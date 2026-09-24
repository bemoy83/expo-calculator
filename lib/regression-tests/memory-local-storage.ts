// In-memory localStorage so the persisted zustand stores can run under Node.
// Import this before any store module.
const items = new Map<string, string>();

const memoryStorage: Storage = {
  get length() {
    return items.size;
  },
  clear: () => items.clear(),
  getItem: (key) => items.get(key) ?? null,
  key: (index) => Array.from(items.keys())[index] ?? null,
  removeItem: (key) => {
    items.delete(key);
  },
  setItem: (key, value) => {
    items.set(key, String(value));
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memoryStorage,
});

export {};
