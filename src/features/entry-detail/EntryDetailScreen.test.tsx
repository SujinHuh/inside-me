import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { DailyEntry, EntryRepository } from '@/src/core/contracts';
import { ENTRY_SCHEMA_VERSION } from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';
import { ControllableEntryRepository } from '@/src/testing/fakes/controllable-entry-repository';
import { InMemoryEntryRepository } from '@/src/testing/fakes/in-memory-entry-repository';
import { FixedClock } from '@/src/testing/fakes/fixed-clock';

import { EntryDetailScreen } from './EntryDetailScreen';

const dateKeyPolicy = new LocalDateKeyPolicy();

function createSyntheticEntry(): DailyEntry {
  const parsedDate = dateKeyPolicy.parseDateKey('2026-08-20');
  if (!parsedDate.ok) throw new Error('Invalid synthetic date');

  const calm = {
    id: 'emotion-calm',
    kind: 'emotion' as const,
    label: '차분한',
    source: 'catalog' as const,
    intensity: 3 as const,
  };
  const relieved = {
    id: 'emotion-relieved',
    kind: 'emotion' as const,
    label: '후련한',
    source: 'catalog' as const,
    intensity: 4 as const,
  };
  const rest = {
    id: 'need-rest',
    kind: 'need' as const,
    label: '휴식',
    source: 'catalog' as const,
  };

  return {
    schemaVersion: ENTRY_SCHEMA_VERSION,
    id: 'synthetic-entry-detail',
    dateKey: parsedDate.value,
    inputMethod: 'text',
    story: '햇볕 아래에서 천천히 걸었다.',
    exploration: {
      userExpressed: [],
      userSelected: { emotions: [calm, relieved], needs: [rest] },
      aiSuggested: { emotions: [], needs: [] },
      finalConfirmed: {
        emotions: {
          status: 'confirmed',
          items: [calm, relieved],
          representativeEmotionId: calm.id,
        },
        needs: { status: 'confirmed', items: [rest] },
      },
    },
    summary: '천천히 쉬어 갈 여유가 필요했던 날',
    createdAt: '2026-08-20T03:00:00.000Z',
    updatedAt: '2026-08-20T03:00:00.000Z',
  };
}

function createRepository(seed: readonly DailyEntry[] = []): InMemoryEntryRepository {
  return new InMemoryEntryRepository(
    new FixedClock(new Date('2026-08-20T12:00:00.000Z')),
    () => 'unused-synthetic-id',
    dateKeyPolicy,
    seed,
  );
}

interface RenderDetailOptions {
  repository?: EntryRepository;
  dateKey?: string;
  onEdit?: jest.Mock;
  onDeleted?: jest.Mock;
  onRequestExport?: jest.Mock;
}

function renderDetail({
  repository = createRepository([createSyntheticEntry()]),
  dateKey = '2026-08-20',
  onEdit = jest.fn(),
  onDeleted = jest.fn(),
  onRequestExport = jest.fn(),
}: RenderDetailOptions = {}) {
  render(
    <EntryDetailScreen
      dateKey={dateKey}
      dateKeyPolicy={dateKeyPolicy}
      onDeleted={onDeleted}
      onEdit={onEdit}
      onRequestExport={onRequestExport}
      repository={repository}
    />,
  );
  return { onDeleted, onEdit, onRequestExport };
}

describe('EntryDetailScreen', () => {
  it('이야기와 모든 감정 강도, 대표 감정, 욕구와 핵심 문장을 보여 준다', async () => {
    const actions = renderDetail();

    expect(await screen.findByText('햇볕 아래에서 천천히 걸었다.')).toBeTruthy();
    expect(screen.getByLabelText('차분한, 감정 강도 5점 중 3점')).toBeTruthy();
    expect(screen.getByLabelText('후련한, 감정 강도 5점 중 4점')).toBeTruthy();
    expect(screen.getByText('강도 3/5 · 대표 감정')).toBeTruthy();
    expect(screen.getByText('• 휴식')).toBeTruthy();
    expect(screen.getByText('천천히 쉬어 갈 여유가 필요했던 날')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '이 기록 수정' }));
    fireEvent.press(screen.getByRole('button', { name: '전체 기록 내보내기' }));
    expect(actions.onEdit).toHaveBeenCalledWith(expect.stringMatching(/^2026-08-20$/));
    expect(actions.onRequestExport).toHaveBeenCalledTimes(1);
  });

  it('잘못된 날짜는 저장소를 조회하지 않고 안전한 오류 화면을 보여 준다', async () => {
    const repository = createRepository([createSyntheticEntry()]);
    const getByDate = jest.spyOn(repository, 'getByDate');
    renderDetail({ dateKey: '2026-02-30', repository });

    expect(await screen.findByText('날짜를 확인할 수 없어요')).toBeTruthy();
    expect(
      screen.getByLabelText(
        '날짜를 확인할 수 없어요. 달력에서 날짜를 다시 선택해 주세요.',
      ),
    ).toHaveProp(
      'accessibilityLabel',
      '날짜를 확인할 수 없어요. 달력에서 날짜를 다시 선택해 주세요.',
    );
    expect(getByDate).not.toHaveBeenCalled();
  });

  it('기록이 없는 날짜를 오류로 취급하지 않는다', async () => {
    renderDetail({ repository: createRepository() });

    expect(await screen.findByText('이 날짜에는 기록이 없어요')).toBeTruthy();
    expect(
      screen.getByLabelText(
        '이 날짜에는 기록이 없어요. 2026년 8월 20일에는 저장된 기록이 없어요.',
      ),
    ).toHaveProp(
      'accessibilityLabel',
      '이 날짜에는 기록이 없어요. 2026년 8월 20일에는 저장된 기록이 없어요.',
    );
  });

  it('삭제 확인을 취소하면 기록을 유지하고 삭제 요청을 보내지 않는다', async () => {
    const repository = createRepository([createSyntheticEntry()]);
    const deleteByDate = jest.spyOn(repository, 'deleteByDate');
    renderDetail({ repository });
    await screen.findByText('햇볕 아래에서 천천히 걸었다.');

    fireEvent.press(screen.getByRole('button', { name: '이 기록 삭제' }));
    expect(
      screen.getByLabelText('이 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '삭제 취소' }));

    expect(screen.queryByText('삭제한 기록은 되돌릴 수 없어요.')).toBeNull();
    expect(screen.getByText('햇볕 아래에서 천천히 걸었다.')).toBeTruthy();
    expect(deleteByDate).not.toHaveBeenCalled();
  });

  it('삭제 확인이 성공하면 기록을 제거하고 완료 콜백을 호출한다', async () => {
    const repository = createRepository([createSyntheticEntry()]);
    const { onDeleted } = renderDetail({ repository });
    await screen.findByText('햇볕 아래에서 천천히 걸었다.');

    fireEvent.press(screen.getByRole('button', { name: '이 기록 삭제' }));
    fireEvent.press(screen.getByRole('button', { name: '삭제 확인' }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith(expect.stringMatching(/^2026-08-20$/));
    });
    await expect(repository.listAll()).resolves.toEqual({ ok: true, value: [] });
  });

  it('삭제 실패 시 기록과 화면 상태를 보존하고 완료 콜백을 호출하지 않는다', async () => {
    const delegate = createRepository([createSyntheticEntry()]);
    const repository = new ControllableEntryRepository(delegate);
    repository.failNext('deleteByDate', {
      code: 'storage-unavailable',
      safeMessage: '기기 저장소를 잠시 사용할 수 없어요.',
    });
    const { onDeleted } = renderDetail({ repository });
    await screen.findByText('햇볕 아래에서 천천히 걸었다.');

    fireEvent.press(screen.getByRole('button', { name: '이 기록 삭제' }));
    fireEvent.press(screen.getByRole('button', { name: '삭제 확인' }));

    expect(
      await screen.findByLabelText(
        '삭제하지 못했어요. 기기 저장소를 잠시 사용할 수 없어요.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('햇볕 아래에서 천천히 걸었다.')).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
    await expect(delegate.listAll()).resolves.toEqual({
      ok: true,
      value: [expect.objectContaining({ id: 'synthetic-entry-detail' })],
    });
  });

  it('조회 실패를 안전한 오류 문구와 재시도 행동으로 구분한다', async () => {
    const repository = new ControllableEntryRepository(createRepository([createSyntheticEntry()]));
    repository.failNext('getByDate', {
      code: 'storage-unavailable',
      safeMessage: '기기 저장소를 잠시 사용할 수 없어요.',
    });
    renderDetail({ repository });

    expect(await screen.findByText('기록을 불러오지 못했어요')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(screen.getByText('햇볕 아래에서 천천히 걸었다.')).toBeTruthy();
    });
  });
});
