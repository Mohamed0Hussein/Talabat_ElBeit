import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Family, Item, Member } from '@/lib/types';
import { toFamily, toItem, toMember } from '@/services/convert';
import { db } from '@/services/firebase';

export function useItems(familyId: string | null): { items: Item[]; loading: boolean } {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setItems([]);
    setLoading(true);
    if (!familyId) return;
    return onSnapshot(
      collection(db, 'families', familyId, 'items'),
      (snap) => {
        setItems(snap.docs.map(toItem));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [familyId]);
  return { items, loading };
}

/** Members, oldest first. Live, so new members get notifications right away. */
export function useMembers(familyId: string | null): Member[] {
  const [members, setMembers] = useState<Member[]>([]);
  useEffect(() => {
    setMembers([]);
    if (!familyId) return;
    return onSnapshot(
      collection(db, 'families', familyId, 'members'),
      (snap) =>
        setMembers(
          snap.docs.map(toMember).sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0)),
        ),
      () => undefined,
    );
  }, [familyId]);
  return members;
}

export function useFamily(familyId: string | null): Family | null {
  const [family, setFamily] = useState<Family | null>(null);
  useEffect(() => {
    setFamily(null);
    if (!familyId) return;
    return onSnapshot(
      doc(db, 'families', familyId),
      (snap) => setFamily(snap.exists() ? toFamily(snap) : null),
      () => undefined,
    );
  }, [familyId]);
  return family;
}
