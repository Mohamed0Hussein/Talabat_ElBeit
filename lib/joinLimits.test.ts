import {
  FAMILY_MAX_ATTEMPTS,
  FAMILY_WINDOW_MS,
  FREE_ATTEMPTS,
  SLOWER_AFTER,
  SLOWER_COOLDOWN_MS,
  SLOW_COOLDOWN_MS,
  accountCooldownUntil,
  familyBusyUntil,
  triesLeftBeforeWait,
} from './joinLimits';

const MIN = 60 * 1000;
const now = new Date(2026, 10, 1, 10, 0);
const ago = (minutes: number) => new Date(now.getTime() - minutes * MIN);

it('matches the numbers in the spec', () => {
  expect(FREE_ATTEMPTS).toBe(5);
  expect(SLOW_COOLDOWN_MS).toBe(15 * MIN);
  expect(SLOWER_AFTER).toBe(10);
  expect(SLOWER_COOLDOWN_MS).toBe(60 * MIN);
  expect(FAMILY_WINDOW_MS).toBe(60 * MIN);
  expect(FAMILY_MAX_ATTEMPTS).toBe(10);
});

describe('accountCooldownUntil', () => {
  it('has no wait before any attempt or within the free attempts', () => {
    expect(accountCooldownUntil(null)).toBeNull();
    expect(accountCooldownUntil({ count: 4, at: now })).toBeNull();
  });

  it('waits 15 minutes after the 5th attempt', () => {
    expect(accountCooldownUntil({ count: 5, at: now })).toEqual(new Date(now.getTime() + 15 * MIN));
  });

  it('waits an hour after the 10th attempt', () => {
    expect(accountCooldownUntil({ count: 10, at: now })).toEqual(new Date(now.getTime() + 60 * MIN));
  });
});

describe('familyBusyUntil', () => {
  it('is busy until the window ends when 10 attempts were made in it', () => {
    const windowStart = ago(10);
    expect(familyBusyUntil({ count: 10, windowStart }, now)).toEqual(new Date(windowStart.getTime() + 60 * MIN));
  });

  it('is free once the window has passed', () => {
    expect(familyBusyUntil({ count: 10, windowStart: ago(61) }, now)).toBeNull();
  });

  it('is free below the cap or without a record', () => {
    expect(familyBusyUntil({ count: 9, windowStart: ago(10) }, now)).toBeNull();
    expect(familyBusyUntil(null, now)).toBeNull();
  });
});

describe('triesLeftBeforeWait', () => {
  it('counts down the free attempts', () => {
    expect(triesLeftBeforeWait(1)).toBe(4);
    expect(triesLeftBeforeWait(5)).toBe(0);
    expect(triesLeftBeforeWait(12)).toBe(0);
  });
});
