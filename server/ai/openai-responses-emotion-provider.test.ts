import type { EmotionSuggestionsRequest } from './emotion-suggestions-contract';
import {
  buildOpenAiResponsesRequest,
  OpenAiResponsesEmotionProvider,
  type OpenAiResponsesGateway,
} from './openai-responses-emotion-provider';

const request: EmotionSuggestionsRequest = {
  requestId: 'request-synthetic-1',
  story: '합성 상황에서 마음이 복잡했다.',
  userSelected: {
    emotionIds: ['emotion-worried'],
    needIds: ['need-safety'],
  },
};
const catalog = {
  emotions: [
    { id: 'emotion-worried', label: '걱정되는' },
    { id: 'emotion-tense', label: '긴장한' },
  ],
  needs: [
    { id: 'need-safety', label: '안전' },
    { id: 'need-rest', label: '휴식' },
  ],
};

describe('OpenAiResponsesEmotionProvider', () => {
  it('Responses API용 최소 요청과 엄격한 JSON schema를 만든다', () => {
    const built = buildOpenAiResponsesRequest('model-to-decide', request, catalog);

    expect(built).toMatchObject({
      model: 'model-to-decide',
      store: false,
      max_output_tokens: 800,
      text: {
        format: {
          type: 'json_schema',
          name: 'emotion_suggestions',
          strict: true,
          schema: {
            additionalProperties: false,
            required: ['emotions', 'needs'],
          },
        },
      },
    });
    expect(JSON.parse(built.input)).toEqual({
      story: request.story,
      userSelected: request.userSelected,
      catalog,
    });
    expect(built.input).toContain('긴장한');
    expect(built.input).toContain('휴식');
    expect(JSON.stringify(built)).not.toContain('OPENAI_API_KEY');
  });

  it('output_text와 usage를 외부 계약으로 변환한다', async () => {
    const createResponse = jest.fn(async () => ({
      status: 'completed',
      output_text: JSON.stringify({
        emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
        needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
      }),
      usage: { input_tokens: 120, output_tokens: 30, total_tokens: 150 },
    }));
    const provider = new OpenAiResponsesEmotionProvider({ createResponse }, 'model-to-decide');

    await expect(provider.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: {
        emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
        needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
      },
      usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150 },
    });
    expect(createResponse).toHaveBeenCalledWith(
      expect.objectContaining({ store: false }),
      { signal: undefined },
    );
  });

  it('raw output content 형식도 처리한다', async () => {
    const gateway: OpenAiResponsesGateway = {
      createResponse: async () => ({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ emotions: [], needs: [] }),
              },
            ],
          },
        ],
      }),
    };
    const provider = new OpenAiResponsesEmotionProvider(gateway, 'model-to-decide');

    await expect(provider.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: { emotions: [], needs: [] },
      usage: null,
    });
  });

  it.each([
    ['출력 누락', {}],
    ['JSON 손상', { status: 'completed', output_text: '{not-json' }],
    ['미완료 응답', { status: 'incomplete', output_text: '{"emotions":[],"needs":[]}', incomplete_details: { reason: 'max_output_tokens' } }],
    ['실패 응답', { status: 'failed', output_text: '{"emotions":[],"needs":[]}', error: { code: 'synthetic' } }],
  ])('%s을 안전한 오류로 바꾼다', async (_label, response) => {
    const provider = new OpenAiResponsesEmotionProvider(
      { createResponse: async () => response },
      'model-to-decide',
    );

    await expect(provider.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'invalid-response',
    });
  });

  it('공급자 예외의 사용자 원문을 반환하지 않는다', async () => {
    const provider = new OpenAiResponsesEmotionProvider(
      {
        createResponse: async () => {
          throw new Error(`공급자 오류: ${request.story}`);
        },
      },
      'model-to-decide',
    );

    const result = await provider.suggest(request, catalog);
    expect(result).toEqual({ ok: false, error: 'unavailable' });
    expect(JSON.stringify(result)).not.toContain(request.story);
  });

  it('사용자가 중단한 요청은 일반 공급자 장애와 구분한다', async () => {
    const controller = new AbortController();
    const provider = new OpenAiResponsesEmotionProvider(
      {
        createResponse: async () => {
          controller.abort();
          throw new Error('합성 취소');
        },
      },
      'model-to-decide',
    );

    await expect(provider.suggest(request, catalog, controller.signal)).resolves.toEqual({
      ok: false,
      error: 'cancelled',
    });
  });
});
