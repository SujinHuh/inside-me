import { useEffect, useRef, useState } from 'react';

import type { SelfExplorationService } from '@/src/application/exploration/self-exploration-service';
import type {
  EmotionChoice,
  EmotionExplorerResponse,
  EmotionExplorerResult,
  EntryDraft,
  NeedChoice,
} from '@/src/core/contracts';

interface UseAssistantExplorationOptions {
  initialDraft?: EntryDraft;
  selfExploration: Pick<SelfExplorationService, 'requestAssistantSuggestions'>;
}

interface AssistantRequestInput {
  story: string;
  emotions: readonly EmotionChoice[];
  needs: readonly NeedChoice[];
}

const emptySuggestions = (): EmotionExplorerResponse => ({ emotions: [], needs: [] });

function initialAcceptedEmotionIds(draft?: EntryDraft): ReadonlySet<string> {
  if (!draft || draft.exploration.finalConfirmed.emotions.status !== 'confirmed') return new Set();
  const userSelectedIds = new Set(draft.exploration.userSelected.emotions.map((choice) => choice.id));
  const suggestedIds = new Set(draft.exploration.aiSuggested.emotions.map(({ choice }) => choice.id));
  return new Set(
    draft.exploration.finalConfirmed.emotions.items
      .map((choice) => choice.id)
      .filter((id) => suggestedIds.has(id) && !userSelectedIds.has(id)),
  );
}

function initialAcceptedNeedIds(draft?: EntryDraft): ReadonlySet<string> {
  if (!draft || draft.exploration.finalConfirmed.needs.status !== 'confirmed') return new Set();
  const userSelectedIds = new Set(draft.exploration.userSelected.needs.map((choice) => choice.id));
  const suggestedIds = new Set(draft.exploration.aiSuggested.needs.map(({ choice }) => choice.id));
  return new Set(
    draft.exploration.finalConfirmed.needs.items
      .map((choice) => choice.id)
      .filter((id) => suggestedIds.has(id) && !userSelectedIds.has(id)),
  );
}

function mergeSuggestions(
  current: EmotionExplorerResponse,
  incoming: EmotionExplorerResponse,
): EmotionExplorerResponse {
  const mergeByChoiceId = <T extends EmotionExplorerResponse['emotions'][number] | EmotionExplorerResponse['needs'][number]>(
    previous: readonly T[],
    next: readonly T[],
  ): readonly T[] => {
    const merged = new Map(previous.map((suggestion) => [suggestion.choice.id, suggestion]));
    next.forEach((suggestion) => merged.set(suggestion.choice.id, suggestion));
    return [...merged.values()];
  };

  return {
    emotions: mergeByChoiceId(current.emotions, incoming.emotions),
    needs: mergeByChoiceId(current.needs, incoming.needs),
  };
}

const unavailableResult = (): EmotionExplorerResult => ({
  ok: false,
  error: {
    code: 'unavailable',
    safeMessage: '지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
  },
});

export function useAssistantExploration({
  initialDraft,
  selfExploration,
}: UseAssistantExplorationOptions) {
  const [requesting, setRequesting] = useState(false);
  const [suggestions, setSuggestions] = useState<EmotionExplorerResponse>(
    initialDraft?.exploration.aiSuggested ?? emptySuggestions,
  );
  const [acceptedEmotionIds, setAcceptedEmotionIds] = useState<ReadonlySet<string>>(
    () => initialAcceptedEmotionIds(initialDraft),
  );
  const [acceptedNeedIds, setAcceptedNeedIds] = useState<ReadonlySet<string>>(
    () => initialAcceptedNeedIds(initialDraft),
  );
  const requestVersion = useRef(0);
  const requestInFlight = useRef(false);

  useEffect(() => () => {
    requestVersion.current += 1;
  }, []);

  const removeAcceptedEmotion = (id: string) => {
    setAcceptedEmotionIds((current) => removeId(current, id));
  };

  const removeAcceptedNeed = (id: string) => {
    setAcceptedNeedIds((current) => removeId(current, id));
  };

  const acceptEmotion = (id: string) => {
    setAcceptedEmotionIds((current) => new Set([...current, id]));
  };

  const acceptNeed = (id: string) => {
    setAcceptedNeedIds((current) => new Set([...current, id]));
  };

  const selectEmotionManually = (id: string) => {
    removeAcceptedEmotion(id);
    setSuggestions((current) => ({
      ...current,
      emotions: current.emotions.filter(({ choice }) => choice.id !== id),
    }));
  };

  const selectNeedManually = (id: string) => {
    removeAcceptedNeed(id);
    setSuggestions((current) => ({
      ...current,
      needs: current.needs.filter(({ choice }) => choice.id !== id),
    }));
  };

  const request = async ({ story, emotions, needs }: AssistantRequestInput) => {
    if (requestInFlight.current) return null;
    requestInFlight.current = true;
    const currentRequestVersion = ++requestVersion.current;
    setRequesting(true);

    let result: EmotionExplorerResult;
    try {
      result = await selfExploration.requestAssistantSuggestions({
        story,
        userSelected: {
          emotions: emotions.filter((choice) => !acceptedEmotionIds.has(choice.id)).map((choice) => ({ ...choice })),
          needs: needs.filter((choice) => !acceptedNeedIds.has(choice.id)).map((choice) => ({ ...choice })),
        },
      });
    } catch {
      result = unavailableResult();
    }

    if (currentRequestVersion !== requestVersion.current) return null;
    requestInFlight.current = false;
    setRequesting(false);
    if (result.ok) {
      setSuggestions((current) => mergeSuggestions(current, result.value));
    }
    return result;
  };

  return {
    acceptEmotion,
    acceptNeed,
    acceptedEmotionIds,
    acceptedNeedIds,
    removeAcceptedEmotion,
    removeAcceptedNeed,
    request,
    requesting,
    selectEmotionManually,
    selectNeedManually,
    suggestions,
  };
}

function removeId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!current.has(id)) return current;
  const next = new Set(current);
  next.delete(id);
  return next;
}
