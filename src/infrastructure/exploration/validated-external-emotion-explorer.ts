import type {
  ExternalEmotionExplorerPayload,
  ExternalEmotionExplorerTransport,
} from '@/src/application/exploration/external-emotion-explorer-transport';
import type {
  EmotionChoice,
  EmotionExplorer,
  EmotionExplorerRequest,
  EmotionExplorerResponse,
  EmotionExplorerResult,
  EmotionNeedVocabulary,
  ExplorerSuggestion,
  NeedChoice,
  VocabularyItem,
} from '@/src/core/contracts';

type UnknownRecord = Record<string, unknown>;
type RequestIdFactory = () => string;

const MAX_SUGGESTIONS_PER_KIND = 5;
const REASON_COPY = {
  'boundary-or-fairness': '존중이나 공정함이 중요했던 순간인지 함께 살펴볼 수 있어요.',
  'connection-distance': '누군가와의 연결이 멀게 느껴졌던 순간인지 함께 살펴볼 수 있어요.',
  'energy-low': '몸과 마음의 에너지가 줄어든 순간인지 함께 살펴볼 수 있어요.',
  'expectation-gap': '기대했던 것과 실제 경험이 달랐던 순간인지 함께 살펴볼 수 있어요.',
  'general-possibility': '이 표현도 지금 경험에 가까운지 함께 살펴볼 수 있어요.',
  'positive-moment': '반갑거나 힘이 났던 순간과 이어지는 표현인지 함께 살펴볼 수 있어요.',
  'settling-needed': '안정되거나 잠시 쉬는 것이 중요했는지 함께 살펴볼 수 있어요.',
  uncertainty: '앞일이 분명하지 않았던 순간과 이어지는 표현인지 함께 살펴볼 수 있어요.',
} as const;

type ReasonCode = keyof typeof REASON_COPY;

interface PreparedExternalRequest {
  payload: ExternalEmotionExplorerPayload;
  selectedEmotionIds: ReadonlySet<string>;
  selectedNeedIds: ReadonlySet<string>;
}

const invalidResponse = (): EmotionExplorerResult => ({
  ok: false,
  error: {
    code: 'invalid-response',
    safeMessage: 'AI 응답을 안전하게 확인하지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
  },
});

const unavailable = (): EmotionExplorerResult => ({
  ok: false,
  error: {
    code: 'unavailable',
    safeMessage: '지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
  },
});

const cancelled = (): EmotionExplorerResult => ({
  ok: false,
  error: {
    code: 'cancelled',
    safeMessage: 'AI 도움 요청을 취소했어요. 직접 고른 내용은 그대로 유지돼요.',
  },
});

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

function isReasonCode(value: unknown): value is ReasonCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REASON_COPY, value);
}

function parseSuggestion<TChoice extends EmotionChoice | NeedChoice>(
  value: unknown,
  selectedIds: ReadonlySet<string>,
  resolveChoice: (id: string) => TChoice | null,
): ExplorerSuggestion<TChoice> | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isReasonCode(value.reasonCode)) {
    return null;
  }
  if (selectedIds.has(value.id)) return null;

  const choice = resolveChoice(value.id);
  if (!choice) return null;
  return { choice, reason: REASON_COPY[value.reasonCode] };
}

function parseSuggestionList<TChoice extends EmotionChoice | NeedChoice>(
  value: unknown,
  selectedIds: ReadonlySet<string>,
  resolveChoice: (id: string) => TChoice | null,
): readonly ExplorerSuggestion<TChoice>[] | null {
  if (!Array.isArray(value) || value.length > MAX_SUGGESTIONS_PER_KIND) return null;

  const suggestions: ExplorerSuggestion<TChoice>[] = [];
  const responseIds = new Set<string>();
  for (const item of value) {
    const suggestion = parseSuggestion(item, selectedIds, resolveChoice);
    if (!suggestion || responseIds.has(suggestion.choice.id)) return null;
    responseIds.add(suggestion.choice.id);
    suggestions.push(suggestion);
  }
  return suggestions;
}

function resolveEmotionChoice(
  id: string,
  vocabulary: EmotionNeedVocabulary,
): EmotionChoice | null {
  const item: VocabularyItem | null = vocabulary.findById(id);
  return item?.kind === 'emotion'
    ? { id: item.id, kind: 'emotion', label: item.label, source: 'catalog' }
    : null;
}

function resolveNeedChoice(id: string, vocabulary: EmotionNeedVocabulary): NeedChoice | null {
  const item: VocabularyItem | null = vocabulary.findById(id);
  return item?.kind === 'need'
    ? { id: item.id, kind: 'need', label: item.label, source: 'catalog' }
    : null;
}

export function parseExternalEmotionExplorerResponse(
  value: unknown,
  vocabulary: EmotionNeedVocabulary,
  selectedIds: {
    emotions: ReadonlySet<string>;
    needs: ReadonlySet<string>;
  },
): EmotionExplorerResponse | null {
  if (!isRecord(value)) return null;

  const emotions = parseSuggestionList<EmotionChoice>(
    value.emotions,
    selectedIds.emotions,
    (id) => resolveEmotionChoice(id, vocabulary),
  );
  const needs = parseSuggestionList<NeedChoice>(
    value.needs,
    selectedIds.needs,
    (id) => resolveNeedChoice(id, vocabulary),
  );
  if (!emotions || !needs) return null;

  return { emotions, needs };
}

function parseCatalogSelectionIds(
  value: unknown,
  expectedKind: 'emotion' | 'need',
  vocabulary: EmotionNeedVocabulary,
): readonly string[] | null {
  if (!Array.isArray(value)) return null;

  const ids: string[] = [];
  const uniqueIds = new Set<string>();
  for (const choice of value) {
    if (
      !isRecord(choice) ||
      typeof choice.id !== 'string' ||
      choice.kind !== expectedKind ||
      (choice.source !== 'catalog' && choice.source !== 'user-added')
    ) {
      return null;
    }
    if (uniqueIds.has(choice.id)) return null;
    uniqueIds.add(choice.id);

    if (choice.source === 'user-added') continue;
    const item = vocabulary.findById(choice.id);
    if (!item || item.kind !== expectedKind) return null;
    ids.push(item.id);
  }
  return ids;
}

function prepareExternalRequest(
  value: unknown,
  requestId: unknown,
  vocabulary: EmotionNeedVocabulary,
): PreparedExternalRequest | null {
  if (!isRecord(value) || typeof value.story !== 'string' || !isRecord(value.userSelected)) {
    return null;
  }
  const story = value.story.trim();
  if (!story || !isValidRequestId(requestId)) return null;

  const emotionIds = parseCatalogSelectionIds(
    value.userSelected.emotions,
    'emotion',
    vocabulary,
  );
  const needIds = parseCatalogSelectionIds(value.userSelected.needs, 'need', vocabulary);
  if (!emotionIds || !needIds) return null;

  return {
    payload: {
      requestId,
      story,
      userSelected: { emotionIds, needIds },
    },
    selectedEmotionIds: new Set(emotionIds),
    selectedNeedIds: new Set(needIds),
  };
}

export class ValidatedExternalEmotionExplorer implements EmotionExplorer {
  constructor(
    private readonly transport: ExternalEmotionExplorerTransport,
    private readonly vocabulary: EmotionNeedVocabulary,
    private readonly createRequestId: RequestIdFactory,
  ) {}

  async suggest(request: EmotionExplorerRequest): Promise<EmotionExplorerResult> {
    try {
      const prepared = prepareExternalRequest(request, this.createRequestId(), this.vocabulary);
      if (!prepared) return invalidResponse();

      const result = await this.transport.requestSuggestions(prepared.payload);
      if (!result.ok) {
        if (result.error.code === 'cancelled') return cancelled();
        return result.error.code === 'invalid-response' ? invalidResponse() : unavailable();
      }

      const parsed = parseExternalEmotionExplorerResponse(result.value, this.vocabulary, {
        emotions: prepared.selectedEmotionIds,
        needs: prepared.selectedNeedIds,
      });
      return parsed ? { ok: true, value: parsed } : invalidResponse();
    } catch {
      // 공급자 예외 원문과 사용자 이야기는 로그나 오류 문구에 노출하지 않는다.
      return unavailable();
    }
  }
}
