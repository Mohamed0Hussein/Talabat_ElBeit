import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { displayNameOf } from '@/lib/familyName';
import { clearUserFamily } from '@/services/families';
import { auth, db } from '@/services/firebase';

export type SessionStatus = 'loading' | 'signedOut' | 'needsFamily' | 'ready';
export type SessionNotice = 'familyDeleted' | 'removed' | null;

type Session = {
  status: SessionStatus;
  user: User | null;
  familyId: string | null;
  notice: SessionNotice;
  clearNotice: () => void;
};

const SessionContext = createContext<Session | null>(null);

const isDenied = (e: unknown) => (e as { code?: string } | null)?.code === 'permission-denied';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // undefined = not loaded yet; null = no family.
  const [familyId, setFamilyId] = useState<string | null | undefined>(undefined);
  const [membership, setMembership] = useState<'checking' | 'ok' | 'gone'>('checking');
  const [notice, setNotice] = useState<SessionNotice>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const uid = user?.uid;

  useEffect(() => {
    setFamilyId(undefined);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => setFamilyId((snap.data()?.familyId as string | null | undefined) ?? null),
      () => setFamilyId(null),
    );
  }, [uid]);

  // Watch our own member record: if it disappears, the family was deleted or we were removed.
  useEffect(() => {
    setMembership('checking');
    if (!uid || !familyId) return;
    let handled = false;
    const gone = async () => {
      if (handled) return;
      handled = true;
      setMembership('gone');
      // Leaving or deleting the family ourselves clears users.familyId in the same write: no notice then.
      const profile = await getDoc(doc(db, 'users', uid)).catch(() => null);
      if (profile?.data()?.familyId !== familyId) return;
      // The join counter is readable by anyone signed in, so it tells deleted from removed.
      const stillExists = await getDoc(doc(db, 'families', familyId, 'meta', 'joinLimit'))
        .then((s) => s.exists())
        .catch(() => false);
      setNotice(stillExists ? 'removed' : 'familyDeleted');
      await clearUserFamily(db, uid).catch(() => undefined);
    };
    return onSnapshot(
      doc(db, 'families', familyId, 'members', uid),
      (snap) => (snap.exists() ? setMembership('ok') : gone()),
      (e) => {
        // Non-members can't read member records, so "denied" also means gone. Other errors (offline) are retried.
        if (isDenied(e)) gone();
      },
    );
  }, [uid, familyId]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const status: SessionStatus =
    user === undefined
      ? 'loading'
      : user === null
        ? 'signedOut'
        : familyId === undefined
          ? 'loading'
          : familyId === null || membership === 'gone'
            ? 'needsFamily'
            : membership === 'ok'
              ? 'ready'
              : 'loading';

  const value = useMemo<Session>(
    () => ({ status, user: user ?? null, familyId: status === 'ready' ? (familyId ?? null) : null, notice, clearNotice }),
    [status, user, familyId, notice, clearNotice],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** The signed-in person as the services expect them. Empty while signing out. */
export function useWho(): { uid: string; displayName: string } {
  const { user } = useSession();
  return { uid: user?.uid ?? '', displayName: user ? displayNameOf(user) : '' };
}
