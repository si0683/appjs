import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// В браузере (веб-версия — для разработки) — обычный localStorage.
const webStorage: StateStorage = {
  getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: (key) => globalThis.localStorage?.removeItem(key),
};

// Обычные настройки — в key-value хранилище на SQLite (быстро, синхронно, работает в Expo Go).
const sqliteStorage: StateStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};

// Токены и пароли — только в защищённое хранилище (Keychain на iOS, Keystore на Android).
const keychainStorage: StateStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const isWeb = Platform.OS === 'web';

export const kvStorage = createJSONStorage(() => (isWeb ? webStorage : sqliteStorage));
export const secureStorage = createJSONStorage(() => (isWeb ? webStorage : keychainStorage));
