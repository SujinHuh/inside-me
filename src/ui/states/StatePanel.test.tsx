import { fireEvent, render, screen } from '@testing-library/react-native';

import { StatePanel } from './StatePanel';

describe('StatePanel', () => {
  it.each([
    ['loading' as const, '기록을 준비하고 있어요'],
    ['empty' as const, '아직 기록이 없어요'],
    ['error' as const, '준비하지 못했어요'],
  ])('%s 상태를 색상 외의 텍스트로 알린다', (kind, title) => {
    render(<StatePanel kind={kind} title={title} description="합성 상태 안내입니다." />);

    expect(screen.getByText(title)).toBeTruthy();
    const panel = screen.getByLabelText(`${title}. 합성 상태 안내입니다.`);
    expect(panel).toBeTruthy();
    expect(panel.props.accessibilityLiveRegion).toBe(kind === 'error' ? 'assertive' : 'polite');
    expect(panel.props.accessibilityRole).toBe(kind === 'error' ? 'alert' : 'summary');
  });

  it('재시도 버튼을 누르면 지정된 행동만 실행한다', () => {
    const onAction = jest.fn();
    render(
      <StatePanel
        actionLabel="다시 시도"
        description="작성 중인 내용은 그대로 남아 있어요."
        kind="error"
        onAction={onAction}
        title="저장하지 못했어요"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
