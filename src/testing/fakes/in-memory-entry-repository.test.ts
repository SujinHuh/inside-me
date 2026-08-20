import type {
  DateKey,
  EmotionChoice,
  EntryDraft,
  ExplorerSuggestion,
  NeedChoice,
} from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';

import { ControllableEntryRepository } from './controllable-entry-repository';
import { FixedClock } from './fixed-clock';
import { InMemoryEntryRepository } from './in-memory-entry-repository';

const dateKeyPolicy = new LocalDateKeyPolicy();

function dateKey(value: string): DateKey {
  const result = dateKeyPolicy.parseDateKey(value);
  if (!result.ok) throw new Error(`Invalid synthetic date: ${value}`);
  return result.value;
}

function createRepository(): InMemoryEntryRepository {
  return new InMemoryEntryRepository(
    new FixedClock(new Date('2026-08-20T12:00:00.000Z')),
    () => 'entry-1',
    dateKeyPolicy,
  );
}

const selectedEmotion: EmotionChoice = {
  id: 'emotion-calm',
  kind: 'emotion',
  label: '차분한',
  source: 'catalog',
};

const selectedNeed: NeedChoice = {
  id: 'need-rest',
  kind: 'need',
  label: '휴식',
  source: 'catalog',
};

const aiEmotion: ExplorerSuggestion<EmotionChoice> = {
  choice: {
    id: 'emotion-relieved',
    kind: 'emotion',
    label: '후련한',
    source: 'catalog',
  },
  reason: '사용자에게 보여 줄 합성 근거',
};

function createDraft(value = '2026-08-20'): EntryDraft {
  return {
    dateKey: dateKey(value),
    inputMethod: 'text',
    story: '합성 테스트 이야기',
    exploration: {
      userExpressed: ['마음이 복잡해요'],
      userSelected: { emotions: [selectedEmotion], needs: [selectedNeed] },
      aiSuggested: { emotions: [aiEmotion], needs: [] },
      finalConfirmed: {
        emotions: { status: 'unknown' },
        needs: { status: 'confirmed', items: [selectedNeed] },
      },
    },
  };
}

describe('InMemoryEntryRepository', () => {
  it('같은 날짜를 다시 저장하면 중복 생성하지 않고 갱신한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    const monthKey = dateKeyPolicy.parseMonthKey('2026-08');
    if (!monthKey.ok) throw new Error('Invalid synthetic month');

    const created = await repository.save(draft);
    const updated = await repository.save({ ...draft, story: '수정한 합성 테스트 이야기' });
    const month = await repository.listByMonth(monthKey.value);

    expect(created.ok && created.value.operation).toBe('created');
    expect(updated.ok && updated.value.operation).toBe('updated');
    expect(month.ok && month.value).toHaveLength(1);
    expect(month.ok && month.value[0].story).toBe('수정한 합성 테스트 이야기');
  });

  it('여러 월의 전체 기록을 날짜 오름차순으로 빠짐없이 반환한다', async () => {
    const repository = createRepository();
    await repository.save(createDraft('2026-09-01'));
    await repository.save(createDraft('2026-07-31'));
    await repository.save(createDraft('2026-08-20'));

    const all = await repository.listAll();
    expect(all.ok && all.value.map((entry) => entry.dateKey)).toEqual([
      '2026-07-31',
      '2026-08-20',
      '2026-09-01',
    ]);
  });

  it('빈 이야기는 기존 기록을 바꾸지 않고 명시적 오류를 반환한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    await repository.save(draft);

    const failed = await repository.save({ ...draft, story: '   ' });
    const stored = await repository.getByDate(draft.dateKey);

    expect(failed).toEqual({
      ok: false,
      error: { code: 'invalid-entry', safeMessage: '이야기를 입력해 주세요.' },
    });
    expect(stored.ok && stored.value?.story).toBe(draft.story);
  });

  it('원본·반환값을 바꿔도 저장값과 AI 비자동확정 상태를 보존한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    const saved = await repository.save(draft);
    if (!saved.ok) throw new Error('Synthetic save failed');

    (draft.exploration.userExpressed as string[]).push('외부에서 바꾼 표현');
    (draft.exploration.aiSuggested.emotions as ExplorerSuggestion<EmotionChoice>[])[0].reason =
      '외부에서 바꾼 근거';
    (saved.value.entry.exploration.userSelected.emotions as EmotionChoice[]).push(aiEmotion.choice);

    const firstRead = await repository.getByDate(draft.dateKey);
    if (!firstRead.ok || !firstRead.value) throw new Error('Synthetic read failed');
    (firstRead.value.exploration.userExpressed as string[]).push('조회값에서 바꾼 표현');

    const all = await repository.listAll();
    if (!all.ok) throw new Error('Synthetic list failed');
    (all.value[0] as { story: string }).story = '목록 반환값에서 바꾼 이야기';

    const secondRead = await repository.getByDate(draft.dateKey);
    expect(secondRead.ok && secondRead.value?.exploration.userExpressed).toEqual([
      '마음이 복잡해요',
    ]);
    expect(secondRead.ok && secondRead.value?.exploration.aiSuggested.emotions[0].reason).toBe(
      '사용자에게 보여 줄 합성 근거',
    );
    expect(secondRead.ok && secondRead.value?.exploration.finalConfirmed.emotions).toEqual({
      status: 'unknown',
    });
    expect(secondRead.ok && secondRead.value?.exploration.userSelected.emotions).toEqual([
      selectedEmotion,
    ]);
  });

  it('seed 객체를 밖에서 바꿔도 저장값은 바뀌지 않는다', async () => {
    const source = createRepository();
    const draft = createDraft();
    const saved = await source.save(draft);
    if (!saved.ok) throw new Error('Synthetic save failed');
    const seed = saved.value.entry;
    const seeded = new InMemoryEntryRepository(
      new FixedClock(new Date('2026-08-20T12:00:00.000Z')),
      () => 'entry-2',
      dateKeyPolicy,
      [seed],
    );

    (seed as { story: string }).story = 'seed 밖에서 바꾼 이야기';
    const stored = await seeded.getByDate(draft.dateKey);

    expect(stored.ok && stored.value?.story).toBe(draft.story);
  });

  it('유효하지 않은 날짜는 저장하지 않는다', async () => {
    const repository = createRepository();
    const invalidDraft = { ...createDraft(), dateKey: '2026-99-99' as DateKey };

    expect(await repository.save(invalidDraft)).toEqual({
      ok: false,
      error: { code: 'invalid-date', safeMessage: '날짜 형식을 확인해 주세요.' },
    });
    expect(await repository.listAll()).toEqual({ ok: true, value: [] });
  });

  it('빈 확정 목록이나 강도 없는 확정 감정은 저장하지 않는다', async () => {
    const repository = createRepository();
    const emptyConfirmed = createDraft();
    emptyConfirmed.exploration.finalConfirmed = {
      emotions: { status: 'confirmed', items: [] },
      needs: { status: 'unknown' },
    } as unknown as typeof emptyConfirmed.exploration.finalConfirmed;
    const missingIntensity = createDraft();
    missingIntensity.exploration.finalConfirmed = {
      emotions: {
        status: 'confirmed',
        items: [{ ...selectedEmotion }],
      },
      needs: { status: 'unknown' },
    } as unknown as typeof missingIntensity.exploration.finalConfirmed;

    expect(await repository.save(emptyConfirmed)).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(await repository.save(missingIntensity)).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(await repository.listAll()).toEqual({ ok: true, value: [] });
  });

  it('unknown에 항목이 섞이거나 알 수 없는 상태면 기존 기록을 보존한다', async () => {
    const repository = createRepository();
    const original = createDraft();
    await repository.save(original);
    const unknownWithItems = createDraft();
    unknownWithItems.exploration.finalConfirmed = {
      emotions: { status: 'unknown', items: [selectedEmotion] },
      needs: { status: 'unknown' },
    } as unknown as typeof unknownWithItems.exploration.finalConfirmed;
    const invalidStatus = createDraft();
    invalidStatus.exploration.finalConfirmed = {
      emotions: { status: 'unexpected' },
      needs: { status: 'unknown' },
    } as unknown as typeof invalidStatus.exploration.finalConfirmed;

    expect(await repository.save(unknownWithItems)).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(await repository.save(invalidStatus)).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    const stored = await repository.getByDate(original.dateKey);
    expect(stored.ok && stored.value?.story).toBe(original.story);
  });

  it('누락되거나 null인 확인 구조는 예외 없이 안전한 오류로 반환한다', async () => {
    const repository = createRepository();
    const missingConfirmation = {
      ...createDraft(),
      exploration: { userExpressed: [], userSelected: {}, aiSuggested: {} },
    } as unknown as EntryDraft;
    const nullConfirmation = {
      ...createDraft(),
      exploration: { finalConfirmed: null },
    } as unknown as EntryDraft;

    await expect(repository.save(missingConfirmation)).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    await expect(repository.save(nullConfirmation)).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(await repository.listAll()).toEqual({ ok: true, value: [] });
  });

  it('삭제한 기록은 다시 조회되지 않는다', async () => {
    const repository = createRepository();
    const draft = createDraft();

    await repository.save(draft);
    expect(await repository.deleteByDate(draft.dateKey)).toEqual({ ok: true, value: true });
    expect(await repository.getByDate(draft.dateKey)).toEqual({ ok: true, value: null });
  });

  it('주입한 저장 실패는 기존 기록을 바꾸지 않고 한 번만 발생한다', async () => {
    const delegate = createRepository();
    const repository = new ControllableEntryRepository(delegate);
    const draft = createDraft();
    await repository.save(draft);
    repository.failNext('save', {
      code: 'storage-unavailable',
      safeMessage: '기록을 저장하지 못했어요.',
    });

    const failed = await repository.save({ ...draft, story: '저장되면 안 되는 합성 이야기' });
    const stored = await repository.getByDate(draft.dateKey);
    const recovered = await repository.save({ ...draft, story: '재시도한 합성 이야기' });

    expect(failed).toEqual({
      ok: false,
      error: { code: 'storage-unavailable', safeMessage: '기록을 저장하지 못했어요.' },
    });
    expect(stored.ok && stored.value?.story).toBe(draft.story);
    expect(recovered.ok && recovered.value.entry.story).toBe('재시도한 합성 이야기');
  });

  it('조회·목록·삭제 작업에도 한 번짜리 안전한 실패를 주입할 수 있다', async () => {
    const delegate = createRepository();
    const repository = new ControllableEntryRepository(delegate);
    const draft = createDraft();
    const monthKey = dateKeyPolicy.parseMonthKey('2026-08');
    if (!monthKey.ok) throw new Error('Invalid synthetic month');
    await repository.save(draft);
    const error = { code: 'storage-unavailable' as const, safeMessage: '기록을 불러오지 못했어요.' };

    repository.failNext('getByDate', error);
    expect(await repository.getByDate(draft.dateKey)).toEqual({ ok: false, error });
    repository.failNext('listByMonth', error);
    expect(await repository.listByMonth(monthKey.value)).toEqual({ ok: false, error });
    repository.failNext('listAll', error);
    expect(await repository.listAll()).toEqual({ ok: false, error });
    repository.failNext('deleteByDate', error);
    expect(await repository.deleteByDate(draft.dateKey)).toEqual({ ok: false, error });

    expect(await repository.getByDate(draft.dateKey)).toMatchObject({ ok: true });
  });
});
