import type {
  DailyEntry,
  DateKey,
  EmotionChoice,
  EntryDraft,
  ExplorerSuggestion,
  NeedChoice,
  RepositoryResult,
} from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';
import { FixedClock } from '@/src/testing/fakes/fixed-clock';
import { InMemoryEntryRepository } from '@/src/testing/fakes/in-memory-entry-repository';

export const dateKeyPolicy = new LocalDateKeyPolicy();

export const selectedEmotion: EmotionChoice = {
  id: 'emotion-calm',
  kind: 'emotion',
  label: '차분한',
  source: 'catalog',
};

export const selectedNeed: NeedChoice = {
  id: 'need-rest',
  kind: 'need',
  label: '휴식',
  source: 'catalog',
};

export const aiEmotion: ExplorerSuggestion<EmotionChoice> = {
  choice: {
    id: 'emotion-relieved',
    kind: 'emotion',
    label: '후련한',
    source: 'catalog',
  },
  reason: '사용자에게 보여 줄 합성 근거',
};

export function dateKey(value: string): DateKey {
  const result = dateKeyPolicy.parseDateKey(value);
  if (!result.ok) throw new Error(`Invalid synthetic date: ${value}`);
  return result.value;
}

export function createDraft(value = '2026-08-20'): EntryDraft {
  return {
    dateKey: dateKey(value),
    inputMethod: 'text',
    story: '합성 테스트 이야기',
    exploration: {
      userExpressed: ['마음이 복잡해요'],
      userSelected: { emotions: [selectedEmotion], needs: [selectedNeed] },
      aiSuggested: { emotions: [aiEmotion], needs: [] },
      finalConfirmed: {
        emotions: { status: 'unknown' },
        needs: { status: 'confirmed', items: [selectedNeed] },
      },
    },
  };
}

function sequenceIdFactory(): () => string {
  let sequence = 0;
  return () => `entry-${++sequence}`;
}

export function createRepository(seed: readonly DailyEntry[] = []): InMemoryEntryRepository {
  return new InMemoryEntryRepository(
    new FixedClock(new Date('2026-08-20T12:00:00.000Z')),
    sequenceIdFactory(),
    dateKeyPolicy,
    seed,
  );
}

export function expectOk<T>(result: RepositoryResult<T>): T {
  if (!result.ok) throw new Error(`Expected repository success, received ${result.error.code}`);
  return result.value;
}
