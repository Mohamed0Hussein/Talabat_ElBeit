import { formatDue, formatNumber, formatTime, localeFor } from './format';

const at = (month: number, day: number, h: number, m = 0) => new Date(2026, month, day, h, m);
const now = at(10, 1, 10, 0); // Sunday 1 Nov 2026
const en = { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday' };
const ar = { today: 'النهارده', tomorrow: 'بكره', yesterday: 'امبارح' };

describe('localeFor', () => {
  it('uses Egyptian Arabic and US English', () => {
    expect(localeFor('ar')).toBe('ar-EG');
    expect(localeFor('en')).toBe('en-US');
  });
});

describe('formatNumber', () => {
  it('uses Arabic-Indic digits in Arabic', () => {
    expect(formatNumber(2, 'ar')).toBe('٢');
    expect(formatNumber(10, 'ar')).toBe('١٠');
  });

  it('uses Western digits in English and keeps halves', () => {
    expect(formatNumber(2, 'en')).toBe('2');
    expect(formatNumber(0.5, 'en')).toBe('0.5');
  });
});

describe('formatTime', () => {
  it('shows hours and minutes', () => {
    expect(formatTime(at(10, 1, 18), 'en')).toMatch(/^6:00\sPM$/);
  });
});

describe('formatDue', () => {
  it('names today, tomorrow and yesterday', () => {
    expect(formatDue(at(10, 1, 18), now, 'en', en)).toMatch(/^Today, 6:00\sPM$/);
    expect(formatDue(at(10, 2, 18), now, 'en', en)).toMatch(/^Tomorrow, 6:00\sPM$/);
    expect(formatDue(at(9, 31, 18), now, 'en', en)).toMatch(/^Yesterday, 6:00\sPM$/);
  });

  it('uses the weekday within the next week', () => {
    expect(formatDue(at(10, 6, 10), now, 'en', en)).toMatch(/^Fri, 10:00\sAM$/);
  });

  it('uses the date further out', () => {
    expect(formatDue(at(10, 20, 10), now, 'en', en)).toMatch(/^Nov 20, 10:00\sAM$/);
  });

  it('writes Arabic with Arabic words and digits', () => {
    const text = formatDue(at(10, 1, 18), now, 'ar', ar);
    expect(text.startsWith('النهارده، ')).toBe(true);
    expect(text).toContain('٦:٠٠');
  });
});
