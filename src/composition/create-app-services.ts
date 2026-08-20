import { SelfExplorationService } from '../application/exploration/self-exploration-service';
import type { EmotionNeedVocabulary } from '../core/contracts/emotion-vocabulary';
import { InMemoryEmotionNeedVocabulary } from '../core/vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '../core/vocabulary/seed';
import { DeterministicEmotionExplorer } from '../infrastructure/exploration/deterministic-emotion-explorer';

export interface AppServices {
  vocabulary: EmotionNeedVocabulary;
  selfExploration: SelfExplorationService;
}

export function createAppServices(): AppServices {
  const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
  const explorer = new DeterministicEmotionExplorer(vocabulary);

  return {
    vocabulary,
    selfExploration: new SelfExplorationService(explorer),
  };
}
