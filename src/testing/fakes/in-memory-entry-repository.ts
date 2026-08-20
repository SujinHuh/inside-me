import {
  ENTRY_SCHEMA_VERSION,
  type Clock,
  type DailyEntry,
  type DateKey,
  type DateKeyPolicy,
  type EntryDraft,
  type EntryRepository,
  type MonthKey,
  type RepositoryResult,
  type SaveEntryResult,
} from '@/src/core/contracts';
import { validateEntryDraft } from '@/src/core/entries/validate-entry-draft';

type IdFactory = () => string;

function cloneEntry(entry: DailyEntry): DailyEntry {
  return JSON.parse(JSON.stringify(entry)) as DailyEntry;
}

export class InMemoryEntryRepository implements EntryRepository {
  private readonly entriesByDate = new Map<DateKey, DailyEntry>();

  constructor(
    private readonly clock: Clock,
    private readonly createId: IdFactory,
    private readonly dateKeyPolicy: DateKeyPolicy,
    seed: readonly DailyEntry[] = [],
  ) {
    seed.forEach((entry) => {
      if (!this.dateKeyPolicy.isDateKey(entry.dateKey)) {
        throw new Error('Invalid synthetic seed date');
      }
      this.entriesByDate.set(entry.dateKey, cloneEntry(entry));
    });
  }

  async getByDate(dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>> {
    if (!this.dateKeyPolicy.isDateKey(dateKey)) {
      return this.invalidDate();
    }
    const entry = this.entriesByDate.get(dateKey);
    return { ok: true, value: entry ? cloneEntry(entry) : null };
  }

  async listByMonth(monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>> {
    if (!this.dateKeyPolicy.isMonthKey(monthKey)) {
      return this.invalidDate();
    }
    const entries = [...this.entriesByDate.values()]
      .filter((entry) => entry.dateKey.startsWith(`${monthKey}-`))
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
      .map(cloneEntry);

    return { ok: true, value: entries };
  }

  async listAll(): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return {
      ok: true,
      value: [...this.entriesByDate.values()]
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
        .map(cloneEntry),
    };
  }

  async save(draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>> {
    const validationError = validateEntryDraft(draft);
    if (validationError) {
      return {
        ok: false,
        error: {
          code: 'invalid-entry',
          safeMessage:
            validationError === 'empty-story'
              ? '이야기를 입력해 주세요.'
              : '감정과 욕구 확인 상태를 확인해 주세요.',
        },
      };
    }
    if (!this.dateKeyPolicy.isDateKey(draft.dateKey)) {
      return this.invalidDate();
    }

    const existing = this.entriesByDate.get(draft.dateKey);
    const now = this.clock.now().toISOString();
    const entry: DailyEntry = {
      ...draft,
      schemaVersion: ENTRY_SCHEMA_VERSION,
      id: existing?.id ?? this.createId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.entriesByDate.set(draft.dateKey, cloneEntry(entry));
    return {
      ok: true,
      value: {
        operation: existing ? 'updated' : 'created',
        entry: cloneEntry(entry),
      },
    };
  }

  async deleteByDate(dateKey: DateKey): Promise<RepositoryResult<boolean>> {
    if (!this.dateKeyPolicy.isDateKey(dateKey)) {
      return this.invalidDate();
    }
    return { ok: true, value: this.entriesByDate.delete(dateKey) };
  }

  private invalidDate<T>(): RepositoryResult<T> {
    return {
      ok: false,
      error: { code: 'invalid-date', safeMessage: '날짜 형식을 확인해 주세요.' },
    };
  }
}
