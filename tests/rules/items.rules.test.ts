import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, addDoc, collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { FID, dbAs, makeEnv, seedFamily, validItem } from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await makeEnv();
});
beforeEach(() => seedFamily(env, { members: ['mona'] }));
afterEach(async () => {
  await env.clearFirestore();
});
afterAll(async () => {
  await env.cleanup();
});

const items = (uid: string) => collection(dbAs(env, uid), 'families', FID, 'items');

async function seedItem() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'families', FID, 'items', 'i1'), {
      ...validItem('owner'),
      createdAt: Timestamp.now(),
    });
  });
  return (uid: string) => doc(dbAs(env, uid), 'families', FID, 'items', 'i1');
}

it('lets a member add a valid item', async () => {
  await assertSucceeds(addDoc(items('mona'), validItem('mona')));
});

it('accepts a due date and half a kilo', async () => {
  await assertSucceeds(addDoc(items('mona'), { ...validItem('mona'), quantity: 0.5, dueAt: Timestamp.now() }));
});

it('refuses non-members', async () => {
  await assertFails(addDoc(items('eve'), validItem('eve')));
});

it('refuses a quantity of zero or less', async () => {
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), quantity: 0 }));
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), quantity: -1 }));
});

it('refuses an unknown unit and an empty name', async () => {
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), unit: 'ton' }));
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), name: '' }));
});

it('refuses an item claiming someone else added it', async () => {
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), addedById: 'owner' }));
});

it('refuses extra fields', async () => {
  await assertFails(addDoc(items('mona'), { ...validItem('mona'), price: 10 }));
});

it('lets members mark an item bought and unbought', async () => {
  const ref = await seedItem();
  await assertSucceeds(updateDoc(ref('mona'), { bought: true, boughtBy: 'mona' }));
  await assertSucceeds(updateDoc(ref('mona'), { bought: false, boughtBy: null }));
});

it('refuses edits to anything other than bought', async () => {
  const ref = await seedItem();
  await assertFails(updateDoc(ref('mona'), { name: 'Cucumbers' }));
  await assertFails(updateDoc(ref('mona'), { quantity: 5 }));
});

it('lets members delete items and refuses outsiders', async () => {
  const ref = await seedItem();
  await assertFails(deleteDoc(ref('eve')));
  await assertSucceeds(deleteDoc(ref('mona')));
});
