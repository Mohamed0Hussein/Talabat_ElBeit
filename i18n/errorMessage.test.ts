import { AppError } from '@/lib/errors';
import { errorMessage } from './errorMessage';

const at = new Date(2026, 10, 1, 14, 32);

it('says how many tries are left after a wrong family password', () => {
  expect(errorMessage(new AppError('wrongPassword', { triesLeft: 3 }), 'en')).toBe(
    'Wrong family password. 3 tries left before a 15-minute wait.',
  );
  expect(errorMessage(new AppError('wrongPassword', { triesLeft: 1 }), 'en')).toBe(
    'Wrong family password. 1 try left before a 15-minute wait.',
  );
  expect(errorMessage(new AppError('wrongPassword', { triesLeft: 3 }), 'ar')).toContain('٣ محاولات');
});

it('says to wait when no free tries are left', () => {
  expect(errorMessage(new AppError('wrongPassword', { triesLeft: 0 }), 'en')).toBe(
    'Wrong family password. Wait 15 minutes before trying again.',
  );
});

it('says when to try again after a lockout', () => {
  expect(errorMessage(new AppError('accountCooldown', { until: at }), 'en')).toMatch(/Try again at 2:32\sPM\.$/);
  expect(errorMessage(new AppError('familyBusy', { until: at }), 'ar')).toContain('٢:٣٢');
});

it('uses the mapped message for other errors', () => {
  expect(errorMessage({ code: 'auth/invalid-credential' }, 'en')).toBe('Wrong email or password.');
  expect(errorMessage(new Error('boom'), 'ar')).toBe('حصلت مشكلة. جرب تاني.');
});
