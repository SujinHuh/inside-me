import {
  ENTRY_SCHEMA_VERSION,
  type Clock,
  type DailyEntry,
  type DateKey,
  type DateKeyPolicy,
  type EntryDraft,
  type EntryRepository,
  type EntryRepositoryError,
  type MonthKey,
  type RepositoryResult,
  type SaveEntryResult,
} from '@/src/core/contracts';
import {
  parseDailyEntry,
  parseEntryDraft,
  type EntryParseError,
} from '@/src/core/entries/parse-entry';

import {
  DAILY_ENTRIES_TABLE,
  EntryDatabaseMigrationError,
  migrateEntryDatabase,
} from './entry-database-schema';
import type { EntrySQLiteDatabase } from './entry-sqlite-database';

type IdFactory = () => string;

interface StoredEntryRow {
  date_key: unknown;
  schema_version: unknown;
  entry_id: unknown;
  created_at: unknown;
  updated_at: unknown;
  entry_json: unknown;
}

class CorruptStoredEntryError extends Error {}
class InvalidGeneratedEntryError extends Error {}

const SELECT_COLUMNS = `
date_key, schema_version, entry_id, created_at, updated_at, entry_json
`;

function repositoryError(
  code: EntryRepositoryError['code'],
  safeMessage: string,
): RepositoryResult<never> {
  return { ok: false, error: { code, safeMessage } };
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

function laterTimestamp(now: string, createdAt: string): string {
  return now < createdAt ? createdAt : now;
}

export class SQLiteEntryRepository implements EntryRepository {
  private initialization: Promise<void> | null = null;

  constructor(
    private readonly database: EntrySQLiteDatabase,
    private readonly clock: Clock,
    private readonly createId: IdFactory,
    private readonly dateKeyPolicy: DateKeyPolicy,
  ) {}

  async getByDate(dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>> {
    if (!this.dateKeyPolicy.isDateKey(dateKey)) return this.invalidDate();

    try {
      await this.ensureInitialized();
      const row = await this.database.getFirstAsync<StoredEntryRow>(
        `SELECT ${SELECT_COLUMNS} FROM ${DAILY_ENTRIES_TABLE} WHERE date_key = ?;`,
        [dateKey],
      );
      return { ok: true, value: row ? this.parseStoredRow(row) : null };
    } catch (error) {
      return this.readError(error);
    }
  }

  async listByMonth(monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>> {
    if (!this.dateKeyPolicy.isMonthKey(monthKey)) return this.invalidDate();

    try {
      await this.ensureInitialized();
      const rows = await this.database.getAllAsync<StoredEntryRow>(
        `SELECT ${SELECT_COLUMNS} FROM ${DAILY_ENTRIES_TABLE}
         WHERE date_key LIKE ? ORDER BY date_key ASC;`,
        [`${monthKey}-%`],
      );
      return { ok: true, value: rows.map((row) => this.parseStoredRow(row)) };
    } catch (error) {
      return this.readError(error);
    }
  }

  async listAll(): Promise<RepositoryResult<readonly DailyEntry[]>> {
    try {
      await this.ensureInitialized();
      const rows = await this.database.getAllAsync<StoredEntryRow>(
        `SELECT ${SELECT_COLUMNS} FROM ${DAILY_ENTRIES_TABLE} ORDER BY date_key ASC;`,
        [],
      );
      return { ok: true, value: rows.map((row) => this.parseStoredRow(row)) };
    } catch (error) {
      return this.readError(error);
    }
  }

  async save(draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>> {
    const parsedDraft = parseEntryDraft(draft, this.dateKeyPolicy);
    if (!parsedDraft.ok) {
      if (parsedDraft.error === 'invalid-date') return this.invalidDate();
      return repositoryError('invalid-entry', invalidEntryMessage(parsedDraft.error));
    }

    try {
      await this.ensureInitialized();
      let result: SaveEntryResult | undefined;
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        const existingRow = await transaction.getFirstAsync<StoredEntryRow>(
          `SELECT ${SELECT_COLUMNS} FROM ${DAILY_ENTRIES_TABLE} WHERE date_key = ?;`,
          [parsedDraft.value.dateKey],
        );
        const existing = existingRow ? this.parseStoredRow(existingRow) : null;
        const now = this.clock.now().toISOString();
        const entry: DailyEntry = {
          ...parsedDraft.value,
          schemaVersion: ENTRY_SCHEMA_VERSION,
          id: existing?.id ?? this.createId(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: existing ? laterTimestamp(now, existing.createdAt) : now,
        };
        const parsedEntry = parseDailyEntry(entry, this.dateKeyPolicy);
        if (!parsedEntry.ok) throw new InvalidGeneratedEntryError();

        const safeEntry = parsedEntry.value;
        await transaction.runAsync(
          `INSERT INTO ${DAILY_ENTRIES_TABLE}
             (date_key, schema_version, entry_id, created_at, updated_at, entry_json)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(date_key) DO UPDATE SET
             schema_version = excluded.schema_version,
             entry_id = excluded.entry_id,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             entry_json = excluded.entry_json;`,
          [
            safeEntry.dateKey,
            safeEntry.schemaVersion,
            safeEntry.id,
            safeEntry.createdAt,
            safeEntry.updatedAt,
            JSON.stringify(safeEntry),
          ],
        );
        result = {
          operation: existing ? 'updated' : 'created',
          entry: safeEntry,
        };
      });
      if (!result) return repositoryError('unknown', '기록을 저장할 수 없습니다.');
      return { ok: true, value: result };
    } catch (error) {
      if (error instanceof EntryDatabaseMigrationError) return this.migrationError();
      if (error instanceof CorruptStoredEntryError) {
        return repositoryError('corrupt-data', '저장된 기록을 안전하게 읽을 수 없습니다.');
      }
      if (error instanceof InvalidGeneratedEntryError) {
        return repositoryError('unknown', '기록을 저장할 수 없습니다.');
      }
      return repositoryError('storage-unavailable', '기록을 저장할 수 없습니다.');
    }
  }

  async deleteByDate(dateKey: DateKey): Promise<RepositoryResult<boolean>> {
    if (!this.dateKeyPolicy.isDateKey(dateKey)) return this.invalidDate();

    try {
      await this.ensureInitialized();
      let deleted = false;
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        const result = await transaction.runAsync(
          `DELETE FROM ${DAILY_ENTRIES_TABLE} WHERE date_key = ?;`,
          [dateKey],
        );
        deleted = result.changes > 0;
      });
      return { ok: true, value: deleted };
    } catch (error) {
      if (error instanceof EntryDatabaseMigrationError) return this.migrationError();
      return repositoryError('storage-unavailable', '기록을 삭제할 수 없습니다.');
    }
  }

  private ensureInitialized(): Promise<void> {
    this.initialization ??= migrateEntryDatabase(this.database);
    return this.initialization;
  }

  private parseStoredRow(row: StoredEntryRow): DailyEntry {
    if (
      typeof row.entry_json !== 'string' ||
      typeof row.date_key !== 'string' ||
      typeof row.schema_version !== 'number' ||
      typeof row.entry_id !== 'string' ||
      typeof row.created_at !== 'string' ||
      typeof row.updated_at !== 'string'
    ) {
      throw new CorruptStoredEntryError();
    }

    let rawEntry: unknown;
    try {
      rawEntry = JSON.parse(row.entry_json);
    } catch {
      throw new CorruptStoredEntryError();
    }
    const parsed = parseDailyEntry(rawEntry, this.dateKeyPolicy);
    if (
      !parsed.ok ||
      parsed.value.dateKey !== row.date_key ||
      parsed.value.schemaVersion !== row.schema_version ||
      parsed.value.id !== row.entry_id ||
      parsed.value.createdAt !== row.created_at ||
      parsed.value.updatedAt !== row.updated_at
    ) {
      throw new CorruptStoredEntryError();
    }
    return parsed.value;
  }

  private invalidDate<T>(): RepositoryResult<T> {
    return repositoryError('invalid-date', '날짜 형식을 확인해 주세요.');
  }

  private migrationError<T>(): RepositoryResult<T> {
    return repositoryError('migration-failed', '기록 저장소를 준비할 수 없습니다.');
  }

  private readError<T>(error: unknown): RepositoryResult<T> {
    if (error instanceof EntryDatabaseMigrationError) return this.migrationError();
    if (error instanceof CorruptStoredEntryError) {
      return repositoryError('corrupt-data', '저장된 기록을 안전하게 읽을 수 없습니다.');
    }
    return repositoryError('storage-unavailable', '저장된 기록을 읽을 수 없습니다.');
  }
}
