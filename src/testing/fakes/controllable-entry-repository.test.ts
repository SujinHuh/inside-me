import { ControllableEntryRepository } from '@/src/testing/fakes/controllable-entry-repository';
import {
  createDraft,
  createRepository,
  dateKeyPolicy,
  expectOk,
} from '@/src/testing/fixtures/entry-fixtures';

describe('ControllableEntryRepository', () => {
  it('주입한 저장 실패는 기존 기록을 보존하고 한 번만 발생한다', async () => {
    const repository = new ControllableEntryRepository(createRepository());
    const draft = createDraft();
    await repository.save(draft);
    repository.failNext('save', {
      code: 'storage-unavailable',
      safeMessage: '기록을 저장하지 못했어요.',
    });

    const failed = await repository.save({ ...draft, story: '저장되면 안 되는 합성 이야기' });
    const stored = expectOk(await repository.getByDate(draft.dateKey));
    const recovered = expectOk(
      await repository.save({ ...draft, story: '재시도한 합성 이야기' }),
    );

    expect(failed).toMatchObject({ ok: false, error: { code: 'storage-unavailable' } });
    expect(stored?.story).toBe(draft.story);
    expect(recovered.entry.story).toBe('재시도한 합성 이야기');
  });

  it('조회·목록·삭제 실패도 기존 기록을 보존하고 한 번만 발생한다', async () => {
    const repository = new ControllableEntryRepository(createRepository());
    const draft = createDraft();
    const monthKey = dateKeyPolicy.parseMonthKey('2026-08');
    if (!monthKey.ok) throw new Error('Invalid synthetic month');
    await repository.save(draft);
    const error = { code: 'storage-unavailable' as const, safeMessage: '기록을 불러오지 못했어요.' };

    for (const operation of ['getByDate', 'listByMonth', 'listAll', 'deleteByDate'] as const) {
      repository.failNext(operation, error);
      const result =
        operation === 'getByDate'
          ? await repository.getByDate(draft.dateKey)
          : operation === 'listByMonth'
            ? await repository.listByMonth(monthKey.value)
            : operation === 'listAll'
              ? await repository.listAll()
              : await repository.deleteByDate(draft.dateKey);
      expect(result).toEqual({ ok: false, error });
    }

    expect(expectOk(await repository.getByDate(draft.dateKey))?.story).toBe(draft.story);
  });
});
