import type {
  ActiveRecordingReference,
  TemporaryAudioCleanupPort,
  TemporaryAudioReference,
  VoicePortResult,
  VoiceOwnedResourceResult,
  VoiceRecorderPort,
  VoiceRecorderStartErrorCode,
  VoiceRecorderStopErrorCode,
  VoiceTranscriberPort,
  VoiceTranscriptionErrorCode,
} from '@/src/application/voice-recording/contracts';

export interface DeferredResult<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
}

type Outcome<T> = () => Promise<T>;

function createDeferredResult<T>(): DeferredResult<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

function resolved<T>(value: T): Outcome<T> {
  return async () => value;
}

function rejected<T>(reason: unknown): Outcome<T> {
  return async () => {
    throw reason;
  };
}

function takeNext<T>(queue: Outcome<T>[], operation: string): Promise<T> {
  const next = queue.shift();
  if (!next) {
    throw new Error(`No synthetic ${operation} result was configured.`);
  }
  return next();
}

export class ControllableVoiceRecorderPort implements VoiceRecorderPort {
  startCalls = 0;
  finishCalls = 0;
  cancelCalls = 0;
  startReleaseCalls = 0;
  finishReleaseCalls = 0;

  private readonly startOutcomes: Outcome<
    VoiceOwnedResourceResult<VoiceRecorderStartErrorCode>
  >[] = [];
  private readonly finishOutcomes: Outcome<
    VoiceOwnedResourceResult<VoiceRecorderStopErrorCode>
  >[] = [];
  private readonly cancelOutcomes: Outcome<VoicePortResult<void, 'cleanup-failed'>>[] = [];

  queueStart(
    result: VoicePortResult<unknown, VoiceRecorderStartErrorCode>,
    releaseResults: VoicePortResult<void, 'cleanup-failed'>[] = [
      { ok: true, value: undefined },
    ],
  ): void {
    this.startOutcomes.push(resolved(this.withStartRelease(result, releaseResults)));
  }

  queueStartThrow(reason: unknown): void {
    this.startOutcomes.push(rejected(reason));
  }

  queueStartWithoutRelease(value: unknown): void {
    this.startOutcomes.push(resolved(
      { ok: true, value } as VoiceOwnedResourceResult<VoiceRecorderStartErrorCode>,
    ));
  }

  queueStartWithDeferredRelease(
    result: { readonly ok: true; readonly value: unknown },
  ): DeferredResult<VoicePortResult<void, 'cleanup-failed'>> {
    const deferred = createDeferredResult<VoicePortResult<void, 'cleanup-failed'>>();
    this.startOutcomes.push(resolved(this.withStartReleaseOutcomes(
      result,
      [() => deferred.promise],
    )));
    return deferred;
  }

  queueStartWithFailedThenDeferredRelease(
    result: { readonly ok: true; readonly value: unknown },
  ): DeferredResult<VoicePortResult<void, 'cleanup-failed'>> {
    const deferred = createDeferredResult<VoicePortResult<void, 'cleanup-failed'>>();
    this.startOutcomes.push(resolved(this.withStartReleaseOutcomes(
      result,
      [
        resolved({ ok: false, error: { code: 'cleanup-failed' } }),
        () => deferred.promise,
      ],
    )));
    return deferred;
  }

  deferStart(): DeferredResult<VoicePortResult<unknown, VoiceRecorderStartErrorCode>> {
    const deferred = createDeferredResult<VoicePortResult<unknown, VoiceRecorderStartErrorCode>>();
    this.startOutcomes.push(async () => this.withStartRelease(
      await deferred.promise,
      [{ ok: true, value: undefined }],
    ));
    return deferred;
  }

  queueFinish(
    result: VoicePortResult<unknown, VoiceRecorderStopErrorCode>,
    releaseResults: VoicePortResult<void, 'cleanup-failed'>[] = [
      { ok: true, value: undefined },
    ],
  ): void {
    this.finishOutcomes.push(resolved(this.withFinishRelease(result, releaseResults)));
  }

  queueFinishThrow(reason: unknown): void {
    this.finishOutcomes.push(rejected(reason));
  }

  queueFinishWithoutRelease(value: unknown): void {
    this.finishOutcomes.push(resolved(
      { ok: true, value } as VoiceOwnedResourceResult<VoiceRecorderStopErrorCode>,
    ));
  }

  queueFinishWithThrowThenSuccessfulRelease(
    result: { readonly ok: true; readonly value: unknown },
    reason: unknown,
  ): void {
    this.finishOutcomes.push(resolved(this.withFinishReleaseOutcomes(
      result,
      [
        rejected(reason),
        resolved({ ok: true, value: undefined }),
      ],
    )));
  }

  deferFinish(): DeferredResult<VoicePortResult<unknown, VoiceRecorderStopErrorCode>> {
    const deferred = createDeferredResult<VoicePortResult<unknown, VoiceRecorderStopErrorCode>>();
    this.finishOutcomes.push(async () => this.withFinishRelease(
      await deferred.promise,
      [{ ok: true, value: undefined }],
    ));
    return deferred;
  }

  queueCancel(result: VoicePortResult<void, 'cleanup-failed'>): void {
    this.cancelOutcomes.push(resolved(result));
  }

  queueCancelThrow(reason: unknown): void {
    this.cancelOutcomes.push(rejected(reason));
  }

  deferCancel(): DeferredResult<VoicePortResult<void, 'cleanup-failed'>> {
    const deferred = createDeferredResult<VoicePortResult<void, 'cleanup-failed'>>();
    this.cancelOutcomes.push(() => deferred.promise);
    return deferred;
  }

  start(): Promise<VoiceOwnedResourceResult<VoiceRecorderStartErrorCode>> {
    this.startCalls += 1;
    return takeNext(this.startOutcomes, 'start');
  }

  finish(
    _recording: ActiveRecordingReference,
  ): Promise<VoiceOwnedResourceResult<VoiceRecorderStopErrorCode>> {
    this.finishCalls += 1;
    return takeNext(this.finishOutcomes, 'finish');
  }

  cancel(
    _recording: ActiveRecordingReference,
  ): Promise<VoicePortResult<void, 'cleanup-failed'>> {
    this.cancelCalls += 1;
    return takeNext(this.cancelOutcomes, 'cancel');
  }

  private withStartRelease(
    result: VoicePortResult<unknown, VoiceRecorderStartErrorCode>,
    releaseResults: VoicePortResult<void, 'cleanup-failed'>[],
  ): VoiceOwnedResourceResult<VoiceRecorderStartErrorCode> {
    return this.withStartReleaseOutcomes(result, releaseResults.map(resolved));
  }

  private withStartReleaseOutcomes(
    result: VoicePortResult<unknown, VoiceRecorderStartErrorCode>,
    outcomes: Outcome<VoicePortResult<void, 'cleanup-failed'>>[],
  ): VoiceOwnedResourceResult<VoiceRecorderStartErrorCode> {
    if (!result.ok) return result;
    return {
      ...result,
      release: async () => {
        this.startReleaseCalls += 1;
        return takeNext(outcomes, 'start release');
      },
    };
  }

  private withFinishRelease(
    result: VoicePortResult<unknown, VoiceRecorderStopErrorCode>,
    releaseResults: VoicePortResult<void, 'cleanup-failed'>[],
  ): VoiceOwnedResourceResult<VoiceRecorderStopErrorCode> {
    return this.withFinishReleaseOutcomes(result, releaseResults.map(resolved));
  }

  private withFinishReleaseOutcomes(
    result: VoicePortResult<unknown, VoiceRecorderStopErrorCode>,
    outcomes: Outcome<VoicePortResult<void, 'cleanup-failed'>>[],
  ): VoiceOwnedResourceResult<VoiceRecorderStopErrorCode> {
    if (!result.ok) return result;
    return {
      ...result,
      release: async () => {
        this.finishReleaseCalls += 1;
        return takeNext(outcomes, 'finish release');
      },
    };
  }
}

export class ControllableVoiceTranscriberPort implements VoiceTranscriberPort {
  transcribeCalls = 0;

  private readonly outcomes: {
    readonly expectedOpaqueId?: string;
    readonly run: Outcome<VoicePortResult<unknown, VoiceTranscriptionErrorCode>>;
  }[] = [];

  queueResult(
    result: VoicePortResult<unknown, VoiceTranscriptionErrorCode>,
    expectedOpaqueId?: string,
  ): void {
    this.outcomes.push({ expectedOpaqueId, run: resolved(result) });
  }

  queueThrow(reason: unknown): void {
    this.outcomes.push({ run: rejected(reason) });
  }

  defer(): DeferredResult<VoicePortResult<unknown, VoiceTranscriptionErrorCode>> {
    const deferred = createDeferredResult<VoicePortResult<unknown, VoiceTranscriptionErrorCode>>();
    this.outcomes.push({ run: () => deferred.promise });
    return deferred;
  }

  transcribe(
    audio: TemporaryAudioReference,
  ): Promise<VoicePortResult<unknown, VoiceTranscriptionErrorCode>> {
    this.transcribeCalls += 1;
    const next = this.outcomes.shift();
    if (!next) throw new Error('No synthetic transcription result was configured.');
    if (next.expectedOpaqueId !== undefined && next.expectedOpaqueId !== audio.opaqueId) {
      throw new Error('The synthetic audio reference did not match.');
    }
    return next.run();
  }
}

export class ControllableTemporaryAudioCleanupPort implements TemporaryAudioCleanupPort {
  deleteCalls = 0;

  private readonly outcomes: Outcome<VoicePortResult<void, 'cleanup-failed'>>[] = [];

  queueResult(result: VoicePortResult<void, 'cleanup-failed'>): void {
    this.outcomes.push(resolved(result));
  }

  queueThrow(reason: unknown): void {
    this.outcomes.push(rejected(reason));
  }

  defer(): DeferredResult<VoicePortResult<void, 'cleanup-failed'>> {
    const deferred = createDeferredResult<VoicePortResult<void, 'cleanup-failed'>>();
    this.outcomes.push(() => deferred.promise);
    return deferred;
  }

  delete(
    _audio: TemporaryAudioReference,
  ): Promise<VoicePortResult<void, 'cleanup-failed'>> {
    this.deleteCalls += 1;
    return takeNext(this.outcomes, 'cleanup');
  }
}
