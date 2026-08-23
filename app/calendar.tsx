import { useRouter } from 'expo-router';

import { useAppServices } from '@/src/composition/AppServicesProvider';
import { CalendarScreen } from '@/src/features/calendar/CalendarScreen';

export default function CalendarRoute() {
  const router = useRouter();
  const { dateKeyPolicy, entryRepository } = useAppServices();
  const currentMonth = dateKeyPolicy.monthFromDate(new Date());

  return (
    <CalendarScreen
      dateKeyPolicy={dateKeyPolicy}
      initialMonthKey={currentMonth}
      onOpenEntry={(dateKey) =>
        router.push({ pathname: '/entries/[dateKey]', params: { dateKey } })
      }
      repository={entryRepository}
    />
  );
}
