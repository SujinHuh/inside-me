import type { ExternalEmotionExplorerFetch } from '@/src/infrastructure/exploration/http-external-emotion-explorer-transport';
import { HttpExternalEmotionExplorerTransport } from '@/src/infrastructure/exploration/http-external-emotion-explorer-transport';
import { ValidatedExternalEmotionExplorer } from '@/src/infrastructure/exploration/validated-external-emotion-explorer';
import { TextEntryFlowScreen } from '@/src/features/text-entry/TextEntryFlowScreen';
import { createRepository, dateKey } from '@/src/testing/fixtures/entry-fixtures';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createFakeEmotionSuggestionsHttpHandler } from '../../server/ai/create-fake-emotion-suggestions-http-handler';
import { createAppServices } from './create-app-services';

const SYNTHETIC_ENDPOINT = 'http://127.0.0.1:3000/api/ai/emotion-suggestions';

function createServicesWithFakeHttp(options: { readonly budgetLimitUsd?: number } = {}) {
  const handler = createFakeEmotionSuggestionsHttpHandler(options);
  const fetch: ExternalEmotionExplorerFetch = jest.fn(async (_endpoint, init) => {
    const result = await handler.handle({
      method: init.method,
      body: JSON.parse(init.body) as unknown,
      signal: init.signal,
    });

    return {
      ok: result.status >= 200 && result.status < 300,
      json: async () => result.body,
    };
  });

  const services = createAppServices({
    createEmotionExplorer: (vocabulary) => new ValidatedExternalEmotionExplorer(
      new HttpExternalEmotionExplorerTransport({
        endpoint: SYNTHETIC_ENDPOINT,
        fetch,
        timeoutMs: 1_000,
      }),
      vocabulary,
      () => 'synthetic-integration-request-1',
    ),
  });

  return { services, fetch };
}

describe('Expo AI HTTP fake 조합', () => {
  it('실제 네트워크·API 키 없이 HTTP 계약과 검증 경계를 거쳐 카탈로그 후보를 반환한다', async () => {
    const { services, fetch } = createServicesWithFakeHttp();
    const selectedEmotion = services.vocabulary.findById('emotion-worried');
    const selectedNeed = services.vocabulary.findById('need-safety');
    if (selectedEmotion?.kind !== 'emotion' || selectedNeed?.kind !== 'need') {
      throw new Error('Synthetic catalog fixture is unavailable');
    }
    const userSelected = {
      emotions: [{ ...selectedEmotion, source: 'catalog' as const }],
      needs: [{ ...selectedNeed, source: 'catalog' as const }],
    };

    const result = await services.selfExploration.requestAssistantSuggestions({
      story: '  합성 상황에서 마음이 복잡했다.  ',
      userSelected,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        emotions: expect.arrayContaining([
          expect.objectContaining({
            choice: expect.objectContaining({ kind: 'emotion', source: 'catalog' }),
            reason: '이 표현도 지금 경험에 가까운지 함께 살펴볼 수 있어요.',
          }),
        ]),
        needs: expect.arrayContaining([
          expect.objectContaining({
            choice: expect.objectContaining({ kind: 'need', source: 'catalog' }),
            reason: '이 표현도 지금 경험에 가까운지 함께 살펴볼 수 있어요.',
          }),
        ]),
      },
    });
    if (result.ok) {
      expect(result.value.emotions.map(({ choice }) => choice.id)).not.toContain(
        selectedEmotion.id,
      );
      expect(result.value.needs.map(({ choice }) => choice.id)).not.toContain(selectedNeed.id);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      SYNTHETIC_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          requestId: 'synthetic-integration-request-1',
          story: '합성 상황에서 마음이 복잡했다.',
          userSelected: {
            emotionIds: ['emotion-worried'],
            needIds: ['need-safety'],
          },
        }),
      }),
    );
  });

  it('화면에서 사용자가 안내를 확인한 뒤에만 fake HTTP 후보를 보여 준다', async () => {
    const { services, fetch } = createServicesWithFakeHttp();
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-25')}
        repository={createRepository()}
        selfExploration={services.selfExploration}
        vocabulary={services.vocabulary}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText('오늘의 이야기'),
      '합성 화면 통합 상황에서 마음이 복잡했다.',
    );
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    fireEvent.press(screen.getByLabelText('기쁜 선택'));
    fireEvent.press(screen.getByLabelText('휴식 선택'));
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));

    expect(fetch).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('AI 보조 후보가 도착했어요')).toBeTruthy());
    expect(screen.getByText('AI가 마음을 판정한 결과가 아니에요. 가까운 표현만 내 선택에 추가하세요.')).toBeTruthy();
  });

  it('서버 예산 거부를 안전한 오류로 바꾸고 사용자가 고른 감정·욕구를 변경하지 않는다', async () => {
    const { services, fetch } = createServicesWithFakeHttp({ budgetLimitUsd: 0 });
    const selectedEmotion = services.vocabulary.findById('emotion-worried');
    const selectedNeed = services.vocabulary.findById('need-safety');
    if (selectedEmotion?.kind !== 'emotion' || selectedNeed?.kind !== 'need') {
      throw new Error('Synthetic catalog fixture is unavailable');
    }
    const userSelected = {
      emotions: [{ ...selectedEmotion, source: 'catalog' as const }],
      needs: [{ ...selectedNeed, source: 'catalog' as const }],
    };
    const snapshot = services.selfExploration.begin(userSelected);
    const beforeRequest = {
      emotions: snapshot.userSelected.emotions.map((choice) => ({ ...choice })),
      needs: snapshot.userSelected.needs.map((choice) => ({ ...choice })),
    };

    const result = await services.selfExploration.requestAssistantSuggestions({
      story: '합성 상황에서 잠시 답답했다.',
      userSelected: snapshot.userSelected,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unavailable',
        safeMessage: '지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
      },
    });
    expect(snapshot.userSelected).toEqual(beforeRequest);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('합성 상황');
  });
});
