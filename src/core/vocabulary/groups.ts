import type { EmotionGroupId, NeedGroupId } from '../contracts/emotion-vocabulary';

interface VocabularyGroupBase<TKind extends 'emotion' | 'need', TId extends EmotionGroupId | NeedGroupId> {
  id: TId;
  kind: TKind;
  label: string;
}

export type VocabularyGroup =
  | VocabularyGroupBase<'emotion', EmotionGroupId>
  | VocabularyGroupBase<'need', NeedGroupId>;

export const VOCABULARY_GROUPS = [
  { id: 'joy', kind: 'emotion', label: '기쁨과 즐거움' },
  { id: 'calm', kind: 'emotion', label: '편안함과 평온' },
  { id: 'confidence', kind: 'emotion', label: '자신감과 활력' },
  { id: 'worry', kind: 'emotion', label: '걱정과 불안' },
  { id: 'fear', kind: 'emotion', label: '두려움' },
  { id: 'tension', kind: 'emotion', label: '긴장과 불편함' },
  { id: 'sadness', kind: 'emotion', label: '슬픔과 서운함' },
  { id: 'loneliness', kind: 'emotion', label: '외로움' },
  { id: 'fatigue', kind: 'emotion', label: '피로와 무기력' },
  { id: 'confusion', kind: 'emotion', label: '혼란과 당황' },
  { id: 'anger', kind: 'emotion', label: '화와 억울함' },
  { id: 'autonomy', kind: 'need', label: '자율성' },
  { id: 'physical-wellbeing', kind: 'need', label: '신체적 안녕과 생존' },
  { id: 'connection', kind: 'need', label: '연결과 상호의존' },
  { id: 'play', kind: 'need', label: '놀이와 재미' },
  { id: 'meaning', kind: 'need', label: '삶의 의미' },
  { id: 'integrity', kind: 'need', label: '진실성과 자기존중' },
  { id: 'peace', kind: 'need', label: '아름다움과 평화' },
  { id: 'growth', kind: 'need', label: '자기구현과 성장' },
] satisfies readonly VocabularyGroup[];
