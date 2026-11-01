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
