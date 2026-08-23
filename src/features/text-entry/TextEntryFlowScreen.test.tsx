import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { InMemoryEmotionNeedVocabulary, INITIAL_VOCABULARY } from '@/src/core/vocabulary';
import { ControllableEntryRepository } from '@/src/testing/fakes/controllable-entry-repository';
import { createDraft, createRepository, dateKey, expectOk } from '@/src/testing/fixtures/entry-fixtures';
import { TextEntryFlowScreen } from './TextEntryFlowScreen';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

function advanceToConfirmation() {
  fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '합성 테스트를 완료해서 마음이 여러 갈래였다.');
  fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
  fireEvent.press(screen.getByLabelText('기쁜 선택'));
  fireEvent.press(screen.getByLabelText('서운한 선택'));
  fireEvent.press(screen.getByLabelText('서운한 강도 4'));
  fireEvent.press(screen.getByRole('button', { name: '욕구 살펴보기' }));
  fireEvent.press(screen.getByLabelText('휴식 선택'));
  fireEvent.press(screen.getByRole('button', { name: '저장 전 확인하기' }));
}

describe('TextEntryFlowScreen', () => {
  it('빈 글을 막고 키보드 입력과 접근성 이름을 유지한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
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

  it('대표 감정을 선택해도 해당 감정을 해제하면 대표 선택을 무효화한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '감정 다시 고르기' }));
    fireEvent.press(screen.getByLabelText('기쁜 선택 해제'));
    fireEvent.press(screen.getByRole('button', { name: '욕구 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '저장 전 확인하기' }));

    expect(screen.getByLabelText('서운한: 대표 감정으로 선택').props.accessibilityState.selected).toBe(false);
  });

  it('저장 실패 후에도 글과 사용자 선택을 보존한다', async () => {
    const repository = new ControllableEntryRepository(createRepository());
    repository.failNext('save', { code: 'storage-unavailable', safeMessage: '기록을 저장하지 못했어요.' });
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={repository}
        vocabulary={vocabulary}
      />,
    );
    advanceToConfirmation();
    fireEvent.press(screen.getByLabelText('기쁜: 대표 감정으로 선택'));
    fireEvent.press(screen.getByRole('button', { name: '이 내용으로 저장' }));

    await waitFor(() => expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy());
    expect(screen.getByLabelText('기쁜: 대표 감정으로 선택').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: '감정 다시 고르기' }));
    fireEvent.press(screen.getByRole('button', { name: '글 다시 보기' }));
    expect(screen.getByDisplayValue('합성 테스트를 완료해서 마음이 여러 갈래였다.')).toBeTruthy();
  });

  it('검색·주제 필터·직접 추가로 목록을 탐색한다', () => {
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        repository={createRepository()}
        vocabulary={vocabulary}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '탐색 동작을 확인하는 합성 글');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));

    fireEvent.changeText(screen.getByLabelText('감정 검색'), '고마운');
    expect(screen.getByLabelText('감사한 선택')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('감정 검색'), '');
    fireEvent.press(screen.getByRole('button', { name: '화와 억울함' }));
    expect(screen.getByLabelText('억울한 선택')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('내 감정 직접 추가'), '뿌듯한');
    fireEvent.press(screen.getByRole('button', { name: '추가' }));
    expect(screen.getByText('뿌듯한 강도 3')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('뿌듯한 감정 선택 해제'));
    expect(screen.queryByText('뿌듯한 강도 3')).toBeNull();

    fireEvent.press(screen.getByLabelText('억울한 선택'));

    fireEvent.press(screen.getByRole('button', { name: '욕구 살펴보기' }));
    fireEvent.changeText(screen.getByLabelText('내 욕구 직접 추가'), '여유');
    fireEvent.press(screen.getByRole('button', { name: '추가' }));
    fireEvent.press(screen.getByRole('button', { name: '저장 전 확인하기' }));
    expect(screen.getByText('선택한 욕구: 여유')).toBeTruthy();
  });

  it('기존 초안을 다시 열어 수정하고 AI 제안을 사용자 확정으로 바꾸지 않는다', async () => {
    const repository = createRepository();
    const initialDraft = createDraft('2026-08-23');
    render(
      <TextEntryFlowScreen
        dateKey={dateKey('2026-08-23')}
        initialDraft={initialDraft}
        repository={repository}
        vocabulary={vocabulary}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('오늘의 이야기'), '수정한 합성 이야기');
    fireEvent.press(screen.getByRole('button', { name: '감정 살펴보기' }));
    expect(screen.getByText('차분한 강도 3')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '욕구 살펴보기' }));
    fireEvent.press(screen.getByRole('button', { name: '저장 전 확인하기' }));
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
});
