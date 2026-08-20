import type { DailyEntry, DateKey, EntryDraft } from '@/src/core/contracts';
import {
  createDraft,
  createRepository,
  expectOk,
  selectedEmotion,
} from '@/src/testing/fixtures/entry-fixtures';

describe('InMemoryEntryRepository 런타임 경계', () => {
  it('빈 이야기는 기존 기록을 바꾸지 않고 명시적 오류를 반환한다', async () => {
    const repository = createRepository();
    const draft = createDraft();
    await repository.save(draft);

    expect(await repository.save({ ...draft, story: '   ' })).toEqual({
      ok: false,
      error: { code: 'invalid-entry', safeMessage: '이야기를 입력해 주세요.' },
    });
    expect(expectOk(await repository.getByDate(draft.dateKey))?.story).toBe(draft.story);
  });

  it('잘못된 날짜와 입력 방식은 저장하지 않는다', async () => {
    const repository = createRepository();
    const invalidDate = { ...createDraft(), dateKey: '2026-99-99' as DateKey };
    const invalidMethod = { ...createDraft(), inputMethod: 'unknown' } as unknown as EntryDraft;

    expect(await repository.save(invalidDate)).toMatchObject({
      ok: false,
      error: { code: 'invalid-date' },
    });
    expect(await repository.save(invalidMethod)).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(await repository.listAll()).toEqual({ ok: true, value: [] });
  });

  it('선택·제안 구조와 선택 ID·문구가 잘못되면 저장하지 않는다', async () => {
    const repository = createRepository();
    const missingSelected = {
      ...createDraft(),
      exploration: {
        ...createDraft().exploration,
        userSelected: {},
      },
    } as unknown as EntryDraft;
    const blankChoice = createDraft();
    blankChoice.exploration.userSelected = {
      emotions: [{ ...selectedEmotion, id: ' ' }],
      needs: [],
    };
    const invalidSuggestion = createDraft();
    invalidSuggestion.exploration.aiSuggested = {
      emotions: [{ choice: selectedEmotion, reason: ' ' }],
      needs: [],
    };

    for (const draft of [missingSelected, blankChoice, invalidSuggestion]) {
      expect(await repository.save(draft)).toMatchObject({
        ok: false,
        error: { code: 'invalid-entry' },
      });
    }
    expect(await repository.listAll()).toEqual({ ok: true, value: [] });
  });

  it('잘못된 확정 구조는 저장하지 않고 기존 기록을 보존한다', async () => {
    const repository = createRepository();
    const original = createDraft();
    await repository.save(original);
    const malformed = [
      { emotions: { status: 'confirmed', items: [] }, needs: { status: 'unknown' } },
      {
        emotions: { status: 'confirmed', items: [{ ...selectedEmotion }] },
        needs: { status: 'unknown' },
      },
      {
        emotions: { status: 'unknown', items: [selectedEmotion] },
        needs: { status: 'unknown' },
      },
      { emotions: { status: 'unexpected' }, needs: { status: 'unknown' } },
    ];

    for (const finalConfirmed of malformed) {
      const draft = createDraft();
      draft.exploration.finalConfirmed = finalConfirmed as unknown as typeof draft.exploration.finalConfirmed;
      expect(await repository.save(draft)).toMatchObject({
        ok: false,
        error: { code: 'invalid-entry' },
      });
    }
    expect(expectOk(await repository.getByDate(original.dateKey))?.story).toBe(original.story);
  });

  it('허용하지 않은 추가 필드는 제거하고 허용된 필드만 저장한다', async () => {
    const repository = createRepository();
    const unsafe = {
      ...createDraft(),
      rawTranscript: '저장되면 안 되는 합성 민감 필드',
      exploration: {
        ...createDraft().exploration,
        extraInference: '저장되면 안 되는 합성 추론',
      },
    } as unknown as EntryDraft;

    const stored = expectOk(await repository.save(unsafe)).entry as DailyEntry & {
      rawTranscript?: string;
      exploration: DailyEntry['exploration'] & { extraInference?: string };
    };
    expect(stored.rawTranscript).toBeUndefined();
    expect(stored.exploration.extraInference).toBeUndefined();
    const reread = expectOk(await repository.getByDate(stored.dateKey)) as typeof stored | null;
    expect(reread?.rawTranscript).toBeUndefined();
    expect(reread?.exploration.extraInference).toBeUndefined();
  });

  it('불완전하거나 시각 순서가 손상된 seed는 즉시 거부한다', async () => {
    const source = createRepository();
    const valid = expectOk(await source.save(createDraft())).entry;
    const invalidSeed = { ...valid, inputMethod: 'bad' } as unknown as DailyEntry;
    const invalidTimestamps = {
      ...valid,
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    };

    expect(() => createRepository([invalidSeed])).toThrow('Invalid synthetic seed entry');
    expect(() => createRepository([invalidTimestamps])).toThrow('Invalid synthetic seed entry');
  });
});
