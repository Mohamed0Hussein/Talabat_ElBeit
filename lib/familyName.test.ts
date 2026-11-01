import { displayNameOf, normalizeFamilyName, validateFamilyName } from './familyName';

describe('normalizeFamilyName', () => {
  it('trims, collapses inner spaces and lowercases', () => {
    expect(normalizeFamilyName('  The  Husseins ')).toBe('the husseins');
  });

  it('leaves Arabic letters as they are', () => {
    expect(normalizeFamilyName(' عيلة   حسين ')).toBe('عيلة حسين');
  });
});

describe('validateFamilyName', () => {
  it('accepts a normal name with spaces around it', () => {
    expect(validateFamilyName('  Hussein  ')).toBe('ok');
  });

  it('accepts an Arabic name', () => {
    expect(validateFamilyName('عيلة حسين')).toBe('ok');
  });

  it('rejects a slash, which Firestore ids cannot contain', () => {
    expect(validateFamilyName('a/b')).toBe('invalidChars');
  });

  it('rejects names Firestore reserves', () => {
    expect(validateFamilyName('..')).toBe('invalidChars');
    expect(validateFamilyName('__x__')).toBe('invalidChars');
  });

  it('rejects names shorter than 2 characters', () => {
    expect(validateFamilyName(' x ')).toBe('tooShort');
  });

  it('rejects names longer than 40 characters', () => {
    expect(validateFamilyName('a'.repeat(41))).toBe('tooLong');
    expect(validateFamilyName('a'.repeat(40))).toBe('ok');
  });
});

describe('displayNameOf', () => {
  it('uses the display name when there is one', () => {
    expect(displayNameOf({ displayName: ' Mona ', email: 'mona@x.com' })).toBe('Mona');
  });

  it('falls back to the part of the email before @', () => {
    expect(displayNameOf({ displayName: null, email: 'sara@x.com' })).toBe('sara');
  });

  it('returns an empty string when there is nothing to show', () => {
    expect(displayNameOf({})).toBe('');
  });
});
