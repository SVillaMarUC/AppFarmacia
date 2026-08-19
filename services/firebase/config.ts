import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAuth, initializeAuth } from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

type ExtraConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

const firebaseConfig = {
  apiKey: extra.firebaseApiKey ?? extra.apiKey,
  authDomain: extra.firebaseAuthDomain ?? extra.authDomain,
  projectId: extra.firebaseProjectId ?? extra.projectId,
  storageBucket: extra.firebaseStorageBucket ?? extra.storageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId ?? extra.messagingSenderId,
  appId: extra.firebaseAppId ?? extra.appId,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingKeys.length === 0;

if (missingKeys.length > 0) {
  console.warn(
    `Faltan variables de Firebase en Constants.expoConfig.extra: ${missingKeys.join(', ')}. La app iniciara en modo degradado hasta que configures el entorno.`
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

const buildDb = () => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
};

export const auth = buildAuth();
export const db = buildDb();
export const storage = getStorage(app);