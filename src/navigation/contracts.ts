import type { DateKey } from '@/src/core/contracts';

export type AppRouteParams = {
  home: undefined;
  textEntry: { dateKey?: DateKey } | undefined;
  emotionReview: { dateKey: DateKey };
  calendar: undefined;
  entryDetail: { dateKey: DateKey };
};

export type AppRouteName = keyof AppRouteParams;
