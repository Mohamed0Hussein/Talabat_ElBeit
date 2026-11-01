import type { DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { UNITS, type Family, type Item, type Lang, type Member, type Unit } from '@/lib/types';

// Pending server timestamps read as estimates, so freshly written docs still have dates.
const OPTIONS = { serverTimestamps: 'estimate' } as const;

const toDate = (t: unknown): Date | null => (t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : null);
const toLang = (l: unknown): Lang => (l === 'ar' ? 'ar' : 'en');
const toUnit = (u: unknown): Unit => (UNITS.includes(u as Unit) ? (u as Unit) : 'pcs');

export function toItem(snap: DocumentSnapshot): Item {
  const d = snap.data(OPTIONS) ?? {};
  return {
    id: snap.id,
    name: String(d.name ?? ''),
    quantity: typeof d.quantity === 'number' ? d.quantity : 1,
    unit: toUnit(d.unit),
    dueAt: toDate(d.dueAt),
    bought: d.bought === true,
    boughtBy: typeof d.boughtBy === 'string' ? d.boughtBy : null,
    addedBy: String(d.addedBy ?? ''),
    addedById: String(d.addedById ?? ''),
    createdAt: toDate(d.createdAt) ?? new Date(),
  };
}

export function toMember(snap: DocumentSnapshot): Member {
  const d = snap.data(OPTIONS) ?? {};
  return {
    id: snap.id,
    displayName: String(d.displayName ?? ''),
    expoPushToken: String(d.expoPushToken ?? ''),
    language: toLang(d.language),
    joinedAt: toDate(d.joinedAt),
  };
}

export function toFamily(snap: DocumentSnapshot): Family {
  const d = snap.data(OPTIONS) ?? {};
  return {
    id: snap.id,
    name: String(d.name ?? ''),
    nameKey: String(d.nameKey ?? ''),
    creatorId: String(d.creatorId ?? ''),
    createdAt: toDate(d.createdAt),
  };
}
