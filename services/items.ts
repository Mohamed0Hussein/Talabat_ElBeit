import { type Firestore, Timestamp, addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import type { Unit } from '@/lib/types';
import type { Who } from './families';

const BATCH_LIMIT = 450;

const itemsOf = (db: Firestore, familyId: string) => collection(db, 'families', familyId, 'items');

export async function addItem(
  db: Firestore,
  familyId: string,
  user: Who,
  input: { name: string; quantity: number; unit: Unit; dueAt: Date | null },
): Promise<string> {
  const ref = await addDoc(itemsOf(db, familyId), {
    name: input.name.trim(),
    quantity: input.quantity,
    unit: input.unit,
    dueAt: input.dueAt ? Timestamp.fromDate(input.dueAt) : null,
    bought: false,
    boughtBy: null,
    addedBy: user.displayName,
    addedById: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setBought(
  db: Firestore,
  familyId: string,
  itemId: string,
  bought: boolean,
  byName: string | null,
): Promise<void> {
  await updateDoc(doc(itemsOf(db, familyId), itemId), { bought, boughtBy: bought ? byName : null });
}

export async function deleteItem(db: Firestore, familyId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(itemsOf(db, familyId), itemId));
}

export async function clearBought(db: Firestore, familyId: string, itemIds: string[]): Promise<void> {
  for (let i = 0; i < itemIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    itemIds.slice(i, i + BATCH_LIMIT).forEach((id) => batch.delete(doc(itemsOf(db, familyId), id)));
    await batch.commit();
  }
}
