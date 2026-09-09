import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Proveedor de almacenamiento seguro multiplataforma.
 * - En plataformas nativas (iOS / Android), utiliza `expo-secure-store` para máxima seguridad y cifrado.
 * - En Web, utiliza `@react-native-async-storage/async-storage` evitando excepciones en runtime por APIs nativas no disponibles.
 */
export const safeStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Si SecureStore falla en dispositivo físico por configuración de hardware, recurrir a AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }

    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) {
        return val;
      }
      return AsyncStorage.getItem(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignorar error si no existía en SecureStore
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignorar error de borrado secundario
    }
  },
};
