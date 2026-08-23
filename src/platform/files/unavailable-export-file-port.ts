import type { ExportFilePort, ExportFileResult } from './export-file-port';

export class UnavailableExportFilePort implements ExportFilePort {
  async shareJson(): Promise<ExportFileResult> {
    return {
      ok: false,
      error: {
        code: 'share-failed',
        safeMessage: '이 환경에서는 기록 파일을 공유할 수 없어요.',
      },
    };
  }
}
