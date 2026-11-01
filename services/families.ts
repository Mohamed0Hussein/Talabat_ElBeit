import {
  type DocumentReference,
  type Firestore,
  type Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { AppError } from '@/lib/errors';
import { normalizeFamilyName } from '@/lib/familyName';
import {
  FAMILY_MAX_ATTEMPTS,
  FAMILY_WINDOW_MS,
  FREE_ATTEMPTS,
  accountCooldownUntil,
  familyBusyUntil,
  triesLeftBeforeWait,
} from '@/lib/joinLimits';
import { passwordHashInput } from '@/lib/password';
import type { Lang, Member } from '@/lib/types';
import { sha256Hex } from './hash';

export type Who = { uid: string; displayName: string };
export type FamilyInput = { name: string; password: string; language: Lang; expoPushToken: string };

const BATCH_LIMIT = 450;

const isDenied = (e: unknown) => (e as { code?: string } | null)?.code === 'permission-denied';

function memberData(user: Who, input: FamilyInput) {
  return {
    displayName: user.displayName,
    expoPushToken: input.expoPushToken,
    language: input.language,
    joinedAt: serverTimestamp(),
  };
}

function userData(user: Who, familyId: string | null, language: Lang) {
  return { displayName: user.displayName, familyId, language, updatedAt: serverTimestamp() };
}

export async function createFamily(db: Firestore, user: Who, input: FamilyInput): Promise<{ familyId: string }> {
  const nameKey = normalizeFamilyName(input.name);
  const nameRef = doc(db, 'familyNames', nameKey);
  if ((await getDoc(nameRef)).exists()) throw new AppError('familyNameTaken');

  const familyRef = doc(collection(db, 'families'));
  const familyId = familyRef.id;
  const hash = await sha256Hex(passwordHashInput(familyId, input.password));

  const batch = writeBatch(db);
  batch.set(nameRef, { familyId });
  batch.set(familyRef, {
    name: input.name.trim().replace(/\s+/g, ' '),
    nameKey,
    creatorId: user.uid,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(familyRef, 'secret', 'password'), { hash });
  batch.set(doc(familyRef, 'meta', 'joinLimit'), { windowStart: serverTimestamp(), count: 0 });
  batch.set(doc(familyRef, 'members', user.uid), memberData(user, input));
  batch.set(doc(db, 'users', user.uid), userData(user, familyId, input.language));
  try {
    await batch.commit();
  } catch (e) {
    // Someone took the name between our check and the write.
    if (isDenied(e) && (await getDoc(nameRef)).exists()) throw new AppError('familyNameTaken');
    throw e;
  }
  return { familyId };
}

type AttemptState = {
  prev: { count: number; at: Date } | null;
  limit: { count: number; windowStart: Date; raw: Timestamp };
};

async function readAttemptState(attemptRef: DocumentReference, limitRef: DocumentReference): Promise<AttemptState> {
  const [attempt, limit] = await Promise.all([getDoc(attemptRef), getDoc(limitRef)]);
  if (!limit.exists()) throw new AppError('familyNotFound');
  const a = attempt.data();
  const l = limit.data();
  return {
    prev: a ? { count: a.count as number, at: (a.at as Timestamp).toDate() } : null,
    limit: { count: l.count as number, windowStart: (l.windowStart as Timestamp).toDate(), raw: l.windowStart as Timestamp },
  };
}

/**
 * Records one password guess and counts it against the family (firestore.rules checks both limits).
 * Returns this account's attempt count. Retries when the family counter changed under us,
 * or when the phone clock put us on the wrong side of the family's hour window.
 */
async function recordAttempt(db: Firestore, familyRef: DocumentReference, uid: string, proof: string, now: Date) {
  const attemptRef = doc(familyRef, 'joinAttempts', uid);
  const limitRef = doc(familyRef, 'meta', 'joinLimit');
  let flipWindow = false;
  let lastSeen = '';
  for (let tryNo = 0; ; tryNo++) {
    const state = await readAttemptState(attemptRef, limitRef);
    const cooldown = accountCooldownUntil(state.prev);
    if (cooldown && cooldown.getTime() > now.getTime()) throw new AppError('accountCooldown', { until: cooldown, triesLeft: 0 });
    const busy = familyBusyUntil(state.limit, now);
    if (busy) throw new AppError('familyBusy', { until: busy });

    const seen = `${state.prev?.count}:${state.limit.count}:${state.limit.raw.toMillis()}`;
    if (tryNo > 0 && seen === lastSeen) flipWindow = !flipWindow; // nothing changed, so our clock was wrong
    lastSeen = seen;

    let windowOpen = now.getTime() < state.limit.windowStart.getTime() + FAMILY_WINDOW_MS;
    if (flipWindow) windowOpen = !windowOpen;
    const count = (state.prev?.count ?? 0) + 1;

    const batch = writeBatch(db);
    batch.set(attemptRef, { proof, count, at: serverTimestamp() });
    batch.set(
      limitRef,
      windowOpen ? { windowStart: state.limit.raw, count: state.limit.count + 1 } : { windowStart: serverTimestamp(), count: 1 },
    );
    try {
      await batch.commit();
      return count;
    } catch (e) {
      if (!isDenied(e)) throw e;
      if (tryNo >= 2) throw refusedAttempt(state);
    }
  }
}

/** The server kept refusing the attempt: say which limit it was, judged from the server's own timestamps. */
function refusedAttempt(state: AttemptState): Error {
  if (state.prev && state.prev.count >= FREE_ATTEMPTS) {
    return new AppError('accountCooldown', { until: accountCooldownUntil(state.prev) ?? undefined, triesLeft: 0 });
  }
  if (state.limit.count >= FAMILY_MAX_ATTEMPTS) {
    return new AppError('familyBusy', { until: new Date(state.limit.windowStart.getTime() + FAMILY_WINDOW_MS) });
  }
  return new Error('join attempt refused'); // shown as the generic message
}

async function isMemberAlready(memberRef: DocumentReference): Promise<boolean> {
  try {
    return (await getDoc(memberRef)).exists();
  } catch (e) {
    if (isDenied(e)) return false; // non-members can't read member records
    throw e;
  }
}

export async function joinFamily(
  db: Firestore,
  user: Who,
  input: FamilyInput,
  now: Date = new Date(),
): Promise<{ familyId: string }> {
  const nameSnap = await getDoc(doc(db, 'familyNames', normalizeFamilyName(input.name)));
  if (!nameSnap.exists()) throw new AppError('familyNotFound');
  const familyId = nameSnap.data().familyId as string;
  const familyRef = doc(db, 'families', familyId);
  const memberRef = doc(familyRef, 'members', user.uid);

  if (await isMemberAlready(memberRef)) {
    const batch = writeBatch(db);
    batch.update(memberRef, { displayName: user.displayName, expoPushToken: input.expoPushToken, language: input.language });
    batch.set(doc(db, 'users', user.uid), userData(user, familyId, input.language));
    await batch.commit();
    return { familyId };
  }

  const proof = await sha256Hex(passwordHashInput(familyId, input.password));
  const count = await recordAttempt(db, familyRef, user.uid, proof, now);

  const batch = writeBatch(db);
  batch.set(memberRef, memberData(user, input));
  batch.set(doc(db, 'users', user.uid), userData(user, familyId, input.language));
  try {
    await batch.commit();
  } catch (e) {
    if (isDenied(e)) throw new AppError('wrongPassword', { triesLeft: triesLeftBeforeWait(count) });
    throw e;
  }
  return { familyId };
}

export async function leaveFamily(db: Firestore, uid: string, familyId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'families', familyId, 'members', uid));
  batch.update(doc(db, 'users', uid), { familyId: null, updatedAt: serverTimestamp() });
  await batch.commit();
}

async function deleteInChunks(db: Firestore, refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/** Creator only. Items first, then other members, then everything else in one final batch. */
export async function deleteFamily(db: Firestore, uid: string, familyId: string): Promise<void> {
  const familyRef = doc(db, 'families', familyId);
  const family = await getDoc(familyRef);
  if (!family.exists()) return;
  const nameKey = family.data().nameKey as string;

  const items = await getDocs(collection(familyRef, 'items'));
  await deleteInChunks(db, items.docs.map((d) => d.ref));
  const members = await getDocs(collection(familyRef, 'members'));
  await deleteInChunks(db, members.docs.filter((d) => d.id !== uid).map((d) => d.ref));

  const batch = writeBatch(db);
  batch.delete(doc(familyRef, 'secret', 'password'));
  batch.delete(doc(familyRef, 'meta', 'joinLimit'));
  batch.delete(doc(db, 'familyNames', nameKey));
  batch.delete(doc(familyRef, 'members', uid));
  batch.delete(familyRef);
  batch.update(doc(db, 'users', uid), { familyId: null, updatedAt: serverTimestamp() });
  await batch.commit();
}

/** Used when the family was deleted or we were removed from it. */
export async function clearUserFamily(db: Firestore, uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { familyId: null, updatedAt: serverTimestamp() });
}

export async function updateMyMember(
  db: Firestore,
  familyId: string,
  uid: string,
  patch: Partial<Pick<Member, 'displayName' | 'expoPushToken' | 'language'>>,
): Promise<void> {
  await updateDoc(doc(db, 'families', familyId, 'members', uid), patch);
}

/** Creator only. Old guesses stop working at once; members already in the family stay in. */
export async function changeFamilyPassword(db: Firestore, familyId: string, newPassword: string): Promise<void> {
  const hash = await sha256Hex(passwordHashInput(familyId, newPassword));
  await setDoc(doc(db, 'families', familyId, 'secret', 'password'), { hash });
}

/** Creator only. To keep them out, change the password too. */
export async function removeMember(db: Firestore, familyId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'members', memberId));
}
