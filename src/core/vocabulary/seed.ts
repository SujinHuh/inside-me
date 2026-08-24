import type {
  EmotionGroupId,
  EmotionVocabularyItem,
  NeedGroupId,
  NeedVocabularyItem,
  VocabularyItem,
} from '../contracts/emotion-vocabulary';

type EmotionSection = 'fulfilled' | 'unfulfilled';
type SourceGroup<TGroup extends EmotionGroupId | NeedGroupId> = readonly [
  group: TGroup,
  labels: readonly string[],
];

const LEGACY_EMOTION_IDS: Readonly<Record<string, string>> = {
  '기쁜': 'joyful', '행복한': 'happy', '감사한': 'grateful', '신나는': 'excited',
  '편안한': 'comfortable', '평온한': 'peaceful', '자신감 있는': 'confident', '희망에 찬': 'hopeful',
  '걱정되는': 'worried', '불안한': 'anxious', '두려운': 'afraid', '막막한': 'overwhelmed',
  '긴장한': 'tense', '답답한': 'frustrated', '슬픈': 'sad', '서운한': 'hurt',
  '실망스러운': 'disappointed', '외로운': 'lonely', '지친': 'tired', '무기력한': 'powerless',
  '혼란스러운': 'confused', '민망한': 'embarrassed', '화나는': 'angry', '억울한': 'wronged',
};

const LEGACY_NEED_IDS: Readonly<Record<string, string>> = {
  '자신의 꿈·목표·가치를 선택할 자유': 'choice',
  '자신의 꿈·목표·가치를 이루기 위한 방법을 선택할 자유': 'self-direction',
  '휴식': 'rest', '안전': 'safety', '돌봄을 받음': 'care', '연결': 'connection',
  '이해': 'understanding', '존중': 'respect', '신뢰': 'trust', '즐거움': 'play',
  '의미': 'meaning', '기여': 'contribution', '진실': 'authenticity',
  '자기존중': 'self-respect', '평화': 'peace', '성장': 'growth',
};

const LEGACY_SEARCH_TERMS: Readonly<Record<string, readonly string[]>> = {
  'emotion-joyful': ['기쁨', '좋은'], 'emotion-happy': ['행복'],
  'emotion-grateful': ['고마운', '고맙다'], 'emotion-excited': ['흥분되는', '활기찬'],
  'emotion-comfortable': ['안심되는', '긴장이 풀리는'], 'emotion-peaceful': ['고요한', '차분한'],
  'emotion-confident': ['든든한', '당당한'], 'emotion-hopeful': ['기대되는', '힘이 솟는'],
  'emotion-worried': ['염려되는', '근심하는'], 'emotion-anxious': ['조바심', '초조한'],
  'emotion-afraid': ['무서운', '겁나는'], 'emotion-overwhelmed': ['압도된', '진땀나는'],
  'emotion-tense': ['떨리는', '불편한'], 'emotion-frustrated': ['갑갑한', '막힌'],
  'emotion-sad': ['울적한', '비참한'], 'emotion-hurt': ['섭섭한', '섭섭함', '속상한'],
  'emotion-disappointed': ['실망한', '기대가 무너진'], 'emotion-lonely': ['고독한', '혼자인'],
  'emotion-tired': ['피곤한', '노곤한'], 'emotion-powerless': ['힘이 없는', '의욕 없는'],
  'emotion-confused': ['멍한', '갈피를 못 잡는'], 'emotion-embarrassed': ['당황스러운', '놀란'],
  'emotion-angry': ['분한', '짜증나는'], 'emotion-wronged': ['부당한', '울화가 치미는'],
  'need-choice': ['선택할 자유', '선택', '자유'],
  'need-self-direction': ['내 삶을 정할 자유', '자기결정', '주도권'],
  'need-rest': ['쉬기', '수면'], 'need-safety': ['보호', '안정'],
  'need-care': ['돌봄', '보살핌'], 'need-connection': ['유대', '소속'],
  'need-understanding': ['알아주기', '공감'], 'need-respect': ['인정', '배려'],
  'need-trust': ['믿음', '정서적 안전'], 'need-play': ['놀이', '재미'],
  'need-meaning': ['가치', '중요함'], 'need-contribution': ['도움', '참여'],
  'need-authenticity': ['진실성', '솔직함', '진정성'], 'need-self-respect': ['자존감', '존재감'],
  'need-peace': ['조화', '질서'], 'need-growth': ['배움', '발전'],
};

const LEGACY_EMOTION_GROUP_OVERRIDES: Readonly<Record<string, EmotionGroupId>> = {
  'emotion-excited': 'joy',
  'emotion-disappointed': 'sadness',
};

const LEGACY_EXPLORATION_TAGS: Readonly<Record<string, EmotionVocabularyItem['explorationTags']>> = {
  'emotion-joyful': ['comfortable', 'energized'],
  'emotion-happy': ['comfortable', 'energized'],
  'emotion-grateful': ['comfortable', 'calm'],
  'emotion-excited': ['comfortable', 'energized'],
  'emotion-comfortable': ['comfortable', 'calm'],
  'emotion-peaceful': ['comfortable', 'calm'],
  'emotion-confident': ['comfortable', 'energized'],
  'emotion-hopeful': ['comfortable', 'energized'],
  'emotion-worried': ['uncomfortable'],
  'emotion-anxious': ['uncomfortable', 'energized'],
  'emotion-afraid': ['uncomfortable', 'energized'],
  'emotion-overwhelmed': ['uncomfortable'],
  'emotion-tense': ['uncomfortable', 'energized'],
  'emotion-frustrated': ['uncomfortable', 'energized'],
  'emotion-sad': ['uncomfortable', 'calm'],
  'emotion-hurt': ['uncomfortable', 'calm'],
  'emotion-disappointed': ['uncomfortable', 'calm'],
  'emotion-lonely': ['uncomfortable', 'calm'],
  'emotion-tired': ['uncomfortable', 'calm'],
  'emotion-powerless': ['uncomfortable', 'calm'],
  'emotion-confused': ['uncomfortable'],
  'emotion-embarrassed': ['uncomfortable', 'energized'],
  'emotion-angry': ['uncomfortable', 'energized'],
  'emotion-wronged': ['uncomfortable', 'energized'],
};

const DEFAULT_EXPLORATION_TAGS: Readonly<Record<EmotionGroupId, EmotionVocabularyItem['explorationTags']>> = {
  joy: ['comfortable', 'energized'],
  calm: ['comfortable', 'calm'],
  confidence: ['comfortable', 'energized'],
  worry: ['uncomfortable'],
  fear: ['uncomfortable', 'energized'],
  tension: ['uncomfortable', 'energized'],
  sadness: ['uncomfortable', 'calm'],
  loneliness: ['uncomfortable', 'calm'],
  fatigue: ['uncomfortable', 'calm'],
  confusion: ['uncomfortable'],
  anger: ['uncomfortable', 'energized'],
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value.normalize('NFKC')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function catalogId(kind: 'emotion' | 'need', label: string): string {
  const legacyId = kind === 'emotion' ? LEGACY_EMOTION_IDS[label] : LEGACY_NEED_IDS[label];
  return `${kind}-${legacyId ?? `reference-${stableHash(`${kind}:${label}`)}`}`;
}

const emotion = (label: string, group: EmotionGroupId, section: EmotionSection): EmotionVocabularyItem => {
  const id = catalogId('emotion', label);
  const resolvedGroup = LEGACY_EMOTION_GROUP_OVERRIDES[id] ?? group;
  return {
    id, kind: 'emotion', label, groups: [resolvedGroup], searchTerms: LEGACY_SEARCH_TERMS[id] ?? [],
    source: 'user-reference', explorationTags: LEGACY_EXPLORATION_TAGS[id] ?? DEFAULT_EXPLORATION_TAGS[resolvedGroup],
    needConnection: section,
  };
};

const need = (label: string, group: NeedGroupId): NeedVocabularyItem => {
  const id = catalogId('need', label);
  const sourceAliases = label === '신체적 접촉' ? ['스킨십'] : [];
  return {
    id, kind: 'need', label, groups: [group],
    searchTerms: [...(LEGACY_SEARCH_TERMS[id] ?? []), ...sourceAliases],
    source: 'user-reference', explorationTags: [],
  };
};

const FULFILLED_EMOTION_GROUPS = [
  ['joy', ['감동받은', '뭉클한', '감격스런', '벅찬', '환희에 찬', '황홀한', '충만한', '고마운', '감사한', '즐거운', '유쾌한', '통쾌한', '흔쾌한', '경이로운']],
  ['joy', ['기쁜', '반가운', '행복한', '따뜻한', '감미로운', '포근한', '푸근한', '사랑하는', '훈훈한', '정겨운', '친근한']],
  ['confidence', ['뿌듯한', '산뜻한', '만족스런', '상쾌한', '흡족한', '개운한', '후련한', '든든한', '흐뭇한', '홀가분한']],
  ['calm', ['편안한', '느긋한', '담담한', '친밀한', '긴장이 풀리는', '차분한', '안심이 되는', '가벼운', '평화로운', '누그러지는', '고요한', '여유로운', '진정되는', '잠잠해진', '평온한']],
  ['confidence', ['흥미로운', '재미있는', '끌리는', '활기찬', '짜릿한', '신나는', '용기나는', '기력이 넘치는', '기운이 나는', '당당한', '살아있는', '생기가 도는', '원기가 왕성한']],
  ['confidence', ['자신감 있는', '힘이 솟는', '흥분된', '두근거리는', '기대에 부푼', '들뜬', '희망에 찬']],
] satisfies readonly SourceGroup<EmotionGroupId>[];

const UNFULFILLED_EMOTION_GROUPS = [
  ['worry', ['걱정되는', '까마득한', '암담한', '염려되는', '근심하는', '신경 쓰이는', '뒤숭숭한']],
  ['fear', ['무서운', '섬뜩한', '오싹한', '겁나는', '두려운', '진땀나는', '주눅 든', '막막한']],
  ['tension', ['불안한', '조바심 나는', '긴장한', '떨리는', '조마조마한', '초조한', '불편한', '거북한', '겸연쩍은', '곤혹스러운', '멋쩍은', '쑥스러운', '괴로운', '난처한', '답답한', '갑갑한', '서먹한', '어색한', '찜찜한']],
  ['sadness', ['슬픈', '그리운', '목이 메는', '먹먹한', '서글픈', '서러운', '쓰라린', '울적한', '참담한', '한스러운', '비참한', '속상한', '안타까운', '서운한', '김빠진', '애석한', '낙담한']],
  ['loneliness', ['섭섭한', '외로운', '고독한', '공허한', '허전한', '허탈한', '쓸쓸한', '허한']],
  ['fatigue', ['우울한', '무력한', '무기력한', '침울한', '피곤한', '노곤한', '따분한', '맥 빠진', '귀찮은', '지겨운', '절망스러운', '실망스러운', '좌절한', '힘든', '무료한', '지친', '심심한', '질린', '지루한']],
  ['confusion', ['멍한', '혼란스러운', '놀란', '민망한', '당혹스런', '부끄러운']],
  ['anger', ['화나는', '약오르는', '분한', '울화가 치미는', '억울한', '열 받는', '짜증나는']],
] satisfies readonly SourceGroup<EmotionGroupId>[];

const NEED_GROUPS = [
  ['autonomy', ['자신의 꿈·목표·가치를 선택할 자유', '자신의 꿈·목표·가치를 이루기 위한 방법을 선택할 자유']],
  ['physical-wellbeing', ['공기', '음식', '물', '주거', '휴식', '수면', '안전', '신체적 접촉', '성적 표현', '따뜻함', '부드러움', '편안함', '돌봄을 받음', '보호받음', '애착 형성', '자유로운 움직임', '운동']],
  ['connection', ['주는 것', '봉사', '친밀한 관계', '유대', '소통', '연결', '배려', '존중', '상호성', '공감', '이해', '수용', '지지', '협력', '도움', '감사', '인정', '승인', '사랑', '애정', '관심', '호감', '우정', '가까움', '나눔', '소속감', '공동체', '안도', '위안', '신뢰', '확신', '예측가능성', '정서적 안전', '자기 보호', '일관성', '안정성']],
  ['play', ['즐거움', '재미', '유머', '흥']],
  ['meaning', ['기여', '능력', '도전', '명료함', '발견', '보람', '의미', '인생예찬', '기념하기', '깨달음', '자극', '주관을 가짐', '중요하게 여겨짐', '참여', '회복', '효능감', '희망', '열정']],
  ['integrity', ['정직', '진실', '성실성', '존재감', '의지', '개성', '자기존중', '비전', '꿈']],
  ['peace', ['아름다움', '평탄함', '홀가분함', '여유', '평등', '조화', '질서', '평화', '영적 교감', '영성']],
  ['growth', ['성취', '배움', '생산', '성장', '창조성', '치유', '숙달', '전문성', '목표', '가르침', '자각', '자기표현', '자신감', '자기 신뢰']],
] satisfies readonly SourceGroup<NeedGroupId>[];

const emotionItems = (groups: readonly SourceGroup<EmotionGroupId>[], section: EmotionSection) =>
  groups.flatMap(([group, labels]) => labels.map((label) => emotion(label, group, section)));

const needItems = NEED_GROUPS.flatMap(([group, labels]) => labels.map((label) => need(label, group)));

// 사용자 제공 이미지의 선택 표현을 구조화한 전체 카탈로그다. 목록은 탐색 도구이며 정답표가 아니다.
// 기존 대표 시드 ID는 로컬 기록 호환성을 위해 유지하고, 새 ID는 표시 순서와 무관하게 이름에서 만든다.
export const INITIAL_VOCABULARY: readonly VocabularyItem[] = [
  ...emotionItems(FULFILLED_EMOTION_GROUPS, 'fulfilled'),
  ...emotionItems(UNFULFILLED_EMOTION_GROUPS, 'unfulfilled'),
  ...needItems,
];

export const VOCABULARY_SOURCE_COUNTS = {
  fulfilledEmotions: 70,
  unfulfilledEmotions: 91,
  needs: 110,
  total: 271,
} as const;
