import type { ExternalEmotionExplorerPayload } from '@/src/application/exploration/external-emotion-explorer-transport';

import {
  type ExternalEmotionExplorerFetch,
  HttpExternalEmotionExplorerTransport,
} from './http-external-emotion-explorer-transport';

const payload: ExternalEmotionExplorerPayload = {
  requestId: 'request-synthetic-1',
  story: '합성 상황에서 마음이 복잡했다.',
  userSelected: {
    emotionIds: ['emotion-worried'],
    needIds: ['need-safety'],
  },
};

function response(ok: boolean, value: unknown) {
  return {
    ok,
    json: jest.fn(async () => value),
  };
}

function createTransport(fetch: ExternalEmotionExplorerFetch, timeoutMs = 1_000) {
  return new HttpExternalEmotionExplorerTransport({
    endpoint: 'http://127.0.0.1:3000/api/ai/emotion-suggestions',
    fetch,
    timeoutMs,
  });
}

describe('HttpExternalEmotionExplorerTransport', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('허용된 요청 필드만 POST JSON으로 보내고 성공 envelope의 value를 반환한다', async () => {
    const serverValue = {
      emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
      needs: [],
    };
    const fetch = jest.fn(async () => response(true, {
      ok: true,
      value: serverValue,
      ignoredServerMetadata: 'discarded',
    }));
    const transport = createTransport(fetch);
    const payloadWithExtra = {
      ...payload,
      secret: 'send-me-not',
      userSelected: {
        ...payload.userSelected,
        labels: ['전송하지 않음'],
      },
    } as ExternalEmotionExplorerPayload;

    await expect(transport.requestSuggestions(payloadWithExtra)).resolves.toEqual({
      ok: true,
      value: serverValue,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/ai/emotion-suggestions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    ['cancelled', 'cancelled'],
    ['unavailable', 'unavailable'],
    ['invalid-response', 'invalid-response'],
  ] as const)('허용된 서버 오류 %s만 안전한 코드로 투영한다', async (serverCode, expectedCode) => {
    const fetch = jest.fn(async () => response(true, {
      ok: false,
      error: { code: serverCode, detail: '일기 원문이 포함될 수 있는 세부 오류' },
    }));

    const result = await createTransport(fetch).requestSuggestions(payload);

    expect(result).toEqual({ ok: false, error: { code: expectedCode } });
    expect(JSON.stringify(result)).not.toContain('일기 원문');
  });

  it.each([
    ['envelope가 객체가 아님', null],
    ['ok 판별값 누락', { value: { emotions: [], needs: [] } }],
    ['성공 value 누락', { ok: true }],
    ['알 수 없는 오류 코드', { ok: false, error: { code: 'internal-detail' } }],
  ])('%s 응답을 invalid-response로 변환한다', async (_label, serverResponse) => {
    const fetch = jest.fn(async () => response(true, serverResponse));

    await expect(createTransport(fetch).requestSuggestions(payload)).resolves.toEqual({
      ok: false,
      error: { code: 'invalid-response' },
    });
  });

  it.each([
    ['cancelled', 'cancelled'],
    ['unavailable', 'unavailable'],
    ['invalid-response', 'invalid-response'],
  ] as const)('2xx가 아닌 응답의 허용 오류 %s를 안전한 코드로 투영한다', async (serverCode, expectedCode) => {
    const failedResponse = response(false, {
      ok: false,
      error: { code: serverCode, detail: '외부에 보이면 안 되는 세부 정보' },
    });
    const fetch = jest.fn(async () => failedResponse);

    const result = await createTransport(fetch).requestSuggestions(payload);

    expect(result).toEqual({ ok: false, error: { code: expectedCode } });
    expect(failedResponse.json).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('외부에 보이면');
  });

  it.each([
    ['성공 envelope', { ok: true, value: { emotions: [], needs: [] } }],
    ['잘못된 envelope', { ok: false, error: { code: 'server-detail' } }],
  ])('2xx가 아닌 %s는 unavailable로 변환한다', async (_label, body) => {
    const failedResponse = response(false, body);
    const fetch = jest.fn(async () => failedResponse);

    await expect(createTransport(fetch).requestSuggestions(payload)).resolves.toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
    expect(failedResponse.json).toHaveBeenCalledTimes(1);
  });

  it('2xx가 아닌 응답의 JSON 파싱 실패를 unavailable로 변환한다', async () => {
    const fetch = jest.fn(async () => ({
      ok: false,
      json: async () => { throw new Error('내부 응답 세부 정보'); },
    }));

    await expect(createTransport(fetch).requestSuggestions(payload)).resolves.toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
  });

  it.each([
    ['fetch 예외', async () => { throw new Error('합성 일기와 네트워크 세부 정보'); }],
    ['JSON 파싱 예외', async () => ({
      ok: true,
      json: async () => { throw new Error('서버 응답 세부 정보'); },
    })],
  ] as const)('%s를 unavailable로 변환하고 자동 재시도하지 않는다', async (_label, implementation) => {
    const fetch = jest.fn(implementation) as unknown as jest.MockedFunction<ExternalEmotionExplorerFetch>;

    await expect(createTransport(fetch).requestSuggestions(payload)).resolves.toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('timeout이 되면 fetch signal을 abort하고 unavailable로 변환한다', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetch: ExternalEmotionExplorerFetch = jest.fn((_endpoint, init) => {
      requestSignal = init.signal;
      // fetch 구현이 abort를 무시해도 transport 자체 timeout은 종료되어야 한다.
      return new Promise(() => undefined);
    });
    const pending = createTransport(fetch, 25).requestSuggestions(payload);

    expect(requestSignal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(25);

    await expect(pending).resolves.toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
    expect(requestSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('응답 본문 읽기가 멈춰도 timeout 뒤 unavailable로 복구한다', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetch: ExternalEmotionExplorerFetch = jest.fn(async (_endpoint, init) => {
      requestSignal = init.signal;
      return {
        ok: true,
        json: () => new Promise(() => undefined),
      };
    });
    const pending = createTransport(fetch, 25).requestSuggestions(payload);

    await jest.advanceTimersByTimeAsync(25);

    await expect(pending).resolves.toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
    expect(requestSignal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('요청 완료 뒤 timeout timer를 정리한다', async () => {
    jest.useFakeTimers();
    const fetch = jest.fn(async () => response(true, {
      ok: true,
      value: { emotions: [], needs: [] },
    }));

    await createTransport(fetch).requestSuggestions(payload);

    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    ['빈 endpoint', { endpoint: '   ', timeoutMs: 100 }],
    ['0 timeout', { endpoint: 'http://127.0.0.1', timeoutMs: 0 }],
    ['소수 timeout', { endpoint: 'http://127.0.0.1', timeoutMs: 1.5 }],
  ])('%s 설정을 거부한다', (_label, options) => {
    const fetch = jest.fn(async () => response(true, { ok: true, value: {} }));

    expect(() => new HttpExternalEmotionExplorerTransport({ ...options, fetch })).toThrow();
  });
});
