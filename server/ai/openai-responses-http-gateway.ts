import type {
  OpenAiResponsesGateway,
  OpenAiResponsesRequest,
} from './openai-responses-emotion-provider';

interface FetchResponse {
  readonly ok: boolean;
  json(): Promise<unknown>;
}

export type ServerFetch = (
  input: string,
  init: {
    readonly method: 'POST';
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal?: AbortSignal;
  },
) => Promise<FetchResponse>;

const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 비밀 키를 서버 실행 환경에서 주입받는 경계다.
 * Expo 클라이언트에서 이 클래스를 생성하거나 키를 전달하면 안 된다.
 */
export class OpenAiResponsesHttpGateway implements OpenAiResponsesGateway {
  private readonly apiKey: string;

  constructor(
    private readonly fetch: ServerFetch,
    apiKey: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.apiKey = apiKey.trim();
    if (!this.apiKey) throw new Error('OpenAI API key is required');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('OpenAI timeout must be a positive integer');
    }
  }

  async createResponse(
    request: OpenAiResponsesRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<unknown> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = options?.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    const response = await this.fetch(RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });

    // 공급자 오류 본문에 사용자 원문이 섞일 수 있으므로 읽거나 재포장하지 않는다.
    if (!response.ok) throw new Error('OpenAI Responses API request failed');
    return response.json();
  }
}
