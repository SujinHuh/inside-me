import type { PropsWithChildren } from 'react';

import type { AppServices } from './create-app-services';
import { AppServicesProvider } from './AppServicesProvider';
import { StartupErrorBoundary } from './StartupErrorBoundary';

interface AppServiceBoundaryProps extends PropsWithChildren {
  createServices?: () => AppServices;
}

export function AppServiceBoundary({ children, createServices }: AppServiceBoundaryProps) {
  return (
    <StartupErrorBoundary>
      <AppServicesProvider createServices={createServices}>{children}</AppServicesProvider>
    </StartupErrorBoundary>
  );
}
