export type SQLiteBindValue = string | number | null | Uint8Array;
export type SQLiteBindParams = SQLiteBindValue[];

export interface SQLiteRunResult {
  lastInsertRowId: number;
  changes: number;
}

/** expo-sqlite SQLiteDatabase에서 기록 저장에 필요한 최소 표면만 노출한다. */
export interface EntrySQLiteDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
  getFirstAsync<T>(source: string, params: SQLiteBindParams): Promise<T | null>;
  getAllAsync<T>(source: string, params: SQLiteBindParams): Promise<T[]>;
  withExclusiveTransactionAsync(
    task: (transaction: EntrySQLiteDatabase) => Promise<void>,
  ): Promise<void>;
}
