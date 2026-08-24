import { INITIAL_VOCABULARY } from '@/src/core/vocabulary/seed';

import { faceVariantForEmotion } from './RepresentativeEmotionFace';

describe('RepresentativeEmotionFace', () => {
  it('전체 감정을 11가지 서로 다른 표정 계열에 연결한다', () => {
    const emotionIds = INITIAL_VOCABULARY.filter((item) => item.kind === 'emotion').map(
      (item) => item.id,
    );
    const variants = emotionIds.map(faceVariantForEmotion);

    expect(emotionIds).toHaveLength(161);
    expect(new Set(variants).size).toBe(11);
    expect(faceVariantForEmotion('emotion-excited')).toBe('joy');
    expect(faceVariantForEmotion('emotion-anxious')).toBe('worry');
    expect(faceVariantForEmotion('emotion-disappointed')).toBe('sadness');
  });

  it('기존 24개 감정 ID의 달력 표정을 모두 보존한다', () => {
    const expected = {
      'emotion-joyful': 'joy', 'emotion-happy': 'joy', 'emotion-grateful': 'joy', 'emotion-excited': 'joy',
      'emotion-comfortable': 'calm', 'emotion-peaceful': 'calm', 'emotion-confident': 'confidence',
      'emotion-hopeful': 'confidence', 'emotion-worried': 'worry', 'emotion-anxious': 'worry',
      'emotion-afraid': 'fear', 'emotion-overwhelmed': 'fear', 'emotion-tense': 'tension',
      'emotion-frustrated': 'tension', 'emotion-sad': 'sadness', 'emotion-hurt': 'sadness',
      'emotion-disappointed': 'sadness', 'emotion-lonely': 'loneliness', 'emotion-tired': 'fatigue',
      'emotion-powerless': 'fatigue', 'emotion-confused': 'confusion', 'emotion-embarrassed': 'confusion',
      'emotion-angry': 'anger', 'emotion-wronged': 'anger',
    } as const;

    for (const [emotionId, variant] of Object.entries(expected)) {
      expect(faceVariantForEmotion(emotionId)).toBe(variant);
    }
  });

  it('카탈로그 밖 직접 추가 감정도 안전한 표정으로 표시한다', () => {
    expect(faceVariantForEmotion('custom-emotion-1')).toBe('confusion');
  });
});
