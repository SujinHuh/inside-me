import { InMemoryEmotionNeedVocabulary } from './in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY, VOCABULARY_SOURCE_COUNTS } from './seed';

describe('전체 감정·욕구 카탈로그', () => {
  it('제공 이미지에서 구조화한 271개 고유 표현을 모두 포함한다', () => {
    const fulfilled = INITIAL_VOCABULARY.filter(
      (item) => item.kind === 'emotion' && item.needConnection === 'fulfilled',
    );
    const unfulfilled = INITIAL_VOCABULARY.filter(
      (item) => item.kind === 'emotion' && item.needConnection === 'unfulfilled',
    );
    const needs = INITIAL_VOCABULARY.filter((item) => item.kind === 'need');

    expect(fulfilled).toHaveLength(VOCABULARY_SOURCE_COUNTS.fulfilledEmotions);
    expect(unfulfilled).toHaveLength(VOCABULARY_SOURCE_COUNTS.unfulfilledEmotions);
    expect(needs).toHaveLength(VOCABULARY_SOURCE_COUNTS.needs);
    expect(INITIAL_VOCABULARY).toHaveLength(VOCABULARY_SOURCE_COUNTS.total);
    expect(new Set(INITIAL_VOCABULARY.map((item) => item.id)).size).toBe(VOCABULARY_SOURCE_COUNTS.total);
    expect(new Set(INITIAL_VOCABULARY.map((item) => `${item.kind}:${item.label}`)).size).toBe(
      VOCABULARY_SOURCE_COUNTS.total,
    );
  });

  it('기존 로컬 기록에서 사용한 대표 ID와 검색 별칭을 보존한다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

    const legacyEmotionIds = [
      'joyful', 'happy', 'grateful', 'excited', 'comfortable', 'peaceful', 'confident', 'hopeful',
      'worried', 'anxious', 'afraid', 'overwhelmed', 'tense', 'frustrated', 'sad', 'hurt',
      'disappointed', 'lonely', 'tired', 'powerless', 'confused', 'embarrassed', 'angry', 'wronged',
    ];
    const legacyNeedIds = [
      'choice', 'self-direction', 'rest', 'safety', 'care', 'connection', 'understanding', 'respect',
      'trust', 'play', 'meaning', 'contribution', 'authenticity', 'self-respect', 'peace', 'growth',
    ];

    expect(legacyEmotionIds.every((id) => catalog.findById(`emotion-${id}`)?.kind === 'emotion')).toBe(true);
    expect(legacyNeedIds.every((id) => catalog.findById(`need-${id}`)?.kind === 'need')).toBe(true);
    expect(catalog.findById('emotion-hurt')?.label).toBe('서운한');
    expect(catalog.findById('need-rest')?.label).toBe('휴식');
    expect(catalog.search({ kind: 'need', text: '스킨십' }).map((item) => item.label)).toEqual([
      '신체적 접촉',
    ]);
    expect(catalog.search({ kind: 'emotion', text: '당황스러운' }).map((item) => item.id)).toContain('emotion-embarrassed');
    expect(catalog.search({ kind: 'need', text: '진실성' }).map((item) => item.id)).toContain('need-authenticity');
    expect(catalog.search({ kind: 'need', text: '믿음' }).map((item) => item.id)).toContain('need-trust');
    expect(catalog.search({ kind: 'need', text: '가치' }).map((item) => item.id)).toContain('need-meaning');
  });

  it('욕구 충족 연결 축과 기존 편안·활성 탐색 태그를 별도로 보존한다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

    expect(catalog.search({ kind: 'emotion', needConnection: 'fulfilled' })).toHaveLength(70);
    expect(catalog.search({ kind: 'emotion', needConnection: 'unfulfilled' })).toHaveLength(91);
    expect(catalog.findById('emotion-anxious')).toMatchObject({
      groups: ['tension'],
      needConnection: 'unfulfilled',
      explorationTags: ['uncomfortable', 'energized'],
    });
    expect(catalog.search({ kind: 'emotion', explorationTag: 'energized' }).map((item) => item.id)).toContain('emotion-anxious');
    expect(catalog.search({ kind: 'emotion', explorationTag: 'calm' }).map((item) => item.id)).toContain('emotion-disappointed');
  });

  it('욕구의 8개 큰 범주가 모두 비어 있지 않다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
    const groups = ['autonomy', 'physical-wellbeing', 'connection', 'play', 'meaning', 'integrity', 'peace', 'growth'] as const;

    for (const group of groups) {
      expect(catalog.search({ kind: 'need', group }).length).toBeGreaterThan(0);
    }
  });

  it('한 장 지도에서 사용하는 감정 11개 그룹 개수를 고정한다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
    const expectedCounts = {
      joy: 26,
      calm: 15,
      confidence: 29,
      worry: 7,
      fear: 8,
      tension: 19,
      sadness: 18,
      loneliness: 8,
      fatigue: 18,
      confusion: 6,
      anger: 7,
    } as const;

    for (const [group, count] of Object.entries(expectedCounts)) {
      expect(catalog.search({ kind: 'emotion', group: group as keyof typeof expectedCounts })).toHaveLength(count);
    }
  });
});
