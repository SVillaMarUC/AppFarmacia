import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAuth, initializeAuth } from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

type ExtraConfig = {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Faltan variables de Firebase en Constants.expoConfig.extra: ${missingKeys.join(', ')}. Revisa tu .env.`
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const buildAuth = () => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    const authModule = require('firebase/auth') as {
      getReactNativePersistence?: (storage: unknown) => unknown;
    };

    if (authModule.getReactNativePersistence) {
      return initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage) as Persistence,
      });
    }

    return initializeAuth(app, {
      persistence: AsyncStorage as unknown as Persistence,
    });
  } catch {
    return getAuth(app);
  }
};

export const auth = buildAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);