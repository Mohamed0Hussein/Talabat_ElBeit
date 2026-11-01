export type FamilyNameCheck = 'ok' | 'tooShort' | 'tooLong' | 'invalidChars';

const MIN_LENGTH = 2;
const MAX_LENGTH = 40;

/** The lookup key for a family name: "  The  Husseins " and "the husseins" are the same family. */
export function normalizeFamilyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function validateFamilyName(name: string): FamilyNameCheck {
  const key = normalizeFamilyName(name);
  // The key becomes a Firestore document id, which can't contain "/" or be "." / ".." / "__x__".
  if (key.includes('/') || key === '.' || key === '..' || /^__.*__$/.test(key)) return 'invalidChars';
  const length = [...key].length;
  if (length < MIN_LENGTH) return 'tooShort';
  if (length > MAX_LENGTH) return 'tooLong';
  return 'ok';
}

/** A name to show for a person: their display name, else the start of their email. */
export function displayNameOf(user: { displayName?: string | null; email?: string | null }): string {
  const name = user.displayName?.trim();
  if (name) return name;
  return user.email?.split('@')[0] ?? '';
}
