import type { Clock } from '@/src/core/contracts';

export class FixedClock implements Clock {
  constructor(private readonly fixedNow: Date) {}

  now(): Date {
    return new Date(this.fixedNow.getTime());
  }
}
