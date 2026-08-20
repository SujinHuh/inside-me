import type { PropsWithChildren } from 'react';

import { AppServiceBoundary } from './AppServiceBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  return <AppServiceBoundary>{children}</AppServiceBoundary>;
}
