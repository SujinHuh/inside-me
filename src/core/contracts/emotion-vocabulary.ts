export type VocabularyKind = 'emotion' | 'need';
export type VocabularySource = 'user-reference' | 'curated';
export type ExplorationTag = 'comfortable' | 'uncomfortable' | 'energized' | 'calm';

export interface VocabularyItem {
  id: string;
  kind: VocabularyKind;
  label: string;
  groups: readonly string[];
  searchTerms: readonly string[];
  source: VocabularySource;
  explorationTags: readonly ExplorationTag[];
}

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

export interface VocabularyQuery {
  kind: VocabularyKind;
  text?: string;
  group?: string;
  explorationTag?: ExplorationTag;
}

export interface EmotionNeedVocabulary {
  search(query: VocabularyQuery): readonly VocabularyItem[];
  findById(id: string): VocabularyItem | null;
}
