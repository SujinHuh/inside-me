export interface AiCostBudget {
  readonly limitUsd: number;
  readonly spentUsd: number;
  readonly reservedUsd: number | null;
}

export type AiCostBudgetError =
  | 'invalid-budget'
  | 'invalid-cost'
  | 'cost-overflow'
  | 'request-in-flight'
  | 'insufficient-budget'
  | 'no-reservation';

export type AiCostBudgetResult =
  | { readonly ok: true; readonly value: AiCostBudget }
  | { readonly ok: false; readonly error: AiCostBudgetError };

export interface SettledAiCostBudget {
  readonly budget: AiCostBudget;
  readonly exceededAfterSettlement: boolean;
}

export type SettleAiCostBudgetResult =
  | { readonly ok: true; readonly value: SettledAiCostBudget }
  | { readonly ok: false; readonly error: AiCostBudgetError };

const NANOS_PER_USD = 1_000_000_000;

function toNanos(value: number, rounding: 'approved-limit' | 'cost'): number | null {
  if (!isNonNegativeFinite(value)) {
    return null;
  }

  const scaled = value * NANOS_PER_USD;
  const rounded = rounding === 'approved-limit' ? Math.floor(scaled) : Math.ceil(scaled);
  if (!Number.isSafeInteger(rounded)) {
    return null;
  }

  return rounded;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidBudget(budget: AiCostBudget): boolean {
  return (
    toNanos(budget.limitUsd, 'approved-limit') !== null &&
    toNanos(budget.spentUsd, 'cost') !== null &&
    (budget.reservedUsd === null ||
      (toNanos(budget.reservedUsd, 'cost') !== null && budget.reservedUsd > 0))
  );
}

export function createAiCostBudget(limitUsd: number, spentUsd = 0): AiCostBudgetResult {
  const budget: AiCostBudget = { limitUsd, spentUsd, reservedUsd: null };
  return isValidBudget(budget)
    ? { ok: true, value: budget }
    : { ok: false, error: 'invalid-budget' };
}

export function reserveEstimatedAiCost(
  budget: AiCostBudget,
  estimatedMaximumUsd: number,
): AiCostBudgetResult {
  if (!isValidBudget(budget)) {
    return { ok: false, error: 'invalid-budget' };
  }
  if (!Number.isFinite(estimatedMaximumUsd) || estimatedMaximumUsd <= 0) {
    return { ok: false, error: 'invalid-cost' };
  }
  if (budget.reservedUsd !== null) {
    return { ok: false, error: 'request-in-flight' };
  }

  const approvedLimitNanos = toNanos(budget.limitUsd, 'approved-limit');
  const spentNanos = toNanos(budget.spentUsd, 'cost');
  const estimatedNanos = toNanos(estimatedMaximumUsd, 'cost');
  if (approvedLimitNanos === null || spentNanos === null || estimatedNanos === null) {
    return { ok: false, error: 'cost-overflow' };
  }

  const remainingNanos = Math.max(0, approvedLimitNanos - spentNanos);
  if (estimatedNanos > remainingNanos) {
    return { ok: false, error: 'insufficient-budget' };
  }

  return {
    ok: true,
    value: { ...budget, reservedUsd: estimatedMaximumUsd },
  };
}

export function settleReservedAiCost(
  budget: AiCostBudget,
  actualUsd: number,
): SettleAiCostBudgetResult {
  if (!isValidBudget(budget)) {
    return { ok: false, error: 'invalid-budget' };
  }
  if (!isNonNegativeFinite(actualUsd)) {
    return { ok: false, error: 'invalid-cost' };
  }
  if (budget.reservedUsd === null) {
    return { ok: false, error: 'no-reservation' };
  }

  const nextSpentUsd = budget.spentUsd + actualUsd;
  if (!Number.isFinite(nextSpentUsd) || toNanos(nextSpentUsd, 'cost') === null) {
    return { ok: false, error: 'cost-overflow' };
  }

  const settledBudget: AiCostBudget = {
    ...budget,
    spentUsd: nextSpentUsd,
    reservedUsd: null,
  };

  return {
    ok: true,
    value: {
      budget: settledBudget,
      exceededAfterSettlement:
        (toNanos(settledBudget.spentUsd, 'cost') ?? Number.POSITIVE_INFINITY) >
        (toNanos(settledBudget.limitUsd, 'approved-limit') ?? Number.NEGATIVE_INFINITY),
    },
  };
}

export function cancelAiCostReservation(budget: AiCostBudget): AiCostBudgetResult {
  if (!isValidBudget(budget)) {
    return { ok: false, error: 'invalid-budget' };
  }
  if (budget.reservedUsd === null) {
    return { ok: false, error: 'no-reservation' };
  }

  return {
    ok: true,
    value: { ...budget, reservedUsd: null },
  };
}

export class AiCostBudgetCoordinator {
  private currentBudget: AiCostBudget;

  private constructor(initialBudget: AiCostBudget) {
    this.currentBudget = initialBudget;
  }

  static create(limitUsd: number, spentUsd = 0): AiCostBudgetCoordinatorResult {
    const created = createAiCostBudget(limitUsd, spentUsd);
    return created.ok
      ? { ok: true, value: new AiCostBudgetCoordinator(created.value) }
      : created;
  }

  snapshot(): AiCostBudget {
    return { ...this.currentBudget };
  }

  reserve(estimatedMaximumUsd: number): AiCostBudgetResult {
    const result = reserveEstimatedAiCost(this.currentBudget, estimatedMaximumUsd);
    if (result.ok) {
      this.currentBudget = result.value;
    }
    return result;
  }

  settle(actualUsd: number): SettleAiCostBudgetResult {
    const result = settleReservedAiCost(this.currentBudget, actualUsd);
    if (result.ok) {
      this.currentBudget = result.value.budget;
    }
    return result;
  }

  cancel(): AiCostBudgetResult {
    const result = cancelAiCostReservation(this.currentBudget);
    if (result.ok) {
      this.currentBudget = result.value;
    }
    return result;
  }
}

export type AiCostBudgetCoordinatorResult =
  | { readonly ok: true; readonly value: AiCostBudgetCoordinator }
  | { readonly ok: false; readonly error: AiCostBudgetError };
