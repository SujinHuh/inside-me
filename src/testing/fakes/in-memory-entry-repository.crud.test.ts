import type { EmotionChoice, ExplorerSuggestion } from '@/src/core/contracts';
import {
  aiEmotion,
  createDraft,
  createRepository,
  dateKeyPolicy,
  expectOk,
  selectedEmotion,
} from '@/src/testing/fixtures/entry-fixtures';

describe('InMemoryEntryRepository CRUD 계약', () => {
  it('같은 날짜를 다시 저장하면 식별자를 유지하고 한 기록만 갱신한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    const monthKey = dateKeyPolicy.parseMonthKey('2026-08');
    if (!monthKey.ok) throw new Error('Invalid synthetic month');

    const created = expectOk(await repository.save(draft));
    const updated = expectOk(
      await repository.save({ ...draft, story: '수정한 합성 테스트 이야기' }),
    );
    const month = expectOk(await repository.listByMonth(monthKey.value));

    expect(created.operation).toBe('created');
    expect(updated.operation).toBe('updated');
    expect(updated.entry.id).toBe(created.entry.id);
    expect(updated.entry.createdAt).toBe(created.entry.createdAt);
    expect(month).toHaveLength(1);
    expect(month[0].story).toBe('수정한 합성 테스트 이야기');
  });

  it('여러 월의 기록을 날짜순으로 반환하고 서로 다른 날짜에는 고유 ID를 부여한다', async () => {
    const repository = createRepository();
    await repository.save(createDraft('2026-09-01'));
    await repository.save(createDraft('2026-07-31'));
    await repository.save(createDraft('2026-08-20'));

    const all = expectOk(await repository.listAll());
    expect(all.map((entry) => entry.dateKey)).toEqual([
      '2026-07-31',
      '2026-08-20',
      '2026-09-01',
    ]);
    expect(new Set(all.map((entry) => entry.id)).size).toBe(3);
  });

  it('입력과 저장·조회·월별·전체 목록 반환값의 외부 변경에서 저장값을 보호한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    const monthKey = dateKeyPolicy.parseMonthKey('2026-08');
    if (!monthKey.ok) throw new Error('Invalid synthetic month');
    const saved = expectOk(await repository.save(draft));

    (draft.exploration.userExpressed as string[]).push('외부에서 바꾼 표현');
    (draft.exploration.aiSuggested.emotions as ExplorerSuggestion<EmotionChoice>[])[0].reason =
      '외부에서 바꾼 근거';
    (saved.entry.exploration.userSelected.emotions as EmotionChoice[]).push(aiEmotion.choice);

    const firstRead = expectOk(await repository.getByDate(draft.dateKey));
    if (!firstRead) throw new Error('Synthetic entry missing');
    (firstRead.exploration.userExpressed as string[]).push('조회값에서 바꾼 표현');
    const month = expectOk(await repository.listByMonth(monthKey.value));
    (month[0] as { story: string }).story = '월별 목록에서 바꾼 이야기';
    const all = expectOk(await repository.listAll());
    (all[0] as { story: string }).story = '전체 목록에서 바꾼 이야기';

    const secondRead = expectOk(await repository.getByDate(draft.dateKey));
    expect(secondRead?.exploration.userExpressed).toEqual(['마음이 복잡해요']);
    expect(secondRead?.exploration.aiSuggested.emotions[0].reason).toBe(
      '사용자에게 보여 줄 합성 근거',
    );
    expect(secondRead?.exploration.finalConfirmed.emotions).toEqual({ status: 'unknown' });
    expect(secondRead?.exploration.userSelected.emotions).toEqual([selectedEmotion]);
    expect(secondRead?.story).toBe(draft.story);
  });

  it('seed 객체의 외부 변경에서도 저장값을 보호한다', async () => {
    const source = createRepository();
    const draft = createDraft();
    const seed = expectOk(await source.save(draft)).entry;
    const seeded = createRepository([seed]);

    (seed as { story: string }).story = 'seed 밖에서 바꾼 이야기';

    expect(expectOk(await seeded.getByDate(draft.dateKey))?.story).toBe(draft.story);
  });

  it('삭제한 기록은 다시 조회되지 않는다', async () => {
    const repository = createRepository();
    const draft = createDraft();

    await repository.save(draft);
    expect(await repository.deleteByDate(draft.dateKey)).toEqual({ ok: true, value: true });
    expect(await repository.getByDate(draft.dateKey)).toEqual({ ok: true, value: null });
  });
});
