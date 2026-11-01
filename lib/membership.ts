export const MAX_RESUBSCRIBES = 3;

export type MembershipStep = 'wait' | 'gone' | 'resubscribe' | 'trust';

/**
 * What to do after asking the server whether our member record exists, because the live
 * listener was refused or saw nothing. `exists` is null when the server couldn't be reached.
 */
export function membershipStep(exists: boolean | null, resubscribesUsed: number): MembershipStep {
  if (exists === null) return 'wait';
  if (!exists) return 'gone';
  return resubscribesUsed < MAX_RESUBSCRIBES ? 'resubscribe' : 'trust';
}

/**
 * The family id from our profile snapshot, or 'unknown' when the snapshot can't be trusted yet:
 * our own write is still unsaved, or we're offline and nothing is cached (Firestore then reports
 * an empty profile, which must not be read as "no family").
 */
export function familyIdFromProfile(snap: {
  exists: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  familyId: unknown;
}): string | null | 'unknown' {
  if (snap.hasPendingWrites) return 'unknown';
  if (!snap.exists && snap.fromCache) return 'unknown';
  return typeof snap.familyId === 'string' ? snap.familyId : null;
}
