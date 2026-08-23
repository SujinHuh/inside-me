import { LOCAL_DATABASE_NAME } from '../local-database';
import type {
  EntrySQLiteDatabase,
  SQLiteBindParams,
  SQLiteRunResult,
} from '../entry-sqlite-database';

interface FakeStoredRow {
  date_key: string;
  schema_version: number;
  entry_id: string;
  created_at: string;
  updated_at: string;
  entry_json: string;
}

interface FakeDatabaseState {
  userVersion: number;
  rows: Map<string, FakeStoredRow>;
  deleted: boolean;
}

function cloneRows(rows: Map<string, FakeStoredRow>): Map<string, FakeStoredRow> {
  return new Map([...rows].map(([key, row]) => [key, { ...row }]));
}

/**
 * Jest에서 운영 DB를 열지 않고 repository의 SQL 호출과 transaction 보존을 검증하는 격리 대역이다.
 * 실제 expo-sqlite native 실행은 IMP-104·106 통합 게이트에서 확인한다.
 */
export class FakeEntrySQLiteDatabase implements EntrySQLiteDatabase {
  readonly executedSources: string[] = [];
  private failNextWriteFlag = false;
  private failNextDeleteFlag = false;
  private failMigrationFlag = false;

  private constructor(
    readonly databaseName: string,
    private readonly state: FakeDatabaseState,
  ) {
    if (databaseName === LOCAL_DATABASE_NAME || !databaseName.startsWith('inside-me-test-')) {
      throw new Error('Tests must use an isolated synthetic database name');
    }
  }

  static create(databaseName: string): FakeEntrySQLiteDatabase {
    return new FakeEntrySQLiteDatabase(databaseName, {
      userVersion: 0,
      rows: new Map(),
      deleted: false,
    });
  }

  reopen(): FakeEntrySQLiteDatabase {
    this.assertAvailable();
    return new FakeEntrySQLiteDatabase(this.databaseName, this.state);
  }

  async deleteDatabaseAsync(): Promise<void> {
    this.state.rows.clear();
    this.state.deleted = true;
  }

  failNextWrite(): void {
    this.failNextWriteFlag = true;
  }

  failNextDelete(): void {
    this.failNextDeleteFlag = true;
  }

  failMigration(): void {
    this.failMigrationFlag = true;
  }

  setUserVersion(version: number): void {
    this.state.userVersion = version;
  }

  corruptEntryJson(dateKey: string, entryJson: string): void {
    const row = this.state.rows.get(dateKey);
    if (!row) throw new Error('Synthetic row does not exist');
    row.entry_json = entryJson;
  }

  async execAsync(source: string): Promise<void> {
    this.assertAvailable();
    this.executedSources.push(source);
    if (source.includes('CREATE TABLE')) {
      if (this.failMigrationFlag) throw new Error('Synthetic migration failure');
      this.state.userVersion = 1;
    }
  }

  async runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult> {
    this.assertAvailable();
    this.executedSources.push(source);
    if (source.includes('INSERT INTO daily_entries')) {
      if (this.failNextWriteFlag) {
        this.failNextWriteFlag = false;
        throw new Error('Synthetic write failure');
      }
      const [dateKey, schemaVersion, entryId, createdAt, updatedAt, entryJson] = params;
      if (
        typeof dateKey !== 'string' ||
        typeof schemaVersion !== 'number' ||
        typeof entryId !== 'string' ||
        typeof createdAt !== 'string' ||
        typeof updatedAt !== 'string' ||
        typeof entryJson !== 'string'
      ) {
        throw new Error('Synthetic invalid insert parameters');
      }
      this.state.rows.set(dateKey, {
        date_key: dateKey,
        schema_version: schemaVersion,
        entry_id: entryId,
        created_at: createdAt,
        updated_at: updatedAt,
        entry_json: entryJson,
      });
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (source.includes('DELETE FROM daily_entries')) {
      if (this.failNextDeleteFlag) {
        this.failNextDeleteFlag = false;
        throw new Error('Synthetic delete failure');
      }
      const [dateKey] = params;
      if (typeof dateKey !== 'string') throw new Error('Synthetic invalid delete parameters');
      const deleted = this.state.rows.delete(dateKey);
      return { lastInsertRowId: 0, changes: deleted ? 1 : 0 };
    }
    throw new Error('Synthetic unsupported run statement');
  }

  async getFirstAsync<T>(source: string, params: SQLiteBindParams): Promise<T | null> {
    this.assertAvailable();
    this.executedSources.push(source);
    if (source.includes('PRAGMA user_version')) {
      return { user_version: this.state.userVersion } as unknown as T;
    }
    if (source.includes('FROM daily_entries') && source.includes('WHERE date_key = ?')) {
      const [dateKey] = params;
      if (typeof dateKey !== 'string') throw new Error('Synthetic invalid date parameter');
      const row = this.state.rows.get(dateKey);
      return row ? ({ ...row } as unknown as T) : null;
    }
    throw new Error('Synthetic unsupported first query');
  }

  async getAllAsync<T>(source: string, params: SQLiteBindParams): Promise<T[]> {
    this.assertAvailable();
    this.executedSources.push(source);
    let rows = [...this.state.rows.values()];
    if (source.includes('WHERE date_key LIKE ?')) {
      const [pattern] = params;
      if (typeof pattern !== 'string' || !pattern.endsWith('-%')) {
        throw new Error('Synthetic invalid month parameter');
      }
      const prefix = pattern.slice(0, -1);
      rows = rows.filter((row) => row.date_key.startsWith(prefix));
    }
    return rows
      .sort((left, right) => left.date_key.localeCompare(right.date_key))
      .map((row) => ({ ...row }) as unknown as T);
  }

  async withExclusiveTransactionAsync(
    task: (transaction: EntrySQLiteDatabase) => Promise<void>,
  ): Promise<void> {
    this.assertAvailable();
    const previousVersion = this.state.userVersion;
    const previousRows = cloneRows(this.state.rows);
    try {
      await task(this);
    } catch (error) {
      this.state.userVersion = previousVersion;
      this.state.rows = previousRows;
      throw error;
    }
  }

  private assertAvailable(): void {
    if (this.state.deleted) throw new Error('Synthetic database was deleted');
  }
}
