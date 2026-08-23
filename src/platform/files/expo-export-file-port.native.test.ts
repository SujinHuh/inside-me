import { ExpoExportFilePort } from './expo-export-file-port.native';

function createHarness() {
  let exists = false;
  const file = {
    uri: 'file:///synthetic-cache/inside-me-export.json',
    get exists() {
      return exists;
    },
    create: jest.fn(() => {
      exists = true;
    }),
    write: jest.fn(),
    delete: jest.fn(() => {
      exists = false;
    }),
  };
  const sharing = {
    isAvailableAsync: jest.fn(async () => true),
    shareAsync: jest.fn(async () => undefined),
  };
  const port = new ExpoExportFilePort(
    () => new Date('2026-08-23T01:02:03.004Z'),
    () => file,
    sharing,
  );
  return { file, port, sharing };
}

describe('ExpoExportFilePort', () => {
  it('비민감 파일명으로 JSON을 공유하고 성공 뒤 cache 파일을 삭제한다', async () => {
    const { file, port, sharing } = createHarness();

    await expect(port.shareJson('{"schemaVersion":1}')).resolves.toEqual({ ok: true });

    expect(file.write).toHaveBeenCalledWith('{"schemaVersion":1}');
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      'file:///synthetic-cache/inside-me-export.json',
      expect.objectContaining({ mimeType: 'application/json' }),
    );
    expect(file.delete).toHaveBeenCalledTimes(1);
  });

  it('공유가 실패하거나 취소되어도 cache 파일을 삭제한다', async () => {
    const { file, port, sharing } = createHarness();
    sharing.shareAsync.mockRejectedValueOnce(new Error('synthetic share cancellation'));

    await expect(port.shareJson('{}')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'share-failed' }),
    });
    expect(file.delete).toHaveBeenCalledTimes(1);
  });

  it('파일 쓰기 실패 뒤 생성된 임시 파일도 삭제한다', async () => {
    const { file, port, sharing } = createHarness();
    file.write.mockImplementationOnce(() => {
      throw new Error('synthetic write failure');
    });

    await expect(port.shareJson('{}')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'write-failed' }),
    });
    expect(sharing.shareAsync).not.toHaveBeenCalled();
    expect(file.delete).toHaveBeenCalledTimes(1);
  });

  it('임시 파일 삭제 실패를 별도 오류로 알린다', async () => {
    const { file, port } = createHarness();
    file.delete.mockImplementationOnce(() => {
      throw new Error('synthetic cleanup failure');
    });

    await expect(port.shareJson('{}')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'cleanup-failed' }),
    });
  });

  it('공유 가능 여부 조회 실패를 안전한 오류로 반환하고 파일을 만들지 않는다', async () => {
    const { file, port, sharing } = createHarness();
    sharing.isAvailableAsync.mockRejectedValueOnce(new Error('synthetic platform detail'));

    await expect(port.shareJson('{}')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'share-failed' }),
    });
    expect(file.create).not.toHaveBeenCalled();
  });
});
