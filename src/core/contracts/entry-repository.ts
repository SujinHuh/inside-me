import type { DateKey, MonthKey } from './date';
import type { DailyEntry, EntryDraft } from './entry';

export type EntryRepositoryErrorCode =
  | 'invalid-entry'
  | 'invalid-date'
  | 'storage-unavailable'
  | 'corrupt-data'
  | 'migration-failed'
  | 'unknown';

export interface EntryRepositoryError {
  code: EntryRepositoryErrorCode;
  safeMessage: string;
}

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EntryRepositoryError };

export interface SaveEntryResult {
  operation: 'created' | 'updated';
  entry: DailyEntry;
}

export interface EntryRepository {
  getByDate(dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>>;
  listByMonth(monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>>;
  listAll(): Promise<RepositoryResult<readonly DailyEntry[]>>;
  save(draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>>;
  deleteByDate(dateKey: DateKey): Promise<RepositoryResult<boolean>>;
}
