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
import {
  parseDailyEntry,
  parseEntryDraft,
  type EntryParseError,
} from '@/src/core/entries/parse-entry';

type IdFactory = () => string;

function cloneEntry(entry: DailyEntry, dateKeyPolicy: DateKeyPolicy): DailyEntry {
  const parsed = parseDailyEntry(entry, dateKeyPolicy);
  if (!parsed.ok) throw new Error('Invalid in-memory entry state');
  return parsed.value;
}

function invalidEntryMessage(error: EntryParseError): string {
  switch (error) {
    case 'empty-story':
      return '이야기를 입력해 주세요.';
    case 'invalid-date':
      return '날짜 형식을 확인해 주세요.';
    case 'invalid-input-method':
    case 'invalid-structure':
    case 'invalid-exploration':
    case 'invalid-confirmation':
      return '기록 내용을 다시 확인해 주세요.';
  }
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
      const parsed = parseDailyEntry(entry, this.dateKeyPolicy);
      if (!parsed.ok) {
        throw new Error('Invalid synthetic seed entry');
      }
      this.entriesByDate.set(parsed.value.dateKey, cloneEntry(parsed.value, this.dateKeyPolicy));
    });
  }

  async getByDate(dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>> {
    if (!this.dateKeyPolicy.isDateKey(dateKey)) {
      return this.invalidDate();
    }
    const entry = this.entriesByDate.get(dateKey);
    return { ok: true, value: entry ? cloneEntry(entry, this.dateKeyPolicy) : null };
  }

  async listByMonth(monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>> {
    if (!this.dateKeyPolicy.isMonthKey(monthKey)) {
      return this.invalidDate();
    }
    const entries = [...this.entriesByDate.values()]
      .filter((entry) => entry.dateKey.startsWith(`${monthKey}-`))
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
      .map((entry) => cloneEntry(entry, this.dateKeyPolicy));

    return { ok: true, value: entries };
  }

  async listAll(): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return {
      ok: true,
      value: [...this.entriesByDate.values()]
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
        .map((entry) => cloneEntry(entry, this.dateKeyPolicy)),
    };
  }

  async save(draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>> {
    const parsed = parseEntryDraft(draft, this.dateKeyPolicy);
    if (!parsed.ok) {
      if (parsed.error === 'invalid-date') return this.invalidDate();
      return {
        ok: false,
        error: {
          code: 'invalid-entry',
          safeMessage: invalidEntryMessage(parsed.error),
        },
      };
    }

    const normalizedDraft = parsed.value;
    const existing = this.entriesByDate.get(normalizedDraft.dateKey);
    const now = this.clock.now().toISOString();
    const entry: DailyEntry = {
      ...normalizedDraft,
      schemaVersion: ENTRY_SCHEMA_VERSION,
      id: existing?.id ?? this.createId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.entriesByDate.set(normalizedDraft.dateKey, cloneEntry(entry, this.dateKeyPolicy));
    return {
      ok: true,
      value: {
        operation: existing ? 'updated' : 'created',
        entry: cloneEntry(entry, this.dateKeyPolicy),
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
