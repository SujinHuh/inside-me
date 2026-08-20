import { render } from '@testing-library/react-native';
import { useEffect } from 'react';

import type { AppServices } from './create-app-services';
import { AppServicesProvider, useAppServices } from './AppServicesProvider';

function ServicesConsumer({ onServices }: { onServices: (services: AppServices) => void }) {
  const services = useAppServices();

  useEffect(() => onServices(services), [onServices, services]);
  return null;
}

describe('AppServicesProvider', () => {
  it('같은 Provider 수명 동안 서비스 인스턴스를 한 번만 만든다', () => {
    const services = { vocabulary: {}, selfExploration: {} } as AppServices;
    const createServices = jest.fn(() => services);
    const onServices = jest.fn();
    const view = render(
      <AppServicesProvider createServices={createServices}>
        <ServicesConsumer onServices={onServices} />
      </AppServicesProvider>,
    );

    view.rerender(
      <AppServicesProvider createServices={createServices}>
        <ServicesConsumer onServices={onServices} />
      </AppServicesProvider>,
    );

    expect(createServices).toHaveBeenCalledTimes(1);
    expect(onServices.mock.calls.every(([value]) => value === services)).toBe(true);
  });
});
