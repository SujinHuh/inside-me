import { JsonEntrySerializer } from '../core/entries/json-entry-serializer';
import { dateKeyPolicy, createRepository } from '../testing/fixtures/entry-fixtures';
import type { ExportFilePort, ExportFileResult } from '../platform/files/export-file-port';
import { shareEntryExport } from './share-entry-export';

describe('shareEntryExport', () => {
  it('전체 기록을 검증된 JSON으로 직렬화한 뒤 파일 포트에 한 번만 전달한다', async () => {
    const repository = createRepository();
    const shareJson = jest.fn(
      async (_contents: string): Promise<ExportFileResult> => ({ ok: true }),
    );
    const filePort: ExportFilePort = { shareJson };

    await expect(
      shareEntryExport(
        repository,
        new JsonEntrySerializer(dateKeyPolicy),
        filePort,
        new Date('2026-08-23T01:02:03.000Z'),
      ),
    ).resolves.toEqual({ ok: true });

    expect(shareJson).toHaveBeenCalledTimes(1);
    const contents = shareJson.mock.calls[0]?.[0];
    expect(contents).toBeDefined();
    expect(JSON.parse(contents ?? '')).toMatchObject({
      schemaVersion: 1,
      exportedAt: '2026-08-23T01:02:03.000Z',
    });
  });
});
