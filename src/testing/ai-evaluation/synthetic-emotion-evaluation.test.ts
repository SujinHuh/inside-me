import type {
  EmotionExplorer,
  EmotionExplorerRequest,
  EmotionExplorerResult,
} from '@/src/core/contracts';
import { InMemoryEmotionNeedVocabulary } from '@/src/core/vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '@/src/core/vocabulary/seed';

import {
  runSyntheticEmotionEvaluation,
  SYNTHETIC_EMOTION_EVALUATION_SCENARIOS,
  SYNTHETIC_EVALUATION_CATEGORIES,
} from './synthetic-emotion-evaluation';

const success = (index: number): EmotionExplorerResult => ({
  ok: true,
  value: {
    emotions: [
      {
        choice: {
          id: index % 2 === 0 ? 'emotion-hopeful' : 'emotion-tense',
          kind: 'emotion',
          label: index % 2 === 0 ? '희망에 찬' : '긴장한',
          source: 'catalog',
        },
        reason: '합성 평가용 안전한 이유',
      },
    ],
    needs: [
      {
        choice: {
          id: index % 2 === 0 ? 'need-growth' : 'need-safety',
          kind: 'need',
          label: index % 2 === 0 ? '성장' : '안전',
          source: 'catalog',
        },
        reason: '합성 평가용 안전한 이유',
      },
    ],
  },
});

describe('합성 감정 탐색 평가 기반', () => {
  it('정답표 없이 24개의 고유한 합성 상황과 네 범주를 제공한다', () => {
    expect(SYNTHETIC_EMOTION_EVALUATION_SCENARIOS).toHaveLength(24);
    expect(new Set(SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.map(({ id }) => id)).size).toBe(24);
    expect(
      new Set(SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.map(({ request }) => request.story)).size,
    ).toBe(24);

    for (const category of SYNTHETIC_EVALUATION_CATEGORIES) {
      expect(
        SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.filter((item) => item.category === category),
      ).toHaveLength(6);
    }

    expect(JSON.stringify(SYNTHETIC_EMOTION_EVALUATION_SCENARIOS)).not.toContain('expected');
  });

  it('사용자가 미리 고른 어휘 ID가 현재 카탈로그와 일치한다', () => {
    const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

    for (const { request } of SYNTHETIC_EMOTION_EVALUATION_SCENARIOS) {
      for (const choice of [...request.userSelected.emotions, ...request.userSelected.needs]) {
        expect(vocabulary.findById(choice.id)).toEqual(expect.objectContaining({
          id: choice.id,
          kind: choice.kind,
          label: choice.label,
        }));
      }
    }
  });

  it('상황을 순서대로 실행하고 성공·안전 오류와 후보 다양성을 요약한다', async () => {
    let callIndex = 0;
    let resolveFirstRequest!: (result: EmotionExplorerResult) => void;
    const firstRequest = new Promise<EmotionExplorerResult>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const suggest = jest.fn(async (_request: EmotionExplorerRequest): Promise<EmotionExplorerResult> => {
      const index = callIndex;
      callIndex += 1;
      if (index === 0) {
        return firstRequest;
      }
      if (index === 21) {
        return { ok: false, error: { code: 'invalid-response', safeMessage: '안전한 오류' } };
      }
      if (index === 22) {
        return { ok: false, error: { code: 'unavailable', safeMessage: '안전한 오류' } };
      }
      if (index === 23) {
        return { ok: false, error: { code: 'cancelled', safeMessage: '안전한 오류' } };
      }
      return success(index);
    });
    const explorer: EmotionExplorer = { suggest };

    const reportPromise = runSyntheticEmotionEvaluation(explorer);
    await Promise.resolve();
    expect(suggest).toHaveBeenCalledTimes(1);

    resolveFirstRequest(success(0));
    const report = await reportPromise;

    expect(suggest).toHaveBeenCalledTimes(24);
    expect(suggest.mock.calls.map(([request]) => request.story)).toEqual(
      SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.map(({ request }) => request.story),
    );
    expect(report).toEqual(expect.objectContaining({
      total: 24,
      statusCounts: { success: 21, invalidResponse: 1, unavailable: 1, cancelled: 1 },
      uniqueSuggestedEmotionIds: ['emotion-hopeful', 'emotion-tense'],
      uniqueSuggestedNeedIds: ['need-growth', 'need-safety'],
    }));
    expect(report.observations.map(({ scenarioId }) => scenarioId)).toEqual(
      SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.map(({ id }) => id),
    );
  });

  it('20개 미만이거나 중복된 상황은 공급자를 호출하기 전에 거부한다', async () => {
    const explorer: EmotionExplorer = { suggest: jest.fn(async () => success(0)) };

    await expect(
      runSyntheticEmotionEvaluation(explorer, SYNTHETIC_EMOTION_EVALUATION_SCENARIOS.slice(0, 19)),
    ).rejects.toThrow('20개 이상의 상황');

    const duplicate = [
      ...SYNTHETIC_EMOTION_EVALUATION_SCENARIOS,
      SYNTHETIC_EMOTION_EVALUATION_SCENARIOS[0],
    ];
    await expect(runSyntheticEmotionEvaluation(explorer, duplicate)).rejects.toThrow(
      '서로 달라야 합니다',
    );
    expect(explorer.suggest).not.toHaveBeenCalled();
  });
});
