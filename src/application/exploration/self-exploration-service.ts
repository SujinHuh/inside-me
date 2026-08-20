import type {
  EmotionExplorer,
  EmotionExplorerRequest,
  EmotionExplorerResult,
} from '../../core/contracts/emotion-explorer';
import type { EmotionChoice, NeedChoice } from '../../core/contracts/emotion-vocabulary';

export interface SelfExplorationSnapshot {
  userSelected: {
    emotions: readonly EmotionChoice[];
    needs: readonly NeedChoice[];
  };
  aiSuggested: {
    emotions: readonly [];
    needs: readonly [];
  };
}

const cloneEmotion = (choice: EmotionChoice): EmotionChoice => ({ ...choice });
const cloneNeed = (choice: NeedChoice): NeedChoice => ({ ...choice });

export class SelfExplorationService {
  constructor(private readonly explorer: EmotionExplorer) {}

  begin(userSelected: SelfExplorationSnapshot['userSelected']): SelfExplorationSnapshot {
    return {
      userSelected: {
        emotions: userSelected.emotions.map(cloneEmotion),
        needs: userSelected.needs.map(cloneNeed),
      },
      aiSuggested: { emotions: [], needs: [] },
    };
  }

  requestAssistantSuggestions(request: EmotionExplorerRequest): Promise<EmotionExplorerResult> {
    return this.explorer.suggest({
      story: request.story,
      userSelected: {
        emotions: request.userSelected.emotions.map(cloneEmotion),
        needs: request.userSelected.needs.map(cloneNeed),
      },
    });
  }
}
