import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAppServices } from '@/src/composition/AppServicesProvider';
import type { DailyEntry, DateKey } from '@/src/core/contracts';
import { TextEntryFlowScreen } from '@/src/features/text-entry/TextEntryFlowScreen';
import { StatePanel } from '@/src/ui/states/StatePanel';

type DraftLoadState =
  | { status: 'new'; dateKey: DateKey }
  | { status: 'loading'; dateKey: DateKey }
  | { status: 'ready'; dateKey: DateKey; entry: DailyEntry }
  | { status: 'error'; message: string };

export default function TextEntryRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dateKey?: string | string[] }>();
  const { dateKeyPolicy, entryRepository, selfExploration, vocabulary } = useAppServices();
  const requestedDate = Array.isArray(params.dateKey) ? params.dateKey[0] : params.dateKey;
  const parsedRequestedDate = requestedDate ? dateKeyPolicy.parseDateKey(requestedDate) : null;
  const today = dateKeyPolicy.fromDate(new Date());
  const [loadState, setLoadState] = useState<DraftLoadState>(() =>
    !requestedDate
      ? { status: 'new', dateKey: today }
      : parsedRequestedDate?.ok
        ? { status: 'loading', dateKey: parsedRequestedDate.value }
        : { status: 'error', message: '수정할 날짜를 확인할 수 없어요.' },
  );

  useEffect(() => {
    if (!requestedDate) return;
    const parsedDate = dateKeyPolicy.parseDateKey(requestedDate);
    if (!parsedDate.ok) {
      setLoadState({ status: 'error', message: '수정할 날짜를 확인할 수 없어요.' });
      return;
    }
    let active = true;
    const dateKey = parsedDate.value;
    setLoadState({ status: 'loading', dateKey });
    void entryRepository.getByDate(dateKey).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadState({ status: 'error', message: result.error.safeMessage });
      } else if (!result.value) {
        setLoadState({ status: 'error', message: '수정할 기록을 찾을 수 없어요.' });
      } else {
        setLoadState({ status: 'ready', dateKey, entry: result.value });
      }
    });
    return () => {
      active = false;
    };
  }, [dateKeyPolicy, entryRepository, requestedDate]);

  if (loadState.status === 'loading') {
    return (
      <StatePanel
        description="기기에 저장된 기록을 안전하게 확인하고 있어요."
        kind="loading"
        title="기록을 불러오고 있어요"
      />
    );
  }
  if (loadState.status === 'error') {
    return <StatePanel description={loadState.message} kind="error" title="기록을 열지 못했어요" />;
  }

  return (
    <TextEntryFlowScreen
      dateKey={loadState.dateKey}
      initialDraft={loadState.status === 'ready' ? loadState.entry : undefined}
      onSaved={() =>
        router.replace({ pathname: '/entries/[dateKey]', params: { dateKey: loadState.dateKey } })
      }
      repository={entryRepository}
      selfExploration={selfExploration}
      vocabulary={vocabulary}
    />
  );
}
