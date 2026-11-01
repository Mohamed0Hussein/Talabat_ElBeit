import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createHash } from 'crypto';
import { type Firestore, Timestamp, doc, serverTimestamp, setDoc, setLogLevel, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import path from 'path';

// Denied writes are expected in these tests; keep the SDK from logging each one.
setLogLevel('silent');

export const FID = 'fam1';
export const NAME_KEY = 'hussein';
export const PASSWORD = 'correct-horse';
export const MIN = 60 * 1000;

export const hashFor = (familyId: string, password: string) =>
  createHash('sha256').update(`${familyId}:${password}`, 'utf8').digest('hex');

export const minutesAgo = (m: number) => Timestamp.fromMillis(Date.now() - m * MIN);

export function makeEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-talabat',
    firestore: { rules: readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
}

export function dbAs(env: RulesTestEnvironment, uid: string | null): Firestore {
  const ctx = uid ? env.authenticatedContext(uid) : env.unauthenticatedContext();
  return ctx.firestore() as unknown as Firestore;
}

type SeedOptions = {
  members?: string[];
  limit?: { count: number; windowStart: Timestamp };
  attempts?: Record<string, { count: number; at: Timestamp; proof?: string }>;
};

/** A family "Hussein" (id fam1) created by "owner", written with rules disabled. */
export async function seedFamily(env: RulesTestEnvironment, opts: SeedOptions = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'familyNames', NAME_KEY), { familyId: FID });
    await setDoc(doc(db, 'families', FID), { name: 'Hussein', nameKey: NAME_KEY, creatorId: 'owner', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'families', FID, 'secret', 'password'), { hash: hashFor(FID, PASSWORD) });
    await setDoc(doc(db, 'families', FID, 'meta', 'joinLimit'), opts.limit ?? { count: 0, windowStart: Timestamp.now() });
    for (const uid of ['owner', ...(opts.members ?? [])]) {
      await setDoc(doc(db, 'families', FID, 'members', uid), {
        displayName: uid,
        expoPushToken: '',
        language: 'en',
        joinedAt: Timestamp.now(),
      });
    }
    for (const [uid, a] of Object.entries(opts.attempts ?? {})) {
      await setDoc(doc(db, 'families', FID, 'joinAttempts', uid), { proof: a.proof ?? '0'.repeat(64), count: a.count, at: a.at });
    }
  });
}

/** The batch the app sends to create a family. */
export function createFamilyBatch(db: Firestore, uid: string, familyId: string, nameKey: string, password: string) {
  const b = writeBatch(db);
  b.set(doc(db, 'familyNames', nameKey), { familyId });
  b.set(doc(db, 'families', familyId), { name: nameKey, nameKey, creatorId: uid, createdAt: serverTimestamp() });
  b.set(doc(db, 'families', familyId, 'secret', 'password'), { hash: hashFor(familyId, password) });
  b.set(doc(db, 'families', familyId, 'meta', 'joinLimit'), { windowStart: serverTimestamp(), count: 0 });
  b.set(doc(db, 'families', familyId, 'members', uid), {
    displayName: uid,
    expoPushToken: '',
    language: 'en',
    joinedAt: serverTimestamp(),
  });
  b.set(doc(db, 'users', uid), { displayName: uid, familyId, language: 'en', updatedAt: serverTimestamp() });
  return b;
}

/** The batch the app sends to record one join attempt and count it against the family. */
export function attemptBatch(
  db: Firestore,
  uid: string,
  password: string,
  opts: { prevCount: number; limit: { count: number; windowStart: Timestamp } | 'reset' },
) {
  const b = writeBatch(db);
  b.set(doc(db, 'families', FID, 'joinAttempts', uid), {
    proof: hashFor(FID, password),
    count: opts.prevCount + 1,
    at: serverTimestamp(),
  });
  b.set(
    doc(db, 'families', FID, 'meta', 'joinLimit'),
    opts.limit === 'reset'
      ? { windowStart: serverTimestamp(), count: 1 }
      : { windowStart: opts.limit.windowStart, count: opts.limit.count + 1 },
  );
  return b;
}

export function joinBatch(db: Firestore, uid: string) {
  const b = writeBatch(db);
  b.set(doc(db, 'families', FID, 'members', uid), {
    displayName: uid,
    expoPushToken: '',
    language: 'ar',
    joinedAt: serverTimestamp(),
  });
  b.set(doc(db, 'users', uid), { displayName: uid, familyId: FID, language: 'ar', updatedAt: serverTimestamp() });
  return b;
}

export function validItem(uid: string) {
  return {
    name: 'Tomatoes',
    quantity: 2,
    unit: 'kg',
    dueAt: null,
    bought: false,
    boughtBy: null,
    addedBy: uid,
    addedById: uid,
    createdAt: serverTimestamp(),
  };
}
