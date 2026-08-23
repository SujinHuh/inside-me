import type { EntryRepository, EntrySerializer } from '../core/contracts';
import type { ExportFilePort, ExportFileResult } from '../platform/files/export-file-port';

export async function shareEntryExport(
  repository: EntryRepository,
  serializer: EntrySerializer,
  filePort: ExportFilePort,
  exportedAt: Date,
): Promise<ExportFileResult> {
  const entries = await repository.listAll();
  if (!entries.ok) {
    return {
      ok: false,
      error: { code: 'write-failed', safeMessage: entries.error.safeMessage },
    };
  }

  try {
    const contents = serializer.serialize(entries.value, exportedAt.toISOString());
    return await filePort.shareJson(contents);
  } catch {
    return {
      ok: false,
      error: {
        code: 'write-failed',
        safeMessage: '기록 내보내기 데이터를 만들지 못했어요.',
      },
    };
  }
}
