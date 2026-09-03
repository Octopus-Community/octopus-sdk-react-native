import {
  DEMO_CONFIG_STORAGE_KEY,
  clearPersistedDemoConfig,
  deserializeDemoConfig,
  loadPersistedDemoConfig,
  persistDemoConfig,
  serializeDemoConfig,
} from '../config/configStorage';
import type { DemoConfig } from '../config/demoConfig';
import {
  buildServerEnv,
  octopusUserId,
  resolveApiKey,
} from '../config/demoConfig';
import { mockStore } from '../testing/asyncStorageMock';

// The rule these guard is a security one, not a convenience: a pasted key is
// the only way a production-valid key enters the sample, so it must never reach
// device storage — not when it is written, and not when an older build's blob
// is read back.

const config: DemoConfig = {
  apiKeySource: 'custom',
  customApiKey: 'a-pasted-key',
  selectedKeyId: null,
  userId: 'someone',
  authMode: 'sso',
  theme: 'dark',
  serverEnv: buildServerEnv,
};

beforeEach(() => mockStore.reset());

/** A persisted blob missing one field — what an older build's entry looks like. */
function without(field: string): Record<string, unknown> {
  const blob: Record<string, unknown> = { ...serializeDemoConfig(config) };
  delete blob[field];
  return blob;
}

describe('serializeDemoConfig', () => {
  it('keeps every answer but the key value', () => {
    expect(serializeDemoConfig(config)).toEqual({
      apiKeySource: 'custom',
      selectedKeyId: null,
      userId: 'someone',
      authMode: 'sso',
      theme: 'dark',
    });
  });

  it('drops serverEnv, which the build owns and a blob must not dictate', () => {
    expect(serializeDemoConfig(config)).not.toHaveProperty('serverEnv');
  });
});

describe('deserializeDemoConfig', () => {
  it('round-trips every persisted answer', () => {
    const restored = deserializeDemoConfig(serializeDemoConfig(config));
    expect(restored).toEqual({ ...config, customApiKey: '' });
  });

  it('refuses anything that is not a config object', () => {
    expect(deserializeDemoConfig(null)).toBeNull();
    expect(deserializeDemoConfig('nope')).toBeNull();
    expect(deserializeDemoConfig([])).toBeNull();
  });

  it('refuses a blob whose enums this build does not know', () => {
    const base = serializeDemoConfig(config);
    expect(
      deserializeDemoConfig({ ...base, apiKeySource: 'legacy' })
    ).toBeNull();
    expect(deserializeDemoConfig({ ...base, authMode: 'oauth' })).toBeNull();
    expect(deserializeDemoConfig({ ...base, theme: 'sepia' })).toBeNull();
    expect(deserializeDemoConfig(without('theme'))).toBeNull();
  });

  it('never restores a key value, even from a blob that carries one', () => {
    const restored = deserializeDemoConfig({
      ...serializeDemoConfig(config),
      customApiKey: 'a-pasted-key',
    });
    expect(restored?.customApiKey).toBe('');
  });

  it('drops a key slot this build no longer carries', () => {
    // The named key sets come from the build's own env, so a slot picked under
    // one launcher may simply not exist under the next.
    const restored = deserializeDemoConfig({
      ...serializeDemoConfig(config),
      apiKeySource: 'demo',
      selectedKeyId: 'a-slot-from-another-build',
    });
    expect(restored?.selectedKeyId).toBeNull();
    // ...and does not fall back to the generic key, which would auto-start on a
    // different community than the one that was persisted. Reported as
    // unresolvable so the app asks for a key instead.
    expect(restored?.apiKeySource).toBe('custom');
    expect(resolveApiKey(restored!)).toBe('');
  });

  it('keeps a `demo` source that never named a slot', () => {
    const restored = deserializeDemoConfig({
      ...serializeDemoConfig(config),
      apiKeySource: 'demo',
      selectedKeyId: null,
    });
    expect(restored?.apiKeySource).toBe('demo');
    expect(restored?.selectedKeyId).toBeNull();
  });

  it('back-fills an empty or missing user id from the build seed', () => {
    const base = serializeDemoConfig(config);
    expect(deserializeDemoConfig({ ...base, userId: '  ' })?.userId).toBe(
      octopusUserId
    );
    expect(deserializeDemoConfig(without('userId'))?.userId).toBe(
      octopusUserId
    );
  });

  it('takes serverEnv from the build, not from the blob', () => {
    const restored = deserializeDemoConfig({
      ...serializeDemoConfig(config),
      serverEnv: 'prod',
    });
    expect(restored?.serverEnv).toBe(buildServerEnv);
  });
});

describe('loadPersistedDemoConfig', () => {
  it('restores what persistDemoConfig wrote', async () => {
    await persistDemoConfig(config);
    await expect(loadPersistedDemoConfig()).resolves.toEqual({
      ...config,
      customApiKey: '',
    });
  });

  it('writes no key value to storage', async () => {
    await persistDemoConfig(config);
    expect(mockStore.get(DEMO_CONFIG_STORAGE_KEY)).not.toContain(
      'a-pasted-key'
    );
  });

  it('yields null when nothing was ever persisted', async () => {
    await expect(loadPersistedDemoConfig()).resolves.toBeNull();
  });

  it('strips a key left in storage by an older build', async () => {
    // The self-heal that gives this module its point: a build that persisted
    // the pasted key verbatim leaves it on disk, and the first launch after
    // this change has to take it away rather than merely ignore it.
    mockStore.set(
      DEMO_CONFIG_STORAGE_KEY,
      JSON.stringify({ ...serializeDemoConfig(config), customApiKey: 'leaked' })
    );
    const restored = await loadPersistedDemoConfig();
    expect(restored?.apiKeySource).toBe('custom');
    expect(mockStore.get(DEMO_CONFIG_STORAGE_KEY)).not.toContain('leaked');
  });

  it('erases a blob it cannot read rather than leaving it in place', async () => {
    mockStore.set(DEMO_CONFIG_STORAGE_KEY, '{ not json');
    await expect(loadPersistedDemoConfig()).resolves.toBeNull();
    expect(mockStore.has(DEMO_CONFIG_STORAGE_KEY)).toBe(false);
  });

  it('erases a blob whose schema drifted', async () => {
    mockStore.set(DEMO_CONFIG_STORAGE_KEY, JSON.stringify({ theme: 'sepia' }));
    await expect(loadPersistedDemoConfig()).resolves.toBeNull();
    expect(mockStore.has(DEMO_CONFIG_STORAGE_KEY)).toBe(false);
  });

  it('keeps a valid config when storage itself fails to read', async () => {
    // A read that never happened judged nothing: erasing here would throw away
    // a good config over a transient error.
    await persistDemoConfig(config);
    mockStore.failNextCall('getItem');
    await expect(loadPersistedDemoConfig()).resolves.toBeNull();
    expect(mockStore.has(DEMO_CONFIG_STORAGE_KEY)).toBe(true);
  });

  it('survives a failed write instead of taking the run down', async () => {
    mockStore.failNextCall('setItem');
    await expect(persistDemoConfig(config)).resolves.toBeUndefined();
  });
});

describe('clearPersistedDemoConfig', () => {
  it('forgets the config', async () => {
    await persistDemoConfig(config);
    await clearPersistedDemoConfig();
    expect(mockStore.has(DEMO_CONFIG_STORAGE_KEY)).toBe(false);
  });

  it('survives a storage failure', async () => {
    mockStore.failNextCall('removeItem');
    await expect(clearPersistedDemoConfig()).resolves.toBeUndefined();
  });
});
