import {
  AiCostBudgetCoordinator,
  cancelAiCostReservation,
  createAiCostBudget,
  reserveEstimatedAiCost,
  settleReservedAiCost,
} from './ai-cost-budget';

describe('AI 비용 합성 예산', () => {
  it('다음 요청의 보수적 예상비를 먼저 예약한다', () => {
    const created = createAiCostBudget(1, 0.2);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(reserveEstimatedAiCost(created.value, 0.3)).toEqual({
      ok: true,
      value: { limitUsd: 1, spentUsd: 0.2, reservedUsd: 0.3 },
    });
  });

  it('남은 승인 예산보다 큰 요청을 예약하지 않는다', () => {
    const result = reserveEstimatedAiCost(
      { limitUsd: 1, spentUsd: 0.8, reservedUsd: null },
      0.21,
    );

    expect(result).toEqual({ ok: false, error: 'insufficient-budget' });
  });

  it('부동소수점 오차 때문에 남은 예산과 같은 예약을 막지 않는다', () => {
    expect(
      reserveEstimatedAiCost({ limitUsd: 1, spentUsd: 0.8, reservedUsd: null }, 0.2),
    ).toEqual({
      ok: true,
      value: { limitUsd: 1, spentUsd: 0.8, reservedUsd: 0.2 },
    });
  });

  it('예약된 요청이 있으면 두 번째 요청을 허용하지 않는다', () => {
    const result = reserveEstimatedAiCost(
      { limitUsd: 1, spentUsd: 0, reservedUsd: 0.2 },
      0.1,
    );

    expect(result).toEqual({ ok: false, error: 'request-in-flight' });
  });

  it('같은 coordinator의 빠른 두 요청 중 첫 요청만 예약한다', () => {
    const created = AiCostBudgetCoordinator.create(1);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.value.reserve(0.2).ok).toBe(true);
    expect(created.value.reserve(0.2)).toEqual({ ok: false, error: 'request-in-flight' });
    expect(created.value.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0, reservedUsd: 0.2 });
  });

  it('잔여 예산이 0이면 nano-USD보다 작은 양수 요청도 예약하지 않는다', () => {
    expect(
      reserveEstimatedAiCost({ limitUsd: 1, spentUsd: 1, reservedUsd: null }, 1e-13),
    ).toEqual({ ok: false, error: 'insufficient-budget' });
  });

  it('응답 usage 비용을 반영하고 예약을 해제한다', () => {
    const result = settleReservedAiCost(
      { limitUsd: 1, spentUsd: 0.2, reservedUsd: 0.3 },
      0.25,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        budget: { limitUsd: 1, spentUsd: 0.45, reservedUsd: null },
        exceededAfterSettlement: false,
      },
    });
  });

  it('마지막 요청이 예약액보다 비싸 예산을 넘으면 알리고 후속 요청을 막는다', () => {
    const settled = settleReservedAiCost(
      { limitUsd: 1, spentUsd: 0.85, reservedUsd: 0.15 },
      0.18,
    );
    expect(settled.ok).toBe(true);
    if (!settled.ok) {
      return;
    }

    expect(settled.value.exceededAfterSettlement).toBe(true);
    expect(reserveEstimatedAiCost(settled.value.budget, 0.01)).toEqual({
      ok: false,
      error: 'insufficient-budget',
    });
  });

  it('취소된 합성 요청은 지출을 늘리지 않고 예약만 해제한다', () => {
    expect(
      cancelAiCostReservation({ limitUsd: 1, spentUsd: 0.2, reservedUsd: 0.3 }),
    ).toEqual({
      ok: true,
      value: { limitUsd: 1, spentUsd: 0.2, reservedUsd: null },
    });
  });

  it('잘못된 예산·비용과 예약 없는 정산을 거부한다', () => {
    expect(createAiCostBudget(-1)).toEqual({ ok: false, error: 'invalid-budget' });
    expect(
      reserveEstimatedAiCost({ limitUsd: 1, spentUsd: 0, reservedUsd: null }, 0),
    ).toEqual({ ok: false, error: 'invalid-cost' });
    expect(
      settleReservedAiCost({ limitUsd: 1, spentUsd: 0, reservedUsd: null }, 0.1),
    ).toEqual({ ok: false, error: 'no-reservation' });
  });

  it('정산 합계가 overflow되면 성공 상태를 만들지 않는다', () => {
    expect(
      settleReservedAiCost(
        { limitUsd: 1, spentUsd: Number.MAX_SAFE_INTEGER / 1_000_000_000, reservedUsd: 0.1 },
        Number.MAX_VALUE,
      ),
    ).toEqual({ ok: false, error: 'cost-overflow' });
  });
});
