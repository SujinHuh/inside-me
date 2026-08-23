import { INITIAL_VOCABULARY } from '@/src/core/vocabulary/seed';

import { faceVariantForEmotion } from './RepresentativeEmotionFace';

describe('RepresentativeEmotionFace', () => {
  it('초기 감정 24개를 11가지 서로 다른 표정 계열에 연결한다', () => {
    const emotionIds = INITIAL_VOCABULARY.filter((item) => item.kind === 'emotion').map(
      (item) => item.id,
    );
    const variants = emotionIds.map(faceVariantForEmotion);

    expect(emotionIds).toHaveLength(24);
    expect(new Set(variants).size).toBe(11);
  });

  it('카탈로그 밖 직접 추가 감정도 안전한 표정으로 표시한다', () => {
    expect(faceVariantForEmotion('custom-emotion-1')).toBe('confusion');
  });
});
