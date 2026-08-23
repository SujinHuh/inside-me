import { ENTRY_DATABASE_SCHEMA_VERSION, migrateEntryDatabase } from './entry-database-schema';
import { LOCAL_DATABASE_NAME } from './local-database';
import { FakeEntrySQLiteDatabase } from './testing/fake-entry-sqlite-database';

function uniqueDatabaseName(): string {
  return `inside-me-test-schema-${Date.now()}-${Math.random()}.db`;
}

describe('entry database schema', () => {
  let database: FakeEntrySQLiteDatabase;

  beforeEach(() => {
    database = FakeEntrySQLiteDatabase.create(uniqueDatabaseName());
  });

  afterEach(async () => {
    await database.deleteDatabaseAsync();
  });

  it('운영 기본 DB와 다른 고유 이름에 v1 schema를 transaction으로 준비한다', async () => {
    expect(database.databaseName).not.toBe(LOCAL_DATABASE_NAME);

    await migrateEntryDatabase(database);
    await migrateEntryDatabase(database);

    expect(database.executedSources.join('\n')).toContain('CREATE TABLE IF NOT EXISTS daily_entries');
    expect(database.executedSources.join('\n')).toContain(
      `PRAGMA user_version = ${ENTRY_DATABASE_SCHEMA_VERSION}`,
    );
    expect(database.executedSources.filter((source) => source.includes('CREATE TABLE'))).toHaveLength(
      1,
    );
  });

  it('지원 버전보다 높거나 migration이 실패하면 안전한 오류로 거부한다', async () => {
    database.setUserVersion(ENTRY_DATABASE_SCHEMA_VERSION + 1);
    await expect(migrateEntryDatabase(database)).rejects.toMatchObject({
      name: 'EntryDatabaseMigrationError',
      message: '기록 저장소를 준비할 수 없습니다.',
    });

    const migrationFailure = FakeEntrySQLiteDatabase.create(uniqueDatabaseName());
    migrationFailure.failMigration();
    await expect(migrateEntryDatabase(migrationFailure)).rejects.toMatchObject({
      name: 'EntryDatabaseMigrationError',
    });
    await migrationFailure.deleteDatabaseAsync();
  });
});
