import {
  EMOTION_SUGGESTION_REASON_CODES,
  type EmotionSuggestionProvider,
  type EmotionSuggestionProviderCatalog,
  type EmotionSuggestionProviderResult,
  type EmotionSuggestionUsage,
  type EmotionSuggestionsRequest,
} from './emotion-suggestions-contract';

type UnknownRecord = Record<string, unknown>;

export interface OpenAiResponsesRequest {
  readonly model: string;
  readonly store: false;
  readonly instructions: string;
  readonly input: string;
  readonly max_output_tokens: number;
  readonly text: {
    readonly format: {
      readonly type: 'json_schema';
      readonly name: 'emotion_suggestions';
      readonly strict: true;
      readonly schema: UnknownRecord;
    };
  };
}

export interface OpenAiResponsesGateway {
  createResponse(
    request: OpenAiResponsesRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<unknown>;
}

const INSTRUCTIONS = [
  '당신은 사용자의 감정을 판정하는 전문가가 아니라 자기 탐색을 돕는 기록 도우미입니다.',
  '제공된 카탈로그 ID에서만 감정과 욕구 후보를 고릅니다.',
  '사용자가 이미 고른 ID는 제외하고 각 종류당 5개를 넘지 않게 제안합니다.',
  '진단·단정·타인의 의도 추정을 하지 않고, 결과를 가능성으로만 제시합니다.',
  '자유 설명 대신 요청된 JSON schema만 반환합니다.',
].join('\n');

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseUsage(value: unknown): EmotionSuggestionUsage | null {
  if (!isRecord(value)) return null;
  const inputTokens = tokenCount(value.input_tokens);
  const outputTokens = tokenCount(value.output_tokens);
  const totalTokens = tokenCount(value.total_tokens);
  return inputTokens !== null && outputTokens !== null && totalTokens !== null
    ? { inputTokens, outputTokens, totalTokens }
    : null;
}

function extractOutputText(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (
    value.status !== 'completed' ||
    (value.error !== undefined && value.error !== null) ||
    (value.incomplete_details !== undefined && value.incomplete_details !== null)
  ) {
    return null;
  }
  if (typeof value.output_text === 'string') return value.output_text;
  if (!Array.isArray(value.output)) return null;

  for (const output of value.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return null;
}

function suggestionArraySchema(allowedIds: readonly string[]): UnknownRecord {
  return {
    type: 'array',
    maxItems: 5,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'reasonCode'],
      properties: {
        id: { type: 'string', enum: allowedIds },
        reasonCode: { type: 'string', enum: EMOTION_SUGGESTION_REASON_CODES },
      },
    },
  };
}

export function buildOpenAiResponsesRequest(
  model: string,
  request: EmotionSuggestionsRequest,
  catalog: EmotionSuggestionProviderCatalog,
): OpenAiResponsesRequest {
  const normalizedModel = model.trim();
  if (!normalizedModel) throw new Error('OpenAI model is required');

  return {
    model: normalizedModel,
    store: false,
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      story: request.story,
      userSelected: request.userSelected,
      catalog,
    }),
    max_output_tokens: 800,
    text: {
      format: {
        type: 'json_schema',
        name: 'emotion_suggestions',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['emotions', 'needs'],
          properties: {
            emotions: suggestionArraySchema(catalog.emotions.map((item) => item.id)),
            needs: suggestionArraySchema(catalog.needs.map((item) => item.id)),
          },
        },
      },
    },
  };
}

export class OpenAiResponsesEmotionProvider implements EmotionSuggestionProvider {
  constructor(
    private readonly gateway: OpenAiResponsesGateway,
    private readonly model: string,
  ) {}

  async suggest(
    request: EmotionSuggestionsRequest,
    catalog: EmotionSuggestionProviderCatalog,
    signal?: AbortSignal,
  ): Promise<EmotionSuggestionProviderResult> {
    try {
      const response = await this.gateway.createResponse(
        buildOpenAiResponsesRequest(this.model, request, catalog),
        { signal },
      );
      const outputText = extractOutputText(response);
      if (!outputText) return { ok: false, error: 'invalid-response' };

      try {
        return {
          ok: true,
          value: JSON.parse(outputText) as unknown,
          usage: isRecord(response) ? parseUsage(response.usage) : null,
        };
      } catch {
        return { ok: false, error: 'invalid-response' };
      }
    } catch {
      // 공급자 오류와 사용자 원문은 서버 경계 밖으로 노출하지 않는다.
      return { ok: false, error: signal?.aborted ? 'cancelled' : 'unavailable' };
    }
  }
}
