import type {
  ExternalEmotionExplorerHttpErrorCode,
  ExternalEmotionExplorerHttpResponse,
} from '../../src/application/exploration/external-emotion-explorer-transport';
import type { EmotionSuggestionsServiceResult } from './emotion-suggestions-service';

export interface EmotionSuggestionsHttpRequest {
  readonly method: string;
  readonly body: unknown;
  readonly signal?: AbortSignal;
}

export interface EmotionSuggestionsHttpResult {
  readonly status: number;
  readonly body: ExternalEmotionExplorerHttpResponse;
}

export interface EmotionSuggestionsHttpService {
  suggest(value: unknown, signal?: AbortSignal): Promise<EmotionSuggestionsServiceResult>;
}

function failure(
  status: number,
  code: ExternalEmotionExplorerHttpErrorCode,
): EmotionSuggestionsHttpResult {
  return { status, body: { ok: false, error: { code } } };
}

function mapServiceFailure(
  error: Extract<EmotionSuggestionsServiceResult, { ok: false }>['error'],
): EmotionSuggestionsHttpResult {
  switch (error) {
    case 'invalid-request':
      return failure(400, 'invalid-response');
    case 'invalid-response':
      return failure(502, 'invalid-response');
    case 'cancelled':
      return failure(499, 'cancelled');
    case 'duplicate-request':
    case 'request-in-flight':
      return failure(409, 'unavailable');
    case 'insufficient-budget':
      return failure(429, 'unavailable');
    case 'unavailable':
    case 'cost-accounting-failed':
      return failure(503, 'unavailable');
  }
}

/**
 * Node, Expo Router API 등 특정 웹 프레임워크에 의존하지 않는 HTTP 경계다.
 * 서비스의 usage·비용·예산 상태는 클라이언트 응답으로 내보내지 않는다.
 */
export class EmotionSuggestionsHttpHandler {
  constructor(private readonly service: EmotionSuggestionsHttpService) {}

  async handle(request: EmotionSuggestionsHttpRequest): Promise<EmotionSuggestionsHttpResult> {
    if (request.method !== 'POST') return failure(405, 'invalid-response');

    try {
      const result = await this.service.suggest(request.body, request.signal);
      return result.ok
        ? { status: 200, body: { ok: true, value: result.value } }
        : mapServiceFailure(result.error);
    } catch {
      // 예외 원문에 일기 내용이 있을 수 있으므로 응답·로그에 전달하지 않는다.
      return failure(503, 'unavailable');
    }
  }
}
