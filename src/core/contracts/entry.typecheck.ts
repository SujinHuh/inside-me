import type { Confirmation, ConfirmedEmotion, EmotionConfirmation } from './entry';

const invalidUnknownConfirmation: Confirmation<ConfirmedEmotion> = {
  status: 'unknown',
  // @ts-expect-error unknown 상태에는 확정 항목을 함께 저장할 수 없다.
  items: [],
};

void invalidUnknownConfirmation;

const invalidEmptyConfirmation: Confirmation<ConfirmedEmotion> = {
  status: 'confirmed',
  // @ts-expect-error confirmed 상태에는 최소 한 개의 확정 항목이 필요하다.
  items: [],
};

const invalidEmotionWithoutIntensity: ConfirmedEmotion = {
  id: 'emotion-calm',
  kind: 'emotion',
  label: '차분한',
  source: 'catalog',
  // @ts-expect-error 최종 확정 감정에는 강도가 필요하다.
  intensity: undefined,
};

void invalidEmptyConfirmation;
void invalidEmotionWithoutIntensity;

const invalidUnknownRepresentative: EmotionConfirmation = {
  status: 'unknown',
  // @ts-expect-error unknown 상태에는 대표 감정을 함께 저장할 수 없다.
  representativeEmotionId: 'emotion-calm',
};

const invalidConfirmedWithoutRepresentative: EmotionConfirmation = {
  status: 'confirmed',
  items: [
    {
      id: 'emotion-calm',
      kind: 'emotion',
      label: '차분한',
      source: 'catalog',
      intensity: 3,
    },
  ],
  // @ts-expect-error confirmed 상태에는 대표 감정 ID가 필요하다.
  representativeEmotionId: undefined,
};

void invalidUnknownRepresentative;
void invalidConfirmedWithoutRepresentative;
