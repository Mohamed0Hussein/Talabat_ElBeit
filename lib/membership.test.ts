import { MAX_RESUBSCRIBES, familyIdFromProfile, membershipStep } from './membership';

it('waits when the server could not be reached', () => {
  expect(membershipStep(null, 0)).toBe('wait');
});

it('is gone when the server says the member record does not exist', () => {
  expect(membershipStep(false, 0)).toBe('gone');
});

it('re-subscribes a few times when the record exists but the listener failed', () => {
  expect(MAX_RESUBSCRIBES).toBe(3);
  expect(membershipStep(true, 0)).toBe('resubscribe');
  expect(membershipStep(true, 2)).toBe('resubscribe');
});

it('trusts the server after that instead of waiting forever', () => {
  expect(membershipStep(true, 3)).toBe('trust');
});

describe('familyIdFromProfile', () => {
  const snap = (o: Partial<{ exists: boolean; fromCache: boolean; hasPendingWrites: boolean; familyId: unknown }>) => ({
    exists: true,
    fromCache: false,
    hasPendingWrites: false,
    familyId: 'f1',
    ...o,
  });

  it('reads the family from a saved profile', () => {
    expect(familyIdFromProfile(snap({}))).toBe('f1');
    expect(familyIdFromProfile(snap({ familyId: null }))).toBeNull();
  });

  it('treats a missing profile from the server as no family', () => {
    expect(familyIdFromProfile(snap({ exists: false, familyId: undefined }))).toBeNull();
  });

  it('waits when offline and the profile is not cached', () => {
    expect(familyIdFromProfile(snap({ exists: false, fromCache: true, familyId: undefined }))).toBe('unknown');
  });

  it('waits while our own change is unsaved', () => {
    expect(familyIdFromProfile(snap({ hasPendingWrites: true }))).toBe('unknown');
  });
});
