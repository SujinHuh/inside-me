import { AiCostBudgetCoordinator } from '../../src/core/ai-costs/ai-cost-budget';
import { INITIAL_VOCABULARY } from '../../src/core/vocabulary/seed';
import {
  BudgetedEmotionSuggestionProvider,
  InMemoryEmotionSuggestionRequestRegistry,
  type EmotionSuggestionCostPolicy,
} from './budgeted-emotion-suggestion-provider';
import { EmotionSuggestionsHttpHandler } from './emotion-suggestions-http-handler';
import { EmotionSuggestionsService } from './emotion-suggestions-service';
import { FakeEmotionSuggestionProvider } from './fake-emotion-suggestion-provider';

const DEFAULT_SYNTHETIC_BUDGET_USD = 1;
const SYNTHETIC_ESTIMATED_MAXIMUM_USD = 0.001;
const SYNTHETIC_USD_PER_TOKEN = 0.000_001;

export interface FakeEmotionSuggestionsHttpHandlerOptions {
  readonly budgetLimitUsd?: number;
}

function createSyntheticCostPolicy(): EmotionSuggestionCostPolicy {
  return {
    estimateMaximumUsd: () => SYNTHETIC_ESTIMATED_MAXIMUM_USD,
    calculateActualUsd: (usage) => usage.totalTokens * SYNTHETIC_USD_PER_TOKEN,
  };
}

/**
 * 실제 API 키·fetch·OpenAI 없이 서버 계층의 전체 경로를 검증하는 조합이다.
 * 합성 비용 정책은 실제 모델 가격을 의미하지 않는다.
 */
export function createFakeEmotionSuggestionsHttpHandler(
  options: FakeEmotionSuggestionsHttpHandlerOptions = {},
): EmotionSuggestionsHttpHandler {
  const budget = AiCostBudgetCoordinator.create(
    options.budgetLimitUsd ?? DEFAULT_SYNTHETIC_BUDGET_USD,
  );
  if (!budget.ok) throw new Error('Synthetic AI budget configuration is invalid');

  const provider = new BudgetedEmotionSuggestionProvider(
    new FakeEmotionSuggestionProvider(),
    budget.value,
    createSyntheticCostPolicy(),
    new InMemoryEmotionSuggestionRequestRegistry(),
  );
  return new EmotionSuggestionsHttpHandler(
    new EmotionSuggestionsService(INITIAL_VOCABULARY, provider),
  );
}
