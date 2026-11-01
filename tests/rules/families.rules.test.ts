import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  FID,
  NAME_KEY,
  PASSWORD,
  attemptBatch,
  hashFor,
  createFamilyBatch,
  dbAs,
  joinBatch,
  makeEnv,
  minutesAgo,
  seedFamily,
} from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await makeEnv();
});
afterEach(async () => {
  await env.clearFirestore();
});
afterAll(async () => {
  await env.cleanup();
});

describe('creating a family', () => {
  it('lets a signed-in user create a family with all its parts in one batch', async () => {
    await assertSucceeds(createFamilyBatch(dbAs(env, 'alice'), 'alice', 'famA', 'smiths', 'longpassword').commit());
  });

  it('refuses a second family with a name that is taken', async () => {
    await createFamilyBatch(dbAs(env, 'alice'), 'alice', 'famA', 'smiths', 'longpassword').commit();
    await assertFails(createFamilyBatch(dbAs(env, 'bob'), 'bob', 'famB', 'smiths', 'otherpassword').commit());
  });

  it('refuses a family created on behalf of someone else', async () => {
    await assertFails(createFamilyBatch(dbAs(env, 'alice'), 'bob', 'famA', 'smiths', 'longpassword').commit());
  });

  it('refuses signed-out users', async () => {
    await assertFails(createFamilyBatch(dbAs(env, null), 'alice', 'famA', 'smiths', 'longpassword').commit());
  });
});

describe('reading', () => {
  beforeEach(() => seedFamily(env, { members: ['mona'] }));

  it('never lets anyone read the password hash, not even the creator', async () => {
    await assertFails(getDoc(doc(dbAs(env, 'owner'), 'families', FID, 'secret', 'password')));
    await assertFails(getDoc(doc(dbAs(env, 'eve'), 'families', FID, 'secret', 'password')));
  });

  it('keeps the family, members and items private to members', async () => {
    const eve = dbAs(env, 'eve');
    await assertFails(getDoc(doc(eve, 'families', FID)));
    await assertFails(getDocs(collection(eve, 'families', FID, 'members')));
    await assertFails(getDocs(collection(eve, 'families', FID, 'items')));
    const mona = dbAs(env, 'mona');
    await assertSucceeds(getDoc(doc(mona, 'families', FID)));
    await assertSucceeds(getDocs(collection(mona, 'families', FID, 'members')));
    await assertSucceeds(getDocs(collection(mona, 'families', FID, 'items')));
  });

  it('lets a signed-in user look up one family name and the join limit, but not list names', async () => {
    const eve = dbAs(env, 'eve');
    await assertSucceeds(getDoc(doc(eve, 'familyNames', NAME_KEY)));
    await assertSucceeds(getDoc(doc(eve, 'families', FID, 'meta', 'joinLimit')));
    await assertFails(getDocs(collection(eve, 'familyNames')));
    await assertFails(getDoc(doc(dbAs(env, null), 'familyNames', NAME_KEY)));
  });

  it('lets people read only their own user doc and join attempt', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'mona'), { displayName: 'mona', familyId: FID, language: 'en', updatedAt: Timestamp.now() });
    });
    await assertSucceeds(getDoc(doc(dbAs(env, 'mona'), 'users', 'mona')));
    await assertFails(getDoc(doc(dbAs(env, 'eve'), 'users', 'mona')));
    await assertSucceeds(getDoc(doc(dbAs(env, 'eve'), 'families', FID, 'joinAttempts', 'eve')));
    await assertFails(getDoc(doc(dbAs(env, 'eve'), 'families', FID, 'joinAttempts', 'mona')));
  });
});

describe('joining', () => {
  const fresh = () => ({ count: 0, windowStart: minutesAgo(5) });

  it('refuses to add a member who has made no attempt', async () => {
    await seedFamily(env);
    await assertFails(joinBatch(dbAs(env, 'bob'), 'bob').commit());
  });

  it('accepts a member whose recorded attempt has the right password', async () => {
    const limit = fresh();
    await seedFamily(env, { limit });
    const bob = dbAs(env, 'bob');
    await assertSucceeds(attemptBatch(bob, 'bob', PASSWORD, { prevCount: 0, limit }).commit());
    await assertSucceeds(joinBatch(bob, 'bob').commit());
  });

  it('refuses a member whose recorded attempt has the wrong password', async () => {
    const limit = fresh();
    await seedFamily(env, { limit });
    const bob = dbAs(env, 'bob');
    await assertSucceeds(attemptBatch(bob, 'bob', 'wrong-password', { prevCount: 0, limit }).commit());
    await assertFails(joinBatch(bob, 'bob').commit());
  });

  it('refuses a correct attempt made more than 10 minutes ago', async () => {
    await seedFamily(env, { attempts: { bob: { count: 1, at: minutesAgo(11), proof: hashFor(FID, PASSWORD) } } });
    await assertFails(joinBatch(dbAs(env, 'bob'), 'bob').commit());
  });

  it('accepts a correct attempt from the last 10 minutes', async () => {
    await seedFamily(env, { attempts: { bob: { count: 1, at: minutesAgo(5), proof: hashFor(FID, PASSWORD) } } });
    await assertSucceeds(joinBatch(dbAs(env, 'bob'), 'bob').commit());
  });

  it('refuses an attempt that does not count against the family limit', async () => {
    await seedFamily(env, { limit: fresh() });
    const bob = dbAs(env, 'bob');
    await assertFails(
      setDoc(doc(bob, 'families', FID, 'joinAttempts', 'bob'), { proof: '0'.repeat(64), count: 1, at: Timestamp.now() }),
    );
  });

  it('refuses a limit change without an attempt', async () => {
    const limit = fresh();
    await seedFamily(env, { limit });
    await assertFails(
      setDoc(doc(dbAs(env, 'bob'), 'families', FID, 'meta', 'joinLimit'), { windowStart: limit.windowStart, count: 1 }),
    );
  });

  it('refuses an attempt that lowers its own count', async () => {
    const limit = fresh();
    await seedFamily(env, { limit, attempts: { bob: { count: 4, at: minutesAgo(1) } } });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: -1, limit }).commit());
  });

  it('never lets anyone delete their attempt record to reset it', async () => {
    await seedFamily(env, { attempts: { bob: { count: 5, at: minutesAgo(1) } } });
    await assertFails(deleteDoc(doc(dbAs(env, 'bob'), 'families', FID, 'joinAttempts', 'bob')));
  });
});

describe('account lockout', () => {
  const limit = { count: 0, windowStart: minutesAgo(5) };

  it('allows the 5th attempt right away', async () => {
    await seedFamily(env, { limit, attempts: { bob: { count: 4, at: minutesAgo(0) } } });
    await assertSucceeds(attemptBatch(dbAs(env, 'bob'), 'bob', 'guess', { prevCount: 4, limit }).commit());
  });

  it('makes you wait 15 minutes after 5 attempts', async () => {
    await seedFamily(env, { limit, attempts: { bob: { count: 5, at: minutesAgo(1) } } });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', 'guess', { prevCount: 5, limit }).commit());
  });

  it('lets you try again once 15 minutes have passed', async () => {
    await seedFamily(env, { limit, attempts: { bob: { count: 5, at: minutesAgo(16) } } });
    await assertSucceeds(attemptBatch(dbAs(env, 'bob'), 'bob', 'guess', { prevCount: 5, limit }).commit());
  });

  it('makes you wait an hour after 10 attempts', async () => {
    await seedFamily(env, { limit, attempts: { bob: { count: 10, at: minutesAgo(30) } } });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', 'guess', { prevCount: 10, limit }).commit());
  });

  it('lets you try again after the hour', async () => {
    await seedFamily(env, { limit, attempts: { bob: { count: 10, at: minutesAgo(61) } } });
    await assertSucceeds(attemptBatch(dbAs(env, 'bob'), 'bob', 'guess', { prevCount: 10, limit }).commit());
  });
});

describe('family limit', () => {
  it('stops all attempts after 10 in the current hour', async () => {
    const limit = { count: 10, windowStart: minutesAgo(10) };
    await seedFamily(env, { limit });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit }).commit());
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit: 'reset' }).commit());
  });

  it('allows the 10th attempt in the hour', async () => {
    const limit = { count: 9, windowStart: minutesAgo(10) };
    await seedFamily(env, { limit });
    await assertSucceeds(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit }).commit());
  });

  it('starts a new window once the hour has passed', async () => {
    const limit = { count: 10, windowStart: minutesAgo(61) };
    await seedFamily(env, { limit });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit }).commit());
    await assertSucceeds(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit: 'reset' }).commit());
  });

  it('refuses a reset while the window is still open', async () => {
    await seedFamily(env, { limit: { count: 3, windowStart: minutesAgo(10) } });
    await assertFails(attemptBatch(dbAs(env, 'bob'), 'bob', PASSWORD, { prevCount: 0, limit: 'reset' }).commit());
  });
});

describe('members', () => {
  beforeEach(() => seedFamily(env, { members: ['mona', 'ahmed'] }));

  it('lets you update your own push token and language', async () => {
    await assertSucceeds(
      updateDoc(doc(dbAs(env, 'mona'), 'families', FID, 'members', 'mona'), { expoPushToken: 'ExponentPushToken[x]', language: 'ar' }),
    );
  });

  it("refuses changes to someone else's member record", async () => {
    await assertFails(updateDoc(doc(dbAs(env, 'mona'), 'families', FID, 'members', 'ahmed'), { expoPushToken: 'stolen' }));
  });

  it('lets you leave', async () => {
    await assertSucceeds(deleteDoc(doc(dbAs(env, 'mona'), 'families', FID, 'members', 'mona')));
  });

  it('lets only the creator remove another member', async () => {
    await assertFails(deleteDoc(doc(dbAs(env, 'mona'), 'families', FID, 'members', 'ahmed')));
    await assertSucceeds(deleteDoc(doc(dbAs(env, 'owner'), 'families', FID, 'members', 'ahmed')));
  });
});

describe('changing the password', () => {
  beforeEach(() => seedFamily(env, { members: ['mona'] }));
  const newHash = hashFor(FID, 'a-new-password');

  it('lets the creator replace the password hash', async () => {
    await assertSucceeds(setDoc(doc(dbAs(env, 'owner'), 'families', FID, 'secret', 'password'), { hash: newHash }));
  });

  it('refuses other members', async () => {
    await assertFails(setDoc(doc(dbAs(env, 'mona'), 'families', FID, 'secret', 'password'), { hash: newHash }));
  });

  it('refuses anything that is not a 64-character hash', async () => {
    await assertFails(setDoc(doc(dbAs(env, 'owner'), 'families', FID, 'secret', 'password'), { hash: 'short' }));
    await assertFails(setDoc(doc(dbAs(env, 'owner'), 'families', FID, 'secret', 'password'), { hash: newHash, note: 'x' }));
  });
});

describe('deleting a family', () => {
  beforeEach(() => seedFamily(env, { members: ['mona'] }));

  function finalBatch(uid: string) {
    const db = dbAs(env, uid);
    const b = writeBatch(db);
    b.delete(doc(db, 'families', FID, 'secret', 'password'));
    b.delete(doc(db, 'families', FID, 'meta', 'joinLimit'));
    b.delete(doc(db, 'familyNames', NAME_KEY));
    b.delete(doc(db, 'families', FID, 'members', 'owner'));
    b.delete(doc(db, 'families', FID));
    return b;
  }

  it('lets the creator delete the family and its parts', async () => {
    await assertSucceeds(finalBatch('owner').commit());
  });

  it('refuses other members', async () => {
    await assertFails(finalBatch('mona').commit());
  });
});
