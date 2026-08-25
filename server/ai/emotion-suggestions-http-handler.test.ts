import type { EmotionSuggestionsServiceResult } from './emotion-suggestions-service';
import {
  EmotionSuggestionsHttpHandler,
  type EmotionSuggestionsHttpService,
} from './emotion-suggestions-http-handler';

const validBody = {
  requestId: 'synthetic-request-1',
  story: '응답에 노출되면 안 되는 합성 이야기',
  userSelected: { emotionIds: [], needIds: [] },
};

function createHandler(result: EmotionSuggestionsServiceResult) {
  const suggest = jest.fn(async () => result);
  return { handler: new EmotionSuggestionsHttpHandler({ suggest }), suggest };
}

describe('EmotionSuggestionsHttpHandler', () => {
  it('POST body와 signal을 서비스에 전달하고 usage 없이 검증된 후보만 반환한다', async () => {
    const value = {
      emotions: [{ id: 'emotion-calm', reasonCode: 'settling-needed' as const }],
      needs: [{ id: 'need-rest', reasonCode: 'settling-needed' as const }],
    };
    const { handler, suggest } = createHandler({
      ok: true,
      value,
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    });
    const controller = new AbortController();

    const response = await handler.handle({
      method: 'POST',
      body: validBody,
      signal: controller.signal,
    });

    expect(suggest).toHaveBeenCalledWith(validBody, controller.signal);
    expect(response).toEqual({ status: 200, body: { ok: true, value } });
    expect(JSON.stringify(response)).not.toContain('usage');
    expect(JSON.stringify(response)).not.toContain('budget');
    expect(JSON.stringify(response)).not.toContain('cost');
  });

  it('POST가 아닌 요청은 서비스를 호출하지 않는다', async () => {
    const { handler, suggest } = createHandler({ ok: false, error: 'unavailable' });

    await expect(handler.handle({ method: 'GET', body: validBody })).resolves.toEqual({
      status: 405,
      body: { ok: false, error: { code: 'invalid-response' } },
    });
    expect(suggest).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid-request', 400, 'invalid-response'],
    ['invalid-response', 502, 'invalid-response'],
    ['cancelled', 499, 'cancelled'],
    ['duplicate-request', 409, 'unavailable'],
    ['request-in-flight', 409, 'unavailable'],
    ['insufficient-budget', 429, 'unavailable'],
    ['unavailable', 503, 'unavailable'],
    ['cost-accounting-failed', 503, 'unavailable'],
  ] as const)('%s를 안전한 HTTP 응답으로 변환한다', async (error, status, code) => {
    const { handler } = createHandler({ ok: false, error });

    await expect(handler.handle({ method: 'POST', body: validBody })).resolves.toEqual({
      status,
      body: { ok: false, error: { code } },
    });
  });

  it('서비스 예외 원문과 이야기를 응답에 노출하지 않는다', async () => {
    const service: EmotionSuggestionsHttpService = {
      suggest: jest.fn(async () => {
        throw new Error(`${validBody.story}: 합성 내부 오류`);
      }),
    };
    const handler = new EmotionSuggestionsHttpHandler(service);

    const response = await handler.handle({ method: 'POST', body: validBody });

    expect(response).toEqual({
      status: 503,
      body: { ok: false, error: { code: 'unavailable' } },
    });
    expect(JSON.stringify(response)).not.toContain(validBody.story);
    expect(JSON.stringify(response)).not.toContain('내부 오류');
  });
});
