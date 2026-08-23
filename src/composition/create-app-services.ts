import { SelfExplorationService } from '../application/exploration/self-exploration-service';
import type { DateKeyPolicy, EntryRepository, EntrySerializer } from '../core/contracts';
import type { EmotionNeedVocabulary } from '../core/contracts/emotion-vocabulary';
import { JsonEntrySerializer } from '../core/entries/json-entry-serializer';
import { LocalDateKeyPolicy } from '../core/dates/local-date-key-policy';
import { InMemoryEmotionNeedVocabulary } from '../core/vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '../core/vocabulary/seed';
import { DeterministicEmotionExplorer } from '../infrastructure/exploration/deterministic-emotion-explorer';
import { UnavailableEntryRepository } from '../infrastructure/storage/unavailable-entry-repository';
import type { ExportFilePort } from '../platform/files/export-file-port';
import { UnavailableExportFilePort } from '../platform/files/unavailable-export-file-port';

interface AppServiceDependencies {
  dateKeyPolicy?: DateKeyPolicy;
  entryRepository?: EntryRepository;
  exportFilePort?: ExportFilePort;
  persistentEntriesAvailable?: boolean;
}

export interface AppServices {
  vocabulary: EmotionNeedVocabulary;
  selfExploration: SelfExplorationService;
  entryRepository: EntryRepository;
  entrySerializer: EntrySerializer;
  dateKeyPolicy: DateKeyPolicy;
  exportFilePort: ExportFilePort;
  persistentEntriesAvailable: boolean;
}

export function createAppServices(dependencies: AppServiceDependencies = {}): AppServices {
  const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
  const explorer = new DeterministicEmotionExplorer(vocabulary);
  const dateKeyPolicy = dependencies.dateKeyPolicy ?? new LocalDateKeyPolicy();

  return {
    vocabulary,
    selfExploration: new SelfExplorationService(explorer),
    entryRepository: dependencies.entryRepository ?? new UnavailableEntryRepository(),
    entrySerializer: new JsonEntrySerializer(dateKeyPolicy),
    dateKeyPolicy,
    exportFilePort: dependencies.exportFilePort ?? new UnavailableExportFilePort(),
    persistentEntriesAvailable: dependencies.persistentEntriesAvailable ?? false,
  };
}
