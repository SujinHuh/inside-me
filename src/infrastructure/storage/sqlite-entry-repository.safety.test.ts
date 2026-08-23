import type { DailyEntry, DateKey, EntryDraft } from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';
import { FixedClock } from '@/src/testing/fakes/fixed-clock';
import {
  createDraft,
  expectOk,
  selectedEmotion,
} from '@/src/testing/fixtures/entry-fixtures';

import { SQLiteEntryRepository } from './sqlite-entry-repository';
import { FakeEntrySQLiteDatabase } from './testing/fake-entry-sqlite-database';

const dateKeyPolicy = new LocalDateKeyPolicy();

function uniqueDatabaseName(): string {
  return `inside-me-test-safety-${Date.now()}-${Math.random()}.db`;
}

function repository(database: FakeEntrySQLiteDatabase): SQLiteEntryRepository {
  let sequence = 0;
  return new SQLiteEntryRepository(
    database,
    new FixedClock(new Date('2026-08-23T03:00:00.000Z')),
    () => `sqlite-safety-entry-${++sequence}`,
    dateKeyPolicy,
  );
}

describe('SQLiteEntryRepository 실패와 데이터 보존', () => {
  let database: FakeEntrySQLiteDatabase;

  beforeEach(() => {
    database = FakeEntrySQLiteDatabase.create(uniqueDatabaseName());
  });

  afterEach(async () => {
    await database.deleteDatabaseAsync();
  });

  it('잘못된 대표 감정과 중복 ID를 거부하고 기존 기록을 보존한다', async () => {
    const entries = repository(database);
    const original = createDraft('2026-08-23');
    await entries.save(original);

    const invalidRepresentative = createDraft('2026-08-23');
    invalidRepresentative.exploration.finalConfirmed.emotions = {
      status: 'confirmed',
      items: [{ ...selectedEmotion, intensity: 3 }],
      representativeEmotionId: 'emotion-not-confirmed',
    };
    const duplicate = createDraft('2026-08-23');
    duplicate.exploration.finalConfirmed.emotions = {
      status: 'confirmed',
      items: [
        { ...selectedEmotion, intensity: 2 },
        { ...selectedEmotion, label: '중복 합성 감정', intensity: 5 },
      ],
      representativeEmotionId: selectedEmotion.id,
    };

    for (const draft of [invalidRepresentative, duplicate]) {
      expect(await entries.save(draft)).toMatchObject({
        ok: false,
        error: { code: 'invalid-entry' },
      });
    }
    expect(expectOk(await entries.getByDate(original.dateKey))?.story).toBe(original.story);
  });

  it('알 수 없는 추가 필드를 제거하고 허용된 구조만 저장한다', async () => {
    const entries = repository(database);
    const unsafe = {
      ...createDraft('2026-08-23'),
      rawTranscript: '저장하면 안 되는 합성 필드',
      exploration: {
        ...createDraft('2026-08-23').exploration,
        extraInference: '저장하면 안 되는 합성 추론',
      },
    } as unknown as EntryDraft;

    const stored = expectOk(await entries.save(unsafe)).entry as DailyEntry & {
      rawTranscript?: string;
      exploration: DailyEntry['exploration'] & { extraInference?: string };
    };

    expect(stored.rawTranscript).toBeUndefined();
    expect(stored.exploration.extraInference).toBeUndefined();
    expect(JSON.stringify(expectOk(await entries.listAll()))).not.toContain('rawTranscript');
  });

  it('transaction 저장 실패 시 기존 합성 기록을 롤백한다', async () => {
    const entries = repository(database);
    const original = createDraft('2026-08-23');
    await entries.save(original);
    database.failNextWrite();

    expect(
      await entries.save({ ...original, story: '저장되면 안 되는 수정' }),
    ).toMatchObject({ ok: false, error: { code: 'storage-unavailable' } });

    expect(expectOk(await entries.getByDate(original.dateKey))?.story).toBe(original.story);
  });

  it('삭제 실패 시 기존 합성 기록을 보존한다', async () => {
    const entries = repository(database);
    const original = createDraft('2026-08-23');
    await entries.save(original);
    database.failNextDelete();

    expect(await entries.deleteByDate(original.dateKey)).toMatchObject({
      ok: false,
      error: { code: 'storage-unavailable' },
    });
    expect(expectOk(await entries.getByDate(original.dateKey))?.story).toBe(original.story);
  });

  it('손상된 row는 내용을 노출하지 않고 corrupt-data로 구분한다', async () => {
    const entries = repository(database);
    const draft = createDraft('2026-08-23');
    await entries.save(draft);
    database.corruptEntryJson(draft.dateKey, '{"story":"손상된 합성 기록"');

    expect(await entries.getByDate(draft.dateKey)).toEqual({
      ok: false,
      error: {
        code: 'corrupt-data',
        safeMessage: '저장된 기록을 안전하게 읽을 수 없습니다.',
      },
    });
    expect(JSON.stringify(await entries.getByDate(draft.dateKey))).not.toContain('손상된 합성 기록');
  });

  it('migration 실패와 잘못된 날짜를 구분한다', async () => {
    database.failMigration();
    expect(await repository(database).listAll()).toEqual({
      ok: false,
      error: {
        code: 'migration-failed',
        safeMessage: '기록 저장소를 준비할 수 없습니다.',
      },
    });

    const separate = FakeEntrySQLiteDatabase.create(uniqueDatabaseName());
    const invalidDate = '2026-99-99' as DateKey;
    expect(await repository(separate).getByDate(invalidDate)).toMatchObject({
      ok: false,
      error: { code: 'invalid-date' },
    });
    await separate.deleteDatabaseAsync();
  });
});
