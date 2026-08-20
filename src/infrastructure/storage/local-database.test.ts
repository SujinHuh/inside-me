import { LOCAL_DATABASE_NAME, prepareLocalDatabase } from './local-database';

describe('prepareLocalDatabase', () => {
  it('고정된 비민감 파일명을 사용한다', () => {
    expect(LOCAL_DATABASE_NAME).toBe('inside-me.db');
    expect(LOCAL_DATABASE_NAME).not.toMatch(/[가-힣\s/\\]/);
  });

  it('WAL과 외래 키 보호를 켜고 사용자 입력 SQL을 받지 않는다', async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);

    await prepareLocalDatabase({ execAsync });

    expect(execAsync).toHaveBeenCalledTimes(1);
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA journal_mode = WAL');
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA foreign_keys = ON');
  });
});
