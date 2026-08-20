import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, type PropsWithChildren } from 'react';

import { LOCAL_DATABASE_NAME, prepareLocalDatabase } from '../infrastructure/storage/local-database';
import { StatePanel } from '../ui/states/StatePanel';
import { AppServiceBoundary } from './AppServiceBoundary';
import { StartupErrorBoundary } from './StartupErrorBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <StartupErrorBoundary>
      <Suspense
        fallback={
          <StatePanel
            description="기기에 저장할 공간을 안전하게 확인하고 있어요."
            kind="loading"
            title="Inside Me를 준비하고 있어요"
          />
        }
      >
        <SQLiteProvider databaseName={LOCAL_DATABASE_NAME} onInit={prepareLocalDatabase} useSuspense>
          <AppServiceBoundary>{children}</AppServiceBoundary>
        </SQLiteProvider>
      </Suspense>
    </StartupErrorBoundary>
  );
}
