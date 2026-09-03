import { Appearance, AppState } from 'react-native';
import { OctopusReactNativeSdk } from './nativeModule';
import type { OctopusTheme } from '../initialize';

let isListening = false;
let currentColorScheme: string | null | undefined = null;

// Set via ColorSchemeManager.setForcedThemeMode (the setThemeMode() TS API). While non-null,
// updateNativeColorScheme sends this instead of the system-observed value, flagged as forced.
// The system-change listeners below keep firing and keep calling updateNativeColorScheme as
// before — they do not skip the native call while a force is active, they just get overridden
// by the `||` in updateNativeColorScheme, so each system event still re-sends the
// (still-forced) value. The manager keeps listening (so a later setForcedThemeMode(null) can
// resume without re-subscribing) — the "stops reacting" part is only true of the *value* sent,
// not of whether the bridge is called.
let forcedColorScheme: 'light' | 'dark' | null = null;

/**
 * Internal color scheme manager that automatically handles appearance changes
 * and updates the native modules accordingly.
 */
export class ColorSchemeManager {
  private static instance: ColorSchemeManager;
  private appearanceSubscription: any = null;
  private appStateSubscription: any = null;

  private constructor() {}

  static getInstance(): ColorSchemeManager {
    if (!ColorSchemeManager.instance) {
      ColorSchemeManager.instance = new ColorSchemeManager();
    }
    return ColorSchemeManager.instance;
  }

  /**
   * Set the current theme for color scheme management
   * Note: This is kept for API compatibility but theme updates are not used
   * when the Octopus UI is open since the React Native app is backgrounded.
   */
  setTheme(_theme: OctopusTheme | null): void {
    // Theme is set during initialization and applied when UI opens
    // No need to store it here since updates can't happen while UI is open
  }

  /**
   * Start listening to appearance changes and automatically update native modules
   */
  startListening(): void {
    if (isListening) {
      return;
    }

    isListening = true;
    currentColorScheme = Appearance.getColorScheme();

    // Listen to appearance changes
    this.appearanceSubscription = Appearance.addChangeListener(
      ({ colorScheme }) => {
        currentColorScheme = colorScheme;
        // While a themeMode force is active (setThemeMode), this still calls
        // updateNativeColorScheme on every system change, but the forced value is all that
        // goes out, so the system value never reaches the native side while forced. See
        // updateNativeColorScheme.
        this.updateNativeColorScheme();
      }
    );

    // Listen to app state changes to ensure we have the latest color scheme
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        // Only check color scheme when app becomes active (foreground)
        if (nextAppState === 'active') {
          const newColorScheme = Appearance.getColorScheme();
          if (newColorScheme !== currentColorScheme) {
            currentColorScheme = newColorScheme;
            this.updateNativeColorScheme();
          }
        }
      }
    );
  }

  /**
   * The scheme currently forced through `setThemeMode()`, or `null` when the Octopus UI
   * follows the system. `initialize()` reads it so a force set *before* initialization is the
   * scheme the native side starts from, rather than the system value.
   */
  getForcedColorScheme(): 'light' | 'dark' | null {
    return forcedColorScheme;
  }

  /**
   * Re-sends the active force, if any, to the native side. Called by `initialize()` once the
   * native module has initialized: a `setThemeMode()` made before that had no native side to
   * reach (iOS keeps the override outside of its initialize path, and a re-`initialize()`
   * rebuilds the Android theme config from scratch), so the force is pushed again here.
   * Without a force nothing is sent.
   */
  pushForcedColorScheme(): void {
    if (forcedColorScheme) {
      this.updateNativeColorScheme();
    }
  }

  /**
   * Forces the native color scheme to `scheme`, or releases a previous force back to the
   * system-observed value when `scheme` is `null`. Backs the public `setThemeMode()` API.
   *
   * @see setThemeMode
   */
  setForcedThemeMode(scheme: 'light' | 'dark' | null): void {
    forcedColorScheme = scheme;
    this.updateNativeColorScheme();
  }

  /**
   * Stop listening to appearance changes
   */
  stopListening(): void {
    if (this.appearanceSubscription) {
      this.appearanceSubscription.remove();
      this.appearanceSubscription = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    isListening = false;
  }

  /**
   * Get the current color scheme
   */
  getCurrentColorScheme(): string | null | undefined {
    return currentColorScheme;
  }

  /**
   * Update the native modules with the forced color scheme, or with `undefined` (flagged as
   * not forced) when the Octopus UI follows the system.
   *
   * Both natives apply it live to an open Octopus UI. Android resolves `undefined` from its
   * own configuration at render time (the Octopus screens are recreated / reconfigured by the
   * OS on an appearance change, which is more reliable than the value JS observed) and
   * re-selects a dual-mode set from the result; iOS maps `undefined` to `.unspecified` and
   * drops its interface-style override. Neither platform is ever pinned to a system value JS
   * observed at some earlier instant.
   */
  private updateNativeColorScheme(): void {
    // This is the single call site both the system listeners above and setForcedThemeMode
    // funnel through, so no path can push a system value while a force is active.
    try {
      OctopusReactNativeSdk.updateColorScheme(
        forcedColorScheme ?? undefined,
        forcedColorScheme != null
      );
    } catch (error) {
      this.stopListening();
    }
  }
}

// Export singleton instance
export const colorSchemeManager = ColorSchemeManager.getInstance();
