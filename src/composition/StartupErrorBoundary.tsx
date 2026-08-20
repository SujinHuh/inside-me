import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

import { StatePanel } from '../ui/states/StatePanel';

interface StartupErrorBoundaryState {
  failed: boolean;
}

export class StartupErrorBoundary extends Component<PropsWithChildren, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): StartupErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // 민감한 기록이나 원시 오류를 일반 로그로 내보내지 않는다.
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <StatePanel
          description="앱을 다시 열어 주세요. 기기에 있던 기록은 지우지 않았어요."
          kind="error"
          title="Inside Me를 준비하지 못했어요"
        />
      );
    }

    return this.props.children;
  }
}
