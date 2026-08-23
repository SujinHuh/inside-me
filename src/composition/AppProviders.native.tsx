import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Suspense, type PropsWithChildren, useCallback } from 'react';

import { LocalDateKeyPolicy } from '../core/dates/local-date-key-policy';
import { LOCAL_DATABASE_NAME, prepareLocalDatabase } from '../infrastructure/storage/local-database';
import { ExpoSQLiteDatabaseAdapter } from '../infrastructure/storage/expo-sqlite-database-adapter';
import { SQLiteEntryRepository } from '../infrastructure/storage/sqlite-entry-repository';
import { ExpoExportFilePort } from '../platform/files/expo-export-file-port.native';
import { StatePanel } from '../ui/states/StatePanel';
import { AppServiceBoundary } from './AppServiceBoundary';
import { StartupErrorBoundary } from './StartupErrorBoundary';
import { createAppServices } from './create-app-services';

const systemClock = { now: () => new Date() };

function createEntryId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `entry-${Date.now().toString(36)}-${randomPart}`;
}

function NativeAppServiceBoundary({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const createServices = useCallback(() => {
    const dateKeyPolicy = new LocalDateKeyPolicy();
    const entryRepository = new SQLiteEntryRepository(
      new ExpoSQLiteDatabaseAdapter(database),
      systemClock,
      createEntryId,
      dateKeyPolicy,
    );
    return createAppServices({
      dateKeyPolicy,
      entryRepository,
      exportFilePort: new ExpoExportFilePort(),
      persistentEntriesAvailable: true,
    });
  }, [database]);

  return <AppServiceBoundary createServices={createServices}>{children}</AppServiceBoundary>;
}

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
          <NativeAppServiceBoundary>{children}</NativeAppServiceBoundary>
        </SQLiteProvider>
      </Suspense>
    </StartupErrorBoundary>
  );
}
