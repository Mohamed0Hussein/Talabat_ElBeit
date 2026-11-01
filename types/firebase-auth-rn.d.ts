// firebase/auth exports getReactNativePersistence only in its React Native build, which the
// TypeScript types don't describe. Declaring it here keeps type checking independent of where
// npm happens to place @firebase/auth inside node_modules.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
