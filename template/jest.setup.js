// Заглушки нативных модулей для тестов в Node.
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map();
  return {
    __esModule: true,
    default: {
      getItemSync: (k) => data.get(k) ?? null,
      setItemSync: (k, v) => data.set(k, v),
      removeItemSync: (k) => data.delete(k),
    },
  };
});
