import { AppError, errorKey } from './errors';

describe('errorKey', () => {
  it('maps sign-in failures to one friendly message', () => {
    expect(errorKey({ code: 'auth/invalid-credential' })).toBe('errors.wrongCredentials');
    expect(errorKey({ code: 'auth/wrong-password' })).toBe('errors.wrongCredentials');
    expect(errorKey({ code: 'auth/user-not-found' })).toBe('errors.wrongCredentials');
  });

  it('maps sign-up failures', () => {
    expect(errorKey({ code: 'auth/email-already-in-use' })).toBe('errors.emailInUse');
    expect(errorKey({ code: 'auth/invalid-email' })).toBe('errors.invalidEmail');
    expect(errorKey({ code: 'auth/weak-password' })).toBe('errors.weakPassword');
  });

  it('maps network and rate-limit failures', () => {
    expect(errorKey({ code: 'auth/network-request-failed' })).toBe('errors.network');
    expect(errorKey({ code: 'unavailable' })).toBe('errors.network');
    expect(errorKey({ code: 'auth/too-many-requests' })).toBe('errors.tooManyRequests');
  });

  it('maps app errors by their code', () => {
    expect(errorKey(new AppError('familyNotFound'))).toBe('errors.familyNotFound');
    expect(errorKey(new AppError('wrongPassword', { triesLeft: 3 }))).toBe('errors.wrongPassword');
  });

  it('falls back to a generic message', () => {
    expect(errorKey(new Error('boom'))).toBe('errors.generic');
    expect(errorKey(undefined)).toBe('errors.generic');
  });
});

describe('AppError', () => {
  it('carries when to try again and tries left', () => {
    const until = new Date(2026, 10, 1, 10, 15);
    const e = new AppError('accountCooldown', { until, triesLeft: 0 });
    expect(e.code).toBe('accountCooldown');
    expect(e.until).toEqual(until);
    expect(e.triesLeft).toBe(0);
    expect(e).toBeInstanceOf(Error);
  });
});
