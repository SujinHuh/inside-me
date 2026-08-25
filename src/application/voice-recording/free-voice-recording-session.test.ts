import {
  ControllableTemporaryAudioCleanupPort,
  ControllableVoiceRecorderPort,
  ControllableVoiceTranscriberPort,
} from '@/src/testing/fakes/controllable-voice-recording-ports';

import type { FreeVoiceRecordingState } from './contracts';
import { FreeVoiceRecordingSession } from './free-voice-recording-session';

const RECORDING_ID = 'recording-synthetic-1';
const AUDIO_ID = 'audio-synthetic-1';
const SYNTHETIC_TRANSCRIPT = '  합성된 하루 기록  ';

function createHarness() {
  const recorder = new ControllableVoiceRecorderPort();
  const transcriber = new ControllableVoiceTranscriberPort();
  const cleanup = new ControllableTemporaryAudioCleanupPort();
  const session = new FreeVoiceRecordingSession(recorder, transcriber, cleanup);
  return { session, recorder, transcriber, cleanup };
}

function queueRecordingStarted(recorder: ControllableVoiceRecorderPort): void {
  recorder.queueStart({ ok: true, value: { opaqueId: RECORDING_ID } });
}

async function startRecording(
  session: FreeVoiceRecordingSession,
  recorder: ControllableVoiceRecorderPort,
): Promise<void> {
  queueRecordingStarted(recorder);
  await session.startRecording();
  expect(session.getState()).toEqual({
    status: 'recording',
    recording: { opaqueId: RECORDING_ID },
  });
}

async function reachCleanupRequiredForReview(
  session: FreeVoiceRecordingSession,
  recorder: ControllableVoiceRecorderPort,
  transcriber: ControllableVoiceTranscriberPort,
  cleanup: ControllableTemporaryAudioCleanupPort,
): Promise<void> {
  await startRecording(session, recorder);
  recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
  transcriber.queueResult(
    { ok: true, value: { text: SYNTHETIC_TRANSCRIPT } },
    AUDIO_ID,
  );
  cleanup.queueResult({ ok: false, error: { code: 'cleanup-failed' } });
  await session.finishRecording();
  expect(session.getState()).toMatchObject({
    status: 'cleanup-required',
    target: { kind: 'temporary-audio', audio: { opaqueId: AUDIO_ID } },
    continuation: { kind: 'review', transcript: SYNTHETIC_TRANSCRIPT },
  });
}

describe('FreeVoiceRecordingSession', () => {
  it('녹음·전사·임시 오디오 삭제 후에만 원문을 보존한 검토와 글 인계를 제공한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    queueRecordingStarted(recorder);
    recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
    transcriber.queueResult(
      { ok: true, value: { text: SYNTHETIC_TRANSCRIPT } },
      AUDIO_ID,
    );
    cleanup.queueResult({ ok: true, value: undefined });

    await session.startRecording();
    const finished = await session.finishRecording();

    expect(finished).toEqual({
      ok: true,
      value: { status: 'reviewing', transcript: SYNTHETIC_TRANSCRIPT },
    });
    expect(recorder.startCalls).toBe(1);
    expect(recorder.finishCalls).toBe(1);
    expect(transcriber.transcribeCalls).toBe(1);
    expect(cleanup.deleteCalls).toBe(1);

    const revised = '  사용자가 수정한 합성 기록  ';
    expect(session.reviseTranscript(revised)).toEqual({
      ok: true,
      value: { status: 'reviewing', transcript: revised },
    });
    expect(session.createStoryHandoff()).toEqual({
      ok: true,
      value: { inputMethod: 'voice', story: revised },
    });
  });

  it('빈 수정문은 거부하고 마지막으로 확인한 전사 원문을 유지한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    queueRecordingStarted(recorder);
    recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
    transcriber.queueResult({ ok: true, value: { text: SYNTHETIC_TRANSCRIPT } });
    cleanup.queueResult({ ok: true, value: undefined });
    await session.startRecording();
    await session.finishRecording();

    expect(session.reviseTranscript('   ')).toMatchObject({
      ok: false,
      error: { code: 'invalid-transcript' },
    });
    expect(session.getState()).toEqual({
      status: 'reviewing',
      transcript: SYNTHETIC_TRANSCRIPT,
    });
  });

  it.each([
    ['녹음 시작', 'start'],
    ['녹음 종료', 'finish'],
    ['전사', 'transcribe'],
  ] as const)('%s 포트 예외 원문을 반환하지 않고 안전한 오류로 바꾼다', async (_label, operation) => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    const privateDetail = '노출되면 안 되는 합성 공급자 세부 정보';

    if (operation === 'start') {
      recorder.queueStartThrow(new Error(privateDetail));
      await session.startRecording();
    } else {
      await startRecording(session, recorder);
      if (operation === 'finish') {
        recorder.queueFinishThrow(new Error(privateDetail));
      } else {
        recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
        transcriber.queueThrow(new Error(privateDetail));
      }
      await session.finishRecording();
    }

    const serialized = JSON.stringify(session.getState());
    expect(serialized).not.toContain(privateDetail);
    expect(serialized).not.toContain('Error');
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('유효한 시작 참조라도 release가 없으면 녹음 상태로 진행하지 않는다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    recorder.queueStartWithoutRelease({ opaqueId: RECORDING_ID });
    recorder.queueCancel({ ok: true, value: undefined });

    await session.startRecording();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-resource-owner' },
    });
    expect(transcriber.transcribeCalls).toBe(0);
    expect(recorder.cancelCalls).toBe(1);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it.each([
    ['null', null],
    ['빈 객체', {}],
    ['빈 ID', { opaqueId: '   ' }],
    ['문자열이 아닌 ID', { opaqueId: 123 }],
  ])('잘못된 녹음 참조(%s)를 기록 중 상태로 받지 않는다', async (_label, value) => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    recorder.queueStart({ ok: true, value });

    await session.startRecording();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-reference' },
    });
    expect(recorder.startReleaseCalls).toBe(1);
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('유효한 종료 참조라도 release가 없으면 전사로 진행하지 않는다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinishWithoutRelease({ opaqueId: AUDIO_ID });
    cleanup.queueResult({ ok: true, value: undefined });

    await session.finishRecording();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-resource-owner' },
    });
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(1);
  });

  it.each([
    ['빈 객체', {}],
    ['빈 ID', { opaqueId: '' }],
    ['배열', [{ opaqueId: AUDIO_ID }]],
  ])('잘못된 임시 오디오 참조(%s)를 전사하지 않는다', async (_label, value) => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinish({ ok: true, value });

    await session.finishRecording();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-reference' },
    });
    expect(recorder.finishReleaseCalls).toBe(1);
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('잘못된 시작 참조의 release 실패는 같은 소유 자원 정리로만 재시도한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    recorder.queueStart(
      { ok: true, value: {} },
      [
        { ok: false, error: { code: 'cleanup-failed' } },
        { ok: true, value: undefined },
      ],
    );

    await session.startRecording();
    expect(session.getState()).toMatchObject({
      status: 'cleanup-required',
      target: { kind: 'owned-resource' },
    });
    await session.retryCleanup();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-reference' },
    });
    expect(recorder.startReleaseCalls).toBe(2);
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(0);
    expect(session.retryCleanup()).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid-state' },
    });
  });

  it('잘못된 종료 참조의 release 예외도 원문 없이 보존하고 같은 release로 복구한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    const privateDetail = '노출되면 안 되는 합성 release 세부 정보';
    recorder.queueFinishWithThrowThenSuccessfulRelease(
      { ok: true, value: {} },
      new Error(privateDetail),
    );

    await session.finishRecording();
    expect(JSON.stringify(session.getState())).not.toContain(privateDetail);
    expect(session.getState()).toMatchObject({
      status: 'cleanup-required',
      target: { kind: 'owned-resource' },
    });
    await session.retryCleanup();

    expect(session.getState()).toMatchObject({
      status: 'resource-failed',
      error: { code: 'invalid-reference' },
    });
    expect(recorder.finishReleaseCalls).toBe(2);
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('소유 자원 release 재시도 중 중복 명령을 막고 성공 뒤 release를 다시 호출하지 않는다', async () => {
    const { session, recorder } = createHarness();
    const deferred = recorder.queueStartWithFailedThenDeferredRelease({ ok: true, value: {} });

    await session.startRecording();
    const firstRetry = session.retryCleanup();
    const duplicate = await session.retryCleanup();

    expect(duplicate).toMatchObject({ ok: false, error: { code: 'invalid-state' } });
    expect(recorder.startReleaseCalls).toBe(2);
    deferred.resolve({ ok: true, value: undefined });
    await firstRetry;
    expect(session.getState()).toMatchObject({ status: 'resource-failed' });
    await session.retryCleanup();
    expect(recorder.startReleaseCalls).toBe(2);
  });

  it.each([
    ['빈 객체', {}],
    ['빈 문자열', { text: '  ' }],
    ['문자열이 아닌 본문', { text: 42 }],
  ])('잘못된 전사 결과(%s)는 삭제·검토로 진행하지 않는다', async (_label, value) => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
    transcriber.queueResult({ ok: true, value }, AUDIO_ID);

    await session.finishRecording();

    expect(session.getState()).toMatchObject({
      status: 'transcription-failed',
      audio: { opaqueId: AUDIO_ID },
      error: { code: 'invalid-transcript' },
    });
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('전사 실패 뒤 같은 불투명 참조로 재시도하고 성공한 원본을 삭제한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
    transcriber.queueResult(
      { ok: false, error: { code: 'transcription-failed' } },
      AUDIO_ID,
    );
    transcriber.queueResult(
      { ok: true, value: { text: SYNTHETIC_TRANSCRIPT } },
      AUDIO_ID,
    );
    cleanup.queueResult({ ok: true, value: undefined });

    await session.finishRecording();
    expect(session.getState()).toMatchObject({ status: 'transcription-failed' });
    await session.retryTranscription();

    expect(session.getState()).toEqual({
      status: 'reviewing',
      transcript: SYNTHETIC_TRANSCRIPT,
    });
    expect(transcriber.transcribeCalls).toBe(2);
    expect(cleanup.deleteCalls).toBe(1);
  });

  it('녹음 종료 실패 뒤 취소하면 활성 녹음만 정리하고 종료한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinish({ ok: false, error: { code: 'stop-failed' } });
    recorder.queueCancel({ ok: true, value: undefined });
    await session.finishRecording();

    await session.cancel();

    expect(session.getState()).toEqual({ status: 'cancelled' });
    expect(recorder.cancelCalls).toBe(1);
    expect(transcriber.transcribeCalls).toBe(0);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('전사 실패 뒤 취소하면 임시 오디오를 삭제하고 전사를 저장하지 않는다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueFinish({ ok: true, value: { opaqueId: AUDIO_ID } });
    transcriber.queueResult({ ok: false, error: { code: 'unavailable' } });
    cleanup.queueResult({ ok: true, value: undefined });
    await session.finishRecording();

    await session.cancel();

    expect(session.getState()).toEqual({ status: 'cancelled' });
    expect(cleanup.deleteCalls).toBe(1);
    expect(session.createStoryHandoff()).toMatchObject({
      ok: false,
      error: { code: 'invalid-state' },
    });
  });

  it('임시 오디오 삭제 실패 뒤 삭제만 재시도하고 전사를 반복하지 않는다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await reachCleanupRequiredForReview(session, recorder, transcriber, cleanup);
    cleanup.queueResult({ ok: true, value: undefined });

    await session.retryCleanup();

    expect(session.getState()).toEqual({
      status: 'reviewing',
      transcript: SYNTHETIC_TRANSCRIPT,
    });
    expect(transcriber.transcribeCalls).toBe(1);
    expect(cleanup.deleteCalls).toBe(2);
  });

  it('녹음 취소 정리 실패도 cleanup-required로 남기고 같은 정리만 재시도한다', async () => {
    const { session, recorder, cleanup } = createHarness();
    await startRecording(session, recorder);
    recorder.queueCancel({ ok: false, error: { code: 'cleanup-failed' } });
    recorder.queueCancel({ ok: true, value: undefined });

    await session.cancel();
    expect(session.getState()).toMatchObject({
      status: 'cleanup-required',
      target: { kind: 'active-recording', recording: { opaqueId: RECORDING_ID } },
      continuation: { kind: 'cancelled' },
    });
    await session.retryCleanup();

    expect(session.getState()).toEqual({ status: 'cancelled' });
    expect(recorder.cancelCalls).toBe(2);
    expect(cleanup.deleteCalls).toBe(0);
  });

  it('시작 중 중복 명령은 두 번째 포트 호출 없이 거부한다', async () => {
    const { session, recorder } = createHarness();
    const deferred = recorder.deferStart();

    const first = session.startRecording();
    const duplicate = await session.startRecording();

    expect(duplicate).toMatchObject({ ok: false, error: { code: 'invalid-state' } });
    expect(recorder.startCalls).toBe(1);
    deferred.resolve({ ok: true, value: { opaqueId: RECORDING_ID } });
    await first;
    expect(session.getState()).toMatchObject({ status: 'recording' });
  });

  it('정리 재시도 중 중복 명령은 삭제를 한 번만 호출한다', async () => {
    const { session, recorder, transcriber, cleanup } = createHarness();
    await reachCleanupRequiredForReview(session, recorder, transcriber, cleanup);
    const deferred = cleanup.defer();

    const first = session.retryCleanup();
    const duplicate = await session.retryCleanup();

    expect(duplicate).toMatchObject({ ok: false, error: { code: 'invalid-state' } });
    expect(cleanup.deleteCalls).toBe(2);
    deferred.resolve({ ok: true, value: undefined });
    await first;
    expect(session.getState()).toEqual({
      status: 'reviewing',
      transcript: SYNTHETIC_TRANSCRIPT,
    });
    expect(transcriber.transcribeCalls).toBe(1);
  });

  it('getState 반환값 변경이 세션의 임시 참조를 바꾸지 않는다', async () => {
    const { session, recorder } = createHarness();
    await startRecording(session, recorder);
    const state = session.getState() as Extract<FreeVoiceRecordingState, { status: 'recording' }>;

    (state.recording as { opaqueId: string }).opaqueId = 'changed-synthetic-id';

    expect(session.getState()).toEqual({
      status: 'recording',
      recording: { opaqueId: RECORDING_ID },
    });
  });
});
