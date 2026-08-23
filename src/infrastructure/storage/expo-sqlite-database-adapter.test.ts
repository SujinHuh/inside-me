import type { SQLiteDatabase } from 'expo-sqlite';

import { ExpoSQLiteDatabaseAdapter } from './expo-sqlite-database-adapter';

function sqliteMock() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue({ value: 'first' }),
    getAllAsync: jest.fn().mockResolvedValue([{ value: 'all' }]),
    withExclusiveTransactionAsync: jest.fn(),
  };
}

describe('ExpoSQLiteDatabaseAdapter', () => {
  it('parameter binding 호출을 expo-sqlite에 그대로 위임한다', async () => {
    const sqlite = sqliteMock();
    const adapter = new ExpoSQLiteDatabaseAdapter(sqlite as unknown as SQLiteDatabase);

    await adapter.execAsync('PRAGMA foreign_keys = ON;');
    await adapter.runAsync('DELETE FROM daily_entries WHERE date_key = ?;', ['2026-08-23']);
    await adapter.getFirstAsync('SELECT entry_json FROM daily_entries WHERE date_key = ?;', [
      '2026-08-23',
    ]);
    await adapter.getAllAsync('SELECT entry_json FROM daily_entries;', []);

    expect(sqlite.execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
    expect(sqlite.runAsync).toHaveBeenCalledWith(
      'DELETE FROM daily_entries WHERE date_key = ?;',
      ['2026-08-23'],
    );
    expect(sqlite.getFirstAsync).toHaveBeenCalledTimes(1);
    expect(sqlite.getAllAsync).toHaveBeenCalledTimes(1);
  });

  it('exclusive transaction의 transaction 객체도 제한된 adapter로 전달한다', async () => {
    const sqlite = sqliteMock();
    const transaction = sqliteMock();
    sqlite.withExclusiveTransactionAsync.mockImplementation(
      async (task: (database: SQLiteDatabase) => Promise<void>) => {
        await task(transaction as unknown as SQLiteDatabase);
      },
    );
    const adapter = new ExpoSQLiteDatabaseAdapter(sqlite as unknown as SQLiteDatabase);

    await adapter.withExclusiveTransactionAsync(async (database) => {
      await database.runAsync('DELETE FROM daily_entries WHERE date_key = ?;', ['2026-08-23']);
    });

    expect(transaction.runAsync).toHaveBeenCalledWith(
      'DELETE FROM daily_entries WHERE date_key = ?;',
      ['2026-08-23'],
    );
  });
});
