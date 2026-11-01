import type { Lang, Member } from './types';

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, string>;
};

/** One message per other member with a token, in that member's language. */
export function buildPushMessages(
  members: Member[],
  excludeUid: string,
  build: (lang: Lang) => { title: string; body: string },
  data: Record<string, string>,
): PushMessage[] {
  return members
    .filter((m) => m.id !== excludeUid && m.expoPushToken)
    .map((m) => ({ to: m.expoPushToken, ...build(m.language), sound: 'default', data }));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
