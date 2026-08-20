export const LOCAL_DATABASE_NAME = 'inside-me.db';

export interface LocalDatabaseConnection {
  execAsync(source: string): Promise<void>;
}

export async function prepareLocalDatabase(database: LocalDatabaseConnection): Promise<void> {
  await database.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
`);
}
