import type { Lang } from './types';

export function localeFor(lang: Lang): string {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
}

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 2 }).format(n);
}

export function formatTime(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(localeFor(lang), { hour: 'numeric', minute: '2-digit' }).format(d);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today, 6:00 PM", "Fri, 10:00 AM", "Nov 20, 10:00 AM"; Arabic uses "،" and Arabic digits. */
export function formatDue(
  dueAt: Date,
  now: Date,
  lang: Lang,
  words: { today: string; tomorrow: string; yesterday: string },
): string {
  const locale = localeFor(lang);
  const days = Math.round((startOfDay(dueAt) - startOfDay(now)) / DAY_MS);
  let day: string;
  if (days === 0) day = words.today;
  else if (days === 1) day = words.tomorrow;
  else if (days === -1) day = words.yesterday;
  else if (days > 1 && days < 7) day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dueAt);
  else day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(dueAt);
  const separator = lang === 'ar' ? '، ' : ', ';
  return `${day}${separator}${formatTime(dueAt, lang)}`;
}
