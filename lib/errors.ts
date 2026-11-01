export type AppErrorCode = 'familyNotFound' | 'familyNameTaken' | 'wrongPassword' | 'accountCooldown' | 'familyBusy';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly until?: Date;
  readonly triesLeft?: number;

  constructor(code: AppErrorCode, extra: { until?: Date; triesLeft?: number } = {}) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.until = extra.until;
    this.triesLeft = extra.triesLeft;
  }
}

const CODE_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'errors.wrongCredentials',
  'auth/wrong-password': 'errors.wrongCredentials',
  'auth/user-not-found': 'errors.wrongCredentials',
  'auth/email-already-in-use': 'errors.emailInUse',
  'auth/invalid-email': 'errors.invalidEmail',
  'auth/weak-password': 'errors.weakPassword',
  'auth/network-request-failed': 'errors.network',
  'auth/too-many-requests': 'errors.tooManyRequests',
  unavailable: 'errors.network',
  'permission-denied': 'errors.permission',
};

/** The translation key for any error the app can hit. */
export function errorKey(e: unknown): string {
  if (e instanceof AppError) return `errors.${e.code}`;
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  return CODE_KEYS[code] ?? 'errors.generic';
}
