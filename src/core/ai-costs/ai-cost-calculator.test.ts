import {
  OPENAI_LUNA_PRICE_PROFILE,
  OPENAI_TERRA_PRICE_PROFILE,
} from './openai-price-profiles';
import { estimateMonthlyAiCost, type AiCostScenario } from './ai-cost-calculator';

const MONTHLY_SESSIONS = 30;

function expectMonthlyCost(scenario: AiCostScenario, lunaUsd: number, terraUsd: number): void {
  const luna = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, scenario);
  const terra = estimateMonthlyAiCost(OPENAI_TERRA_PRICE_PROFILE, scenario);

  expect(luna.ok).toBe(true);
  expect(terra.ok).toBe(true);
  if (!luna.ok || !terra.ok) {
    return;
  }
  expect(luna.value.monthlyUsd).toBeCloseTo(lunaUsd, 10);
  expect(terra.value.monthlyUsd).toBeCloseTo(terraUsd, 10);
}

describe('estimateMonthlyAiCost', () => {
  it('가격 조사일과 프로필 ID를 결과에 보존한다', () => {
    const result = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
      monthlySessions: 1,
      perSession: { mode: 'text', inputTextTokens: 1_000, outputTextTokens: 300 },
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        profileId: 'openai-2026-08-24-gpt-5.6-luna',
        priceObservedOn: '2026-08-24',
        mode: 'text',
      },
    });
  });

  it('하루 한 번 텍스트 사용의 월 비용을 계산한다', () => {
    expectMonthlyCost(
      {
        monthlySessions: MONTHLY_SESSIONS,
        perSession: { mode: 'text', inputTextTokens: 1_000, outputTextTokens: 300 },
      },
      0.0168,
      0.168,
    );
  });

  it('5분 자유 음성 전사와 텍스트 결과의 월 비용을 계산한다', () => {
    expectMonthlyCost(
      {
        monthlySessions: MONTHLY_SESSIONS,
        perSession: {
          mode: 'free-voice',
          transcriptionMinutes: 5,
          inputTextTokens: 1_000,
          outputTextTokens: 300,
        },
      },
      0.6918,
      0.843,
    );
  });

  it('턴형 음성 핑퐁의 전사·텍스트·음성 합성 월 비용을 계산한다', () => {
    expectMonthlyCost(
      {
        monthlySessions: MONTHLY_SESSIONS,
        perSession: {
          mode: 'turn-based-voice',
          transcriptionMinutes: 2.5,
          textRequests: [
            { inputTextTokens: 500, outputTextTokens: 200 },
            { inputTextTokens: 1_000, outputTextTokens: 300 },
            { inputTextTokens: 1_500, outputTextTokens: 500 },
          ],
          speechCharacters: 750,
        },
      },
      0.729,
      1.215,
    );
  });

  it('Realtime 5분의 입력·출력 오디오 기본 월 비용을 계산한다', () => {
    expectMonthlyCost(
      {
        monthlySessions: MONTHLY_SESSIONS,
        perSession: {
          mode: 'realtime-voice',
          inputTextTokens: 0,
          outputTextTokens: 0,
          inputAudioTokens: 1_500,
          outputAudioTokens: 3_000,
        },
      },
      2.25,
      2.25,
    );
  });

  it('272K를 초과한 텍스트 입력에는 장문 배수 단가를 적용한다', () => {
    const result = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
      monthlySessions: 1,
      perSession: { mode: 'text', inputTextTokens: 272_001, outputTextTokens: 1_000 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.monthlyUsd).toBeCloseTo(0.1106004, 10);
  });

  it('정확히 272K인 텍스트 입력에는 기본 단가를 적용한다', () => {
    const result = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
      monthlySessions: 1,
      perSession: { mode: 'text', inputTextTokens: 272_000, outputTextTokens: 1_000 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.monthlyUsd).toBeCloseTo(0.0556, 10);
  });

  it('턴형 세션 합계가 272K를 넘어도 각 요청이 기준 이하면 기본 단가를 적용한다', () => {
    const result = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
      monthlySessions: 1,
      perSession: {
        mode: 'turn-based-voice',
        transcriptionMinutes: 0,
        textRequests: [
          { inputTextTokens: 140_000, outputTextTokens: 0 },
          { inputTextTokens: 140_000, outputTextTokens: 0 },
        ],
        speechCharacters: 0,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.monthlyUsd).toBeCloseTo(0.056, 10);
  });

  it('음성 길이를 1·3·5·10분으로 바꾼 자유 음성 비용을 재현한다', () => {
    const costs = [1, 3, 5, 10].map((minutes) => {
      const result = estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: MONTHLY_SESSIONS,
        perSession: {
          mode: 'free-voice',
          transcriptionMinutes: minutes,
          inputTextTokens: 1_000,
          outputTextTokens: 300,
        },
      });
      return result.ok ? result.value.monthlyUsd : null;
    });

    [0.1518, 0.4218, 0.6918, 1.3668].forEach((expected, index) => {
      expect(costs[index]).toBeCloseTo(expected, 10);
    });
  });

  it('음수·무한대·0회 사용 시나리오를 계산하지 않는다', () => {
    expect(
      estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: 0,
        perSession: { mode: 'text', inputTextTokens: 1_000, outputTextTokens: 300 },
      }),
    ).toEqual({ ok: false, error: 'invalid-usage-scenario' });
    expect(
      estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: 30,
        perSession: {
          mode: 'turn-based-voice',
          transcriptionMinutes: 2.5,
          textRequests: [],
          speechCharacters: 750,
        },
      }),
    ).toEqual({ ok: false, error: 'invalid-usage-scenario' });
    expect(
      estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: 30,
        perSession: { mode: 'text', inputTextTokens: -1, outputTextTokens: 300 },
      }),
    ).toEqual({ ok: false, error: 'invalid-usage-scenario' });
    expect(
      estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: 30,
        perSession: { mode: 'text', inputTextTokens: 1_000, outputTextTokens: Infinity },
      }),
    ).toEqual({ ok: false, error: 'invalid-usage-scenario' });
    expect(
      estimateMonthlyAiCost(OPENAI_LUNA_PRICE_PROFILE, {
        monthlySessions: 30,
        perSession: { mode: 'text', inputTextTokens: 1.5, outputTextTokens: 300 },
      }),
    ).toEqual({ ok: false, error: 'invalid-usage-scenario' });
  });

  it('잘못된 가격 프로필을 계산에 사용하지 않는다', () => {
    const result = estimateMonthlyAiCost(
      {
        ...OPENAI_LUNA_PRICE_PROFILE,
        text: {
          ...OPENAI_LUNA_PRICE_PROFILE.text,
          inputUsdPerMillionTokens: Number.NaN,
        },
      },
      {
        monthlySessions: 30,
        perSession: { mode: 'text', inputTextTokens: 1_000, outputTextTokens: 300 },
      },
    );

    expect(result).toEqual({ ok: false, error: 'invalid-price-profile' });
  });

  it('유한 입력의 계산 결과가 overflow되면 성공값으로 반환하지 않는다', () => {
    const result = estimateMonthlyAiCost(
      {
        ...OPENAI_LUNA_PRICE_PROFILE,
        text: {
          ...OPENAI_LUNA_PRICE_PROFILE.text,
          inputUsdPerMillionTokens: Number.MAX_VALUE,
        },
      },
      {
        monthlySessions: 30,
        perSession: {
          mode: 'text',
          inputTextTokens: Number.MAX_SAFE_INTEGER,
          outputTextTokens: 0,
        },
      },
    );

    expect(result).toEqual({ ok: false, error: 'cost-overflow' });
  });
});
