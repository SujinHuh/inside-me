export type ExportFileErrorCode = 'cancelled' | 'write-failed' | 'share-failed' | 'cleanup-failed';

export type ExportFileResult =
  | { ok: true }
  | { ok: false; error: { code: ExportFileErrorCode; safeMessage: string } };

export interface ExportFilePort {
  shareJson(contents: string): Promise<ExportFileResult>;
}
