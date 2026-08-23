import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ExportFilePort, ExportFileResult } from './export-file-port';
import { createSafeExportFileName } from './safe-export-file-name';

interface TemporaryFile {
  readonly uri: string;
  readonly exists: boolean;
  create(options: { intermediates: boolean; overwrite: boolean }): void;
  write(contents: string): void;
  delete(): void;
}

interface SharingBoundary {
  isAvailableAsync(): Promise<boolean>;
  shareAsync(
    uri: string,
    options: { dialogTitle: string; mimeType: string; UTI: string },
  ): Promise<void>;
}

type TemporaryFileFactory = (name: string) => TemporaryFile;

const createCacheFile: TemporaryFileFactory = (name) => new File(Paths.cache, name);

export class ExpoExportFilePort implements ExportFilePort {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly createFile: TemporaryFileFactory = createCacheFile,
    private readonly sharing: SharingBoundary = Sharing,
  ) {}

  async shareJson(contents: string): Promise<ExportFileResult> {
    let sharingAvailable = false;
    try {
      sharingAvailable = await this.sharing.isAvailableAsync();
    } catch {
      // 공급자 예외 원문에는 기기 정보가 포함될 수 있어 안전한 문구로만 반환한다.
    }
    if (!sharingAvailable) {
      return {
        ok: false,
        error: { code: 'share-failed', safeMessage: '이 기기에서는 파일 공유를 열 수 없어요.' },
      };
    }

    const file = this.createFile(createSafeExportFileName(this.now()));
    let result: ExportFileResult = { ok: true };
    let stage: 'writing' | 'sharing' = 'writing';

    try {
      file.create({ intermediates: true, overwrite: true });
      file.write(contents);
      stage = 'sharing';
      await this.sharing.shareAsync(file.uri, {
        dialogTitle: 'Inside Me 기록 내보내기',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } catch {
      result = {
        ok: false,
        error: {
          code: stage === 'sharing' ? 'share-failed' : 'write-failed',
          safeMessage:
            stage === 'sharing'
              ? '기록 파일 공유를 완료하지 못했어요.'
              : '기록 파일을 만들지 못했어요.',
        },
      };
    } finally {
      try {
        if (file.exists) file.delete();
      } catch {
        result = {
          ok: false,
          error: {
            code: 'cleanup-failed',
            safeMessage: '임시 내보내기 파일을 정리하지 못했어요. 앱 cache를 확인해 주세요.',
          },
        };
      }
    }

    return result;
  }
}
