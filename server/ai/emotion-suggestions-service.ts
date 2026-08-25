import type { VocabularyItem } from '../../src/core/contracts/emotion-vocabulary';
import {
  createEmotionSuggestionCatalog,
  parseEmotionSuggestionsRequest,
  parseEmotionSuggestionsResponse,
  type EmotionSuggestionProvider,
  type EmotionSuggestionProviderError,
  type EmotionSuggestionProviderCatalog,
  type EmotionSuggestionUsage,
  type EmotionSuggestionsResponse,
} from './emotion-suggestions-contract';

export type EmotionSuggestionsServiceResult =
  | {
      readonly ok: true;
      readonly value: EmotionSuggestionsResponse;
      readonly usage: EmotionSuggestionUsage | null;
    }
  | {
      readonly ok: false;
      readonly error: 'invalid-request' | EmotionSuggestionProviderError;
    };

export class EmotionSuggestionsService {
  private readonly catalog;
  private readonly providerCatalog: EmotionSuggestionProviderCatalog;

  constructor(
    vocabulary: readonly VocabularyItem[],
    private readonly provider: EmotionSuggestionProvider,
  ) {
    this.catalog = createEmotionSuggestionCatalog(vocabulary);
    this.providerCatalog = {
      emotions: vocabulary
        .filter((item) => item.kind === 'emotion')
        .map(({ id, label }) => ({ id, label })),
      needs: vocabulary
        .filter((item) => item.kind === 'need')
        .map(({ id, label }) => ({ id, label })),
    };
  }

  async suggest(value: unknown, signal?: AbortSignal): Promise<EmotionSuggestionsServiceResult> {
    const request = parseEmotionSuggestionsRequest(value, this.catalog);
    if (!request) return { ok: false, error: 'invalid-request' };

    const result = await this.provider.suggest(request, this.providerCatalog, signal);
    if (!result.ok) return result;

    const response = parseEmotionSuggestionsResponse(
      result.value,
      this.catalog,
      request.userSelected,
    );
    return response
      ? { ok: true, value: response, usage: result.usage }
      : { ok: false, error: 'invalid-response' };
  }
}
