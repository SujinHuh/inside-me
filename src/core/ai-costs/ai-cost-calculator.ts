export interface AiCostPriceProfile {
  readonly id: string;
  readonly observedOn: string;
  readonly text: {
    readonly model: string;
    readonly inputUsdPerMillionTokens: number;
    readonly outputUsdPerMillionTokens: number;
    readonly longContext: {
      readonly inputTokenThresholdExclusive: number;
      readonly inputPriceMultiplier: number;
      readonly outputPriceMultiplier: number;
    };
  };
  readonly transcription: {
    readonly model: string;
    readonly usdPerMinute: number;
  };
  readonly speech: {
    readonly model: string;
    readonly usdPerMillionCharacters: number;
  };
  readonly realtime: {
    readonly model: string;
    readonly inputTextUsdPerMillionTokens: number;
    readonly outputTextUsdPerMillionTokens: number;
    readonly inputAudioUsdPerMillionTokens: number;
    readonly outputAudioUsdPerMillionTokens: number;
  };
}

export interface TextTokenUsage {
  readonly inputTextTokens: number;
  readonly outputTextTokens: number;
}

export type AiModeUsage =
  | {
      readonly mode: 'text';
      readonly inputTextTokens: number;
      readonly outputTextTokens: number;
    }
  | {
      readonly mode: 'free-voice';
      readonly transcriptionMinutes: number;
      readonly inputTextTokens: number;
      readonly outputTextTokens: number;
    }
  | {
      readonly mode: 'turn-based-voice';
      readonly transcriptionMinutes: number;
      readonly textRequests: readonly TextTokenUsage[];
      readonly speechCharacters: number;
    }
  | {
      readonly mode: 'realtime-voice';
      readonly inputTextTokens: number;
      readonly outputTextTokens: number;
      readonly inputAudioTokens: number;
      readonly outputAudioTokens: number;
    };

export interface AiCostScenario {
  readonly monthlySessions: number;
  readonly perSession: AiModeUsage;
}

export type AiCostComponentKind =
  | 'text-input'
  | 'text-output'
  | 'transcription'
  | 'speech'
  | 'realtime-text-input'
  | 'realtime-text-output'
  | 'realtime-audio-input'
  | 'realtime-audio-output';

export interface AiCostComponent {
  readonly kind: AiCostComponentKind;
  readonly perSessionUsd: number;
  readonly monthlyUsd: number;
}

export interface AiCostEstimate {
  readonly profileId: string;
  readonly priceObservedOn: string;
  readonly mode: AiModeUsage['mode'];
  readonly monthlySessions: number;
  readonly perSessionUsd: number;
  readonly monthlyUsd: number;
  readonly components: readonly AiCostComponent[];
}

export type AiCostCalculationResult =
  | { readonly ok: true; readonly value: AiCostEstimate }
  | {
      readonly ok: false;
      readonly error: 'invalid-price-profile' | 'invalid-usage-scenario' | 'cost-overflow';
    };

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isValidPriceProfile(profile: AiCostPriceProfile): boolean {
  const rates = [
    profile.text.inputUsdPerMillionTokens,
    profile.text.outputUsdPerMillionTokens,
    profile.text.longContext.inputPriceMultiplier,
    profile.text.longContext.outputPriceMultiplier,
    profile.transcription.usdPerMinute,
    profile.speech.usdPerMillionCharacters,
    profile.realtime.inputTextUsdPerMillionTokens,
    profile.realtime.outputTextUsdPerMillionTokens,
    profile.realtime.inputAudioUsdPerMillionTokens,
    profile.realtime.outputAudioUsdPerMillionTokens,
  ];

  return (
    profile.id.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(profile.observedOn) &&
    profile.text.model.trim().length > 0 &&
    profile.transcription.model.trim().length > 0 &&
    profile.speech.model.trim().length > 0 &&
    profile.realtime.model.trim().length > 0 &&
    Number.isSafeInteger(profile.text.longContext.inputTokenThresholdExclusive) &&
    profile.text.longContext.inputTokenThresholdExclusive >= 0 &&
    profile.text.longContext.inputPriceMultiplier > 0 &&
    profile.text.longContext.outputPriceMultiplier > 0 &&
    rates.every(isNonNegativeFinite)
  );
}

function isValidUsage(usage: AiModeUsage): boolean {
  switch (usage.mode) {
    case 'text':
      return (
        isNonNegativeSafeInteger(usage.inputTextTokens) &&
        isNonNegativeSafeInteger(usage.outputTextTokens)
      );
    case 'free-voice':
      return (
        isNonNegativeFinite(usage.transcriptionMinutes) &&
        isNonNegativeSafeInteger(usage.inputTextTokens) &&
        isNonNegativeSafeInteger(usage.outputTextTokens)
      );
    case 'turn-based-voice':
      return (
        isNonNegativeFinite(usage.transcriptionMinutes) &&
        usage.textRequests.length > 0 &&
        usage.textRequests.every(
          (request) =>
            isNonNegativeSafeInteger(request.inputTextTokens) &&
            isNonNegativeSafeInteger(request.outputTextTokens),
        ) &&
        isNonNegativeSafeInteger(usage.speechCharacters)
      );
    case 'realtime-voice':
      return (
        isNonNegativeSafeInteger(usage.inputTextTokens) &&
        isNonNegativeSafeInteger(usage.outputTextTokens) &&
        isNonNegativeSafeInteger(usage.inputAudioTokens) &&
        isNonNegativeSafeInteger(usage.outputAudioTokens)
      );
  }
}

function isValidScenario(scenario: AiCostScenario): boolean {
  return (
    Number.isSafeInteger(scenario.monthlySessions) &&
    scenario.monthlySessions > 0 &&
    isValidUsage(scenario.perSession)
  );
}

function perMillion(quantity: number, usdPerMillion: number): number {
  return (quantity / 1_000_000) * usdPerMillion;
}

function component(
  kind: AiCostComponentKind,
  perSessionUsd: number,
  monthlySessions: number,
): AiCostComponent {
  return {
    kind,
    perSessionUsd,
    monthlyUsd: perSessionUsd * monthlySessions,
  };
}

function textComponents(
  profile: AiCostPriceProfile,
  inputTextTokens: number,
  outputTextTokens: number,
  monthlySessions: number,
): readonly AiCostComponent[] {
  const usesLongContextPrice =
    inputTextTokens > profile.text.longContext.inputTokenThresholdExclusive;
  const inputPriceMultiplier = usesLongContextPrice
    ? profile.text.longContext.inputPriceMultiplier
    : 1;
  const outputPriceMultiplier = usesLongContextPrice
    ? profile.text.longContext.outputPriceMultiplier
    : 1;

  return [
    component(
      'text-input',
      perMillion(
        inputTextTokens,
        profile.text.inputUsdPerMillionTokens * inputPriceMultiplier,
      ),
      monthlySessions,
    ),
    component(
      'text-output',
      perMillion(
        outputTextTokens,
        profile.text.outputUsdPerMillionTokens * outputPriceMultiplier,
      ),
      monthlySessions,
    ),
  ];
}

function calculateComponents(
  profile: AiCostPriceProfile,
  scenario: AiCostScenario,
): readonly AiCostComponent[] {
  const { monthlySessions, perSession: usage } = scenario;

  switch (usage.mode) {
    case 'text':
      return textComponents(
        profile,
        usage.inputTextTokens,
        usage.outputTextTokens,
        monthlySessions,
      );
    case 'free-voice':
      return [
        component(
          'transcription',
          usage.transcriptionMinutes * profile.transcription.usdPerMinute,
          monthlySessions,
        ),
        ...textComponents(
          profile,
          usage.inputTextTokens,
          usage.outputTextTokens,
          monthlySessions,
        ),
      ];
    case 'turn-based-voice':
      return [
        component(
          'transcription',
          usage.transcriptionMinutes * profile.transcription.usdPerMinute,
          monthlySessions,
        ),
        ...usage.textRequests.flatMap((request) =>
          textComponents(
            profile,
            request.inputTextTokens,
            request.outputTextTokens,
            monthlySessions,
          ),
        ),
        component(
          'speech',
          perMillion(usage.speechCharacters, profile.speech.usdPerMillionCharacters),
          monthlySessions,
        ),
      ];
    case 'realtime-voice':
      return [
        component(
          'realtime-text-input',
          perMillion(usage.inputTextTokens, profile.realtime.inputTextUsdPerMillionTokens),
          monthlySessions,
        ),
        component(
          'realtime-text-output',
          perMillion(usage.outputTextTokens, profile.realtime.outputTextUsdPerMillionTokens),
          monthlySessions,
        ),
        component(
          'realtime-audio-input',
          perMillion(usage.inputAudioTokens, profile.realtime.inputAudioUsdPerMillionTokens),
          monthlySessions,
        ),
        component(
          'realtime-audio-output',
          perMillion(usage.outputAudioTokens, profile.realtime.outputAudioUsdPerMillionTokens),
          monthlySessions,
        ),
      ];
  }
}

export function estimateMonthlyAiCost(
  profile: AiCostPriceProfile,
  scenario: AiCostScenario,
): AiCostCalculationResult {
  if (!isValidPriceProfile(profile)) {
    return { ok: false, error: 'invalid-price-profile' };
  }
  if (!isValidScenario(scenario)) {
    return { ok: false, error: 'invalid-usage-scenario' };
  }

  const components = calculateComponents(profile, scenario);
  if (
    components.some(
      (item) => !isNonNegativeFinite(item.perSessionUsd) || !isNonNegativeFinite(item.monthlyUsd),
    )
  ) {
    return { ok: false, error: 'cost-overflow' };
  }
  const perSessionUsd = components.reduce((total, item) => total + item.perSessionUsd, 0);
  const monthlyUsd = components.reduce((total, item) => total + item.monthlyUsd, 0);
  if (!isNonNegativeFinite(perSessionUsd) || !isNonNegativeFinite(monthlyUsd)) {
    return { ok: false, error: 'cost-overflow' };
  }

  return {
    ok: true,
    value: {
      profileId: profile.id,
      priceObservedOn: profile.observedOn,
      mode: scenario.perSession.mode,
      monthlySessions: scenario.monthlySessions,
      perSessionUsd,
      monthlyUsd,
      components,
    },
  };
}
