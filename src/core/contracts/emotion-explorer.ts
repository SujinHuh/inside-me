import type { ExplorerSuggestion } from './entry';
import type { EmotionChoice, NeedChoice } from './emotion-vocabulary';

export interface EmotionExplorerRequest {
  story: string;
  userSelected: {
    emotions: readonly EmotionChoice[];
    needs: readonly NeedChoice[];
  };
}

export interface EmotionExplorerResponse {
  emotions: readonly ExplorerSuggestion<EmotionChoice>[];
  needs: readonly ExplorerSuggestion<NeedChoice>[];
}

export type EmotionExplorerResult =
  | { ok: true; value: EmotionExplorerResponse }
  | { ok: false; error: { code: 'cancelled' | 'unavailable' | 'invalid-response'; safeMessage: string } };

export interface EmotionExplorer {
  suggest(request: EmotionExplorerRequest): Promise<EmotionExplorerResult>;
}
