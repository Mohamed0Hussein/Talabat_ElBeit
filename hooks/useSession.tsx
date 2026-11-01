import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot, waitForPendingWrites } from 'firebase/firestore';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { displayNameOf } from '@/lib/familyName';
import { useLanguage } from '@/i18n/LanguageProvider';
import { clearUserFamily, updateMyMember } from '@/services/families';
import { auth, db } from '@/services/firebase';
import { registerForPush } from '@/services/push';

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
  // Bumped to re-subscribe when a listener failed only because our own write wasn't saved yet.
  const [resubscribe, setResubscribe] = useState(0);
  const memberRef = useRef<{ expoPushToken?: string; language?: string } | null>(null);
  const { lang } = useLanguage();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const uid = user?.uid;

  useEffect(() => {
    setFamilyId(undefined);
    if (!uid) return;
    // Only trust saved data: a join with the wrong password is applied locally first, then rolled back.
    return onSnapshot(
      doc(db, 'users', uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        setFamilyId((snap.data()?.familyId as string | null | undefined) ?? null);
      },
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
    const memberDoc = doc(db, 'families', familyId, 'members', uid);
    // Right after creating or joining, the listener can start before the server has our member
    // record and be refused. So check with the server once our own writes are saved before deciding.
    const confirmGone = async () => {
      await waitForPendingWrites(db).catch(() => undefined);
      const exists = await getDocFromServer(memberDoc)
        .then((s) => s.exists())
        .catch((e) => (isDenied(e) ? false : null));
      if (exists === null) return; // offline: decide later
      if (exists && resubscribe < 3) setResubscribe((n) => n + 1);
      else if (!exists) gone();
    };
    return onSnapshot(
      memberDoc,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (!snap.exists()) {
          if (!snap.metadata.fromCache) confirmGone();
          return;
        }
        memberRef.current = snap.data();
        setMembership('ok');
      },
      (e) => {
        // Non-members can't read member records, so "denied" can mean gone. Other errors (offline) are retried.
        if (isDenied(e)) confirmGone();
      },
    );
  }, [uid, familyId, resubscribe]);

  // Once in a family: keep this phone's push token and the chosen language on our member record.
  useEffect(() => {
    if (!uid || !familyId || membership !== 'ok') return;
    let cancelled = false;
    (async () => {
      const token = await registerForPush();
      const current = memberRef.current ?? {};
      const patch: { expoPushToken?: string; language?: 'en' | 'ar' } = {};
      if (token && token !== current.expoPushToken) patch.expoPushToken = token;
      if (lang !== current.language) patch.language = lang;
      if (!cancelled && Object.keys(patch).length) await updateMyMember(db, familyId, uid, patch).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, familyId, membership, lang]);

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
