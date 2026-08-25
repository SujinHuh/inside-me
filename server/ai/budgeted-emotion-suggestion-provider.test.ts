import { AiCostBudgetCoordinator } from '../../src/core/ai-costs/ai-cost-budget';
import { OPENAI_LUNA_PRICE_PROFILE } from '../../src/core/ai-costs/openai-price-profiles';
import type {
  EmotionSuggestionProvider,
  EmotionSuggestionProviderResult,
  EmotionSuggestionUsage,
  EmotionSuggestionsRequest,
} from './emotion-suggestions-contract';
import {
  BudgetedEmotionSuggestionProvider,
  createTextEmotionSuggestionCostPolicy,
  InMemoryEmotionSuggestionRequestRegistry,
  type EmotionSuggestionCostPolicy,
  type EmotionSuggestionRequestRegistry,
} from './budgeted-emotion-suggestion-provider';

const request: EmotionSuggestionsRequest = {
  requestId: 'synthetic-request-1',
  story: '합성 상황 설명',
  userSelected: { emotionIds: [], needIds: [] },
};

const catalog = {
  emotions: [{ id: 'emotion-calm', label: '차분한' }],
  needs: [{ id: 'need-rest', label: '휴식' }],
};

const successValue = {
  emotions: [{ id: 'emotion-calm', reasonCode: 'settling-needed' }],
  needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
};

const usage: EmotionSuggestionUsage = {
  inputTokens: 100,
  outputTokens: 20,
  totalTokens: 120,
};

function createBudget(limitUsd = 1, spentUsd = 0): AiCostBudgetCoordinator {
  const created = AiCostBudgetCoordinator.create(limitUsd, spentUsd);
  if (!created.ok) throw new Error('합성 예산 생성 실패');
  return created.value;
}

function createCostPolicy(
  estimatedMaximumUsd = 0.01,
  actualUsd = 0.004,
): EmotionSuggestionCostPolicy {
  return {
    estimateMaximumUsd: () => estimatedMaximumUsd,
    calculateActualUsd: () => actualUsd,
  };
}

function createProvider(result: EmotionSuggestionProviderResult): EmotionSuggestionProvider {
  return { suggest: jest.fn(async () => result) };
}

function createBudgetedProvider(
  provider: EmotionSuggestionProvider,
  budget: AiCostBudgetCoordinator,
  costPolicy: EmotionSuggestionCostPolicy,
  requestRegistry: EmotionSuggestionRequestRegistry =
    new InMemoryEmotionSuggestionRequestRegistry(),
): BudgetedEmotionSuggestionProvider {
  return new BudgetedEmotionSuggestionProvider(
    provider,
    budget,
    costPolicy,
    requestRegistry,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('BudgetedEmotionSuggestionProvider', () => {
  it('공급자 usage로 실제 비용을 정산하고 예약을 해제한다', async () => {
    const budget = createBudget();
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01, 0.004),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: successValue,
      usage,
    });
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.004, reservedUsd: null });
  });

  it('성공 응답에 usage가 없으면 추정 최대 비용을 보수적으로 정산한다', async () => {
    const budget = createBudget();
    const provider = createProvider({ ok: true, value: successValue, usage: null });
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: successValue,
      usage: null,
    });
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.01, reservedUsd: null });
  });

  it('남은 예산이 부족하면 공급자를 호출하지 않는다', async () => {
    const budget = createBudget(0.009);
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'insufficient-budget',
    });
    expect(provider.suggest).not.toHaveBeenCalled();
    expect(budget.snapshot()).toEqual({ limitUsd: 0.009, spentUsd: 0, reservedUsd: null });
  });

  it('첫 요청이 진행 중이면 다른 요청을 차단한다', async () => {
    const deferred = createDeferred<EmotionSuggestionProviderResult>();
    const provider: EmotionSuggestionProvider = {
      suggest: jest.fn(() => deferred.promise),
    };
    const budget = createBudget();
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(),
    );

    const first = budgeted.suggest(request, catalog);
    await expect(
      budgeted.suggest({ ...request, requestId: 'synthetic-request-2' }, catalog),
    ).resolves.toEqual({ ok: false, error: 'request-in-flight' });
    expect(provider.suggest).toHaveBeenCalledTimes(1);

    deferred.resolve({ ok: true, value: successValue, usage });
    await expect(first).resolves.toEqual({ ok: true, value: successValue, usage });
  });

  it('호출 전에 이미 취소된 요청은 예약하거나 공급자를 호출하지 않는다', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budget = createBudget();
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(),
    );

    await expect(budgeted.suggest(request, catalog, controller.signal)).resolves.toEqual({
      ok: false,
      error: 'cancelled',
    });
    expect(provider.suggest).not.toHaveBeenCalled();
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0, reservedUsd: null });
  });

  it('공급자 호출 뒤 취소는 추정 최대 비용을 보수적으로 정산한다', async () => {
    const deferred = createDeferred<EmotionSuggestionProviderResult>();
    const provider: EmotionSuggestionProvider = {
      suggest: jest.fn(() => deferred.promise),
    };
    const budget = createBudget();
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01),
    );
    const controller = new AbortController();

    const pending = budgeted.suggest(request, catalog, controller.signal);
    expect(budget.snapshot().reservedUsd).toBe(0.01);
    controller.abort();
    deferred.resolve({ ok: false, error: 'cancelled' });

    await expect(pending).resolves.toEqual({ ok: false, error: 'cancelled' });
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.01, reservedUsd: null });
  });

  it.each(['unavailable', 'invalid-response'] as const)(
    '%s 실패는 추정 최대 비용을 정산하고 예약을 해제한다',
    async (error) => {
      const budget = createBudget();
      const provider = createProvider({ ok: false, error });
      const budgeted = createBudgetedProvider(
        provider,
        budget,
        createCostPolicy(0.01),
      );

      await expect(budgeted.suggest(request, catalog)).resolves.toEqual({ ok: false, error });
      expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.01, reservedUsd: null });
    },
  );

  it('공급자가 예외를 던져도 추정 최대 비용을 정산하고 안전한 실패를 반환한다', async () => {
    const provider: EmotionSuggestionProvider = {
      suggest: jest.fn(async () => {
        throw new Error('합성 공급자 오류');
      }),
    };
    const budget = createBudget();
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.01, reservedUsd: null });
  });

  it('완료된 requestId의 순차 재요청을 공급자 호출 전에 차단한다', async () => {
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budget = createBudget();
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: successValue,
      usage,
    });
    const afterFirst = budget.snapshot();
    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'duplicate-request',
    });
    expect(provider.suggest).toHaveBeenCalledTimes(1);
    expect(budget.snapshot()).toEqual(afterFirst);
  });

  it('공유 요청 원장을 사용하는 두 조정자도 같은 requestId를 한 번만 전달한다', async () => {
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budget = createBudget();
    const requestRegistry = new InMemoryEmotionSuggestionRequestRegistry();
    const first = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(),
      requestRegistry,
    );
    const second = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(),
      requestRegistry,
    );

    await expect(first.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: successValue,
      usage,
    });
    await expect(second.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'duplicate-request',
    });
    expect(provider.suggest).toHaveBeenCalledTimes(1);
  });

  it('실제 비용이 한도를 넘으면 응답 뒤 새로운 요청을 차단한다', async () => {
    const budget = createBudget(0.01);
    const provider = createProvider({ ok: true, value: successValue, usage });
    const budgeted = createBudgetedProvider(
      provider,
      budget,
      createCostPolicy(0.01, 0.012),
    );

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: true,
      value: successValue,
      usage,
    });
    await expect(
      budgeted.suggest({ ...request, requestId: 'synthetic-request-2' }, catalog),
    ).resolves.toEqual({ ok: false, error: 'insufficient-budget' });
    expect(provider.suggest).toHaveBeenCalledTimes(1);
    expect(budget.snapshot()).toEqual({ limitUsd: 0.01, spentUsd: 0.012, reservedUsd: null });
  });

  it('실제 비용 계산 실패 시 추정 최대 비용으로 정산하고 오류를 반환한다', async () => {
    const budget = createBudget();
    const provider = createProvider({ ok: true, value: successValue, usage });
    const costPolicy: EmotionSuggestionCostPolicy = {
      estimateMaximumUsd: () => 0.01,
      calculateActualUsd: () => Number.NaN,
    };
    const budgeted = createBudgetedProvider(provider, budget, costPolicy);

    await expect(budgeted.suggest(request, catalog)).resolves.toEqual({
      ok: false,
      error: 'cost-accounting-failed',
    });
    expect(budget.snapshot()).toEqual({ limitUsd: 1, spentUsd: 0.01, reservedUsd: null });
  });
});

describe('createTextEmotionSuggestionCostPolicy', () => {
  it('텍스트 입력·출력 usage와 모델 가격 프로필로 최대·실제 비용을 계산한다', () => {
    const policy = createTextEmotionSuggestionCostPolicy(OPENAI_LUNA_PRICE_PROFILE, {
      inputTokens: 1_000,
      outputTokens: 800,
      totalTokens: 1_800,
    });

    expect(policy.estimateMaximumUsd()).toBeCloseTo(0.00116, 12);
    expect(policy.calculateActualUsd(usage)).toBeCloseTo(0.000044, 12);
  });
});
