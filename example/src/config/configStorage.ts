// Persistence of the Config screen's answers, so a relaunch lands back in the
// app instead of re-asking everything.
//
// Mirrors the Flutter sample's `app_state.dart` (`octopus_demo_config_v1`,
// same field set, same refusals) — the two samples answer the same questions,
// so they persist the same way and a QA scenario written for one reads on the
// other.
//
// **No key value is ever written here.** A pasted key is the only way a
// production-valid key enters the sample; persisting it would let every later
// launch re-enter the SDK with a key someone pasted once and forgot about,
// without ever passing the Config screen again. Only the *source* is kept, so
// the screen can restore every other choice and ask for nothing but the key.

// Pinned to the 2.x line on purpose, and a `yarn upgrade` to 3.x has to be
// paired with a Kotlin/KSP bump. From 3.0 the library's Android module always
// applies `com.google.devtools.ksp` (Room-backed storage is no longer opt-in),
// and it derives the KSP version from `kotlinVersion` through a hardcoded list
// that stops at Kotlin 1.9. This app builds with Kotlin 2.0.21, so the lookup
// misses and falls back to the newest entry it knows — KSP for 1.9.24 — which
// then throws `NoSuchMethodError` against the 2.0 compiler and fails
// `:app:assembleDebug`. On 2.x, `useNextStorage` defaults to false, the KSP
// plugin is never applied, and nothing constrains the Kotlin version.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { debugLog } from '../debug/debugLog';
import type {
  ApiKeySource,
  AppThemeChoice,
  AuthMode,
  DemoConfig,
} from './demoConfig';
import { buildServerEnv, injectedApiKeys, octopusUserId } from './demoConfig';

/**
 * Storage key for the persisted config — versioned, so a future schema change
 * can bump it instead of colliding with stale blobs.
 *
 * Same literal as the Flutter sample's SharedPreferences key: the two apps have
 * distinct bundle ids and never share a store, so this is documentation of the
 * shared contract rather than interop.
 */
export const DEMO_CONFIG_STORAGE_KEY = 'octopus_demo_config_v1';

/** The persisted shape — deliberately not `DemoConfig`, see the file header. */
interface PersistedDemoConfig {
  apiKeySource: ApiKeySource;
  selectedKeyId: string | null;
  userId: string;
  authMode: AuthMode;
  theme: AppThemeChoice;
}

const API_KEY_SOURCES: ApiKeySource[] = ['demo', 'custom'];
const AUTH_MODES: AuthMode[] = ['sso', 'octopus'];
const THEMES: AppThemeChoice[] = ['system', 'light', 'dark'];

/**
 * Projects a config onto what is safe to keep on disk.
 *
 * Two fields are dropped rather than stored: `customApiKey`, for the reason in
 * the file header, and `serverEnv`, which is a property of the *build* — a blob
 * written by a demo build must not be able to tell a later build which backend
 * it is talking to.
 */
export function serializeDemoConfig(config: DemoConfig): PersistedDemoConfig {
  return {
    apiKeySource: config.apiKeySource,
    selectedKeyId: config.selectedKeyId,
    userId: config.userId,
    authMode: config.authMode,
    theme: config.theme,
  };
}

/**
 * Rebuilds a config from {@link serializeDemoConfig} output.
 *
 * Returns `null` when one of the three enums (`apiKeySource`, `authMode`,
 * `theme`) fails to parse — a renamed value, a blob from a future version — so a
 * stale entry sends the app back to a blank Config screen rather than into the
 * SDK with half a configuration. The other fields are not gates: `userId` is
 * back-filled from the build seed and `customApiKey` is never restored at all.
 *
 * Two values are re-derived from the current build rather than trusted:
 * `serverEnv`, which the build owns, and a `selectedKeyId` that no longer names
 * a slot this build carries (the named key sets come from the build's own
 * `OCTOPUS_NAMED_API_KEYS`, so they change from one launcher to the next).
 */
export function deserializeDemoConfig(raw: unknown): DemoConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const json = raw as Record<string, unknown>;

  const apiKeySource = json.apiKeySource;
  const authMode = json.authMode;
  const theme = json.theme;
  if (
    !API_KEY_SOURCES.includes(apiKeySource as ApiKeySource) ||
    !AUTH_MODES.includes(authMode as AuthMode) ||
    !THEMES.includes(theme as AppThemeChoice)
  ) {
    return null;
  }

  const persistedKeyId =
    typeof json.selectedKeyId === 'string' ? json.selectedKeyId : null;
  const keptKeyId = injectedApiKeys.some((k) => k.id === persistedKeyId)
    ? persistedKeyId
    : null;
  // A named slot the build no longer carries is not the same thing as no slot:
  // falling back to the generic `.env` key would silently auto-start on a
  // *different community* than the one that was persisted. Downgraded to
  // `custom` with an empty key instead, which `resolveApiKey` reports as
  // unresolvable — the app then lands on the Config screen seeded with the rest
  // of the restored choices, exactly as it does for a pasted key.
  const droppedKeySlot = persistedKeyId !== null && keptKeyId === null;

  const persistedUserId =
    typeof json.userId === 'string' ? json.userId.trim() : '';

  return {
    apiKeySource: droppedKeySlot ? 'custom' : (apiKeySource as ApiKeySource),
    // Never restored: no key value is persisted. A blob written by an older
    // build could still carry one — ignored here on purpose, and stripped from
    // storage by `loadPersistedDemoConfig`.
    customApiKey: '',
    selectedKeyId: keptKeyId,
    // Back-filled from the build seed: an empty id would connect nobody, and a
    // blob predating the picker has no id at all.
    userId: persistedUserId === '' ? octopusUserId : persistedUserId,
    authMode: authMode as AuthMode,
    theme: theme as AppThemeChoice,
    serverEnv: buildServerEnv,
  };
}

/**
 * Loads the persisted config, or `null` when there is none to restore.
 *
 * Also self-heals a blob written before this module existed, which would have
 * stored the pasted key verbatim: the config is re-persisted through the
 * current {@link serializeDemoConfig}, so the plaintext key stops sitting in
 * device storage on the first launch after this change. A blob that cannot be
 * parsed is *removed* rather than left alone — it sends the app to the Config
 * screen either way, so keeping it buys nothing and it may still hold a key.
 *
 * Storage being unreadable is a different failure from the blob being
 * unreadable, and only the second one justifies erasing: a transient storage
 * error read nothing, so there is nothing to judge.
 */
export async function loadPersistedDemoConfig(): Promise<DemoConfig | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(DEMO_CONFIG_STORAGE_KEY);
  } catch (e) {
    debugLog.apiCall('loadConfig', `storage unavailable — ${describe(e)}`);
    return null;
  }
  if (raw === null || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await clearPersistedDemoConfig();
    debugLog.apiCall('loadConfig', 'unreadable blob — cleared');
    return null;
  }

  const restored = deserializeDemoConfig(parsed);
  if (restored === null) {
    await clearPersistedDemoConfig();
    debugLog.apiCall('loadConfig', 'schema drift — cleared');
    return null;
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'customApiKey' in (parsed as Record<string, unknown>)
  ) {
    await persistDemoConfig(restored);
    debugLog.apiCall('loadConfig', 'stripped a persisted key from an old blob');
  }
  return restored;
}

/**
 * Persists a config so the next launch restores it. Best-effort: a storage
 * failure is logged and never blocks the run.
 */
export async function persistDemoConfig(config: DemoConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(
      DEMO_CONFIG_STORAGE_KEY,
      JSON.stringify(serializeDemoConfig(config))
    );
  } catch (e) {
    debugLog.apiCall('persistConfig', `failed — ${describe(e)}`);
  }
}

/** Forgets the persisted config (Back to Config, and prod-build erasure). */
export async function clearPersistedDemoConfig(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEMO_CONFIG_STORAGE_KEY);
  } catch (e) {
    debugLog.apiCall('clearConfig', `failed — ${describe(e)}`);
  }
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
