import type {
  DailyEntry,
  DateKey,
  EntryDraft,
  EntryRepository,
  EntryRepositoryError,
  MonthKey,
  RepositoryResult,
  SaveEntryResult,
} from '@/src/core/contracts';

type RepositoryOperation = 'getByDate' | 'listByMonth' | 'listAll' | 'save' | 'deleteByDate';

export class ControllableEntryRepository implements EntryRepository {
  private readonly failures = new Map<RepositoryOperation, EntryRepositoryError>();

  constructor(private readonly delegate: EntryRepository) {}

  failNext(operation: RepositoryOperation, error: EntryRepositoryError): void {
    this.failures.set(operation, error);
  }

  async getByDate(dateKey: DateKey): Promise<RepositoryResult<DailyEntry | null>> {
    return this.run('getByDate', () => this.delegate.getByDate(dateKey));
  }

  async listByMonth(monthKey: MonthKey): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return this.run('listByMonth', () => this.delegate.listByMonth(monthKey));
  }

  async listAll(): Promise<RepositoryResult<readonly DailyEntry[]>> {
    return this.run('listAll', () => this.delegate.listAll());
  }

  async save(draft: EntryDraft): Promise<RepositoryResult<SaveEntryResult>> {
    return this.run('save', () => this.delegate.save(draft));
  }

  async deleteByDate(dateKey: DateKey): Promise<RepositoryResult<boolean>> {
    return this.run('deleteByDate', () => this.delegate.deleteByDate(dateKey));
  }

  private async run<T>(
    operation: RepositoryOperation,
    delegate: () => Promise<RepositoryResult<T>>,
  ): Promise<RepositoryResult<T>> {
    const failure = this.failures.get(operation);
    if (failure) {
      this.failures.delete(operation);
      return { ok: false, error: failure };
    }
    return delegate();
  }
}
