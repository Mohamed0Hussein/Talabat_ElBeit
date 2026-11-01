import { AppError, errorKey } from '@/lib/errors';
import { formatNumber, formatTime } from '@/lib/format';
import type { Lang } from '@/lib/types';
import i18n from './index';

/** A message for any error, in the given language. */
export function errorMessage(e: unknown, lang: Lang): string {
  const t = i18n.getFixedT(lang);
  if (e instanceof AppError) {
    if (e.code === 'wrongPassword') {
      const left = e.triesLeft ?? 0;
      return left > 0 ? t('errors.wrongPasswordTries', { count: left, n: formatNumber(left, lang) }) : t('errors.wrongPasswordWait');
    }
    if ((e.code === 'accountCooldown' || e.code === 'familyBusy') && e.until) {
      return t(`errors.${e.code}`, { time: formatTime(e.until, lang) });
    }
  }
  return t(errorKey(e));
}
