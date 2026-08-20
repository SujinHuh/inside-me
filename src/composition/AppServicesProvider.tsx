import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { createAppServices, type AppServices } from './create-app-services';

const AppServicesContext = createContext<AppServices | null>(null);

interface AppServicesProviderProps extends PropsWithChildren {
  createServices?: () => AppServices;
}

export function AppServicesProvider({ children, createServices = createAppServices }: AppServicesProviderProps) {
  const services = useMemo(createServices, [createServices]);

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error('AppServicesProvider 안에서만 앱 서비스를 사용할 수 있습니다.');
  }

  return services;
}
