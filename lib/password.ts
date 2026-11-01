export const MIN_FAMILY_PASSWORD = 8;

export function validateFamilyPassword(password: string): 'ok' | 'tooShort' {
  return password.trim().length >= MIN_FAMILY_PASSWORD ? 'ok' : 'tooShort';
}

/** What gets hashed. The random family id works as a per-family salt. */
export function passwordHashInput(familyId: string, password: string): string {
  return `${familyId}:${password.trim()}`;
}
