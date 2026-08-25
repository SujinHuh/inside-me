import type {
  EmotionSuggestionProvider,
  EmotionSuggestionProviderCatalog,
  EmotionSuggestionProviderResult,
  EmotionSuggestionsRequest,
} from './emotion-suggestions-contract';

const SYNTHETIC_INPUT_TOKENS = 24;
const SYNTHETIC_OUTPUT_TOKENS = 12;
const SUGGESTIONS_PER_KIND = 2;

/**
 * HTTP 조합을 외부 전송 없이 검증하기 위한 결정적 fake다.
 * 이야기 원문을 응답이나 오류에 복사하지 않는다.
 */
export class FakeEmotionSuggestionProvider implements EmotionSuggestionProvider {
  async suggest(
    request: EmotionSuggestionsRequest,
    catalog: EmotionSuggestionProviderCatalog,
    signal?: AbortSignal,
  ): Promise<EmotionSuggestionProviderResult> {
    if (signal?.aborted) return { ok: false, error: 'cancelled' };

    const selectedEmotionIds = new Set(request.userSelected.emotionIds);
    const selectedNeedIds = new Set(request.userSelected.needIds);
    const emotions = catalog.emotions
      .filter(({ id }) => !selectedEmotionIds.has(id))
      .slice(0, SUGGESTIONS_PER_KIND)
      .map(({ id }) => ({ id, reasonCode: 'general-possibility' as const }));
    const needs = catalog.needs
      .filter(({ id }) => !selectedNeedIds.has(id))
      .slice(0, SUGGESTIONS_PER_KIND)
      .map(({ id }) => ({ id, reasonCode: 'general-possibility' as const }));

    return {
      ok: true,
      value: { emotions, needs },
      usage: {
        inputTokens: SYNTHETIC_INPUT_TOKENS,
        outputTokens: SYNTHETIC_OUTPUT_TOKENS,
        totalTokens: SYNTHETIC_INPUT_TOKENS + SYNTHETIC_OUTPUT_TOKENS,
      },
    };
  }
}
