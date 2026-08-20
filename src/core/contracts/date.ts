declare const dateKeyBrand: unique symbol;
declare const monthKeyBrand: unique symbol;

export type DateKey = string & { readonly [dateKeyBrand]: true };
export type MonthKey = string & { readonly [monthKeyBrand]: true };

export type ParseResult<T, TError extends string> =
  | { ok: true; value: T }
  | { ok: false; error: TError };

export type DateKeyResult = ParseResult<DateKey, 'invalid-date-key'>;
export type MonthKeyResult = ParseResult<MonthKey, 'invalid-month-key'>;

export interface Clock {
  now(): Date;
}

export interface DateKeyPolicy {
  /** 사용자 기기의 현지 달력 날짜를 사용한다. UTC 날짜로 변환하지 않는다. */
  fromDate(date: Date): DateKey;
  monthFromDate(date: Date): MonthKey;
  parseDateKey(value: string): DateKeyResult;
  parseMonthKey(value: string): MonthKeyResult;
  isDateKey(value: string): value is DateKey;
  isMonthKey(value: string): value is MonthKey;
}
