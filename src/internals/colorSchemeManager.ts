import { Appearance, AppState } from 'react-native';
import { OctopusReactNativeSdk } from './nativeModule';
import type { OctopusTheme } from '../initialize';

let isListening = false;
let currentColorScheme: string | null | undefined = null;

// Parity wave — navigation & theme (themeMode)
// Set via ColorSchemeManager.setForcedThemeMode (the setThemeMode() TS API). While non-null,
// updateNativeColorScheme sends this instead of the system-observed value. The system-change
// listeners below keep firing and keep calling updateNativeColorScheme as before — they do not
// skip the native call while a force is active, they just get overridden by the `||` in
// updateNativeColorScheme, so each system event still re-sends the (still-forced) value. The
// manager keeps listening (so a later setForcedThemeMode(null) can resume without
// re-subscribing) — the "stops reacting" part is only true of the *value* sent, not of whether
// the bridge is called.
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
        // updateNativeColorScheme on every system change — it has to, so `currentColorScheme`
        // is ready the moment the force is released — but the forced value keeps winning
        // there (the `||` fallback), so the system value never actually reaches the native
        // side while forced. See updateNativeColorScheme.
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
   * Update the native modules with the current color scheme
   * Note: This is only called when the app becomes active (foreground).
   * When the Octopus UI is open, the React Native app is backgrounded,
   * so theme updates are not possible during UI display.
   */
  private updateNativeColorScheme(): void {
    // Both platforms handle theme updates when the app becomes active
    // iOS uses adaptive colors, Android applies the theme when UI reopens
    //
    // A forced scheme (setThemeMode) always wins over the system-observed one — that's the
    // entire point of forcing it — and this is the single call site both the system listeners
    // above and setForcedThemeMode funnel through, so neither path can push a stale value.
    try {
      OctopusReactNativeSdk.updateColorScheme(
        forcedColorScheme || currentColorScheme || undefined
      );
    } catch (error) {
      this.stopListening();
    }
  }
}

// Export singleton instance
export const colorSchemeManager = ColorSchemeManager.getInstance();
