export interface ExternalEmotionExplorerPayload {
  requestId: string;
  story: string;
  userSelected: {
    emotionIds: readonly string[];
    needIds: readonly string[];
  };
}

export type ExternalEmotionExplorerHttpErrorCode =
  | 'cancelled'
  | 'unavailable'
  | 'invalid-response';

export type ExternalEmotionExplorerHttpResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: { code: ExternalEmotionExplorerHttpErrorCode } };

export type ExternalEmotionExplorerTransportResult = ExternalEmotionExplorerHttpResponse;

/**
 * 실제 공급자·HTTP 구현이 따라야 하는 최소 포트다.
 * 응답은 신뢰하지 않은 unknown으로 받아 adapter 경계에서 반드시 검증한다.
 */
export interface ExternalEmotionExplorerTransport {
  requestSuggestions(
    payload: ExternalEmotionExplorerPayload,
  ): Promise<ExternalEmotionExplorerTransportResult>;
}
