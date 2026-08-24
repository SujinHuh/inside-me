import type { AiCostPriceProfile } from './ai-cost-calculator';

const OBSERVED_ON = '2026-08-24';

const COMMON_AUDIO_RATES = {
  transcription: {
    model: 'gpt-transcribe',
    usdPerMinute: 0.0045,
  },
  speech: {
    model: 'tts-1',
    usdPerMillionCharacters: 15,
  },
  realtime: {
    model: 'gpt-realtime-2.1-mini',
    inputTextUsdPerMillionTokens: 0.6,
    outputTextUsdPerMillionTokens: 2.4,
    inputAudioUsdPerMillionTokens: 10,
    outputAudioUsdPerMillionTokens: 20,
  },
} as const;

export const OPENAI_LUNA_PRICE_PROFILE: AiCostPriceProfile = {
  id: 'openai-2026-08-24-gpt-5.6-luna',
  observedOn: OBSERVED_ON,
  text: {
    model: 'gpt-5.6-luna',
    inputUsdPerMillionTokens: 0.2,
    outputUsdPerMillionTokens: 1.2,
    longContext: {
      inputTokenThresholdExclusive: 272_000,
      inputPriceMultiplier: 2,
      outputPriceMultiplier: 1.5,
    },
  },
  ...COMMON_AUDIO_RATES,
};

export const OPENAI_TERRA_PRICE_PROFILE: AiCostPriceProfile = {
  id: 'openai-2026-08-24-gpt-5.6-terra',
  observedOn: OBSERVED_ON,
  text: {
    model: 'gpt-5.6-terra',
    inputUsdPerMillionTokens: 2,
    outputUsdPerMillionTokens: 12,
    longContext: {
      inputTokenThresholdExclusive: 272_000,
      inputPriceMultiplier: 2,
      outputPriceMultiplier: 1.5,
    },
  },
  ...COMMON_AUDIO_RATES,
};
