import { StyleSheet, Text, View } from 'react-native';

import { borders, colors } from '@/src/ui/tokens';

interface RepresentativeEmotionFaceProps {
  emotionId: string;
  testID?: string;
}

type FaceVariant =
  | 'anger'
  | 'calm'
  | 'confidence'
  | 'confusion'
  | 'fatigue'
  | 'fear'
  | 'joy'
  | 'loneliness'
  | 'sadness'
  | 'tension'
  | 'worry';

interface FacePresentation {
  backgroundColor: string;
  expression: string;
  variant: FaceVariant;
}

const presentations: Record<FaceVariant, FacePresentation> = {
  joy: { backgroundColor: '#F6D66A', expression: '^‿^', variant: 'joy' },
  calm: { backgroundColor: '#A9D8B8', expression: '–‿–', variant: 'calm' },
  confidence: { backgroundColor: '#87C6B2', expression: '•ᴗ•', variant: 'confidence' },
  worry: { backgroundColor: '#B7D6E8', expression: '•﹏•', variant: 'worry' },
  fear: { backgroundColor: '#B9B5D9', expression: '⊙△⊙', variant: 'fear' },
  tension: { backgroundColor: '#E6B37D', expression: '>﹏<', variant: 'tension' },
  sadness: { backgroundColor: '#91B9DB', expression: '╥﹏╥', variant: 'sadness' },
  loneliness: { backgroundColor: '#AEBBC8', expression: '•︵•', variant: 'loneliness' },
  fatigue: { backgroundColor: '#B9C4A5', expression: '–﹏–', variant: 'fatigue' },
  confusion: { backgroundColor: '#C7B4D9', expression: '•_?', variant: 'confusion' },
  anger: { backgroundColor: '#DF927E', expression: 'ಠ︵ಠ', variant: 'anger' },
};

const emotionVariants: Readonly<Record<string, FaceVariant>> = {
  'emotion-joyful': 'joy',
  'emotion-happy': 'joy',
  'emotion-grateful': 'joy',
  'emotion-excited': 'joy',
  'emotion-comfortable': 'calm',
  'emotion-peaceful': 'calm',
  'emotion-calm': 'calm',
  'emotion-confident': 'confidence',
  'emotion-hopeful': 'confidence',
  'emotion-worried': 'worry',
  'emotion-anxious': 'worry',
  'emotion-afraid': 'fear',
  'emotion-overwhelmed': 'fear',
  'emotion-tense': 'tension',
  'emotion-frustrated': 'tension',
  'emotion-sad': 'sadness',
  'emotion-hurt': 'sadness',
  'emotion-disappointed': 'sadness',
  'emotion-lonely': 'loneliness',
  'emotion-tired': 'fatigue',
  'emotion-powerless': 'fatigue',
  'emotion-confused': 'confusion',
  'emotion-embarrassed': 'confusion',
  'emotion-angry': 'anger',
  'emotion-wronged': 'anger',
};

export function faceVariantForEmotion(emotionId: string): FaceVariant {
  return emotionVariants[emotionId] ?? 'confusion';
}

/** 정확한 감정 이름을 보조하는 원본 코드 기반 표정이다. 표정만으로 의미를 확정하지 않는다. */
export function RepresentativeEmotionFace({ emotionId, testID }: RepresentativeEmotionFaceProps) {
  const presentation = presentations[faceVariantForEmotion(emotionId)];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.face, { backgroundColor: presentation.backgroundColor }]}
      testID={testID}
    >
      <Text style={styles.expression} testID={testID ? `${testID}-${presentation.variant}` : undefined}>
        {presentation.expression}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    borderColor: colors.windowBorder,
    borderRadius: 15,
    borderWidth: borders.panel,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  expression: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'center',
  },
});
