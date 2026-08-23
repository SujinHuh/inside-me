import type {
  DailyEntry,
  DateKey,
  DateKeyPolicy,
  MonthKey,
} from '@/src/core/contracts';

export interface CalendarDay {
  day: number;
  dateKey: DateKey;
  entry: DailyEntry | null;
}

export type CalendarGridCell =
  | { kind: 'blank'; id: string }
  | { kind: 'day'; value: CalendarDay };

export interface RepresentativeEmotionSummary {
  id: string;
  label: string;
  intensity: number;
  additionalEmotionCount: number;
}

function parseMonthParts(monthKey: MonthKey): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function dateAtLocalNoon(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);
  return date;
}

export function formatMonthTitle(monthKey: MonthKey): string {
  const { year, month } = parseMonthParts(monthKey);
  return `${year}년 ${month}월`;
}

export function moveMonth(
  monthKey: MonthKey,
  amount: -1 | 1,
  dateKeyPolicy: DateKeyPolicy,
): MonthKey | null {
  const { year, month } = parseMonthParts(monthKey);
  const moved = dateAtLocalNoon(year, month - 1 + amount, 1);

  try {
    return dateKeyPolicy.monthFromDate(moved);
  } catch {
    return null;
  }
}

export function buildCalendarGrid(
  monthKey: MonthKey,
  entries: readonly DailyEntry[],
  dateKeyPolicy: DateKeyPolicy,
): readonly CalendarGridCell[] {
  const { year, month } = parseMonthParts(monthKey);
  const firstWeekday = dateAtLocalNoon(year, month - 1, 1).getDay();
  const dayCount = dateAtLocalNoon(year, month, 0).getDate();
  const entriesByDate = new Map(entries.map((entry) => [entry.dateKey, entry]));
  const cells: CalendarGridCell[] = Array.from({ length: firstWeekday }, (_, index) => ({
    kind: 'blank',
    id: `leading-${index}`,
  }));

  for (let day = 1; day <= dayCount; day += 1) {
    const date = dateAtLocalNoon(year, month - 1, day);
    const dateKey = dateKeyPolicy.fromDate(date);
    cells.push({
      kind: 'day',
      value: { day, dateKey, entry: entriesByDate.get(dateKey) ?? null },
    });
  }

  const trailingCount = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingCount; index += 1) {
    cells.push({ kind: 'blank', id: `trailing-${index}` });
  }

  return cells;
}

export function representativeEmotionSummary(
  entry: DailyEntry,
): RepresentativeEmotionSummary | null {
  const confirmation = entry.exploration.finalConfirmed.emotions;
  if (confirmation.status === 'unknown') return null;

  const representative = confirmation.items.find(
    (emotion) => emotion.id === confirmation.representativeEmotionId,
  );
  if (!representative) return null;

  return {
    id: representative.id,
    label: representative.label,
    intensity: representative.intensity,
    additionalEmotionCount: confirmation.items.length - 1,
  };
}

export function formatCalendarDayAccessibilityLabel(day: CalendarDay): string {
  const [year, month, date] = day.dateKey.split('-').map(Number);
  const dateLabel = `${year}년 ${month}월 ${date}일`;
  if (!day.entry) return `${dateLabel}, 기록 없음`;

  const representative = representativeEmotionSummary(day.entry);
  if (!representative) return `${dateLabel}, 기록 있음, 대표 감정 미확정`;

  const additionalLabel = representative.additionalEmotionCount
    ? `, 추가 감정 ${representative.additionalEmotionCount}개`
    : ', 추가 감정 없음';
  return `${dateLabel}, 대표 감정 ${representative.label}${additionalLabel}`;
}
