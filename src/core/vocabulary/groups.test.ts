import { VOCABULARY_GROUPS } from './groups';

describe('VOCABULARY_GROUPS', () => {
  it('그룹 ID가 중복되지 않는다', () => {
    expect(new Set(VOCABULARY_GROUPS.map((group) => group.id)).size).toBe(VOCABULARY_GROUPS.length);
  });

  it('감정과 욕구 그룹의 종류가 서로 섞이지 않는다', () => {
    const emotionIds = new Set([
      'joy',
      'calm',
      'confidence',
      'worry',
      'fear',
      'tension',
      'sadness',
      'loneliness',
      'fatigue',
      'confusion',
      'anger',
    ]);

    for (const group of VOCABULARY_GROUPS) {
      expect(group.kind === 'emotion').toBe(emotionIds.has(group.id));
    }
  });
});
