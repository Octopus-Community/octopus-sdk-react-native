// The host app's own light/dark appearance, and the two things that can go wrong
// with it at launch.
//
// The Config screen's answer is persisted (`configStorage`), so whatever it holds
// is replayed on the next cold start before anything is on screen. That makes the
// appearance path the one place where a single bad or failing value repeats on
// every launch instead of once — issue #257, where a persisted `dark` took the
// iOS example down and it then aborted again on every relaunch until the app data
// was cleared.
//
// Two separate failures, two guards, both landing in the Debug console rather than
// on the console nobody reads:
//
//   - the persisted value is not a mode this build knows (`coerceThemeMode`);
//   - applying a perfectly valid mode throws (`applyThemeMode`).
//
// Both fall back to `'system'`, which is the appearance a fresh install starts on
// and the only one that needs nothing from the SDK bridge.

import { Appearance } from 'react-native';

import { debugLog } from '../debug/debugLog';
import type { ThemeMode } from '../types/theme';

/** The modes the appearance control offers — the floor every guard falls back into. */
export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** The appearance a failed read or a failed apply lands on. */
export const FALLBACK_THEME_MODE: ThemeMode = 'system';

/**
 * Narrows an arbitrary persisted value to a {@link ThemeMode}, falling back to
 * `'system'` and recording why.
 *
 * `deserializeDemoConfig` already refuses a blob whose `theme` it cannot parse, so
 * on the happy path this never fires. It is the second line: a value that reaches
 * the appearance control from anywhere else — a future field, a hand-edited blob,
 * a launch extra — must not be able to hand the SDK a scheme it will reject on
 * every single launch.
 */
export function coerceThemeMode(value: unknown): ThemeMode {
  if (THEME_MODES.includes(value as ThemeMode)) {
    return value as ThemeMode;
  }
  debugLog.apiCall(
    'setColorScheme',
    `unknown persisted appearance ${JSON.stringify(value)} — using "${FALLBACK_THEME_MODE}"`
  );
  return FALLBACK_THEME_MODE;
}

/**
 * Applies `mode` to the host app's appearance and returns the mode actually in
 * effect — `mode` itself, or `'system'` when applying it threw.
 *
 * `Appearance.setColorScheme` is a native call: it is not contractually
 * infallible, and a throw here runs inside the launch restore, where there is no
 * `catch` above it and React would unmount the whole tree. Falling back is what
 * keeps a bad appearance a bad appearance instead of a crash-loop.
 */
export function applyThemeMode(mode: ThemeMode): ThemeMode {
  try {
    Appearance.setColorScheme(mode === 'system' ? undefined : mode);
    return mode;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    debugLog.apiCall(
      'setColorScheme',
      `failed for "${mode}" — falling back to "${FALLBACK_THEME_MODE}" (${detail})`
    );
    if (mode !== FALLBACK_THEME_MODE) {
      try {
        Appearance.setColorScheme(undefined);
      } catch {
        // The fallback failing too leaves the OS appearance where it was, which is
        // exactly what 'system' means. Nothing left to do, and nothing worth a
        // second identical line in the console.
      }
    }
    return FALLBACK_THEME_MODE;
  }
}

/**
 * {@link coerceThemeMode} then {@link applyThemeMode} — what every restore path
 * should call with a value it did not produce itself.
 */
export function restoreThemeMode(value: unknown): ThemeMode {
  return applyThemeMode(coerceThemeMode(value));
}
