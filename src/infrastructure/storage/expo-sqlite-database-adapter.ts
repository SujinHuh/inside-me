import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  EntrySQLiteDatabase,
  SQLiteBindParams,
  SQLiteRunResult,
} from './entry-sqlite-database';

/** expo-sqlite의 넓은 API를 기록 repository에 필요한 호출로만 제한한다. */
export class ExpoSQLiteDatabaseAdapter implements EntrySQLiteDatabase {
  constructor(private readonly database: SQLiteDatabase) {}

  execAsync(source: string): Promise<void> {
    return this.database.execAsync(source);
  }

  runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult> {
    return this.database.runAsync(source, params);
  }

  getFirstAsync<T>(source: string, params: SQLiteBindParams): Promise<T | null> {
    return this.database.getFirstAsync<T>(source, params);
  }

  getAllAsync<T>(source: string, params: SQLiteBindParams): Promise<T[]> {
    return this.database.getAllAsync<T>(source, params);
  }

  withExclusiveTransactionAsync(
    task: (transaction: EntrySQLiteDatabase) => Promise<void>,
  ): Promise<void> {
    return this.database.withExclusiveTransactionAsync(async (transaction) => {
      await task(new ExpoSQLiteDatabaseAdapter(transaction));
    });
  }
}
