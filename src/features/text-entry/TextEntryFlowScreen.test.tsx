import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StrictMode } from 'react';

import { SelfExplorationService } from '@/src/application/exploration/self-exploration-service';
import type { EmotionExplorer, EmotionExplorerResult } from '@/src/core/contracts';
import { InMemoryEmotionNeedVocabulary, INITIAL_VOCABULARY } from '@/src/core/vocabulary';
import { DeterministicEmotionExplorer } from '@/src/infrastructure/exploration/deterministic-emotion-explorer';
import { ControllableEntryRepository } from '@/src/testing/fakes/controllable-entry-repository';
import { createDraft, createRepository, dateKey, expectOk } from '@/src/testing/fixtures/entry-fixtures';
import { TextEntryFlowScreen } from './TextEntryFlowScreen';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
const selfExploration = new SelfExplorationService(new DeterministicEmotionExplorer(vocabulary));

function advanceToNeeds(story = '합성 테스트를 완료해서 마음이 여러 갈래였다.') {
  fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), story);
  fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
  fireEvent.press(screen.getByLabelText('기쁜 선택'));
  fireEvent.press(screen.getByLabelText('서운한 선택'));
  fireEvent.press(screen.getByLabelText('서운한 강도 4'));
  fireEvent.press(screen.getByLabelText('휴식 선택'));
}

function advanceToConfirmation() {
  advanceToNeeds();
  fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
}

function createSelfExploration(suggest: EmotionExplorer['suggest']): SelfExplorationService {
  return new SelfExplorationService({ suggest });
}

function getPressHandler(element: ReturnType<typeof screen.getByRole>): () => void {
  let current = element;
  while (typeof current.props.onPress !== 'function') {
    if (!current.parent) throw new Error('Pressable handler를 찾을 수 없습니다.');
    current = current.parent;
  }
  return current.props.onPress as () => void;
}

describe('TextEntryFlowScreen', () => {
  it('빈 글을 막고 키보드 입력과 접근성 이름을 유지한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );

    const input = screen.getByLabelText('오늘의 이야기');
    expect(input.props.multiline).toBe(true);
    expect(input.props.textAlignVertical).toBe('top');

    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    expect(screen.getByText('일기를 한 글자 이상 적어 주세요.')).toBeTruthy();
    expect(screen.getByLabelText('오늘의 이야기')).toBeTruthy();
  });

  it('감정·욕구를 직접 탐색하고 복수 감정·강도·대표 감정을 저장한다', async () => {
    const repository = createRepository();
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();

    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));
    expect(screen.getByText('달력에서 먼저 보고 싶은 대표 감정을 골라 주세요.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('서운한: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    const saved = expectOk(await repository.getByDate(dateKey('2026-08-23')));
    expect(saved?.story).toContain('합성 테스트');
    expect(saved?.exploration.aiSuggested).toEqual({ emotions: [], needs: [] });
    expect(saved?.exploration.finalConfirmed.emotions).toMatchObject({
      status: 'confirmed',
      representativeEmotionId: 'emotion-hurt',
      items: [
        { id: 'emotion-joyful', intensity: 3 },
        { id: 'emotion-hurt', intensity: 4 },
      ],
    });
  });

  it('긴 목록을 훑기 전에 감정을 아직 모른다고 선택해 저장한다', async () => {
    const repository = createRepository();
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '아직 이름 붙이기 어려운 합성 상황');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));

    fireEvent.press(screen.getByLabelText('감정을 아직 모르겠어요'));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
    expect(screen.getByText('아직 모르는 마음으로 저장할까요?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    const saved = expectOk(await repository.getByDate(dateKey('2026-08-23')));
    expect(saved?.exploration.finalConfirmed.emotions).toEqual({ status: 'unknown' });
  });

  it('대표 감정을 선택해도 해당 감정을 해제하면 대표 선택을 무효화한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '마음 지도 다시 보기' }));
    fireEvent.press(screen.getByLabelText('기쁜 선택 해제'));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));

    expect(screen.getByLabelText('서운한: 대표 감정으로 선택').props.accessibilityState.selected).toBe(false);
  });

  it('저장 실패 후에도 글과 사용자 선택을 보존한다', async () => {
    const repository = new ControllableEntryRepository(createRepository());
    repository.failNext('save', { code: 'storage-unavailable', safeMessage: '기록을 저장하지 못했어요.' });
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy());
    expect(screen.getByLabelText('기쁜: 대표 감정으로 선택').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: '마음 지도 다시 보기' }));
    fireEvent.press(screen.getByRole('button', { name: '글 다시 보기' }));
    expect(screen.getByDisplayValue('합성 테스트를 완료해서 마음이 여러 갈래였다.')).toBeTruthy();
  });

  it('저장 중에는 빠른 중복 요청을 막고 한 번만 저장한다', async () => {
    const repository = createRepository();
    const originalSave = repository.save.bind(repository);
    let releaseSave: (() => void) | undefined;
    const save = jest.spyOn(repository, 'save').mockImplementation((draft) =>
      new Promise((resolve) => {
        releaseSave = () => { void originalSave(draft).then(resolve); };
      }),
    );
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));

    const saveButton = screen.getByRole('button', { name: '이 내용으로 저장' });
    const pressSave = getPressHandler(saveButton);
    act(() => {
      pressSave();
      pressSave();
    });
    const savingButton = screen.getByRole('button', { name: '저장 중' });

    expect(save).toHaveBeenCalledTimes(1);
    expect(savingButton.props.accessibilityState?.disabled ?? savingButton.props.disabled).toBe(true);

    await act(async () => { releaseSave?.(); });
    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('화면을 벗어난 뒤 저장이 끝나면 늦은 화면 갱신을 폐기한다', async () => {
    const repository = createRepository();
    const originalSave = repository.save.bind(repository);
    let releaseSave: (() => void) | undefined;
    jest.spyOn(repository, 'save').mockImplementation((draft) =>
      new Promise((resolve) => {
        releaseSave = () => { void originalSave(draft).then(resolve); };
      }),
    );
    const onSaved = jest.fn();
    const view = render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        onSaved={onSaved}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));
    view.unmount();

    await act(async () => { releaseSave?.(); });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('React Strict Mode의 effect 재실행 뒤에도 저장 완료를 처리한다', async () => {
    const onSaved = jest.fn();
    render(
      <StrictMode>
        <TextEntryFlowScreen
          dateKey={dateKey('2026-08-23')}
          onSaved={onSaved}
          repository={createRepository()}
          selfExploration={selfExploration}
          vocabulary={vocabulary}
        />
      </StrictMode>,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('저장소가 예외를 던져도 원문을 노출하지 않고 작성 내용을 보존한다', async () => {
    const repository = createRepository();
    const save = jest.spyOn(repository, 'save')
      .mockRejectedValueOnce(new Error('합성 일기 원문과 저장소 내부 경로'));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 저장하지 못했어요. 작성한 내용은 그대로 남아 있어요.')).toBeTruthy());
    expect(screen.queryByText('저장소 내부 경로')).toBeNull();
    expect(screen.getByLabelText('기쁜: 대표 감정으로 선택').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: '마음 지도 다시 보기' }));
    fireEvent.press(screen.getByRole('button', { name: '글 다시 보기' }));
    expect(screen.getByDisplayValue('합성 테스트를 완료해서 마음이 여러 갈래였다.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));
    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('전체 검색·영역 탐색·직접 추가로 한 장 지도를 사용한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '탐색 동작을 확인하는 합성 글');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));

    expect(screen.getByRole('button', { name: '충족 감정' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '미충족 감정' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '욕구' })).toBeTruthy();
    expect(screen.getByLabelText('욕구가 충족되었을 때 연결되는 느낌')).toBeTruthy();
    expect(screen.getByLabelText('욕구가 충족되지 않았을 때 연결되는 느낌')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('감정과 욕구 전체 검색'), '고마운');
    expect(screen.getByLabelText('고마운 선택')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('감정과 욕구 전체 검색'), '억울한');
    expect(screen.getByLabelText('억울한 선택')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('감정과 욕구 전체 검색'), '');

    fireEvent.changeText(screen.getByLabelText('내 감정 직접 추가'), '애틋한');
    fireEvent.press(screen.getByRole('button', { name: '감정 직접 추가하기' }));
    expect(screen.getByText('애틋한 강도 3')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('애틋한 감정 선택 해제'));
    expect(screen.queryByText('애틋한 강도 3')).toBeNull();

    fireEvent.press(screen.getByLabelText('억울한 선택'));

    fireEvent.changeText(screen.getByLabelText('내 욕구 직접 추가'), '온전한 쉼');
    fireEvent.press(screen.getByRole('button', { name: '욕구 직접 추가하기' }));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
    expect(screen.getByText('선택한 욕구: 온전한 쉼')).toBeTruthy();
  });

  it('AI 화면에서도 감정 선택이나 모름 표시 없이 확인 단계를 우회하지 못한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '빈 선택 우회를 확인하는 합성 글');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 계속하기' }));

    expect(screen.getByText('전체 지도에서 내 마음을 찾아보세요.')).toBeTruthy();
    expect(screen.getByText('가까운 감정을 하나 이상 고르거나 아직 모르겠어요를 선택해 주세요.')).toBeTruthy();
  });

  it('기존 초안을 다시 열어 수정하고 AI 제안을 사용자 확정으로 바꾸지 않는다', async () => {
    const repository = createRepository();
    const initialDraft = createDraft('2026-08-23');
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        initialDraft={initialDraft}
        repository={repository}
        selfExploration={selfExploration}
        vocabulary={vocabulary}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '수정한 합성 이야기');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    expect(screen.getByText('차분한 강도 3')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
    fireEvent.press(screen.getByLabelText('차분한: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    const saved = expectOk(await repository.getByDate(dateKey('2026-08-23')));
    expect(saved?.story).toBe('수정한 합성 이야기');
    expect(saved?.exploration.aiSuggested.emotions).toEqual(initialDraft.exploration.aiSuggested.emotions);
    expect(saved?.exploration.finalConfirmed.emotions).toMatchObject({
      status: 'confirmed',
      representativeEmotionId: 'emotion-calm',
      items: [{ id: 'emotion-calm' }],
    });
  });

  it('AI 도움은 명시적 안내 확인 전에 호출하지 않고 취소할 수 있다', () => {
    const suggest = jest.fn<ReturnType<EmotionExplorer['suggest']>, Parameters<EmotionExplorer['suggest']>>();
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();

    expect(suggest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    expect(screen.getByText('현재 버전은 외부 AI에 연결되지 않아, 기기 안의 임시 탐색기로 화면 흐름만 확인해요.')).toBeTruthy();
    expect(screen.getByText('• 목록에 없어 직접 추가한 표현')).toBeTruthy();
    expect(suggest).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: '마음 지도로 돌아가기' }));
    expect(screen.getByText('전체 지도에서 내 마음을 찾아보세요.')).toBeTruthy();
    expect(suggest).not.toHaveBeenCalled();
  });

  it('AI 후보는 자동 선택하지 않고 사용자가 추가한 후 출처를 구분해 저장한다', async () => {
    const repository = createRepository();
    const suggest = jest.fn(async (): Promise<EmotionExplorerResult> => ({
      ok: true,
      value: {
        emotions: [{
          choice: { id: 'emotion-lonely', kind: 'emotion', label: '외로운', source: 'catalog' },
          reason: '연결이 멀게 느껴진 순간인지 함께 살펴볼 수 있어요.',
        }],
        needs: [{
          choice: { id: 'need-connection', kind: 'need', label: '연결', source: 'catalog' },
          reason: '누군가와 이어지고 싶었는지 함께 살펴볼 수 있어요.',
        }],
      },
    }));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={repository}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds('합성 상황에서 혼자 남은 느낌이 들었다.');
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));

    await waitFor(() => expect(screen.getByLabelText('외로운 내 선택에 추가')).toBeTruthy());
    expect(screen.queryByText('외로운 강도 3')).toBeNull();
    fireEvent.press(screen.getByLabelText('외로운 내 선택에 추가'));
    fireEvent.press(screen.getByLabelText('연결 내 선택에 추가'));
    fireEvent.press(screen.getByRole('button', { name: '선택한 내용 확인하기' }));
    fireEvent.press(screen.getByLabelText('외로운: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    const saved = expectOk(await repository.getByDate(dateKey('2026-08-24')));
    expect(saved?.exploration.userSelected.emotions.map((choice) => choice.id)).toEqual([
      'emotion-joyful',
      'emotion-hurt',
    ]);
    expect(saved?.exploration.userSelected.needs.map((choice) => choice.id)).toEqual(['need-rest']);
    expect(saved?.exploration.aiSuggested.emotions.map(({ choice }) => choice.id)).toEqual(['emotion-lonely']);
    expect(saved?.exploration.aiSuggested.needs.map(({ choice }) => choice.id)).toEqual(['need-connection']);
    expect(saved?.exploration.finalConfirmed.emotions).toMatchObject({
      status: 'confirmed',
      representativeEmotionId: 'emotion-lonely',
    });
  });

  it('감정을 모른다고 표시한 뒤 AI 후보를 명시적으로 추가하면 확정 선택으로 바꾼다', async () => {
    const repository = createRepository();
    const suggest = jest.fn(async (): Promise<EmotionExplorerResult> => ({
      ok: true,
      value: {
        emotions: [{
          choice: { id: 'emotion-lonely', kind: 'emotion', label: '외로운', source: 'catalog' },
          reason: '연결이 멀게 느껴진 순간인지 살펴볼 수 있어요.',
        }],
        needs: [],
      },
    }));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={repository}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '후보 선택 전환을 확인하는 합성 글');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    fireEvent.press(screen.getByLabelText('감정을 아직 모르겠어요'));
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));
    await waitFor(() => expect(screen.getByLabelText('외로운 내 선택에 추가')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('외로운 내 선택에 추가'));
    fireEvent.press(screen.getByRole('button', { name: '선택한 내용 확인하기' }));

    expect(screen.getByText('달력에서 먼저 볼 대표 감정을 골라 주세요.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('외로운: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));
    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());

    const saved = expectOk(await repository.getByDate(dateKey('2026-08-24')));
    expect(saved?.exploration.finalConfirmed.emotions).toMatchObject({
      status: 'confirmed',
      representativeEmotionId: 'emotion-lonely',
    });
  });

  it('AI 도움 실패 후에도 글과 선택을 유지하고 재시도하거나 내 선택으로 계속한다', async () => {
    const suggest = jest.fn<ReturnType<EmotionExplorer['suggest']>, Parameters<EmotionExplorer['suggest']>>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'unavailable', safeMessage: '지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.' },
      })
      .mockResolvedValueOnce({ ok: true, value: { emotions: [], needs: [] } });
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));

    await waitFor(() => expect(screen.getByText('지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));
    await waitFor(() => expect(screen.getByText('추가로 보여 줄 후보가 없어요. 이미 고른 내용으로 계속해도 돼요.')).toBeTruthy());
    expect(suggest).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByRole('button', { name: '마음 지도 다시 보기' }));
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 계속하기' }));
    expect(screen.getByLabelText('기쁜: 대표 감정으로 선택')).toBeTruthy();
    expect(screen.getByText('선택한 욕구: 휴식')).toBeTruthy();
  });

  it('후보를 확인하는 동안 중복 요청을 막는다', async () => {
    let resolveRequest: ((result: EmotionExplorerResult) => void) | undefined;
    const suggest = jest.fn(() => new Promise<EmotionExplorerResult>((resolve) => {
      resolveRequest = resolve;
    }));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    const requestButton = screen.getByRole('button', { name: '안내 확인하고 후보 보기' });
    const pressRequest = getPressHandler(requestButton);
    act(() => {
      pressRequest();
      pressRequest();
    });

    const loadingButton = screen.getByRole('button', { name: '후보 확인 중' });
    expect(loadingButton.props.accessibilityState?.disabled ?? loadingButton.props.disabled).toBe(true);
    expect(suggest).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.({ ok: true, value: { emotions: [], needs: [] } });
    });
    await waitFor(() => expect(screen.getByLabelText('AI 보조 후보')).toBeTruthy());
  });

  it('AI에서 본 후보를 목록에서 직접 다시 고르면 사용자 선택으로만 저장한다', async () => {
    const repository = createRepository();
    const suggest = jest.fn(async (): Promise<EmotionExplorerResult> => ({
      ok: true,
      value: {
        emotions: [{
          choice: { id: 'emotion-lonely', kind: 'emotion', label: '외로운', source: 'catalog' },
          reason: '연결이 멀게 느껴졌는지 함께 살펴볼 수 있어요.',
        }],
        needs: [],
      },
    }));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={repository}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));
    await waitFor(() => expect(screen.getByRole('summary', { name: 'AI 보조 후보가 도착했어요' })).toBeTruthy());

    fireEvent.press(screen.getByRole('button', { name: '마음 지도 다시 보기' }));
    fireEvent.press(screen.getByLabelText('외로운 선택'));
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 확인하기' }));
    fireEvent.press(screen.getByLabelText('외로운: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 이 기기에 저장했어요.')).toBeTruthy());
    const saved = expectOk(await repository.getByDate(dateKey('2026-08-24')));
    expect(saved?.exploration.userSelected.emotions.map((choice) => choice.id)).toContain('emotion-lonely');
    expect(saved?.exploration.aiSuggested.emotions).toEqual([]);
  });

  it.each([
    ['cancelled', 'AI 도움 요청을 취소했어요. 직접 고른 내용은 그대로 유지돼요.'],
    ['invalid-response', 'AI 응답을 안전하게 확인하지 못했어요. 직접 고른 내용은 그대로 유지돼요.'],
  ] as const)('%s 결과를 안전하게 표시하고 직접 계속할 수 있다', async (code, safeMessage) => {
    const suggest = jest.fn(async (): Promise<EmotionExplorerResult> => ({
      ok: false,
      error: { code, safeMessage },
    }));
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));

    await waitFor(() => expect(screen.getByText(safeMessage)).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 계속하기' }));
    expect(screen.getByLabelText('기쁜: 대표 감정으로 선택')).toBeTruthy();
    expect(screen.getByText('선택한 욕구: 휴식')).toBeTruthy();
  });

  it('탐색기가 예외를 던져도 원문을 노출하지 않고 선택을 유지한다', async () => {
    const suggest = jest.fn(async (): Promise<EmotionExplorerResult> => {
      throw new Error('합성 이야기와 공급자 세부 정보');
    });
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));

    await waitFor(() => expect(screen.getByText('지금은 AI 도움을 불러오지 못했어요. 직접 고른 내용은 그대로 유지돼요.')).toBeTruthy());
    expect(screen.queryByText('공급자 세부 정보')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: '내 선택으로 계속하기' }));
    expect(screen.getByText('선택한 욕구: 휴식')).toBeTruthy();
  });

  it('화면을 벗어난 뒤 도착한 후보 응답을 폐기한다', async () => {
    let resolveRequest: ((result: EmotionExplorerResult) => void) | undefined;
    const suggest = jest.fn(() => new Promise<EmotionExplorerResult>((resolve) => {
      resolveRequest = resolve;
    }));
    const view = render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-24')}
        repository={createRepository()}
        selfExploration={createSelfExploration(suggest)}
        vocabulary={vocabulary}
      />,
    );
    advanceToNeeds();
    fireEvent.press(screen.getByRole('button', { name: 'AI와 더 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '안내 확인하고 후보 보기' }));
    view.unmount();

    await act(async () => {
      resolveRequest?.({ ok: true, value: { emotions: [], needs: [] } });
    });
    expect(suggest).toHaveBeenCalledTimes(1);
  });
});
