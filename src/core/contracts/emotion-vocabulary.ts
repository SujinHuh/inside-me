export type VocabularyKind = 'emotion' | 'need';
export type VocabularySource = 'user-reference' | 'curated';
export type ExplorationTag = 'comfortable' | 'uncomfortable' | 'energized' | 'calm';

export type EmotionGroupId =
  | 'joy'
  | 'calm'
  | 'confidence'
  | 'worry'
  | 'fear'
  | 'tension'
  | 'sadness'
  | 'loneliness'
  | 'fatigue'
  | 'confusion'
  | 'anger';

export type NeedGroupId =
  | 'autonomy'
  | 'physical-wellbeing'
  | 'connection'
  | 'play'
  | 'meaning'
  | 'integrity'
  | 'peace'
  | 'growth';

export type VocabularyGroupId = EmotionGroupId | NeedGroupId;

interface VocabularyItemBase<TKind extends VocabularyKind, TGroup extends VocabularyGroupId> {
  id: string;
  kind: TKind;
  label: string;
  groups: readonly [TGroup, ...TGroup[]];
  searchTerms: readonly string[];
  source: VocabularySource;
  explorationTags: readonly ExplorationTag[];
}

export type EmotionVocabularyItem = VocabularyItemBase<'emotion', EmotionGroupId>;
export type NeedVocabularyItem = VocabularyItemBase<'need', NeedGroupId>;
export type VocabularyItem = EmotionVocabularyItem | NeedVocabularyItem;

interface VocabularyChoiceBase {
  id: string;
  label: string;
  source: 'catalog' | 'user-added';
}

export interface EmotionChoice extends VocabularyChoiceBase {
  kind: 'emotion';
}

export interface NeedChoice extends VocabularyChoiceBase {
  kind: 'need';
}

export type VocabularyChoice = EmotionChoice | NeedChoice;

interface VocabularyQueryBase<TKind extends VocabularyKind, TGroup extends VocabularyGroupId> {
  kind: TKind;
  text?: string;
  group?: TGroup;
  explorationTag?: ExplorationTag;
}

export type VocabularyQuery =
  | VocabularyQueryBase<'emotion', EmotionGroupId>
  | VocabularyQueryBase<'need', NeedGroupId>;

export interface EmotionNeedVocabulary {
  search(query: VocabularyQuery): readonly VocabularyItem[];
  findById(id: string): VocabularyItem | null;
}
