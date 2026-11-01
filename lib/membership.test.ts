import { MAX_RESUBSCRIBES, membershipStep } from './membership';

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
