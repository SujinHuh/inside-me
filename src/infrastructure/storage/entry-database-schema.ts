import { prepareLocalDatabase } from './local-database';
import type { EntrySQLiteDatabase } from './entry-sqlite-database';

export const ENTRY_DATABASE_SCHEMA_VERSION = 1 as const;
export const DAILY_ENTRIES_TABLE = 'daily_entries';

interface UserVersionRow {
  user_version: number;
}

export class EntryDatabaseMigrationError extends Error {
  constructor() {
    super('기록 저장소를 준비할 수 없습니다.');
    this.name = 'EntryDatabaseMigrationError';
  }
}

const CREATE_SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS ${DAILY_ENTRIES_TABLE} (
  date_key TEXT PRIMARY KEY NOT NULL,
  schema_version INTEGER NOT NULL,
  entry_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  entry_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_entries_updated_at_idx
  ON ${DAILY_ENTRIES_TABLE}(updated_at);
PRAGMA user_version = ${ENTRY_DATABASE_SCHEMA_VERSION};
`;

export async function migrateEntryDatabase(database: EntrySQLiteDatabase): Promise<void> {
  try {
    await prepareLocalDatabase(database);
    const row = await database.getFirstAsync<UserVersionRow>('PRAGMA user_version;', []);
    const version = row?.user_version;
    if (!Number.isInteger(version) || version === undefined || version < 0) {
      throw new EntryDatabaseMigrationError();
    }
    if (version > ENTRY_DATABASE_SCHEMA_VERSION) {
      throw new EntryDatabaseMigrationError();
    }
    if (version === ENTRY_DATABASE_SCHEMA_VERSION) return;

    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(CREATE_SCHEMA_V1);
    });
  } catch (error) {
    if (error instanceof EntryDatabaseMigrationError) throw error;
    throw new EntryDatabaseMigrationError();
  }
}
