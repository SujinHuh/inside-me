import { fireEvent, render, screen } from '@testing-library/react-native';

import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('글 기록 시작을 명시적 콜백으로 전달한다', () => {
    const onStartTextEntry = jest.fn();
    render(<HomeScreen onStartTextEntry={onStartTextEntry} persistentEntriesAvailable />);

    fireEvent.press(screen.getByRole('button', { name: '글로 기록하기' }));

    expect(onStartTextEntry).toHaveBeenCalledTimes(1);
  });

  it('웹 미리보기에서는 저장 버튼을 비활성화하고 이유를 알린다', () => {
    render(<HomeScreen />);

    expect(screen.getByRole('button', { name: '글로 기록하기' })).toBeDisabled();
    expect(
      screen.getByLabelText(
        '웹 미리보기에서는 기록을 저장할 수 없습니다. Android Expo Go에서 확인해 주세요.',
      ),
    ).toBeTruthy();
  });
});
