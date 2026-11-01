import { duePreset, dueStatus, splitItems } from './items';
import type { Item } from './types';

// Sunday 1 November 2026, local time.
const at = (month: number, day: number, h: number, m = 0) => new Date(2026, month, day, h, m);
const now = at(10, 1, 10, 0);

function item(p: Partial<Item> & { id: string }): Item {
  return {
    name: p.id,
    quantity: 1,
    unit: 'pcs',
    dueAt: null,
    bought: false,
    boughtBy: null,
    addedBy: 'Nour',
    addedById: 'u1',
    createdAt: at(10, 1, 8),
    ...p,
  };
}

describe('dueStatus', () => {
  it('is none without a due date', () => {
    expect(dueStatus(null, now)).toBe('none');
  });

  it('is overdue once the due time has passed', () => {
    expect(dueStatus(at(9, 31, 18), now)).toBe('overdue');
    expect(dueStatus(at(10, 1, 9), now)).toBe('overdue');
  });

  it('is today when due later today', () => {
    expect(dueStatus(at(10, 1, 18), now)).toBe('today');
  });

  it('is later when due on another day', () => {
    expect(dueStatus(at(10, 2, 18), now)).toBe('later');
  });
});

describe('splitItems', () => {
  it('puts overdue first, then by due time, then undated by when they were added', () => {
    const items = [
      item({ id: 'a', createdAt: at(10, 1, 8) }),
      item({ id: 'b', dueAt: at(10, 2, 18) }),
      item({ id: 'c', dueAt: at(9, 31, 18) }),
      item({ id: 'd', dueAt: at(10, 1, 18) }),
      item({ id: 'e', bought: true }),
      item({ id: 'f', createdAt: at(10, 1, 7) }),
    ];
    const { toBuy, bought } = splitItems(items, now);
    expect(toBuy.map((i) => i.id)).toEqual(['c', 'd', 'b', 'f', 'a']);
    expect(bought.map((i) => i.id)).toEqual(['e']);
  });

  it('orders bought items by when they were added', () => {
    const items = [
      item({ id: 'late', bought: true, createdAt: at(10, 1, 9) }),
      item({ id: 'early', bought: true, createdAt: at(10, 1, 7) }),
    ];
    expect(splitItems(items, now).bought.map((i) => i.id)).toEqual(['early', 'late']);
  });
});

describe('duePreset', () => {
  it('is null for no rush', () => {
    expect(duePreset('none', now)).toBeNull();
  });

  it('is 18:00 today before 17:00', () => {
    expect(duePreset('today', at(10, 1, 16, 59))).toEqual(at(10, 1, 18));
  });

  it('is 23:00 today from 17:00 on', () => {
    expect(duePreset('today', at(10, 1, 17, 0))).toEqual(at(10, 1, 23));
  });

  it('is 18:00 tomorrow', () => {
    expect(duePreset('tomorrow', at(10, 1, 23, 30))).toEqual(at(10, 2, 18));
  });
});
