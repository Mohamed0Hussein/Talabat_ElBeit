import { type Firestore, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Lang } from '@/lib/types';

/** The user's own profile doc, created right after sign-up. */
export async function createUserProfile(db: Firestore, uid: string, displayName: string, language: Lang): Promise<void> {
  await setDoc(doc(db, 'users', uid), { displayName, familyId: null, language, updatedAt: serverTimestamp() });
}
