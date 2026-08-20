import type { DailyEntry } from './entry';

export const ENTRY_EXPORT_SCHEMA_VERSION = 1 as const;

export interface EntryExportDocument {
  schemaVersion: typeof ENTRY_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  entries: readonly DailyEntry[];
}

export interface EntrySerializer {
  serialize(entries: readonly DailyEntry[], exportedAt: string): string;
}
