import { MIN_FAMILY_PASSWORD, passwordHashInput, validateFamilyPassword } from './password';

describe('validateFamilyPassword', () => {
  it('requires at least 8 characters', () => {
    expect(MIN_FAMILY_PASSWORD).toBe(8);
    expect(validateFamilyPassword('1234567')).toBe('tooShort');
    expect(validateFamilyPassword('12345678')).toBe('ok');
  });

  it('does not count spaces at the ends', () => {
    expect(validateFamilyPassword('  1234567  ')).toBe('tooShort');
  });
});

describe('passwordHashInput', () => {
  it('joins the family id and the trimmed password with a colon', () => {
    expect(passwordHashInput('F1', ' pw12345678 ')).toBe('F1:pw12345678');
  });
});
