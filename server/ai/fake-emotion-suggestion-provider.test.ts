import type { EmotionSuggestionsRequest } from './emotion-suggestions-contract';
import { FakeEmotionSuggestionProvider } from './fake-emotion-suggestion-provider';

const request: EmotionSuggestionsRequest = {
  requestId: 'synthetic-request-1',
  story: '응답에 들어가면 안 되는 합성 이야기',
  userSelected: { emotionIds: ['emotion-first'], needIds: ['need-first'] },
};
const catalog = {
  emotions: [
    { id: 'emotion-first', label: '첫 감정' },
    { id: 'emotion-second', label: '둘째 감정' },
    { id: 'emotion-third', label: '셋째 감정' },
  ],
  needs: [
    { id: 'need-first', label: '첫 욕구' },
    { id: 'need-second', label: '둘째 욕구' },
    { id: 'need-third', label: '셋째 욕구' },
  ],
};

describe('FakeEmotionSuggestionProvider', () => {
  it('이미 고른 ID를 제외하고 카탈로그 순서로 합성 후보와 usage를 반환한다', async () => {
    const provider = new FakeEmotionSuggestionProvider();

    const result = await provider.suggest(request, catalog);

    expect(result).toEqual({
      ok: true,
      value: {
        emotions: [
          { id: 'emotion-second', reasonCode: 'general-possibility' },
          { id: 'emotion-third', reasonCode: 'general-possibility' },
        ],
        needs: [
          { id: 'need-second', reasonCode: 'general-possibility' },
          { id: 'need-third', reasonCode: 'general-possibility' },
        ],
      },
      usage: { inputTokens: 24, outputTokens: 12, totalTokens: 36 },
    });
    expect(JSON.stringify(result)).not.toContain(request.story);
    expect(JSON.stringify(result)).not.toContain('둘째 감정');
  });

  it('이미 중단된 요청은 후보를 생성하지 않는다', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      new FakeEmotionSuggestionProvider().suggest(request, catalog, controller.signal),
    ).resolves.toEqual({ ok: false, error: 'cancelled' });
  });
});
