import { buildPushMessages, chunk } from './pushMessages';
import type { Lang, Member } from './types';

const member = (id: string, language: Lang, expoPushToken = `ExponentPushToken[${id}]`): Member => ({
  id,
  displayName: id,
  expoPushToken,
  language,
  joinedAt: null,
});

const build = (lang: Lang) => (lang === 'ar' ? { title: 'طلب جديد', body: 'منى ضافت طماطم' } : { title: 'New on the list', body: 'Mona added Tomatoes' });

it('sends to everyone except the person who made the change', () => {
  const messages = buildPushMessages([member('mona', 'en'), member('ahmed', 'en')], 'mona', build, { action: 'added' });
  expect(messages.map((m) => m.to)).toEqual(['ExponentPushToken[ahmed]']);
});

it('skips members without a push token', () => {
  const messages = buildPushMessages([member('ahmed', 'en', ''), member('nour', 'en')], 'mona', build, {});
  expect(messages.map((m) => m.to)).toEqual(['ExponentPushToken[nour]']);
});

it('writes each message in the recipient language', () => {
  const messages = buildPushMessages([member('ahmed', 'ar'), member('nour', 'en')], 'mona', build, { familyId: 'f1' });
  expect(messages).toEqual([
    { to: 'ExponentPushToken[ahmed]', title: 'طلب جديد', body: 'منى ضافت طماطم', sound: 'default', data: { familyId: 'f1' } },
    { to: 'ExponentPushToken[nour]', title: 'New on the list', body: 'Mona added Tomatoes', sound: 'default', data: { familyId: 'f1' } },
  ]);
});

it('splits into groups the push service accepts', () => {
  expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  expect(chunk([], 100)).toEqual([]);
});
