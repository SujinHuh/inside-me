import { ENTRY_EXPORT_SCHEMA_VERSION, type DailyEntry } from '@/src/core/contracts';
import { LocalDateKeyPolicy } from '@/src/core/dates/local-date-key-policy';
import {
  createDraft,
  createRepository,
  expectOk,
} from '@/src/testing/fixtures/entry-fixtures';

import {
  EntrySerializationError,
  JsonEntrySerializer,
  parseEntryExportDocument,
} from './json-entry-serializer';

const dateKeyPolicy = new LocalDateKeyPolicy();
const exportedAt = '2026-08-23T01:02:03.000Z';

async function createEntries(): Promise<readonly DailyEntry[]> {
  const repository = createRepository();
  await repository.save(createDraft('2026-08-23'));
  await repository.save(createDraft('2026-08-21'));
  return expectOk(await repository.listAll());
}

describe('JsonEntrySerializer', () => {
  it('모든 합성 기록을 schemaVersion과 함께 UTF-8 JSON으로 왕복 보존한다', async () => {
    const entries = await createEntries();
    const serializer = new JsonEntrySerializer(dateKeyPolicy);

    const json = serializer.serialize(entries, exportedAt);
    const utf8 = new TextEncoder().encode(json);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(utf8);
    const reparsed = parseEntryExportDocument(JSON.parse(decoded), dateKeyPolicy);

    expect(reparsed).toEqual({
      ok: true,
      value: {
        schemaVersion: ENTRY_EXPORT_SCHEMA_VERSION,
        exportedAt,
        entries,
      },
    });
    expect(utf8.byteLength).toBeGreaterThan(json.length);
  });

  it('허용하지 않은 추가 필드를 내보내기 결과에서 제거한다', async () => {
    const [entry] = await createEntries();
    const unsafe = {
      ...entry,
      rawTranscript: '내보내면 안 되는 합성 필드',
      exploration: {
        ...entry.exploration,
        hiddenInference: '내보내면 안 되는 합성 추론',
      },
    } as DailyEntry;

    const json = new JsonEntrySerializer(dateKeyPolicy).serialize([unsafe], exportedAt);
    const document = JSON.parse(json);

    expect(document.entries[0].rawTranscript).toBeUndefined();
    expect(document.entries[0].exploration.hiddenInference).toBeUndefined();
  });

  it('손상된 기록, 시각과 중복 날짜를 안전한 오류로 거부한다', async () => {
    const [entry] = await createEntries();
    const serializer = new JsonEntrySerializer(dateKeyPolicy);
    const invalidEntry = { ...entry, schemaVersion: 99 } as unknown as DailyEntry;
    const duplicateDate = { ...entry, id: 'entry-another' };

    expect(() => serializer.serialize([invalidEntry], exportedAt)).toThrow(
      new EntrySerializationError('invalid-entry'),
    );
    expect(() => serializer.serialize([entry], 'not-a-time')).toThrow(
      new EntrySerializationError('invalid-exported-at'),
    );
    expect(() => serializer.serialize([entry, duplicateDate], exportedAt)).toThrow(
      new EntrySerializationError('duplicate-entry'),
    );
  });

  it('외부 JSON을 읽을 때 문서와 각 기록 전체 구조를 다시 검사한다', async () => {
    const [entry] = await createEntries();
    const malformed = {
      schemaVersion: ENTRY_EXPORT_SCHEMA_VERSION,
      exportedAt,
      entries: [
        {
          ...entry,
          exploration: {
            ...entry.exploration,
            finalConfirmed: {
              ...entry.exploration.finalConfirmed,
              emotions: {
                status: 'confirmed',
                items: [],
                representativeEmotionId: 'missing',
              },
            },
          },
        },
      ],
    };

    expect(parseEntryExportDocument(malformed, dateKeyPolicy)).toEqual({
      ok: false,
      error: 'invalid-entry',
    });
  });
});
