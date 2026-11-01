import type { Item } from './types';

export type DueStatus = 'none' | 'overdue' | 'today' | 'later';
export type DuePreset = 'none' | 'today' | 'tomorrow';

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dueStatus(dueAt: Date | null, now: Date): DueStatus {
  if (!dueAt) return 'none';
  if (dueAt.getTime() < now.getTime()) return 'overdue';
  return isSameDay(dueAt, now) ? 'today' : 'later';
}

function compareToBuy(a: Item, b: Item): number {
  if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/** To buy: dated items by due time (so overdue come first), then undated by when they were added. */
export function splitItems(items: Item[], _now: Date): { toBuy: Item[]; bought: Item[] } {
  const toBuy = items.filter((i) => !i.bought).sort(compareToBuy);
  const bought = items.filter((i) => i.bought).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { toBuy, bought };
}

/** Today means 18:00, or 23:00 if it's already 17:00 or later. Tomorrow means 18:00. */
export function duePreset(preset: DuePreset, now: Date): Date | null {
  if (preset === 'none') return null;
  const due = new Date(now);
  if (preset === 'today') {
    due.setHours(now.getHours() >= 17 ? 23 : 18, 0, 0, 0);
    return due;
  }
  due.setDate(due.getDate() + 1);
  due.setHours(18, 0, 0, 0);
  return due;
}
