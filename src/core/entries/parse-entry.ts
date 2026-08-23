import type {
  ConfirmedEmotion,
  DailyEntry,
  DateKeyPolicy,
  EmotionChoice,
  EntryDraft,
  EntryExploration,
  ExplorerSuggestion,
  NeedChoice,
} from '@/src/core/contracts';
import { ENTRY_SCHEMA_VERSION } from '@/src/core/contracts';

export type EntryParseError =
  | 'empty-story'
  | 'invalid-date'
  | 'invalid-input-method'
  | 'invalid-structure'
  | 'invalid-exploration'
  | 'invalid-confirmation';

export type EntryParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EntryParseError };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseEmotionChoice(value: unknown): EmotionChoice | null {
  if (
    !isRecord(value) ||
    value.kind !== 'emotion' ||
    !isNonBlankString(value.id) ||
    !isNonBlankString(value.label) ||
    (value.source !== 'catalog' && value.source !== 'user-added')
  ) {
    return null;
  }
  return { id: value.id, kind: 'emotion', label: value.label, source: value.source };
}

function parseNeedChoice(value: unknown): NeedChoice | null {
  if (
    !isRecord(value) ||
    value.kind !== 'need' ||
    !isNonBlankString(value.id) ||
    !isNonBlankString(value.label) ||
    (value.source !== 'catalog' && value.source !== 'user-added')
  ) {
    return null;
  }
  return { id: value.id, kind: 'need', label: value.label, source: value.source };
}

function parseConfirmedEmotion(value: unknown): ConfirmedEmotion | null {
  const choice = parseEmotionChoice(value);
  if (
    !choice ||
    !isRecord(value) ||
    !Number.isInteger(value.intensity) ||
    (value.intensity as number) < 1 ||
    (value.intensity as number) > 5
  ) {
    return null;
  }
  return { ...choice, intensity: value.intensity as ConfirmedEmotion['intensity'] };
}

function parseArray<T>(value: unknown, parseItem: (item: unknown) => T | null): readonly T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseItem);
  return parsed.some((item) => item === null) ? null : (parsed as T[]);
}

function parseEmotionSuggestion(value: unknown): ExplorerSuggestion<EmotionChoice> | null {
  if (!isRecord(value) || !isNonBlankString(value.reason)) return null;
  const choice = parseEmotionChoice(value.choice);
  return choice ? { choice, reason: value.reason } : null;
}

function parseNeedSuggestion(value: unknown): ExplorerSuggestion<NeedChoice> | null {
  if (!isRecord(value) || !isNonBlankString(value.reason)) return null;
  const choice = parseNeedChoice(value.choice);
  return choice ? { choice, reason: value.reason } : null;
}

function parseEmotionConfirmation(
  value: unknown,
): EntryExploration['finalConfirmed']['emotions'] | null {
  if (!isRecord(value)) return null;
  if (value.status === 'unknown') {
    return Object.prototype.hasOwnProperty.call(value, 'items') ||
      Object.prototype.hasOwnProperty.call(value, 'representativeEmotionId')
      ? null
      : { status: 'unknown' };
  }
  if (
    value.status !== 'confirmed' ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    !isNonBlankString(value.representativeEmotionId)
  ) {
    return null;
  }
  const items = parseArray(value.items, parseConfirmedEmotion);
  if (
    !items?.length ||
    new Set(items.map((item) => item.id)).size !== items.length ||
    !items.some((item) => item.id === value.representativeEmotionId)
  ) {
    return null;
  }
  return {
    status: 'confirmed',
    items: [items[0], ...items.slice(1)],
    representativeEmotionId: value.representativeEmotionId,
  };
}

function parseNeedConfirmation(
  value: unknown,
): EntryExploration['finalConfirmed']['needs'] | null {
  if (!isRecord(value)) return null;
  if (value.status === 'unknown') {
    return Object.prototype.hasOwnProperty.call(value, 'items') ? null : { status: 'unknown' };
  }
  if (value.status !== 'confirmed' || !Array.isArray(value.items) || value.items.length === 0) {
    return null;
  }
  const items = parseArray(value.items, parseNeedChoice);
  if (!items?.length) return null;
  return { status: 'confirmed', items: [items[0], ...items.slice(1)] };
}

function parseExploration(value: unknown): EntryParseResult<EntryExploration> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.userExpressed) ||
    !value.userExpressed.every(isNonBlankString) ||
    !isRecord(value.userSelected) ||
    !isRecord(value.aiSuggested) ||
    !isRecord(value.finalConfirmed)
  ) {
    return { ok: false, error: 'invalid-exploration' };
  }

  const selectedEmotions = parseArray(value.userSelected.emotions, parseEmotionChoice);
  const selectedNeeds = parseArray(value.userSelected.needs, parseNeedChoice);
  const suggestedEmotions = parseArray(value.aiSuggested.emotions, parseEmotionSuggestion);
  const suggestedNeeds = parseArray(value.aiSuggested.needs, parseNeedSuggestion);
  const confirmedEmotions = parseEmotionConfirmation(value.finalConfirmed.emotions);
  const confirmedNeeds = parseNeedConfirmation(value.finalConfirmed.needs);

  if (!selectedEmotions || !selectedNeeds || !suggestedEmotions || !suggestedNeeds) {
    return { ok: false, error: 'invalid-exploration' };
  }
  if (!confirmedEmotions || !confirmedNeeds) {
    return { ok: false, error: 'invalid-confirmation' };
  }

  return {
    ok: true,
    value: {
      userExpressed: [...value.userExpressed],
      userSelected: { emotions: selectedEmotions, needs: selectedNeeds },
      aiSuggested: { emotions: suggestedEmotions, needs: suggestedNeeds },
      finalConfirmed: { emotions: confirmedEmotions, needs: confirmedNeeds },
    },
  };
}

export function parseEntryDraft(
  value: unknown,
  dateKeyPolicy: DateKeyPolicy,
): EntryParseResult<EntryDraft> {
  if (!isRecord(value) || typeof value.story !== 'string') {
    return { ok: false, error: 'invalid-structure' };
  }
  if (!value.story.trim()) return { ok: false, error: 'empty-story' };
  if (typeof value.dateKey !== 'string' || !dateKeyPolicy.isDateKey(value.dateKey)) {
    return { ok: false, error: 'invalid-date' };
  }
  if (value.inputMethod !== 'text' && value.inputMethod !== 'voice' && value.inputMethod !== 'ai-turn') {
    return { ok: false, error: 'invalid-input-method' };
  }
  if (value.summary !== undefined && typeof value.summary !== 'string') {
    return { ok: false, error: 'invalid-structure' };
  }
  if (value.nextAction !== undefined && typeof value.nextAction !== 'string') {
    return { ok: false, error: 'invalid-structure' };
  }

  const exploration = parseExploration(value.exploration);
  if (!exploration.ok) return exploration;

  return {
    ok: true,
    value: {
      dateKey: value.dateKey,
      inputMethod: value.inputMethod,
      story: value.story,
      exploration: exploration.value,
      ...(value.summary === undefined ? {} : { summary: value.summary }),
      ...(value.nextAction === undefined ? {} : { nextAction: value.nextAction }),
    },
  };
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

export function parseDailyEntry(
  value: unknown,
  dateKeyPolicy: DateKeyPolicy,
): EntryParseResult<DailyEntry> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== ENTRY_SCHEMA_VERSION ||
    !isNonBlankString(value.id) ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.createdAt > value.updatedAt
  ) {
    return { ok: false, error: 'invalid-structure' };
  }
  const draft = parseEntryDraft(value, dateKeyPolicy);
  if (!draft.ok) return draft;

  return {
    ok: true,
    value: {
      ...draft.value,
      schemaVersion: ENTRY_SCHEMA_VERSION,
      id: value.id,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    },
  };
}
