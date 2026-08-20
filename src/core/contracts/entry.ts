import type { DateKey } from './date';
import type { EmotionChoice, NeedChoice, VocabularyChoice } from './emotion-vocabulary';

export const ENTRY_SCHEMA_VERSION = 1 as const;

export type EntryInputMethod = 'text' | 'voice' | 'ai-turn';
export type EmotionIntensity = 1 | 2 | 3 | 4 | 5;

export interface ConfirmedEmotion extends EmotionChoice {
  intensity: EmotionIntensity;
}

export interface ExplorerSuggestion<TChoice extends VocabularyChoice = VocabularyChoice> {
  choice: TChoice;
  reason: string;
}

export type Confirmation<TItem> =
  | { status: 'confirmed'; items: readonly [TItem, ...TItem[]] }
  | { status: 'unknown' };

export interface EntryExploration {
  userExpressed: readonly string[];
  userSelected: {
    emotions: readonly EmotionChoice[];
    needs: readonly NeedChoice[];
  };
  aiSuggested: {
    emotions: readonly ExplorerSuggestion<EmotionChoice>[];
    needs: readonly ExplorerSuggestion<NeedChoice>[];
  };
  finalConfirmed: {
    emotions: Confirmation<ConfirmedEmotion>;
    needs: Confirmation<NeedChoice>;
  };
}

export interface EntryDraft {
  dateKey: DateKey;
  inputMethod: EntryInputMethod;
  story: string;
  exploration: EntryExploration;
  summary?: string;
  nextAction?: string;
}

export interface DailyEntry extends EntryDraft {
  schemaVersion: typeof ENTRY_SCHEMA_VERSION;
  id: string;
  createdAt: string;
  updatedAt: string;
}
