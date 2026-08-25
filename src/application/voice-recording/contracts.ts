export interface ActiveRecordingReference {
  readonly opaqueId: string;
}

export interface TemporaryAudioReference {
  readonly opaqueId: string;
}

export type VoiceRecorderStartErrorCode =
  | 'permission-denied'
  | 'unavailable'
  | 'start-failed';
export type VoiceRecorderStopErrorCode = 'unavailable' | 'stop-failed';
export type VoiceTranscriptionErrorCode = 'unavailable' | 'transcription-failed';

export type VoicePortResult<T, TCode extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: TCode } };

export type VoiceOwnedResourceResult<TCode extends string> =
  | {
      readonly ok: true;
      readonly value: unknown;
      readonly release: () => Promise<VoicePortResult<void, 'cleanup-failed'>>;
    }
  | { readonly ok: false; readonly error: { readonly code: TCode } };

/**
 * 실제 녹음 경로나 URI는 플랫폼 어댑터 안에만 두고 application에는 불투명 ID만 전달한다.
 * 성공 결과는 참조 검증이 실패해도 같은 자원을 정리할 수 있는 재시도 가능 release를 함께
 * 넘긴다. start release는 활성 녹음과 부산물을 모두 정리하고, finish release는 생성된 임시
 * 오디오를 완전히 삭제해야 한다. 실패 반환 또는 예외 전에 생긴 자원은 어댑터가 자체
 * rollback해 새 잔류 자원이 없게 해야 한다. start 실패 뒤에는 활성 녹음이 없어야 하고,
 * finish 실패 뒤에는 입력받은 활성 녹음 참조가 finish 또는 cancel에 계속 유효해야 한다.
 */
export interface VoiceRecorderPort {
  start(): Promise<VoiceOwnedResourceResult<VoiceRecorderStartErrorCode>>;
  finish(
    recording: ActiveRecordingReference,
  ): Promise<VoiceOwnedResourceResult<VoiceRecorderStopErrorCode>>;
  cancel(
    recording: ActiveRecordingReference,
  ): Promise<VoicePortResult<void, 'cleanup-failed'>>;
}

export interface VoiceTranscriberPort {
  transcribe(
    audio: TemporaryAudioReference,
  ): Promise<VoicePortResult<unknown, VoiceTranscriptionErrorCode>>;
}

export interface TemporaryAudioCleanupPort {
  delete(
    audio: TemporaryAudioReference,
  ): Promise<VoicePortResult<void, 'cleanup-failed'>>;
}

export type FreeVoiceSessionErrorCode =
  | VoiceRecorderStartErrorCode
  | VoiceRecorderStopErrorCode
  | VoiceTranscriptionErrorCode
  | 'invalid-reference'
  | 'invalid-resource-owner'
  | 'invalid-transcript'
  | 'cleanup-failed';

export interface SafeFreeVoiceError {
  readonly code: FreeVoiceSessionErrorCode;
  readonly safeMessage: string;
}

export type FreeVoiceCleanupTarget =
  | {
      readonly kind: 'active-recording';
      readonly recording: ActiveRecordingReference;
    }
  | {
      readonly kind: 'temporary-audio';
      readonly audio: TemporaryAudioReference;
    }
  | { readonly kind: 'owned-resource' };

export type FreeVoiceCleanupContinuation =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'review'; readonly transcript: string }
  | { readonly kind: 'failed'; readonly error: SafeFreeVoiceError };

export type FreeVoiceRecordingState =
  | { readonly status: 'idle' }
  | { readonly status: 'starting' }
  | { readonly status: 'start-failed'; readonly error: SafeFreeVoiceError }
  | { readonly status: 'recording'; readonly recording: ActiveRecordingReference }
  | { readonly status: 'stopping'; readonly recording: ActiveRecordingReference }
  | {
      readonly status: 'stop-failed';
      readonly recording: ActiveRecordingReference;
      readonly error: SafeFreeVoiceError;
    }
  | { readonly status: 'transcribing'; readonly audio: TemporaryAudioReference }
  | {
      readonly status: 'transcription-failed';
      readonly audio: TemporaryAudioReference;
      readonly error: SafeFreeVoiceError;
    }
  | {
      readonly status: 'cleanup-required';
      readonly target: FreeVoiceCleanupTarget;
      readonly continuation: FreeVoiceCleanupContinuation;
      readonly error: SafeFreeVoiceError;
    }
  | { readonly status: 'resource-failed'; readonly error: SafeFreeVoiceError }
  | { readonly status: 'reviewing'; readonly transcript: string }
  | { readonly status: 'cancelled' };

export interface VoiceStoryHandoff {
  readonly inputMethod: 'voice';
  readonly story: string;
}

export type FreeVoiceCommandResult<T = FreeVoiceRecordingState> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: 'invalid-state' | 'invalid-transcript';
        readonly safeMessage: string;
      };
    };
