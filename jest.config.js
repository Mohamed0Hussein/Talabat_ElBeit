/** Two projects: fast unit tests for pure logic, and Firestore rules/service tests that need the emulator. */
const alias = { '^@/(.*)$': '<rootDir>/$1' };

module.exports = {
  testTimeout: 30000,
  projects: [
    {
      displayName: 'unit',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/lib/**/*.test.ts', '<rootDir>/i18n/**/*.test.ts', '<rootDir>/hooks/**/*.test.ts?(x)'],
      moduleNameMapper: alias,
    },
    {
      displayName: 'rules',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      moduleNameMapper: { ...alias, '^expo-crypto$': '<rootDir>/tests/shims/expo-crypto.ts' },
    },
  ],
};
