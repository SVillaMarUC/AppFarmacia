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
  extra: {
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