import type {
  ExternalEmotionExplorerTransport,
  ExternalEmotionExplorerTransportResult,
} from '@/src/application/exploration/external-emotion-explorer-transport';
import type { EmotionChoice, EmotionExplorerRequest, NeedChoice } from '@/src/core/contracts';
import { InMemoryEmotionNeedVocabulary } from '@/src/core/vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '@/src/core/vocabulary/seed';

import { ValidatedExternalEmotionExplorer } from './validated-external-emotion-explorer';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
const selectedEmotion: EmotionChoice = {
  id: 'emotion-worried',
  kind: 'emotion',
  label: '걱정되는',
  source: 'catalog',
};
const selectedNeed: NeedChoice = {
  id: 'need-safety',
  kind: 'need',
  label: '안전',
  source: 'catalog',
};
const request: EmotionExplorerRequest = {
  story: '  발표 순서를 기다리며 마음이 복잡했다.  ',
  userSelected: {
    emotions: [
      selectedEmotion,
      {
        id: 'user-added-emotion-%EB%82%B4%EB%A7%88%EC%9D%8C',
        kind: 'emotion',
        label: '내마음',
        source: 'user-added',
      },
    ],
    needs: [selectedNeed],
  },
};

function createHarness(
  result: ExternalEmotionExplorerTransportResult,
  requestId = 'request-synthetic-1',
) {
  const requestSuggestions = jest.fn(async () => result);
  const transport: ExternalEmotionExplorerTransport = { requestSuggestions };
  const explorer = new ValidatedExternalEmotionExplorer(
    transport,
    vocabulary,
    () => requestId,
  );
  return { explorer, requestSuggestions };
}

describe('ValidatedExternalEmotionExplorer', () => {
  it('이야기와 사용자 선택 ID만 전송하고 기존 어휘의 후보만 반환한다', async () => {
    const { explorer, requestSuggestions } = createHarness({
      ok: true,
      value: {
        emotions: [
          {
            id: 'emotion-tense',
            reasonCode: 'uncertainty',
            reason: '공황장애일 수 있어요.',
            ignoredDiaryEcho: '응답에 섞이면 안 되는 합성 필드',
          },
        ],
        needs: [
          {
            id: 'need-rest',
            reasonCode: 'settling-needed',
          },
        ],
        ignoredMetadata: { model: 'synthetic' },
      },
    });

    const result = await explorer.suggest(request);
    expect(result).toEqual({
      ok: true,
      value: {
        emotions: [
          {
            choice: {
              id: 'emotion-tense',
              kind: 'emotion',
              label: '긴장한',
              source: 'catalog',
            },
            reason: '앞일이 분명하지 않았던 순간과 이어지는 표현인지 함께 살펴볼 수 있어요.',
          },
        ],
        needs: [
          {
            choice: { id: 'need-rest', kind: 'need', label: '휴식', source: 'catalog' },
            reason: '안정되거나 잠시 쉬는 것이 중요했는지 함께 살펴볼 수 있어요.',
          },
        ],
      },
    });
    expect(requestSuggestions).toHaveBeenCalledWith({
      requestId: 'request-synthetic-1',
      story: '발표 순서를 기다리며 마음이 복잡했다.',
      userSelected: {
        emotionIds: ['emotion-worried'],
        needIds: ['need-safety'],
      },
    });
    expect(JSON.stringify(result)).not.toContain('공황장애');
  });

  it.each([
    ['알 수 없는 ID', { emotions: [{ id: 'emotion-unknown', reasonCode: 'general-possibility' }], needs: [] }],
    ['잘못된 종류', { emotions: [{ id: 'need-rest', reasonCode: 'general-possibility' }], needs: [] }],
    ['사용자가 이미 고른 ID', { emotions: [{ id: 'emotion-worried', reasonCode: 'general-possibility' }], needs: [] }],
    ['중복 ID', { emotions: [
      { id: 'emotion-tense', reasonCode: 'general-possibility' },
      { id: 'emotion-tense', reasonCode: 'uncertainty' },
    ], needs: [] }],
    ['알 수 없는 이유 코드', { emotions: [{ id: 'emotion-tense', reasonCode: 'diagnosis' }], needs: [] }],
    ['이유 코드 누락', { emotions: [{ id: 'emotion-tense' }], needs: [] }],
    ['과도한 후보 수', { emotions: [
      'joyful', 'happy', 'grateful', 'excited', 'comfortable', 'peaceful',
    ].map((id) => ({ id: `emotion-${id}`, reasonCode: 'general-possibility' })), needs: [] }],
  ])('%s 응답을 사용자 후보로 전달하지 않는다', async (_label, value) => {
    const { explorer } = createHarness({ ok: true, value });

    await expect(explorer.suggest(request)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid-response' }),
    });
  });

  it.each([
    ['cancelled', 'cancelled'],
    ['unavailable', 'unavailable'],
    ['invalid-response', 'invalid-response'],
  ] as const)('transport의 %s를 안전한 %s 오류로 변환한다', async (transportCode, resultCode) => {
    const { explorer } = createHarness({ ok: false, error: { code: transportCode } });

    await expect(explorer.suggest(request)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: resultCode }),
    });
  });

  it('transport 예외 원문 대신 안전한 오류만 반환한다', async () => {
    const requestSuggestions = jest.fn(async (): Promise<ExternalEmotionExplorerTransportResult> => {
      throw new Error('합성 이야기나 공급자 세부 정보가 포함될 수 있는 오류');
    });
    const explorer = new ValidatedExternalEmotionExplorer(
      { requestSuggestions },
      vocabulary,
      () => 'request-synthetic-2',
    );

    const result = await explorer.suggest(request);
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unavailable' }),
    });
    expect(JSON.stringify(result)).not.toContain('합성 이야기');
  });

  it('request ID factory 예외도 안전한 오류로 변환한다', async () => {
    const requestSuggestions = jest.fn();
    const explorer = new ValidatedExternalEmotionExplorer(
      { requestSuggestions },
      vocabulary,
      () => {
        throw new Error('시스템 세부 정보');
      },
    );

    await expect(explorer.suggest(request)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unavailable' }),
    });
    expect(requestSuggestions).not.toHaveBeenCalled();
  });

  it('문자열이 아닌 request ID는 강제 변환하지 않고 거부한다', async () => {
    const requestSuggestions = jest.fn();
    const createUnsafeRequestId = (() => ({
      toString: () => 'request-looks-valid',
      secret: '전송하면 안 되는 합성 값',
    })) as unknown as () => string;
    const explorer = new ValidatedExternalEmotionExplorer(
      { requestSuggestions },
      vocabulary,
      createUnsafeRequestId,
    );

    await expect(explorer.suggest(request)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid-response' }),
    });
    expect(requestSuggestions).not.toHaveBeenCalled();
  });

  it.each([
    ['알 수 없는 카탈로그 ID', {
      ...request,
      userSelected: { emotions: [{ ...selectedEmotion, id: 'emotion-unknown' }], needs: [] },
    }],
    ['잘못된 카탈로그 종류', {
      ...request,
      userSelected: { emotions: [{ ...selectedEmotion, id: 'need-rest' }], needs: [] },
    }],
    ['잘못된 출처', {
      ...request,
      userSelected: { emotions: [{ ...selectedEmotion, source: 'external' }], needs: [] },
    }],
    ['런타임 구조 오류', { story: '합성 이야기', userSelected: null }],
  ])('%s 선택은 transport를 호출하기 전에 거부한다', async (_label, invalidRequest) => {
    const { explorer, requestSuggestions } = createHarness({
      ok: true,
      value: { emotions: [], needs: [] },
    });

    await expect(explorer.suggest(invalidRequest as EmotionExplorerRequest)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid-response' }),
    });
    expect(requestSuggestions).not.toHaveBeenCalled();
  });

  it.each([
    ['빈 이야기', { ...request, story: '   ' }, 'request-synthetic-3'],
    ['잘못된 요청 ID', request, '요청 ID에 공백'],
  ])('%s는 transport를 호출하기 전에 거부한다', async (_label, invalidRequest, requestId) => {
    const { explorer, requestSuggestions } = createHarness(
      { ok: true, value: { emotions: [], needs: [] } },
      requestId,
    );

    await expect(explorer.suggest(invalidRequest)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid-response' }),
    });
    expect(requestSuggestions).not.toHaveBeenCalled();
  });
});
