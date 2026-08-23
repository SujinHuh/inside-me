import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAppServices } from '@/src/composition/AppServicesProvider';
import { EntryDetailScreen } from '@/src/features/entry-detail/EntryDetailScreen';
import { shareEntryExport } from '@/src/composition/share-entry-export';

export default function EntryDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dateKey?: string | string[] }>();
  const { dateKeyPolicy, entryRepository, entrySerializer, exportFilePort } = useAppServices();
  const dateKey = Array.isArray(params.dateKey) ? params.dateKey[0] : params.dateKey;

  return (
    <EntryDetailScreen
      dateKey={dateKey ?? ''}
      dateKeyPolicy={dateKeyPolicy}
      onDeleted={() => router.replace('/calendar')}
      onEdit={(value) =>
        router.push({ pathname: '/text-entry', params: { dateKey: value } })
      }
      onRequestExport={() => {
        void shareEntryExport(
          entryRepository,
          entrySerializer,
          exportFilePort,
          new Date(),
        ).then((result) => {
          if (!result.ok) Alert.alert('내보내지 못했어요', result.error.safeMessage);
        });
      }}
      repository={entryRepository}
    />
  );
}
