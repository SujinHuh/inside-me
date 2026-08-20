import type {
  DateKey,
  DateKeyPolicy,
  DateKeyResult,
  MonthKey,
} from '@/src/core/contracts';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function supportedYear(date: Date): number {
  const year = date.getFullYear();
  if (Number.isNaN(date.getTime()) || year < 1 || year > 9999) {
    throw new RangeError('Local date year must be between 1 and 9999');
  }
  return year;
}

function daysInMonth(year: number, month: number): number {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export class LocalDateKeyPolicy implements DateKeyPolicy {
  fromDate(date: Date): DateKey {
    const year = String(supportedYear(date)).padStart(4, '0');
    return `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as DateKey;
  }

  monthFromDate(date: Date): MonthKey {
    const year = String(supportedYear(date)).padStart(4, '0');
    return `${year}-${pad(date.getMonth() + 1)}` as MonthKey;
  }

  parseDateKey(value: string): DateKeyResult<DateKey> {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return { ok: false, error: 'invalid-date-key' };
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      return { ok: false, error: 'invalid-date-key' };
    }

    return { ok: true, value: value as DateKey };
  }

  parseMonthKey(value: string): DateKeyResult<MonthKey> {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      return { ok: false, error: 'invalid-month-key' };
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < 1 || month < 1 || month > 12) {
      return { ok: false, error: 'invalid-month-key' };
    }

    return { ok: true, value: value as MonthKey };
  }

  isDateKey(value: string): value is DateKey {
    return this.parseDateKey(value).ok;
  }

  isMonthKey(value: string): value is MonthKey {
    return this.parseMonthKey(value).ok;
  }
}
