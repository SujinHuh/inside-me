import { OpenAiResponsesHttpGateway, type ServerFetch } from './openai-responses-http-gateway';
import type { OpenAiResponsesRequest } from './openai-responses-emotion-provider';

const request: OpenAiResponsesRequest = {
  model: 'model-to-decide',
  store: false,
  instructions: '합성 지침',
  input: '합성 입력',
  max_output_tokens: 100,
  text: {
    format: {
      type: 'json_schema',
      name: 'emotion_suggestions',
      strict: true,
      schema: { type: 'object' },
    },
  },
};

describe('OpenAiResponsesHttpGateway', () => {
  it('서버 비밀 키로 Responses endpoint를 호출한다', async () => {
    const fetch: ServerFetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'synthetic-response' }),
    }));
    const gateway = new OpenAiResponsesHttpGateway(fetch, 'synthetic-api-key');
    const controller = new AbortController();

    await expect(
      gateway.createResponse(request, { signal: controller.signal }),
    ).resolves.toEqual({ id: 'synthetic-response' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer synthetic-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('빈 키로 경계를 생성하지 않는다', () => {
    expect(
      () => new OpenAiResponsesHttpGateway(jest.fn() as ServerFetch, '  '),
    ).toThrow('OpenAI API key is required');
  });

  it('시간 제한이 올바른 양의 정수가 아니면 경계를 생성하지 않는다', () => {
    expect(
      () => new OpenAiResponsesHttpGateway(jest.fn() as ServerFetch, 'synthetic-key', 0),
    ).toThrow('OpenAI timeout must be a positive integer');
  });

  it('실패 응답 본문을 읽지 않고 안전한 예외로 끝낸다', async () => {
    const json = jest.fn(async () => ({
      error: `사용자 이야기가 포함될 수 있는 합성 오류`,
    }));
    const fetch: ServerFetch = async () => ({ ok: false, json });
    const gateway = new OpenAiResponsesHttpGateway(fetch, 'synthetic-api-key');

    await expect(gateway.createResponse(request)).rejects.toThrow(
      'OpenAI Responses API request failed',
    );
    expect(json).not.toHaveBeenCalled();
  });
});
