import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'FarmaYa',
  slug: 'farma-ya',
  owner: 'farma-team',
  version: '0.6.0',
  scheme: 'farmaya',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-font', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: true,
    icon: './assets/icon.png',
    buildNumber: '6',
  },
  android: {
    package: 'com.farmaya.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  updates: {
    url: 'https://u.expo.dev/8111788a-5362-4e2d-9ee0-e204bd4bcd16',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    eas: {
      projectId: '8111788a-5362-4e2d-9ee0-e204bd4bcd16',
    },
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    supabaseStorageBucket: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET,
    disableStorageUploads: process.env.EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS,
  },
};

export default config;