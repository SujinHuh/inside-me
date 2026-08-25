import { createFakeEmotionSuggestionsHttpHandler } from './create-fake-emotion-suggestions-http-handler';

const validRequest = {
  requestId: 'synthetic-request-1',
  story: '합성 이야기',
  userSelected: { emotionIds: ['emotion-worried'], needIds: ['need-safety'] },
};

describe('createFakeEmotionSuggestionsHttpHandler', () => {
  it('실제 네트워크 없이 검증·예산·fake 공급자를 거쳐 후보를 반환한다', async () => {
    const handler = createFakeEmotionSuggestionsHttpHandler();

    const response = await handler.handle({ method: 'POST', body: validRequest });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      value: {
        emotions: expect.any(Array),
        needs: expect.any(Array),
      },
    });
    expect(JSON.stringify(response)).not.toContain('usage');
    expect(JSON.stringify(response)).not.toContain(validRequest.story);
  });

  it('잘못된 요청을 fake 공급자 전에 거부한다', async () => {
    const handler = createFakeEmotionSuggestionsHttpHandler();

    await expect(
      handler.handle({ method: 'POST', body: { ...validRequest, story: '   ' } }),
    ).resolves.toEqual({
      status: 400,
      body: { ok: false, error: { code: 'invalid-response' } },
    });
  });

  it('합성 예산이 부족하면 안전한 사용 불가 응답을 반환한다', async () => {
    const handler = createFakeEmotionSuggestionsHttpHandler({ budgetLimitUsd: 0 });

    await expect(handler.handle({ method: 'POST', body: validRequest })).resolves.toEqual({
      status: 429,
      body: { ok: false, error: { code: 'unavailable' } },
    });
  });
});
