import { INITIAL_VOCABULARY } from '../../src/core/vocabulary/seed';
import { EmotionSuggestionsService } from './emotion-suggestions-service';
import { OpenAiResponsesEmotionProvider } from './openai-responses-emotion-provider';

const validRequest = {
  requestId: 'request-synthetic-1',
  story: '합성 이야기',
  userSelected: { emotionIds: ['emotion-worried'], needIds: ['need-safety'] },
};

function createService(output: unknown) {
  const createResponse = jest.fn(async () => output);
  const provider = new OpenAiResponsesEmotionProvider(
    { createResponse },
    'model-to-decide',
  );
  return {
    service: new EmotionSuggestionsService(INITIAL_VOCABULARY, provider),
    createResponse,
  };
}

describe('EmotionSuggestionsService', () => {
  it('유효한 합성 요청을 검증된 후보와 usage로 반환한다', async () => {
    const { service } = createService({
      status: 'completed',
      output_text: JSON.stringify({
        emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
        needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
      }),
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
    });

    await expect(service.suggest(validRequest)).resolves.toEqual({
      ok: true,
      value: {
        emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
        needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
      },
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    });
  });

  it('잘못된 요청은 OpenAI gateway를 호출하지 않는다', async () => {
    const { service, createResponse } = createService({ status: 'completed', output_text: '{}' });

    await expect(
      service.suggest({ ...validRequest, story: '   ' }),
    ).resolves.toEqual({ ok: false, error: 'invalid-request' });
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('스키마를 통과해도 이미 고른 후보는 서버에서 차단한다', async () => {
    const { service } = createService({
      status: 'completed',
      output_text: JSON.stringify({
        emotions: [{ id: 'emotion-worried', reasonCode: 'uncertainty' }],
        needs: [],
      }),
    });

    await expect(service.suggest(validRequest)).resolves.toEqual({
      ok: false,
      error: 'invalid-response',
    });
  });
});
