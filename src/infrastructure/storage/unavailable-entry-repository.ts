import type {
  DailyEntry,
  DateKey,
  EntryDraft,
  EntryRepository,
  MonthKey,
  RepositoryResult,
  SaveEntryResult,
} from '@/src/core/contracts';

function unavailable<T>(): RepositoryResult<T> {
  return {
    ok: false,
    error: {
      code: 'storage-unavailable',
      safeMessage: '이 환경에서는 아직 기록 저장을 사용할 수 없어요.',
    },
  };
}

/** Android 우선 단계에서 영속 저장을 지원하지 않는 플랫폼의 명시적 경계다. */
export class UnavailableEntryRepository implements EntryRepository {
  getByDate(_dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>> {
    return Promise.resolve(unavailable());
  }

  listByMonth(_monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return Promise.resolve(unavailable());
  }

  listAll(): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return Promise.resolve(unavailable());
  }

  save(_draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>> {
    return Promise.resolve(unavailable());
  }

  deleteByDate(_dateKey: DateKey): Promise<RepositoryResult<boolean>> {
    return Promise.resolve(unavailable());
  }
}
