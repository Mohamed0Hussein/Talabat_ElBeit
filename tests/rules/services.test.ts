import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { type Firestore, Timestamp, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { AppError } from '@/lib/errors';
import {
  clearUserFamily,
  createFamily,
  deleteFamily,
  joinFamily,
  leaveFamily,
  updateMyMember,
} from '@/services/families';
import { addItem, clearBought, deleteItem, setBought } from '@/services/items';
import { dbAs, makeEnv } from './helpers';

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

const alice = { uid: 'alice', displayName: 'Alice' };
const bob = { uid: 'bob', displayName: 'Bob' };
const input = (o: Partial<{ name: string; password: string; language: 'en' | 'ar'; expoPushToken: string }> = {}) => ({
  name: 'The  Husseins',
  password: 'longpassword',
  language: 'en' as const,
  expoPushToken: '',
  ...o,
});

/** Read anything, bypassing the rules. */
async function adminGet(path: string, ...segments: string[]) {
  let result: { exists: boolean; data: Record<string, unknown> | undefined } = { exists: false, data: undefined };
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore() as unknown as Firestore, path, ...segments));
    result = { exists: snap.exists(), data: snap.data() };
  });
  return result;
}

async function adminCount(path: string, ...segments: string[]) {
  let n = 0;
  await env.withSecurityRulesDisabled(async (ctx) => {
    n = (await getDocs(collection(ctx.firestore() as unknown as Firestore, path, ...segments))).size;
  });
  return n;
}

describe('createFamily and joinFamily', () => {
  it('creates a family that someone else joins with the right password and any spacing or case', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    const joined = await joinFamily(dbAs(env, 'bob'), bob, input({ name: ' the husseins ', language: 'ar' }));
    expect(joined.familyId).toBe(familyId);
    const member = await adminGet('families', familyId, 'members', 'bob');
    expect(member.exists).toBe(true);
    expect(member.data?.language).toBe('ar');
    expect((await adminGet('users', 'bob')).data?.familyId).toBe(familyId);
  });

  it('keeps the name as typed, without extra spaces', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    expect((await adminGet('families', familyId)).data?.name).toBe('The Husseins');
  });

  it('refuses a name that is taken', async () => {
    await createFamily(dbAs(env, 'alice'), alice, input());
    await expect(createFamily(dbAs(env, 'bob'), bob, input({ name: 'the husseins' }))).rejects.toMatchObject({
      code: 'familyNameTaken',
    });
  });

  it('says when no family has that name', async () => {
    await expect(joinFamily(dbAs(env, 'bob'), bob, input())).rejects.toMatchObject({ code: 'familyNotFound' });
  });

  it('reports a wrong password with the tries left', async () => {
    await createFamily(dbAs(env, 'alice'), alice, input());
    const error = await joinFamily(dbAs(env, 'bob'), bob, input({ password: 'wrongpassword' })).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'wrongPassword', triesLeft: 4 });
  });

  it('makes you wait 15 minutes after 5 wrong passwords', async () => {
    await createFamily(dbAs(env, 'alice'), alice, input());
    const bobDb = dbAs(env, 'bob');
    for (let i = 4; i >= 0; i--) {
      await expect(joinFamily(bobDb, bob, input({ password: 'wrongpassword' }))).rejects.toMatchObject({
        code: 'wrongPassword',
        triesLeft: i,
      });
    }
    const error = await joinFamily(bobDb, bob, input()).catch((e) => e);
    expect(error).toMatchObject({ code: 'accountCooldown' });
    const waitMs = (error as AppError).until!.getTime() - Date.now();
    expect(waitMs).toBeGreaterThan(14 * 60 * 1000);
    expect(waitMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('says the family is busy when it has had 10 attempts this hour', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'families', familyId, 'meta', 'joinLimit'), {
        windowStart: Timestamp.fromMillis(Date.now() - 10 * 60 * 1000),
        count: 10,
      });
    });
    await expect(joinFamily(dbAs(env, 'bob'), bob, input())).rejects.toMatchObject({ code: 'familyBusy' });
  });

  it('still joins when the phone clock is two hours ahead', async () => {
    await createFamily(dbAs(env, 'alice'), alice, input());
    const skewed = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await expect(joinFamily(dbAs(env, 'bob'), bob, input(), skewed)).resolves.toHaveProperty('familyId');
  });

  it('lets an existing member join again without using an attempt', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    await joinFamily(dbAs(env, 'bob'), bob, input());
    await joinFamily(dbAs(env, 'bob'), bob, input({ expoPushToken: 'ExponentPushToken[b]' }));
    expect((await adminGet('families', familyId, 'joinAttempts', 'bob')).data?.count).toBe(1);
    expect((await adminGet('families', familyId, 'members', 'bob')).data?.expoPushToken).toBe('ExponentPushToken[b]');
  });
});

describe('leaving and deleting', () => {
  it('leaves a family', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    await joinFamily(dbAs(env, 'bob'), bob, input());
    await leaveFamily(dbAs(env, 'bob'), 'bob', familyId);
    expect((await adminGet('families', familyId, 'members', 'bob')).exists).toBe(false);
    expect((await adminGet('users', 'bob')).data?.familyId).toBeNull();
  });

  it('deletes the family, its items and members, and frees the name', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    await joinFamily(dbAs(env, 'bob'), bob, input());
    await addItem(dbAs(env, 'alice'), familyId, alice, { name: 'Milk', quantity: 2, unit: 'L', dueAt: null });
    await deleteFamily(dbAs(env, 'alice'), 'alice', familyId);
    expect((await adminGet('families', familyId)).exists).toBe(false);
    expect((await adminGet('familyNames', 'the husseins')).exists).toBe(false);
    expect((await adminGet('families', familyId, 'secret', 'password')).exists).toBe(false);
    expect(await adminCount('families', familyId, 'items')).toBe(0);
    expect(await adminCount('families', familyId, 'members')).toBe(0);
    expect((await adminGet('users', 'alice')).data?.familyId).toBeNull();
    // Bob is still pointed at the deleted family until his app clears it.
    expect((await adminGet('users', 'bob')).data?.familyId).toBe(familyId);
    await clearUserFamily(dbAs(env, 'bob'), 'bob');
    expect((await adminGet('users', 'bob')).data?.familyId).toBeNull();
    // The name can be used again.
    await expect(createFamily(dbAs(env, 'bob'), bob, input())).resolves.toHaveProperty('familyId');
  });

  it('updates your own member record', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    await updateMyMember(dbAs(env, 'alice'), familyId, 'alice', { language: 'ar', expoPushToken: 'ExponentPushToken[a]' });
    expect((await adminGet('families', familyId, 'members', 'alice')).data).toMatchObject({
      language: 'ar',
      expoPushToken: 'ExponentPushToken[a]',
    });
  });
});

describe('items', () => {
  it('adds an item, marks it bought, and deletes it', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    const db = dbAs(env, 'alice');
    const due = new Date(Date.now() + 60 * 60 * 1000);
    const id = await addItem(db, familyId, alice, { name: '  Tomatoes ', quantity: 2, unit: 'kg', dueAt: due });
    const added = await adminGet('families', familyId, 'items', id);
    expect(added.data).toMatchObject({ name: 'Tomatoes', quantity: 2, unit: 'kg', bought: false, addedBy: 'Alice', addedById: 'alice' });
    expect((added.data?.dueAt as Timestamp).toMillis()).toBe(due.getTime());

    await setBought(db, familyId, id, true, 'Alice');
    expect((await adminGet('families', familyId, 'items', id)).data).toMatchObject({ bought: true, boughtBy: 'Alice' });
    await setBought(db, familyId, id, false, null);
    expect((await adminGet('families', familyId, 'items', id)).data).toMatchObject({ bought: false, boughtBy: null });

    await deleteItem(db, familyId, id);
    expect((await adminGet('families', familyId, 'items', id)).exists).toBe(false);
  });

  it('clears bought items', async () => {
    const { familyId } = await createFamily(dbAs(env, 'alice'), alice, input());
    const db = dbAs(env, 'alice');
    const a = await addItem(db, familyId, alice, { name: 'Rice', quantity: 5, unit: 'kg', dueAt: null });
    const b = await addItem(db, familyId, alice, { name: 'Soap', quantity: 1, unit: 'pcs', dueAt: null });
    await clearBought(db, familyId, [a, b]);
    expect(await adminCount('families', familyId, 'items')).toBe(0);
  });
});
