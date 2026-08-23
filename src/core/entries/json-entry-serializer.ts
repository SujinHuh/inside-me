import {
  ENTRY_EXPORT_SCHEMA_VERSION,
  type DailyEntry,
  type DateKeyPolicy,
  type EntryExportDocument,
  type EntrySerializer,
} from '@/src/core/contracts';

import { parseDailyEntry } from './parse-entry';

type UnknownRecord = Record<string, unknown>;

export type EntryExportParseError =
  | 'invalid-document'
  | 'invalid-exported-at'
  | 'invalid-entry'
  | 'duplicate-entry';

export type EntryExportParseResult =
  | { ok: true; value: EntryExportDocument }
  | { ok: false; error: EntryExportParseError };

export class EntrySerializationError extends Error {
  constructor(readonly code: EntryExportParseError) {
    super('기록 내보내기 데이터를 만들 수 없습니다.');
    this.name = 'EntrySerializationError';
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function hasDuplicateEntries(entries: readonly DailyEntry[]): boolean {
  return (
    new Set(entries.map((entry) => entry.dateKey)).size !== entries.length ||
    new Set(entries.map((entry) => entry.id)).size !== entries.length
  );
}

export function parseEntryExportDocument(
  value: unknown,
  dateKeyPolicy: DateKeyPolicy,
): EntryExportParseResult {
  if (
    !isRecord(value) ||
    value.schemaVersion !== ENTRY_EXPORT_SCHEMA_VERSION ||
    !Array.isArray(value.entries)
  ) {
    return { ok: false, error: 'invalid-document' };
  }
  if (!isIsoTimestamp(value.exportedAt)) {
    return { ok: false, error: 'invalid-exported-at' };
  }

  const entries: DailyEntry[] = [];
  for (const item of value.entries) {
    const parsed = parseDailyEntry(item, dateKeyPolicy);
    if (!parsed.ok) return { ok: false, error: 'invalid-entry' };
    entries.push(parsed.value);
  }
  if (hasDuplicateEntries(entries)) {
    return { ok: false, error: 'duplicate-entry' };
  }

  return {
    ok: true,
    value: {
      schemaVersion: ENTRY_EXPORT_SCHEMA_VERSION,
      exportedAt: value.exportedAt,
      entries,
    },
  };
}

export class JsonEntrySerializer implements EntrySerializer {
  constructor(private readonly dateKeyPolicy: DateKeyPolicy) {}

  serialize(entries: readonly DailyEntry[], exportedAt: string): string {
    const parsed = parseEntryExportDocument(
      {
        schemaVersion: ENTRY_EXPORT_SCHEMA_VERSION,
        exportedAt,
        entries,
      },
      this.dateKeyPolicy,
    );
    if (!parsed.ok) throw new EntrySerializationError(parsed.error);

    return JSON.stringify(parsed.value, null, 2);
  }
}
