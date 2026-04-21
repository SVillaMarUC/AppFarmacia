import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'FarmaYa',
  slug: 'farma-ya',
  version: '1.0.0',
  scheme: 'farmaya',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.farmaya.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS'],
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
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    googleVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY,
    disableStorageUploads: process.env.EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS,
    disableGoogleVision: process.env.EXPO_PUBLIC_DISABLE_GOOGLE_VISION,
  },
};

export default config;