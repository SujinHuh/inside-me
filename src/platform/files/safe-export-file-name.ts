declare const safeExportFileNameBrand: unique symbol;

export type SafeExportFileName = string & { readonly [safeExportFileNameBrand]: true };

export function createSafeExportFileName(createdAt: Date): SafeExportFileName {
  if (Number.isNaN(createdAt.getTime())) {
    throw new RangeError('Invalid export timestamp');
  }
  const timestamp = [
    createdAt.getUTCFullYear(),
    String(createdAt.getUTCMonth() + 1).padStart(2, '0'),
    String(createdAt.getUTCDate()).padStart(2, '0'),
    'T',
    String(createdAt.getUTCHours()).padStart(2, '0'),
    String(createdAt.getUTCMinutes()).padStart(2, '0'),
    String(createdAt.getUTCSeconds()).padStart(2, '0'),
    String(createdAt.getUTCMilliseconds()).padStart(3, '0'),
    'Z',
  ].join('');
  return `inside-me-export-${timestamp}.json` as SafeExportFileName;
}
