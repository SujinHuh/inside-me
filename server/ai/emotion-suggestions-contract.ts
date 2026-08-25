import type { VocabularyItem } from '../../src/core/contracts/emotion-vocabulary';

export const EMOTION_SUGGESTION_REASON_CODES = [
  'boundary-or-fairness',
  'connection-distance',
  'energy-low',
  'expectation-gap',
  'general-possibility',
  'positive-moment',
  'settling-needed',
  'uncertainty',
] as const;

export type EmotionSuggestionReasonCode =
  (typeof EMOTION_SUGGESTION_REASON_CODES)[number];

export interface EmotionSuggestionsRequest {
  readonly requestId: string;
  readonly story: string;
  readonly userSelected: {
    readonly emotionIds: readonly string[];
    readonly needIds: readonly string[];
  };
}

export interface EmotionSuggestionItem {
  readonly id: string;
  readonly reasonCode: EmotionSuggestionReasonCode;
}

export interface EmotionSuggestionsResponse {
  readonly emotions: readonly EmotionSuggestionItem[];
  readonly needs: readonly EmotionSuggestionItem[];
}

export interface EmotionSuggestionCatalogItem {
  readonly id: string;
  readonly label: string;
}

export interface EmotionSuggestionProviderCatalog {
  readonly emotions: readonly EmotionSuggestionCatalogItem[];
  readonly needs: readonly EmotionSuggestionCatalogItem[];
}

export interface EmotionSuggestionUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export type EmotionSuggestionProviderResult =
  | {
      readonly ok: true;
      readonly value: unknown;
      readonly usage: EmotionSuggestionUsage | null;
    }
  | { readonly ok: false; readonly error: 'unavailable' | 'invalid-response' };

export interface EmotionSuggestionProvider {
  suggest(
    request: EmotionSuggestionsRequest,
    catalog: EmotionSuggestionProviderCatalog,
    signal?: AbortSignal,
  ): Promise<EmotionSuggestionProviderResult>;
}

interface CatalogIds {
  readonly emotions: ReadonlySet<string>;
  readonly needs: ReadonlySet<string>;
}

type UnknownRecord = Record<string, unknown>;

const MAX_SUGGESTIONS_PER_KIND = 5;
export const MAX_STORY_UTF8_BYTES = 16_000;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

function isReasonCode(value: unknown): value is EmotionSuggestionReasonCode {
  return (
    typeof value === 'string' &&
    EMOTION_SUGGESTION_REASON_CODES.some((reasonCode) => reasonCode === value)
  );
}

function parseCatalogIds(
  value: unknown,
  knownIds: ReadonlySet<string>,
): readonly string[] | null {
  if (!Array.isArray(value)) return null;

  const parsed: string[] = [];
  const uniqueIds = new Set<string>();
  for (const id of value) {
    if (typeof id !== 'string' || !knownIds.has(id) || uniqueIds.has(id)) return null;
    uniqueIds.add(id);
    parsed.push(id);
  }
  return parsed;
}

function parseSuggestions(
  value: unknown,
  knownIds: ReadonlySet<string>,
  selectedIds: ReadonlySet<string>,
): readonly EmotionSuggestionItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_SUGGESTIONS_PER_KIND) return null;

  const parsed: EmotionSuggestionItem[] = [];
  const uniqueIds = new Set<string>();
  for (const suggestion of value) {
    if (
      !isRecord(suggestion) ||
      typeof suggestion.id !== 'string' ||
      !knownIds.has(suggestion.id) ||
      selectedIds.has(suggestion.id) ||
      uniqueIds.has(suggestion.id) ||
      !isReasonCode(suggestion.reasonCode)
    ) {
      return null;
    }
    uniqueIds.add(suggestion.id);
    parsed.push({ id: suggestion.id, reasonCode: suggestion.reasonCode });
  }
  return parsed;
}

export function createEmotionSuggestionCatalog(
  vocabulary: readonly VocabularyItem[],
): CatalogIds {
  return {
    emotions: new Set(vocabulary.filter((item) => item.kind === 'emotion').map((item) => item.id)),
    needs: new Set(vocabulary.filter((item) => item.kind === 'need').map((item) => item.id)),
  };
}

export function parseEmotionSuggestionsRequest(
  value: unknown,
  catalog: CatalogIds,
): EmotionSuggestionsRequest | null {
  if (!isRecord(value) || !isRequestId(value.requestId) || !isRecord(value.userSelected)) {
    return null;
  }

  const story = typeof value.story === 'string' ? value.story.trim() : '';
  if (!story || new TextEncoder().encode(story).byteLength > MAX_STORY_UTF8_BYTES) return null;

  const emotionIds = parseCatalogIds(value.userSelected.emotionIds, catalog.emotions);
  const needIds = parseCatalogIds(value.userSelected.needIds, catalog.needs);
  if (!emotionIds || !needIds) return null;

  return {
    requestId: value.requestId,
    story,
    userSelected: { emotionIds, needIds },
  };
}

export function parseEmotionSuggestionsResponse(
  value: unknown,
  catalog: CatalogIds,
  selected: EmotionSuggestionsRequest['userSelected'],
): EmotionSuggestionsResponse | null {
  if (!isRecord(value)) return null;

  const emotions = parseSuggestions(
    value.emotions,
    catalog.emotions,
    new Set(selected.emotionIds),
  );
  const needs = parseSuggestions(value.needs, catalog.needs, new Set(selected.needIds));
  return emotions && needs ? { emotions, needs } : null;
}
