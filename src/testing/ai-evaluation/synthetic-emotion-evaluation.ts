import type {
  EmotionChoice,
  EmotionExplorer,
  EmotionExplorerRequest,
  EmotionExplorerResult,
  NeedChoice,
} from '@/src/core/contracts';

export const SYNTHETIC_EVALUATION_CATEGORIES = [
  'fulfilled',
  'unfulfilled',
  'mixed',
  'ambiguous',
] as const;

export type SyntheticEvaluationCategory = (typeof SYNTHETIC_EVALUATION_CATEGORIES)[number];

export interface SyntheticEmotionEvaluationScenario {
  id: string;
  category: SyntheticEvaluationCategory;
  request: EmotionExplorerRequest;
}

interface SyntheticEvaluationObservation {
  scenarioId: string;
  category: SyntheticEvaluationCategory;
  result: EmotionExplorerResult;
}

export interface SyntheticEmotionEvaluationReport {
  total: number;
  statusCounts: {
    success: number;
    cancelled: number;
    unavailable: number;
    invalidResponse: number;
  };
  uniqueSuggestedEmotionIds: readonly string[];
  uniqueSuggestedNeedIds: readonly string[];
  observations: readonly SyntheticEvaluationObservation[];
}

const catalogEmotion = (id: string, label: string): EmotionChoice => ({
  id: `emotion-${id}`,
  kind: 'emotion',
  label,
  source: 'catalog',
});

const catalogNeed = (id: string, label: string): NeedChoice => ({
  id: `need-${id}`,
  kind: 'need',
  label,
  source: 'catalog',
});

const scenario = (
  id: string,
  category: SyntheticEvaluationCategory,
  story: string,
  emotions: readonly EmotionChoice[] = [],
  needs: readonly NeedChoice[] = [],
): SyntheticEmotionEvaluationScenario => ({
  id,
  category,
  request: { story, userSelected: { emotions, needs } },
});

// 실제 일기에서 가져오지 않은 상황이다. 각 상황에 정답 감정이나 정답 욕구를 두지 않는다.
export const SYNTHETIC_EMOTION_EVALUATION_SCENARIOS: readonly SyntheticEmotionEvaluationScenario[] = [
  scenario('fulfilled-01', 'fulfilled', '오랫동안 준비한 발표를 마치고 동료들이 구체적인 장점을 이야기해 주었다.'),
  scenario('fulfilled-02', 'fulfilled', '바쁜 하루였지만 저녁에 혼자 조용히 산책할 시간이 생겼다.'),
  scenario('fulfilled-03', 'fulfilled', '친구에게 부탁하기 어려웠던 일을 말했는데 흔쾌히 도와주겠다고 했다.'),
  scenario('fulfilled-04', 'fulfilled', '새로운 방법으로 문제를 풀어 보았고 예상보다 잘 작동했다.'),
  scenario('fulfilled-05', 'fulfilled', '가족과 함께 식사하며 서로의 근황을 천천히 들었다.'),
  scenario(
    'fulfilled-06',
    'fulfilled',
    '오래 미뤘던 작은 일을 끝내고 책상까지 정리했다.',
    [catalogEmotion('comfortable', '편안한')],
  ),
  scenario('unfulfilled-01', 'unfulfilled', '회의에서 내 설명이 끝나기 전에 다른 사람이 말을 끊고 결론을 바꾸었다.'),
  scenario('unfulfilled-02', 'unfulfilled', '약속 시간에 맞춰 갔지만 상대에게서 한참 동안 아무 연락이 없었다.'),
  scenario('unfulfilled-03', 'unfulfilled', '해야 할 일이 계속 늘어나는데 어디부터 손대야 할지 정하지 못했다.'),
  scenario('unfulfilled-04', 'unfulfilled', '며칠째 충분히 자지 못한 상태로 아침 일정을 시작했다.'),
  scenario('unfulfilled-05', 'unfulfilled', '기대했던 결과 발표에서 내 이름을 찾지 못했다.'),
  scenario(
    'unfulfilled-06',
    'unfulfilled',
    '내가 맡지 않은 실수까지 내 책임인 것처럼 이야기되었다.',
    [catalogEmotion('angry', '화나는')],
    [catalogNeed('respect', '존중')],
  ),
  scenario('mixed-01', 'mixed', '새 팀에 합류하게 되어 기대되지만 익숙한 사람들과 떨어지는 것이 마음에 걸린다.'),
  scenario('mixed-02', 'mixed', '어려운 프로젝트를 끝내 뿌듯하면서도 다시 수정 요청이 올까 긴장이 된다.'),
  scenario('mixed-03', 'mixed', '친구가 좋은 소식을 전해 기쁘지만 요즘 자주 만나지 못한 점은 아쉽다.'),
  scenario('mixed-04', 'mixed', '혼자 쉴 수 있어 편안한데 밀린 연락을 생각하면 마음 한편이 무겁다.'),
  scenario('mixed-05', 'mixed', '새로운 제안을 받아 설레지만 지금 생활의 안정도 놓치고 싶지 않다.'),
  scenario(
    'mixed-06',
    'mixed',
    '솔직하게 의견을 말해 후련하지만 상대가 불편해했을까 계속 생각난다.',
    [catalogEmotion('comfortable', '편안한'), catalogEmotion('worried', '걱정되는')],
  ),
  scenario('ambiguous-01', 'ambiguous', '메시지에 짧은 답장만 왔는데 어떤 의미인지 잘 모르겠다.'),
  scenario('ambiguous-02', 'ambiguous', '예정되어 있던 일정이 이유를 듣지 못한 채 다음 주로 미뤄졌다.'),
  scenario('ambiguous-03', 'ambiguous', '하루 종일 특별한 일은 없었지만 집중이 잘되지 않았다.'),
  scenario('ambiguous-04', 'ambiguous', '처음 만난 사람이 내 이야기를 오래 들었지만 표정은 거의 변하지 않았다.'),
  scenario('ambiguous-05', 'ambiguous', '결정을 기다리는 중인데 언제 답을 받을 수 있는지 안내가 없다.'),
  scenario(
    'ambiguous-06',
    'ambiguous',
    '평소와 같은 길을 걸었는데 오늘은 주변이 낯설게 느껴졌다.',
    [],
    [catalogNeed('safety', '안전')],
  ),
];

function validateScenarios(scenarios: readonly SyntheticEmotionEvaluationScenario[]): void {
  if (scenarios.length < 20) {
    throw new Error('합성 AI 평가는 20개 이상의 상황이 필요합니다.');
  }

  const ids = new Set<string>();
  const stories = new Set<string>();
  for (const item of scenarios) {
    const story = item.request.story.trim();
    if (!item.id.trim() || !story || ids.has(item.id) || stories.has(story)) {
      throw new Error('합성 AI 평가 상황의 ID와 이야기는 비어 있지 않고 서로 달라야 합니다.');
    }
    ids.add(item.id);
    stories.add(story);
  }

  for (const category of SYNTHETIC_EVALUATION_CATEGORIES) {
    if (!scenarios.some((item) => item.category === category)) {
      throw new Error('합성 AI 평가는 모든 상황 범주를 포함해야 합니다.');
    }
  }
}

export async function runSyntheticEmotionEvaluation(
  explorer: EmotionExplorer,
  scenarios: readonly SyntheticEmotionEvaluationScenario[] = SYNTHETIC_EMOTION_EVALUATION_SCENARIOS,
): Promise<SyntheticEmotionEvaluationReport> {
  validateScenarios(scenarios);

  const observations: SyntheticEvaluationObservation[] = [];
  const emotionIds = new Set<string>();
  const needIds = new Set<string>();
  const statusCounts = { success: 0, cancelled: 0, unavailable: 0, invalidResponse: 0 };

  // 실제 공급자 계측에서도 요청 순서와 비용을 예측할 수 있도록 병렬 호출하지 않는다.
  for (const item of scenarios) {
    const result = await explorer.suggest(item.request);
    observations.push({ scenarioId: item.id, category: item.category, result });

    if (result.ok) {
      statusCounts.success += 1;
      result.value.emotions.forEach(({ choice }) => emotionIds.add(choice.id));
      result.value.needs.forEach(({ choice }) => needIds.add(choice.id));
    } else if (result.error.code === 'invalid-response') {
      statusCounts.invalidResponse += 1;
    } else {
      statusCounts[result.error.code] += 1;
    }
  }

  return {
    total: scenarios.length,
    statusCounts,
    uniqueSuggestedEmotionIds: [...emotionIds].sort(),
    uniqueSuggestedNeedIds: [...needIds].sort(),
    observations,
  };
}
