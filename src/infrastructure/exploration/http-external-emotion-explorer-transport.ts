import type {
  ExternalEmotionExplorerHttpErrorCode,
  ExternalEmotionExplorerHttpResponse,
  ExternalEmotionExplorerPayload,
  ExternalEmotionExplorerTransport,
} from '@/src/application/exploration/external-emotion-explorer-transport';

interface HttpResponseLike {
  readonly ok: boolean;
  json(): Promise<unknown>;
}

interface HttpRequestInit {
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly signal: AbortSignal;
}

export type ExternalEmotionExplorerFetch = (
  endpoint: string,
  init: HttpRequestInit,
) => Promise<HttpResponseLike>;

interface HttpExternalEmotionExplorerTransportOptions {
  readonly endpoint: string;
  readonly fetch: ExternalEmotionExplorerFetch;
  readonly timeoutMs: number;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpErrorCode(value: unknown): value is ExternalEmotionExplorerHttpErrorCode {
  return value === 'cancelled' || value === 'unavailable' || value === 'invalid-response';
}

function invalidResponse(): ExternalEmotionExplorerHttpResponse {
  return { ok: false, error: { code: 'invalid-response' } };
}

function unavailable(): ExternalEmotionExplorerHttpResponse {
  return { ok: false, error: { code: 'unavailable' } };
}

function parseHttpErrorResponse(value: unknown): ExternalEmotionExplorerHttpResponse | null {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !isRecord(value.error) ||
    !isHttpErrorCode(value.error.code)
  ) {
    return null;
  }

  return { ok: false, error: { code: value.error.code } };
}

function parseHttpResponse(value: unknown): ExternalEmotionExplorerHttpResponse {
  if (!isRecord(value)) return invalidResponse();

  if (value.ok === true && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return { ok: true, value: value.value };
  }

  const errorResponse = parseHttpErrorResponse(value);
  if (errorResponse) return errorResponse;

  return invalidResponse();
}

function serializePayload(payload: ExternalEmotionExplorerPayload): string {
  return JSON.stringify({
    requestId: payload.requestId,
    story: payload.story,
    userSelected: {
      emotionIds: [...payload.userSelected.emotionIds],
      needIds: [...payload.userSelected.needIds],
    },
  });
}

export class HttpExternalEmotionExplorerTransport
  implements ExternalEmotionExplorerTransport
{
  private readonly endpoint: string;
  private readonly fetch: ExternalEmotionExplorerFetch;
  private readonly timeoutMs: number;

  constructor({ endpoint, fetch, timeoutMs }: HttpExternalEmotionExplorerTransportOptions) {
    if (!endpoint.trim()) {
      throw new Error('External emotion explorer endpoint must not be empty');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('External emotion explorer timeout must be a positive integer');
    }

    this.endpoint = endpoint;
    this.fetch = fetch;
    this.timeoutMs = timeoutMs;
  }

  async requestSuggestions(
    payload: ExternalEmotionExplorerPayload,
  ): Promise<ExternalEmotionExplorerHttpResponse> {
    const controller = new AbortController();
    const timedOut = Symbol('timed-out');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<typeof timedOut>((resolve) => {
      timeout = setTimeout(() => {
        controller.abort();
        resolve(timedOut);
      }, this.timeoutMs);
    });

    try {
      const request = async (): Promise<ExternalEmotionExplorerHttpResponse> => {
        const response = await this.fetch(this.endpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: serializePayload(payload),
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) return parseHttpErrorResponse(body) ?? unavailable();

        return parseHttpResponse(body);
      };
      const result = await Promise.race([
        request(),
        timeoutResult,
      ]);

      return result === timedOut ? unavailable() : result;
    } catch {
      // 네트워크·timeout·응답 파싱 예외와 사용자 이야기를 외부로 노출하지 않는다.
      return unavailable();
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
}
