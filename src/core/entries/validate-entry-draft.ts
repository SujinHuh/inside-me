export type EntryDraftValidationError = 'empty-story' | 'invalid-structure' | 'invalid-confirmation';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChoice(value: unknown, kind: 'emotion' | 'need'): value is UnknownRecord {
  return (
    isRecord(value) &&
    value.kind === kind &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (value.source === 'catalog' || value.source === 'user-added')
  );
}

function isValidConfirmation(value: unknown, kind: 'emotion' | 'need'): boolean {
  if (!isRecord(value)) return false;

  if (value.status === 'unknown') {
    return !Object.prototype.hasOwnProperty.call(value, 'items');
  }

  if (value.status !== 'confirmed' || !Array.isArray(value.items) || value.items.length === 0) {
    return false;
  }

  return value.items.every((item) => {
    if (!isChoice(item, kind)) return false;
    if (kind === 'emotion') {
      return (
        Number.isInteger(item.intensity) &&
        (item.intensity as number) >= 1 &&
        (item.intensity as number) <= 5
      );
    }
    return true;
  });
}

export function validateEntryDraft(draft: unknown): EntryDraftValidationError | null {
  if (!isRecord(draft) || typeof draft.story !== 'string') {
    return 'invalid-structure';
  }
  if (!draft.story.trim()) {
    return 'empty-story';
  }

  if (!isRecord(draft.exploration) || !isRecord(draft.exploration.finalConfirmed)) {
    return 'invalid-structure';
  }
  const { emotions, needs } = draft.exploration.finalConfirmed;
  if (!isValidConfirmation(emotions, 'emotion') || !isValidConfirmation(needs, 'need')) {
    return 'invalid-confirmation';
  }

  return null;
}
