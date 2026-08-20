import { createSafeExportFileName } from './safe-export-file-name';

describe('createSafeExportFileName', () => {
  it('사용자 표현 없이 고정 접두어와 UTC 시각만 사용한다', () => {
    const fileName = createSafeExportFileName(new Date('2026-08-20T12:34:56.000Z'));

    expect(fileName).toBe('inside-me-export-20260820T123456000Z.json');
    expect(fileName).not.toMatch(/[\\/\u0000-\u001f]/);
  });

  it('유효하지 않은 시각은 파일명으로 만들지 않는다', () => {
    expect(() => createSafeExportFileName(new Date('invalid'))).toThrow(RangeError);
  });
});
