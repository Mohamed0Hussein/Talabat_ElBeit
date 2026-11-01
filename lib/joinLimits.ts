// Mirrors the limits enforced in firestore.rules, so the app can explain them.
export const FREE_ATTEMPTS = 5;
export const SLOW_COOLDOWN_MS = 15 * 60 * 1000;
export const SLOWER_AFTER = 10;
export const SLOWER_COOLDOWN_MS = 60 * 60 * 1000;
export const FAMILY_WINDOW_MS = 60 * 60 * 1000;
export const FAMILY_MAX_ATTEMPTS = 10;

/** When this account may try again, or null if it may try now. */
export function accountCooldownUntil(prev: { count: number; at: Date } | null): Date | null {
  if (!prev || prev.count < FREE_ATTEMPTS) return null;
  const wait = prev.count < SLOWER_AFTER ? SLOW_COOLDOWN_MS : SLOWER_COOLDOWN_MS;
  return new Date(prev.at.getTime() + wait);
}

/** When the family accepts join attempts again, or null if it does now. */
export function familyBusyUntil(limit: { windowStart: Date; count: number } | null, now: Date): Date | null {
  if (!limit) return null;
  const windowEnd = new Date(limit.windowStart.getTime() + FAMILY_WINDOW_MS);
  if (now.getTime() >= windowEnd.getTime()) return null;
  return limit.count >= FAMILY_MAX_ATTEMPTS ? windowEnd : null;
}

export function triesLeftBeforeWait(count: number): number {
  return Math.max(0, FREE_ATTEMPTS - count);
}
