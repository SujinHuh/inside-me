import { LocalDateKeyPolicy } from './local-date-key-policy';

describe('LocalDateKeyPolicy', () => {
  const policy = new LocalDateKeyPolicy();

  it('사용자 기기의 현지 달력 날짜와 월을 만든다', () => {
    const localMidnight = new Date(2026, 7, 20, 0, 5, 0);

    expect(policy.fromDate(localMidnight)).toBe('2026-08-20');
    expect(policy.monthFromDate(localMidnight)).toBe('2026-08');
  });

  it('윤년은 허용하고 존재하지 않는 월과 날짜는 거부한다', () => {
    expect(policy.parseDateKey('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' });
    expect(policy.parseDateKey('2025-02-29')).toEqual({ ok: false, error: 'invalid-date-key' });
    expect(policy.parseDateKey('2026-13-01')).toEqual({ ok: false, error: 'invalid-date-key' });
    expect(policy.parseDateKey('2026-04-31')).toEqual({ ok: false, error: 'invalid-date-key' });
    expect(policy.parseMonthKey('2026-00')).toEqual({ ok: false, error: 'invalid-month-key' });
  });

  it('지원하는 연도는 4자리로 왕복하고 범위 밖 연도는 거부한다', () => {
    const year99 = new Date(0);
    year99.setFullYear(99, 0, 2);
    expect(policy.fromDate(year99)).toBe('0099-01-02');
    expect(policy.parseDateKey(policy.fromDate(year99)).ok).toBe(true);

    const year10000 = new Date(0);
    year10000.setFullYear(10000, 0, 1);
    expect(() => policy.fromDate(year10000)).toThrow(RangeError);
  });
});
