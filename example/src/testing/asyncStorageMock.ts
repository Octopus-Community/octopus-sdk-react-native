// In-memory stand-in for `@react-native-async-storage/async-storage`, wired in
// through `moduleNameMapper` (see the root `package.json`).
//
// A mapping rather than the package's own bundled jest mock: the dependency
// lands in `example/node_modules`, which the Jest config lists under
// `modulePathIgnorePatterns`, so nothing under it is resolvable from a test.
//
// It also has to be inspectable. What matters about `loadPersistedDemoConfig`
// is what it leaves *in* storage — a blob from an older build carrying a pasted
// key has to be gone afterwards — and that can only be asserted on the raw
// entry, so this exposes one.

const store = new Map<string, string>();

/** Fails the next call of each kind, so the error paths are reachable. */
let failNext: { getItem?: boolean; setItem?: boolean; removeItem?: boolean } =
  {};

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if (failNext.getItem) {
      failNext.getItem = false;
      throw new Error('storage unavailable');
    }
    return store.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (failNext.setItem) {
      failNext.setItem = false;
      throw new Error('storage full');
    }
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (failNext.removeItem) {
      failNext.removeItem = false;
      throw new Error('storage unavailable');
    }
    store.delete(key);
  },
};

/** Test helpers — not part of the real module's surface. */
export const mockStore = {
  reset() {
    store.clear();
    failNext = {};
  },
  get(key: string): string | null {
    return store.get(key) ?? null;
  },
  set(key: string, value: string) {
    store.set(key, value);
  },
  has(key: string): boolean {
    return store.has(key);
  },
  failNextCall(call: 'getItem' | 'setItem' | 'removeItem') {
    failNext[call] = true;
  },
};

export default AsyncStorage;
