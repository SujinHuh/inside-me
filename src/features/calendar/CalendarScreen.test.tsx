import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { DailyEntry, EntryRepository, MonthKey } from '@/src/core/contracts';
import { ENTRY_SCHEMA_VERSION } from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';
import { ControllableEntryRepository } from '@/src/testing/fakes/controllable-entry-repository';
import { InMemoryEntryRepository } from '@/src/testing/fakes/in-memory-entry-repository';
import { FixedClock } from '@/src/testing/fakes/fixed-clock';

import { CalendarScreen } from './CalendarScreen';

const dateKeyPolicy = new LocalDateKeyPolicy();

function monthKey(value: string): MonthKey {
  const result = dateKeyPolicy.parseMonthKey(value);
  if (!result.ok) throw new Error('Invalid synthetic month');
  return result.value;
}

function createSyntheticEntry(date = '2026-08-20'): DailyEntry {
  const parsedDate = dateKeyPolicy.parseDateKey(date);
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
    id: 'synthetic-entry-1',
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

function renderCalendar(repository: EntryRepository, onOpenEntry = jest.fn()) {
  render(
    <CalendarScreen
      dateKeyPolicy={dateKeyPolicy}
      initialMonthKey={monthKey('2026-08')}
      onOpenEntry={onOpenEntry}
      repository={repository}
    />,
  );
  return onOpenEntry;
}

describe('CalendarScreen', () => {
  it('대표 감정의 정확한 이름과 추가 감정 수를 날짜와 함께 전달한다', async () => {
    const onOpenEntry = renderCalendar(createRepository([createSyntheticEntry()]));

    const recordedDay = await screen.findByLabelText(
      '2026년 8월 20일, 대표 감정 차분한, 추가 감정 1개',
    );
    expect(screen.getByText('차분한')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    expect(
      screen.getByTestId('representative-face-2026-08-20', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('representative-face-2026-08-20-calm', { includeHiddenElements: true }),
    ).toBeTruthy();

    fireEvent.press(recordedDay);
    expect(onOpenEntry).toHaveBeenCalledWith(expect.stringMatching(/^2026-08-20$/));
  });

  it('기록이 없는 달과 날짜를 실패가 아닌 중립 문구로 표시한다', async () => {
    renderCalendar(createRepository());

    expect(await screen.findByText('이 달에는 아직 기록이 없어요. 빈 날짜도 괜찮아요.')).toBeTruthy();
    expect(screen.getByLabelText('2026년 8월 20일, 기록 없음')).toBeTruthy();
  });

  it('이전 달로 이동하면 새 달의 기록을 다시 조회한다', async () => {
    renderCalendar(createRepository());
    await screen.findByText('2026년 8월');

    fireEvent.press(screen.getByRole('button', { name: '이전 달' }));

    expect(await screen.findByText('2026년 7월')).toBeTruthy();
    expect(screen.getByLabelText('2026년 7월 1일, 기록 없음')).toBeTruthy();
  });

  it('월 조회 실패를 안전한 오류 문구와 재시도 행동으로 구분한다', async () => {
    const repository = new ControllableEntryRepository(createRepository());
    repository.failNext('listByMonth', {
      code: 'storage-unavailable',
      safeMessage: '기기 저장소를 잠시 사용할 수 없어요.',
    });
    renderCalendar(repository);

    expect(
      await screen.findByLabelText(
        '달력을 불러오지 못했어요. 기기 저장소를 잠시 사용할 수 없어요.',
      ),
    ).toHaveProp(
      'accessibilityLabel',
      '달력을 불러오지 못했어요. 기기 저장소를 잠시 사용할 수 없어요.',
    );
    fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(screen.getByText('이 달에는 아직 기록이 없어요. 빈 날짜도 괜찮아요.')).toBeTruthy();
    });
  });
});
