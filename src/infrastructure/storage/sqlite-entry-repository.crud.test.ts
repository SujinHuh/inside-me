import type { EmotionChoice, ExplorerSuggestion } from '@/src/core/contracts';
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
  return `inside-me-test-crud-${Date.now()}-${Math.random()}.db`;
}

function idFactory(): () => string {
  let sequence = 0;
  return () => `sqlite-entry-${++sequence}`;
}

function repository(database: FakeEntrySQLiteDatabase): SQLiteEntryRepository {
  return new SQLiteEntryRepository(
    database,
    new FixedClock(new Date('2026-08-23T03:00:00.000Z')),
    idFactory(),
    dateKeyPolicy,
  );
}

describe('SQLiteEntryRepository CRUD', () => {
  let database: FakeEntrySQLiteDatabase;

  beforeEach(() => {
    database = FakeEntrySQLiteDatabase.create(uniqueDatabaseName());
  });

  afterEach(async () => {
    await database.deleteDatabaseAsync();
  });

  it('같은 날짜를 중복 생성하지 않고 원자적으로 갱신한다', async () => {
    const entries = repository(database);
    const draft = createDraft('2026-08-23');

    const created = expectOk(await entries.save(draft));
    const updated = expectOk(
      await entries.save({ ...draft, story: '수정한 합성 SQLite 이야기' }),
    );
    const all = expectOk(await entries.listAll());

    expect(created.operation).toBe('created');
    expect(updated.operation).toBe('updated');
    expect(updated.entry.id).toBe(created.entry.id);
    expect(updated.entry.createdAt).toBe(created.entry.createdAt);
    expect(all).toHaveLength(1);
    expect(all[0].story).toBe('수정한 합성 SQLite 이야기');
  });

  it('월·전체 기록을 날짜순으로 조회하고 다른 월을 섞지 않는다', async () => {
    const entries = repository(database);
    await entries.save(createDraft('2026-09-01'));
    await entries.save(createDraft('2026-08-23'));
    await entries.save(createDraft('2026-08-01'));
    const month = dateKeyPolicy.parseMonthKey('2026-08');
    if (!month.ok) throw new Error('Invalid synthetic month');

    expect(expectOk(await entries.listByMonth(month.value)).map((entry) => entry.dateKey)).toEqual([
      '2026-08-01',
      '2026-08-23',
    ]);
    expect(expectOk(await entries.listAll()).map((entry) => entry.dateKey)).toEqual([
      '2026-08-01',
      '2026-08-23',
      '2026-09-01',
    ]);
  });

  it('새 repository로 다시 열어도 대표 감정과 전체 기록을 복원한다', async () => {
    const firstSession = repository(database);
    const draft = createDraft('2026-08-23');
    const secondEmotion = {
      id: 'emotion-grateful',
      kind: 'emotion' as const,
      label: '감사한',
      source: 'catalog' as const,
      intensity: 4 as const,
    };
    draft.exploration.finalConfirmed.emotions = {
      status: 'confirmed',
      items: [{ ...selectedEmotion, intensity: 2 }, secondEmotion],
      representativeEmotionId: secondEmotion.id,
    };
    await firstSession.save(draft);

    const reopened = repository(database.reopen());
    const restored = expectOk(await reopened.getByDate(draft.dateKey));

    expect(restored?.story).toBe(draft.story);
    expect(restored?.exploration.finalConfirmed.emotions).toEqual({
      status: 'confirmed',
      items: [{ ...selectedEmotion, intensity: 2 }, secondEmotion],
      representativeEmotionId: secondEmotion.id,
    });
  });

  it('입력과 저장·조회·목록 반환값의 외부 변경에서 저장값을 보호한다', async () => {
    const entries = repository(database);
    const draft = createDraft('2026-08-23');
    const saved = expectOk(await entries.save(draft));

    (draft.exploration.userExpressed as string[]).push('입력 밖 변경');
    (saved.entry.exploration.aiSuggested.emotions as ExplorerSuggestion<EmotionChoice>[])[0].reason =
      '반환값 밖 변경';
    const firstRead = expectOk(await entries.getByDate(draft.dateKey));
    if (!firstRead) throw new Error('Synthetic entry missing');
    (firstRead as { story: string }).story = '조회값 밖 변경';
    const all = expectOk(await entries.listAll());
    (all[0] as { story: string }).story = '목록 밖 변경';

    const restored = expectOk(await entries.getByDate(draft.dateKey));
    expect(restored?.story).toBe('합성 테스트 이야기');
    expect(restored?.exploration.userExpressed).toEqual(['마음이 복잡해요']);
    expect(restored?.exploration.aiSuggested.emotions[0].reason).toBe(
      '사용자에게 보여 줄 합성 근거',
    );
  });

  it('삭제한 기록은 재초기화 후에도 돌아오지 않는다', async () => {
    const entries = repository(database);
    const draft = createDraft('2026-08-23');
    await entries.save(draft);

    expect(await entries.deleteByDate(draft.dateKey)).toEqual({ ok: true, value: true });
    expect(await entries.deleteByDate(draft.dateKey)).toEqual({ ok: true, value: false });
    expect(await repository(database.reopen()).getByDate(draft.dateKey)).toEqual({
      ok: true,
      value: null,
    });
  });
});
