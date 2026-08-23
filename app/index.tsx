import { useRouter } from 'expo-router';

import { HomeScreen } from '@/src/features/home/HomeScreen';
import { useAppServices } from '@/src/composition/AppServicesProvider';

export default function HomeRoute() {
  const router = useRouter();
  const { persistentEntriesAvailable } = useAppServices();

  return (
    <HomeScreen
      onOpenCalendar={persistentEntriesAvailable ? () => router.push('/calendar') : undefined}
      onStartTextEntry={persistentEntriesAvailable ? () => router.push('/text-entry') : undefined}
      persistentEntriesAvailable={persistentEntriesAvailable}
    />
  );
}
