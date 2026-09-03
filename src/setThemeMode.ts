import { colorSchemeManager } from './internals/colorSchemeManager';
import type { OctopusThemeMode } from './types/octopusThemeMode';

/**
 * Forces the Octopus UI's color scheme, or releases a previous force back to
 * following the system appearance. Scoped to the Octopus UI: the host app's own
 * appearance is untouched (use `Appearance.setColorScheme` from React Native for
 * an app-wide switch, which the Octopus UI follows too).
 *
 * - `'light'` / `'dark'` — the Octopus UI renders in that scheme, regardless
 *   of the device's system appearance. With a dual-mode theme
 *   (`theme.colors.light` / `theme.colors.dark`), the set matching the forced
 *   scheme is selected. While forced, this module keeps observing
 *   `Appearance`/`AppState` changes internally (so it is ready to resume
 *   immediately once released), but the forced value always wins over the
 *   observed one, so the system value never reaches the native side while a
 *   force is active.
 * - `'system'` (the default before this is ever called) — the Octopus UI
 *   follows the device's system appearance, resuming the automatic tracking
 *   `initialize()` already starts.
 *
 * **Live on both platforms.** An already-open `openUI()` screen or an
 * already-mounted `<OctopusUIView>` recolors in place. Calling it before
 * `initialize()` is fine too: `initialize()` starts the native side from the
 * forced scheme, and a later `initialize()` keeps it.
 *
 * **Android**: the scheme in effect (forced, else the device configuration) is
 * resolved at render time and a dual-mode theme is re-selected for it on every
 * change. Works with or without a `theme` at `initialize()` — without one, the
 * base light/dark palette is what gets forced.
 * **iOS**: the forced scheme is applied as an interface-style override on the
 * SDK's own screens (fullscreen and embedded), so the theme's adaptive colors
 * resolve against it; releasing to `'system'` hands control back to the trait
 * collection.
 *
 * **Shape diverges from the Flutter reference by design** — see
 * {@link OctopusThemeMode} for the rationale.
 *
 * @param mode - `'light'`, `'dark'`, or `'system'` to release the force.
 *
 * @example
 * ```typescript
 * // Always render the Octopus UI in dark mode
 * setThemeMode('dark');
 *
 * // Go back to following the system appearance
 * setThemeMode('system');
 * ```
 */
export function setThemeMode(mode: OctopusThemeMode): void {
  colorSchemeManager.setForcedThemeMode(mode === 'system' ? null : mode);
}
