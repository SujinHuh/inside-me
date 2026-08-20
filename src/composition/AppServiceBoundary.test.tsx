import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppServiceBoundary } from './AppServiceBoundary';

describe('AppServiceBoundary', () => {
  it('공통 서비스 생성 실패에서 원시 오류 대신 안전한 상태 화면을 보여 준다', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppServiceBoundary
        createServices={() => {
          throw new Error('합성 내부 오류와 민감할 수 있는 원문');
        }}
      >
        <Text>표시되면 안 되는 화면</Text>
      </AppServiceBoundary>,
    );

    expect(screen.getByText('Inside Me를 준비하지 못했어요')).toBeTruthy();
    expect(screen.queryByText(/합성 내부 오류/)).toBeNull();
    consoleError.mockRestore();
  });
});
