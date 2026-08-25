import {
  type AiCostPriceProfile,
  estimateMonthlyAiCost,
} from '../../src/core/ai-costs/ai-cost-calculator';
import {
  AiCostBudgetCoordinator,
  type AiCostBudgetError,
} from '../../src/core/ai-costs/ai-cost-budget';
import type {
  EmotionSuggestionProvider,
  EmotionSuggestionProviderCatalog,
  EmotionSuggestionProviderError,
  EmotionSuggestionProviderResult,
  EmotionSuggestionUsage,
  EmotionSuggestionsRequest,
} from './emotion-suggestions-contract';

export interface EmotionSuggestionCostPolicy {
  estimateMaximumUsd(): number;
  calculateActualUsd(usage: EmotionSuggestionUsage): number;
}

export interface EmotionSuggestionRequestRegistry {
  tryStart(requestId: string): boolean;
  markCompleted(requestId: string): void;
  release(requestId: string): void;
}

export class InMemoryEmotionSuggestionRequestRegistry
  implements EmotionSuggestionRequestRegistry
{
  private readonly requestStates = new Map<string, 'active' | 'completed'>();

  tryStart(requestId: string): boolean {
    if (this.requestStates.has(requestId)) return false;
    this.requestStates.set(requestId, 'active');
    return true;
  }

  markCompleted(requestId: string): void {
    if (this.requestStates.get(requestId) === 'active') {
      this.requestStates.set(requestId, 'completed');
    }
  }

  release(requestId: string): void {
    if (this.requestStates.get(requestId) === 'active') {
      this.requestStates.delete(requestId);
    }
  }
}

function calculateTextCost(
  profile: AiCostPriceProfile,
  usage: EmotionSuggestionUsage,
): number {
  const result = estimateMonthlyAiCost(profile, {
    monthlySessions: 1,
    perSession: {
      mode: 'text',
      inputTextTokens: usage.inputTokens,
      outputTextTokens: usage.outputTokens,
    },
  });

  if (!result.ok) {
    throw new Error('Emotion suggestion cost could not be calculated');
  }

  return result.value.perSessionUsd;
}

export function createTextEmotionSuggestionCostPolicy(
  profile: AiCostPriceProfile,
  estimatedMaximumUsage: EmotionSuggestionUsage,
): EmotionSuggestionCostPolicy {
  const estimatedMaximumUsd = calculateTextCost(profile, estimatedMaximumUsage);

  return {
    estimateMaximumUsd: () => estimatedMaximumUsd,
    calculateActualUsd: (usage) => calculateTextCost(profile, usage),
  };
}

function reservationError(error: AiCostBudgetError): EmotionSuggestionProviderError {
  switch (error) {
    case 'request-in-flight':
    case 'insufficient-budget':
      return error;
    case 'invalid-budget':
    case 'invalid-cost':
    case 'cost-overflow':
    case 'no-reservation':
      return 'cost-accounting-failed';
  }
}

export class BudgetedEmotionSuggestionProvider implements EmotionSuggestionProvider {
  constructor(
    private readonly provider: EmotionSuggestionProvider,
    private readonly budget: AiCostBudgetCoordinator,
    private readonly costPolicy: EmotionSuggestionCostPolicy,
    private readonly requestRegistry: EmotionSuggestionRequestRegistry,
  ) {}

  async suggest(
    request: EmotionSuggestionsRequest,
    catalog: EmotionSuggestionProviderCatalog,
    signal?: AbortSignal,
  ): Promise<EmotionSuggestionProviderResult> {
    if (signal?.aborted) {
      return { ok: false, error: 'cancelled' };
    }
    if (!this.requestRegistry.tryStart(request.requestId)) {
      return { ok: false, error: 'duplicate-request' };
    }

    let estimatedMaximumUsd: number;
    try {
      estimatedMaximumUsd = this.costPolicy.estimateMaximumUsd();
    } catch {
      this.requestRegistry.release(request.requestId);
      return { ok: false, error: 'cost-accounting-failed' };
    }

    const reservation = this.budget.reserve(estimatedMaximumUsd);
    if (!reservation.ok) {
      this.requestRegistry.release(request.requestId);
      return { ok: false, error: reservationError(reservation.error) };
    }

    if (signal?.aborted) {
      const cancellation = this.budget.cancel();
      this.requestRegistry.release(request.requestId);
      return cancellation.ok
        ? { ok: false, error: 'cancelled' }
        : { ok: false, error: 'cost-accounting-failed' };
    }

    this.requestRegistry.markCompleted(request.requestId);

    try {
      const result = await this.provider.suggest(request, catalog, signal);

      if (!result.ok) {
        return this.settleEstimatedCost(estimatedMaximumUsd)
          ? result
          : { ok: false, error: 'cost-accounting-failed' };
      }

      if (result.usage === null) {
        return this.settleEstimatedCost(estimatedMaximumUsd)
          ? result
          : { ok: false, error: 'cost-accounting-failed' };
      }

      let actualUsd: number;
      try {
        actualUsd = this.costPolicy.calculateActualUsd(result.usage);
      } catch {
        this.settleEstimatedCost(estimatedMaximumUsd);
        return { ok: false, error: 'cost-accounting-failed' };
      }

      const settlement = this.budget.settle(actualUsd);
      if (!settlement.ok) {
        this.settleEstimatedCost(estimatedMaximumUsd);
        return { ok: false, error: 'cost-accounting-failed' };
      }

      return result;
    } catch {
      return this.settleEstimatedCost(estimatedMaximumUsd)
        ? { ok: false, error: 'unavailable' }
        : { ok: false, error: 'cost-accounting-failed' };
    }
  }

  private settleEstimatedCost(estimatedMaximumUsd: number): boolean {
    return this.budget.settle(estimatedMaximumUsd).ok;
  }
}
