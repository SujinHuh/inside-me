import type {
  EmotionChoice,
  EmotionNeedVocabulary,
  NeedChoice,
  VocabularyItem,
} from '../../core/contracts/emotion-vocabulary';
import type {
  EmotionExplorer,
  EmotionExplorerRequest,
  EmotionExplorerResult,
} from '../../core/contracts/emotion-explorer';
import type { ExplorerSuggestion } from '../../core/contracts/entry';

interface SuggestionRule {
  keywords: readonly string[];
  emotionId: string;
  emotionReason: string;
  needId: string;
  needReason: string;
}

const DEFAULT_RULES: readonly SuggestionRule[] = [
  {
    keywords: ['서운', '섭섭', '무시당', '무시했'],
    emotionId: 'emotion-hurt',
    emotionReason: '기대했던 반응과 달랐을 때 함께 살펴볼 수 있는 표현이에요.',
    needId: 'need-respect',
    needReason: '그 순간 존중받고 싶었는지 함께 살펴볼 수 있어요.',
  },
  {
    keywords: ['외롭', '고독'],
    emotionId: 'emotion-lonely',
    emotionReason: '연결이 멀게 느껴졌을 때 함께 살펴볼 수 있는 표현이에요.',
    needId: 'need-connection',
    needReason: '누군가와 연결되고 싶었는지 함께 살펴볼 수 있어요.',
  },
  {
    keywords: ['불안해', '불안했', '걱정돼', '걱정했', '긴장돼', '긴장했'],
    emotionId: 'emotion-anxious',
    emotionReason: '앞일이 분명하지 않을 때 함께 살펴볼 수 있는 표현이에요.',
    needId: 'need-safety',
    needReason: '예측 가능함이나 안전이 중요했는지 함께 살펴볼 수 있어요.',
  },
  {
    keywords: ['지쳐', '지쳤', '피곤해', '피곤했', '쉬고 싶'],
    emotionId: 'emotion-tired',
    emotionReason: '에너지가 줄어든 상태인지 함께 살펴볼 수 있는 표현이에요.',
    needId: 'need-rest',
    needReason: '몸과 마음을 쉬게 할 시간이 필요했는지 살펴볼 수 있어요.',
  },
  {
    keywords: ['화가 났', '화났', '화나는', '화를 냈', '화도 났', '짜증났', '억울'],
    emotionId: 'emotion-wronged',
    emotionReason: '부당하다고 느낀 지점이 있었는지 함께 살펴볼 수 있는 표현이에요.',
    needId: 'need-respect',
    needReason: '공정한 대우나 존중이 중요했는지 함께 살펴볼 수 있어요.',
  },
];
const MAX_SUGGESTIONS_PER_KIND = 3;

const asEmotionChoice = (item: VocabularyItem): EmotionChoice | null =>
  item.kind === 'emotion' ? { id: item.id, kind: 'emotion', label: item.label, source: 'catalog' } : null;

const asNeedChoice = (item: VocabularyItem): NeedChoice | null =>
  item.kind === 'need' ? { id: item.id, kind: 'need', label: item.label, source: 'catalog' } : null;

const invalidResponse = (): EmotionExplorerResult => ({
  ok: false,
  error: {
    code: 'invalid-response',
    safeMessage: '지금은 보조 후보를 준비하지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
  },
});

export class DeterministicEmotionExplorer implements EmotionExplorer {
  constructor(
    private readonly vocabulary: EmotionNeedVocabulary,
    private readonly rules: readonly SuggestionRule[] = DEFAULT_RULES,
  ) {}

  async suggest(request: EmotionExplorerRequest): Promise<EmotionExplorerResult> {
    const story = request.story.trim();
    if (!story) {
      return invalidResponse();
    }

    const selectedEmotionIds = new Set(request.userSelected.emotions.map((choice) => choice.id));
    const selectedNeedIds = new Set(request.userSelected.needs.map((choice) => choice.id));
    const emotions: ExplorerSuggestion<EmotionChoice>[] = [];
    const needs: ExplorerSuggestion<NeedChoice>[] = [];

    for (const rule of this.rules) {
      if (!rule.keywords.some((keyword) => story.includes(keyword))) {
        continue;
      }

      const emotionItem = this.vocabulary.findById(rule.emotionId);
      const needItem = this.vocabulary.findById(rule.needId);
      if (!emotionItem || !needItem) {
        return invalidResponse();
      }

      const emotion = asEmotionChoice(emotionItem);
      const need = asNeedChoice(needItem);
      if (!emotion || !need) {
        return invalidResponse();
      }

      if (
        emotions.length < MAX_SUGGESTIONS_PER_KIND &&
        !selectedEmotionIds.has(emotion.id) &&
        !emotions.some((suggestion) => suggestion.choice.id === emotion.id)
      ) {
        emotions.push({ choice: emotion, reason: rule.emotionReason });
      }

      if (
        needs.length < MAX_SUGGESTIONS_PER_KIND &&
        !selectedNeedIds.has(need.id) &&
        !needs.some((suggestion) => suggestion.choice.id === need.id)
      ) {
        needs.push({ choice: need, reason: rule.needReason });
      }
    }

    return { ok: true, value: { emotions, needs } };
  }
}
