import type { Confirmation, ConfirmedEmotion } from './entry';

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
