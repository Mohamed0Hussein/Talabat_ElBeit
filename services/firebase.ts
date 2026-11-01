import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const useEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === '1';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (useEmulators ? 'demo-key' : undefined),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || (useEmulators ? 'demo-talabat' : undefined),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.warn('Firebase config is missing. Copy .env.example to .env.local and fill it in.');
}

export const app = getApps().length ? getApp() : initializeApp(config);

function createAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    // Keeps people signed in between app launches.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized (fast refresh).
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

if (useEmulators) {
  const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
