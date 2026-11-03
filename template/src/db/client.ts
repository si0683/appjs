import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync, openDatabaseSync } from 'expo-sqlite';
import * as React from 'react';
import { Platform } from 'react-native';

import migrations from './migrations/migrations';
import * as schema from './schema';

const NAME = 'app.db';

let instance: ExpoSQLiteDatabase<typeof schema> | null = null;

// База открывается один раз при старте (см. useDatabase в src/app/_layout.tsx).
export function getDb() {
  if (!instance) throw new Error('База ещё не открыта: дождитесь useDatabase()');
  return instance;
}

async function open() {
  // В браузере SQLite живёт в Web Worker: сначала будим его асинхронно,
  // иначе синхронное открытие не дождётся загрузки WebAssembly.
  if (Platform.OS === 'web') {
    // Нужны заголовки COOP/COEP. Dev-сервер Expo не ставит их на адрес «/»,
    // поэтому один раз переходим на /index.html (там они есть), а оттуда — на главную.
    if (!globalThis.crossOriginIsolated) {
      globalThis.location.replace('/index.html');
      return new Promise<never>(() => {});
    }
    await openDatabaseAsync(NAME);
  }
  // enableChangeListener — чтобы useLiveQuery обновлял экран после записи в базу.
  const sqlite = openDatabaseSync(NAME, { enableChangeListener: true });
  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  instance = db;
}

let opening: Promise<void> | null = null;

// Открывает базу и применяет миграции. Пока не готово — экран-заставка.
export function useDatabase() {
  const [state, setState] = React.useState<{ success: boolean; error?: Error }>({
    success: !!instance,
  });
  React.useEffect(() => {
    if (instance) return;
    opening ??= open();
    opening.then(
      () => setState({ success: true }),
      (error: Error) => setState({ success: false, error })
    );
  }, []);
  return state;
}
