import type {
  ActiveRecordingReference,
  FreeVoiceCleanupContinuation,
  FreeVoiceCleanupTarget,
  FreeVoiceCommandResult,
  FreeVoiceRecordingState,
  FreeVoiceSessionErrorCode,
  SafeFreeVoiceError,
  TemporaryAudioCleanupPort,
  TemporaryAudioReference,
  VoiceRecorderPort,
  VoicePortResult,
  VoiceStoryHandoff,
  VoiceTranscriberPort,
} from './contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOpaqueReference<T extends ActiveRecordingReference | TemporaryAudioReference>(
  value: unknown,
): T | null {
  if (!isRecord(value) || typeof value.opaqueId !== 'string' || !value.opaqueId.trim()) {
    return null;
  }
  return { opaqueId: value.opaqueId } as T;
}

function parseTranscript(value: unknown): string | null {
  if (!isRecord(value) || typeof value.text !== 'string' || !value.text.trim()) {
    return null;
  }
  return value.text;
}

function safeMessage(code: FreeVoiceSessionErrorCode): string {
  switch (code) {
    case 'permission-denied':
      return '마이크 권한을 확인해 주세요.';
    case 'start-failed':
      return '녹음을 시작하지 못했어요.';
    case 'stop-failed':
      return '녹음을 끝내지 못했어요.';
    case 'unavailable':
      return '지금은 음성 기능을 사용할 수 없어요.';
    case 'transcription-failed':
      return '말한 내용을 글로 바꾸지 못했어요.';
    case 'invalid-reference':
      return '임시 음성 정보를 확인하지 못했어요.';
    case 'invalid-resource-owner':
      return '임시 음성을 안전하게 정리할 수 없어 진행을 멈췄어요.';
    case 'invalid-transcript':
      return '글로 바꾼 내용을 확인하지 못했어요.';
    case 'cleanup-failed':
      return '임시 음성을 정리하지 못했어요. 다시 정리해 주세요.';
  }
}

function error(code: FreeVoiceSessionErrorCode): SafeFreeVoiceError {
  return { code, safeMessage: safeMessage(code) };
}

function invalidState<T>(): FreeVoiceCommandResult<T> {
  return {
    ok: false,
    error: {
      code: 'invalid-state',
      safeMessage: '현재 상태에서는 이 작업을 할 수 없어요.',
    },
  };
}

function invalidTranscript<T>(): FreeVoiceCommandResult<T> {
  return {
    ok: false,
    error: {
      code: 'invalid-transcript',
      safeMessage: '글로 바꾼 내용을 한 글자 이상 확인해 주세요.',
    },
  };
}

function cloneRecording(recording: ActiveRecordingReference): ActiveRecordingReference {
  return { opaqueId: recording.opaqueId };
}

function cloneAudio(audio: TemporaryAudioReference): TemporaryAudioReference {
  return { opaqueId: audio.opaqueId };
}

function cloneError(value: SafeFreeVoiceError): SafeFreeVoiceError {
  return { code: value.code, safeMessage: value.safeMessage };
}

function cloneTarget(target: FreeVoiceCleanupTarget): FreeVoiceCleanupTarget {
  if (target.kind === 'active-recording') {
    return { kind: 'active-recording', recording: cloneRecording(target.recording) };
  }
  if (target.kind === 'temporary-audio') {
    return { kind: 'temporary-audio', audio: cloneAudio(target.audio) };
  }
  return { kind: 'owned-resource' };
}

function cloneContinuation(
  continuation: FreeVoiceCleanupContinuation,
): FreeVoiceCleanupContinuation {
  if (continuation.kind === 'review') {
    return { kind: 'review', transcript: continuation.transcript };
  }
  if (continuation.kind === 'failed') {
    return { kind: 'failed', error: cloneError(continuation.error) };
  }
  return { kind: 'cancelled' };
}

function cloneState(state: FreeVoiceRecordingState): FreeVoiceRecordingState {
  switch (state.status) {
    case 'idle':
    case 'starting':
    case 'cancelled':
      return { status: state.status };
    case 'start-failed':
    case 'resource-failed':
      return { status: state.status, error: cloneError(state.error) };
    case 'recording':
    case 'stopping':
      return { status: state.status, recording: cloneRecording(state.recording) };
    case 'stop-failed':
      return {
        status: state.status,
        recording: cloneRecording(state.recording),
        error: cloneError(state.error),
      };
    case 'transcribing':
      return { status: state.status, audio: cloneAudio(state.audio) };
    case 'transcription-failed':
      return {
        status: state.status,
        audio: cloneAudio(state.audio),
        error: cloneError(state.error),
      };
    case 'cleanup-required':
      return {
        status: state.status,
        target: cloneTarget(state.target),
        continuation: cloneContinuation(state.continuation),
        error: cloneError(state.error),
      };
    case 'reviewing':
      return { status: state.status, transcript: state.transcript };
  }
}

function success<T>(value: T): FreeVoiceCommandResult<T> {
  return { ok: true, value };
}

function isFailureCode<TCode extends string>(
  value: unknown,
  allowedCodes: readonly TCode[],
): value is { readonly ok: false; readonly error: { readonly code: TCode } } {
  return isRecord(value)
    && value.ok === false
    && isRecord(value.error)
    && typeof value.error.code === 'string'
    && allowedCodes.includes(value.error.code as TCode);
}

export class FreeVoiceRecordingSession {
  private state: FreeVoiceRecordingState = { status: 'idle' };
  private commandInFlight = false;
  private pendingOwnedResourceRelease:
    | (() => Promise<VoicePortResult<void, 'cleanup-failed'>>)
    | null = null;

  constructor(
    private readonly recorder: VoiceRecorderPort,
    private readonly transcriber: VoiceTranscriberPort,
    private readonly cleanup: TemporaryAudioCleanupPort,
  ) {}

  getState(): FreeVoiceRecordingState {
    return cloneState(this.state);
  }

  async startRecording(): Promise<FreeVoiceCommandResult> {
    if (this.commandInFlight) return invalidState();
    if (
      this.state.status !== 'idle'
      && this.state.status !== 'start-failed'
      && this.state.status !== 'resource-failed'
      && this.state.status !== 'cancelled'
    ) {
      return invalidState();
    }

    this.state = { status: 'starting' };
    this.commandInFlight = true;
    try {
      const result = await this.recorder.start();
      if (isRecord(result) && result.ok === true) {
        const recording = parseOpaqueReference<ActiveRecordingReference>(result.value);
        if (typeof result.release !== 'function') {
          if (recording) {
            await this.cancelRecording(recording, {
              kind: 'failed',
              error: error('invalid-resource-owner'),
            });
          } else {
            this.state = {
              status: 'resource-failed',
              error: error('invalid-resource-owner'),
            };
          }
          return success(this.getState());
        }
        if (recording) {
          this.state = { status: 'recording', recording };
        } else {
          await this.releaseOwnedResource(result.release, {
            kind: 'failed',
            error: error('invalid-reference'),
          });
        }
      } else {
        const code = isFailureCode(result, ['permission-denied', 'unavailable', 'start-failed'])
          ? result.error.code
          : 'start-failed';
        this.state = { status: 'start-failed', error: error(code) };
      }
    } catch {
      this.state = { status: 'start-failed', error: error('start-failed') };
    } finally {
      this.commandInFlight = false;
    }

    return success(this.getState());
  }

  async finishRecording(): Promise<FreeVoiceCommandResult> {
    if (this.commandInFlight) return invalidState();
    if (this.state.status !== 'recording' && this.state.status !== 'stop-failed') {
      return invalidState();
    }

    const recording = cloneRecording(this.state.recording);
    this.state = { status: 'stopping', recording };
    this.commandInFlight = true;
    try {
      const result = await this.recorder.finish(recording);
      if (isRecord(result) && result.ok === true) {
        const audio = parseOpaqueReference<TemporaryAudioReference>(result.value);
        if (typeof result.release !== 'function') {
          if (audio) {
            await this.deleteForContinuation(audio, {
              kind: 'failed',
              error: error('invalid-resource-owner'),
            });
          } else {
            this.state = {
              status: 'resource-failed',
              error: error('invalid-resource-owner'),
            };
          }
          return success(this.getState());
        }
        if (!audio) {
          await this.releaseOwnedResource(result.release, {
            kind: 'failed',
            error: error('invalid-reference'),
          });
        } else {
          await this.transcribeAndCleanup(audio);
        }
      } else {
        const code = isFailureCode(result, ['unavailable', 'stop-failed'])
          ? result.error.code
          : 'stop-failed';
        this.state = { status: 'stop-failed', recording, error: error(code) };
      }
    } catch {
      this.state = { status: 'stop-failed', recording, error: error('stop-failed') };
    } finally {
      this.commandInFlight = false;
    }

    return success(this.getState());
  }

  async retryTranscription(): Promise<FreeVoiceCommandResult> {
    if (this.commandInFlight) return invalidState();
    if (this.state.status !== 'transcription-failed') return invalidState();

    this.commandInFlight = true;
    try {
      await this.transcribeAndCleanup(cloneAudio(this.state.audio));
      return success(this.getState());
    } finally {
      this.commandInFlight = false;
    }
  }

  async cancel(): Promise<FreeVoiceCommandResult> {
    if (this.commandInFlight) return invalidState();
    if (this.state.status === 'recording' || this.state.status === 'stop-failed') {
      const recording = cloneRecording(this.state.recording);
      this.commandInFlight = true;
      try {
        await this.cancelRecording(recording);
        return success(this.getState());
      } finally {
        this.commandInFlight = false;
      }
    }

    if (this.state.status === 'transcription-failed') {
      const audio = cloneAudio(this.state.audio);
      this.commandInFlight = true;
      try {
        await this.deleteForContinuation(audio, { kind: 'cancelled' });
        return success(this.getState());
      } finally {
        this.commandInFlight = false;
      }
    }

    if (
      this.state.status === 'start-failed'
      || this.state.status === 'resource-failed'
      || this.state.status === 'reviewing'
    ) {
      this.state = { status: 'cancelled' };
      return success(this.getState());
    }

    return invalidState();
  }

  async retryCleanup(): Promise<FreeVoiceCommandResult> {
    if (this.commandInFlight) return invalidState();
    if (this.state.status !== 'cleanup-required') return invalidState();

    const target = cloneTarget(this.state.target);
    const continuation = cloneContinuation(this.state.continuation);
    this.commandInFlight = true;
    try {
      if (target.kind === 'active-recording') {
        await this.cancelRecording(target.recording, continuation);
      } else if (target.kind === 'temporary-audio') {
        await this.deleteForContinuation(target.audio, continuation);
      } else if (this.pendingOwnedResourceRelease) {
        await this.releaseOwnedResource(this.pendingOwnedResourceRelease, continuation);
      }
      return success(this.getState());
    } finally {
      this.commandInFlight = false;
    }
  }

  reviseTranscript(text: string): FreeVoiceCommandResult {
    if (this.state.status !== 'reviewing') return invalidState();
    if (typeof text !== 'string' || !text.trim()) return invalidTranscript();

    this.state = { status: 'reviewing', transcript: text };
    return success(this.getState());
  }

  createStoryHandoff(): FreeVoiceCommandResult<VoiceStoryHandoff> {
    if (this.state.status !== 'reviewing') return invalidState();
    if (!this.state.transcript.trim()) return invalidTranscript();

    return success({ inputMethod: 'voice', story: this.state.transcript });
  }

  private async transcribeAndCleanup(audio: TemporaryAudioReference): Promise<void> {
    this.state = { status: 'transcribing', audio: cloneAudio(audio) };
    try {
      const result = await this.transcriber.transcribe(cloneAudio(audio));
      if (isRecord(result) && result.ok === true) {
        const transcript = parseTranscript(result.value);
        if (!transcript) {
          this.state = {
            status: 'transcription-failed',
            audio: cloneAudio(audio),
            error: error('invalid-transcript'),
          };
          return;
        }
        await this.deleteForContinuation(audio, { kind: 'review', transcript });
        return;
      }

      const code = isFailureCode(result, ['unavailable', 'transcription-failed'])
        ? result.error.code
        : 'transcription-failed';
      this.state = {
        status: 'transcription-failed',
        audio: cloneAudio(audio),
        error: error(code),
      };
    } catch {
      this.state = {
        status: 'transcription-failed',
        audio: cloneAudio(audio),
        error: error('transcription-failed'),
      };
    }
  }

  private async cancelRecording(
    recording: ActiveRecordingReference,
    continuation: FreeVoiceCleanupContinuation = { kind: 'cancelled' },
  ): Promise<void> {
    try {
      const result = await this.recorder.cancel(cloneRecording(recording));
      if (isRecord(result) && result.ok === true) {
        this.applyContinuation(continuation);
        return;
      }
    } catch {
      // 포트 예외의 내용을 밖으로 노출하지 않고 정리 재시도 상태로 바꾼다.
    }

    this.state = {
      status: 'cleanup-required',
      target: { kind: 'active-recording', recording: cloneRecording(recording) },
      continuation: cloneContinuation(continuation),
      error: error('cleanup-failed'),
    };
  }

  private async deleteForContinuation(
    audio: TemporaryAudioReference,
    continuation: FreeVoiceCleanupContinuation,
  ): Promise<void> {
    try {
      const result = await this.cleanup.delete(cloneAudio(audio));
      if (isRecord(result) && result.ok === true) {
        this.applyContinuation(continuation);
        return;
      }
    } catch {
      // 포트 예외의 내용을 밖으로 노출하지 않고 정리 재시도 상태로 바꾼다.
    }

    this.state = {
      status: 'cleanup-required',
      target: { kind: 'temporary-audio', audio: cloneAudio(audio) },
      continuation: cloneContinuation(continuation),
      error: error('cleanup-failed'),
    };
  }

  private applyContinuation(continuation: FreeVoiceCleanupContinuation): void {
    if (continuation.kind === 'review') {
      this.state = { status: 'reviewing', transcript: continuation.transcript };
    } else if (continuation.kind === 'failed') {
      this.state = { status: 'resource-failed', error: cloneError(continuation.error) };
    } else {
      this.state = { status: 'cancelled' };
    }
  }

  private async releaseOwnedResource(
    release: () => Promise<VoicePortResult<void, 'cleanup-failed'>>,
    continuation: FreeVoiceCleanupContinuation,
  ): Promise<void> {
    this.pendingOwnedResourceRelease = release;
    try {
      const result = await release();
      if (isRecord(result) && result.ok === true) {
        this.pendingOwnedResourceRelease = null;
        this.applyContinuation(continuation);
        return;
      }
    } catch {
      // release 예외 원문을 노출하지 않고 같은 release만 재시도할 수 있게 보존한다.
    }

    this.state = {
      status: 'cleanup-required',
      target: { kind: 'owned-resource' },
      continuation: cloneContinuation(continuation),
      error: error('cleanup-failed'),
    };
  }
}
