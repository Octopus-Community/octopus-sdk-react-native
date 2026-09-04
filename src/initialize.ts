import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { UserProfileField } from './types/userProfileField';
import type { ImageResolvedAssetSource } from 'react-native';
import { Appearance } from 'react-native';
import { colorSchemeManager } from './internals/colorSchemeManager';
import { parseFontConfig, type ParsedFontConfig } from './internals/fontParser';
import { normalizeThemeColors } from './internals/colorValidator';
import {
  attachStateChannels,
  publishIsInitialised,
} from './internals/stateChannels';
import { log } from './internals/logger';
import { LogLevel } from './enums/LogLevel.enum';
import type { ApiServer } from './types/apiServer';
import { setIsInitialised } from './internals/initialisationState';

/**
 * Color set for a specific appearance mode (light or dark).
 *
 * Every color is an optional hex string in one of these forms, with or without the
 * leading `#`: `#RRGGBB`, the `#RGB` shorthand, or `#AARRGGBB` to carry alpha.
 * **Alpha comes first**, as both native SDKs read it — an 8-digit value is *not* the
 * `#RRGGBBAA` of CSS. Whichever form you use is rewritten to `#RRGGBB` / `#AARRGGBB`
 * before it reaches the native layer, so the same input renders the same color on
 * Android and on iOS. A value that is not a parseable hex string is dropped, the SDK
 * default applies, and a warning is logged by `initialize`.
 */
export interface OctopusColorSet {
  /** Primary color set for branding (hex format: #FF6B35 or FF6B35) */
  primary?: string;
  /** Primary low contrast color (lighter variation of primary) (hex format: #FF6B35 or FF6B35) */
  primaryLowContrast?: string;
  /** High contrast variation of primary color (hex format: #FF6B35 or FF6B35) */
  primaryHighContrast?: string;
  /** Color for content displayed over the primary color (hex format: #FF6B35 or FF6B35) */
  onPrimary?: string;
  /**
   * Color of links, i.e. URLs rendered inside posts and comments
   * (hex format: #FF6B35 or FF6B35).
   *
   * Cosmetic only — it does not change how a link is opened. Omit it to keep the
   * native default.
   */
  link?: string;
  /**
   * Background color of the community screens (hex format: #FF6B35 or FF6B35).
   *
   * Omit it to keep the native default: the Octopus light/dark scheme background on
   * Android, the system background on iOS.
   */
  background?: string;
}

/**
 * Font type options for unified cross-platform font configuration.
 */
export type OctopusFontType = 'serif' | 'monospace' | 'default';

/**
 * Font size configuration for different text types.
 */
export interface OctopusFontSize {
  /** Font size in points (will be converted to platform-specific units) */
  size?: number;
}

/**
 * Font configuration for a specific text type.
 */
export interface OctopusTextStyle {
  /**
   * Font type: serif, monospace, or default (uses system default).
   *
   * This is the narrow, per-style knob: it can only pick one of the three
   * *system* font designs. To use a font of your own, set
   * {@link OctopusFonts.fontFamily} on the theme instead — a resolved
   * `fontFamily` takes precedence over `fontType` on every style (see its
   * documentation for the full precedence rule).
   */
  fontType?: OctopusFontType;
  /** Font size configuration */
  fontSize?: OctopusFontSize;
}

/**
 * Font configuration for customizing the Octopus UI typography.
 */
export interface OctopusFonts {
  /**
   * Custom font family applied to all SDK text (titles, body text, captions,
   * navigation-bar items).
   *
   * **This name is not resolved from the JavaScript bundle.** A font linked with
   * `react-native-asset` / `react-native.config.js` is registered with the *host
   * app*, and that is exactly what is needed here: both native SDKs render their
   * screens natively (Compose on Android, SwiftUI on iOS), so the font must exist
   * as a **native** resource under this exact name:
   *
   * - **Android**: the resource name of a font file, or of an XML
   *   `<font-family>`, under `android/app/src/main/res/font/` in the host app —
   *   `res/font/my_brand_font.ttf` is passed as `'my_brand_font'` (resource names
   *   are lowercase with underscores only, no extension).
   * - **iOS**: the exact **PostScript name** of a font added to the Xcode project
   *   and declared under `UIAppFonts` in `Info.plist`. This is often *not* the
   *   filename — check it with Font Book.
   *
   * If the name does not resolve, the SDK logs a native warning and keeps its own
   * default font.
   *
   * **Precedence over {@link OctopusTextStyle.fontType}**: these two are not
   * competing mechanisms — `fontFamily` names an arbitrary registered family for
   * the whole theme, `fontType` picks one of three *system* designs for one style.
   * A `fontFamily` that resolves natively wins on every style, and `fontType` is
   * ignored; if it does not resolve, each style falls back to its `fontType` (and
   * then to the system default), so a `fontType` set alongside still works as the
   * fallback it now is. Setting both logs a warning at `initialize` naming the
   * styles whose `fontType` is being superseded.
   *
   * **Android navigation-bar side effect**: setting this (or {@link fontWeight})
   * also sets the Android navigation-bar title to the size of the `body1` style,
   * which is smaller than the title size used with no font override. The native
   * top-app-bar title has no typography role of its own and the style we pass
   * replaces the ambient one rather than merging with it, so a complete style has
   * to be supplied. Use `textStyles.body1.fontSize` to control the resulting size.
   *
   * Omit it to keep each native SDK's own default font.
   */
  fontFamily?: string;
  /**
   * Custom font weight applied to all SDK text, on a 100 (thinnest) - 900
   * (boldest) scale — the same scale as CSS `font-weight` and React Native's own
   * numeric `fontWeight`.
   *
   * Unlike {@link fontFamily} this needs no native registration: it is applied on
   * top of whichever family is in effect (custom or default), and native rendering
   * picks the closest weight the font actually has a face for. iOS buckets the
   * value to the nearest of SwiftUI's nine named weights, which have no
   * arbitrary-integer initializer.
   *
   * Must be a whole number within 100-900. Anything else is dropped with a warning
   * at `initialize` and the native default weight applies.
   *
   * Setting this also triggers the Android navigation-bar side effect described on
   * {@link fontFamily}.
   *
   * Omit it to keep each native SDK's own default weight.
   */
  fontWeight?: number;
  /**
   * Unified font configuration for different text types.
   */
  textStyles?: {
    /** Configuration for title1 text */
    title1?: OctopusTextStyle;
    /** Configuration for title2 text */
    title2?: OctopusTextStyle;
    /** Configuration for body1 text */
    body1?: OctopusTextStyle;
    /** Configuration for body2 text */
    body2?: OctopusTextStyle;
    /** Configuration for caption1 text */
    caption1?: OctopusTextStyle;
    /** Configuration for caption2 text */
    caption2?: OctopusTextStyle;
    /**
     * Configuration for navigation-bar items (back / close labels, bar actions).
     *
     * **iOS only.** The native iOS theme has a dedicated `navBarItem` font slot,
     * but the native Android typography has no counterpart, so this style has no
     * effect on Android.
     *
     * Omit it to keep the previous behaviour: nav-bar items follow `body1`.
     * If `body1` is omitted too, the slot falls back to a 17pt system font —
     * *not* to the native iOS default of `.body`: as soon as `textStyles`
     * carries any entry, the bridge builds all seven slots explicitly, so the
     * native per-slot defaults no longer apply. Passing no `fonts` block at all
     * is what leaves the native theme untouched.
     */
    navBarItem?: OctopusTextStyle;
  };
  /**
   * Pre-processed font configuration for native platforms.
   * This is automatically generated and should not be set manually.
   */
  parsedConfig?: ParsedFontConfig | null;
}

/**
 * Theme configuration for customizing the Octopus UI appearance.
 *
 * Supports two approaches:
 * 1. Single color set (backward compatible) - colors are applied to both light and dark modes
 * 2. Dual mode colors - separate color sets for light and dark modes
 */
export interface OctopusTheme {
  /**
   * Color customization options.
   *
   * For backward compatibility, you can pass a single color set that will be used for both light and dark modes.
   * For enhanced theming, you can pass separate color sets for light and dark modes.
   */
  colors?:
    | OctopusColorSet
    | {
        /** Colors for light mode */
        light: OctopusColorSet;
        /** Colors for dark mode */
        dark: OctopusColorSet;
      };
  /** Font customization options */
  fonts?: OctopusFonts;
  /** Logo customization */
  logo?: {
    /** Local image resource - use Image.resolveAssetSource(require('./path/to/image.png')) */
    image?: ImageResolvedAssetSource;
  };
}

/**
 * Customizes the main-feed navigation bar (TopAppBar).
 *
 * Set globally via {@link InitializeParams.topAppBar}. Applies to both the
 * modal (`openUI()`) and the embedded `<OctopusUIView>`.
 */
export interface OctopusTopAppBar {
  /**
   * What to show as the title.
   * - `{ type: 'logo' }` — uses `theme.logo` (the default when omitted)
   * - `{ type: 'text', text }` — custom text (keep under ~18 characters)
   * @default { type: 'logo' }
   */
  title?: { type: 'logo' } | { type: 'text'; text: string };

  /**
   * Title alignment.
   * @default 'leading'
   */
  alignment?: 'leading' | 'center';

  /**
   * Use the theme's primary color as the nav-bar background.
   * On iOS this requires iOS 16+ (ignored on earlier versions).
   * @default false
   */
  coloredBackground?: boolean;
}

/**
 * UI customization options for platform-specific layout adjustments.
 */
export interface OctopusUIOptions {
  /**
   * Bottom padding reserved below the Octopus UI, in points on iOS and dp on Android.
   *
   * Its meaning depends on how the UI is presented, and is the same on both platforms:
   *
   * - In an embedded `<OctopusUIView>`, it is the **total** bottom padding. Each bridge
   *   removes the system safe area from the equation first — Android by consuming the
   *   system insets before mounting, iOS by subtracting the safe area the embedded view
   *   sits in — so the same value renders the same band on both. On iOS the result is
   *   therefore `max(value, safeArea)`: a system safe area already larger than the
   *   requested padding satisfies the request on its own and nothing is added.
   * - In the fullscreen UI opened by `openUI()`, it is an **additional** inset applied on
   *   top of the system safe area (navigation bar on Android, home indicator on iOS).
   *
   * Values of `0` or less reserve nothing on iOS, and on Android in the fullscreen UI.
   *
   * **In an embedded `<OctopusUIView>`, leaving this option out entirely is not the same as
   * passing `0`, on either platform.** Each bridge applies its own default when the option
   * is absent:
   *
   * - Android resolves it from where the view is actually mounted. Since the bridge consumes
   *   the system insets before mounting (see above), nothing else would reserve the
   *   navigation bar on an edge-to-edge device (API 35+) if the default were "no extra
   *   padding" — so it reserves whatever portion of the navigation-bar inset overlaps the
   *   view's own on-screen position, and nothing when the host has already lifted the view
   *   above the navigation bar.
   * - iOS applies a fixed **additional** 10 pt on top of the safe area the embedded view
   *   sits in — the same default the Flutter bridge applies in that state — so the profile
   *   bubble and create-post button never sit flush against the bottom edge of the view.
   *
   * Pass an explicit `0` on either platform to opt back out and reserve nothing. Neither
   * default applies to the fullscreen UI, where an absent value has always meant "reserve
   * nothing" and continues to.
   */
  bottomSafeAreaInset?: number;
}

/**
 * Configuration params for initializing the Octopus SDK.
 */
export interface InitializeParams {
  /** Your Octopus API key obtained from the Octopus dashboard */
  apiKey: string;
  /**
   * The connection mode determines how user authentication is handled.
   * - `sso`: Use Single Sign-On with your existing user system
   * - `octopus`: Let Octopus handle user authentication
   */
  connectionMode:
    | {
        /** SSO mode configuration */
        type: 'sso';
        /** List of user profile fields that your app manages directly */
        appManagedFields: UserProfileField[];
      }
    | {
        /** Octopus-managed authentication mode */
        type: 'octopus';
        /**
         * Base deep link used by Octopus-managed flows that need to redirect back into
         * your app (currently: the magic-link confirmation screen sent by email). Register
         * the resulting URL in your app's manifest / `Info.plist` so the OS routes it back
         * to your app.
         *
         * **The value the backend actually receives differs by platform** — this is not
         * just a mechanism difference, the URL shape itself changes:
         * - iOS passes this string to the backend verbatim.
         * - Android treats it as a *base path* and appends a trailing `/` plus the
         *   magic-link confirmation sub-path, so the backend receives
         *   `<deepLink>/<confirmation-path>`, not `<deepLink>` itself.
         *
         * Omit it to keep the native default (no app redirect is embedded in the
         * generated link).
         */
        deepLink?: string;
      };
  /** Optional theme customization for the Octopus UI */
  theme?: OctopusTheme;
  /** Optional UI customization for layout-related tweaks */
  ui?: OctopusUIOptions;
  /** Optional main-feed navigation bar (TopAppBar) customization. */
  topAppBar?: OctopusTopAppBar;
  /**
   * Optional custom server endpoint the SDK routes its gRPC traffic to. Omit it to use
   * the Octopus default endpoint. See {@link ApiServer} for the validation rules — an
   * invalid value rejects this call with a native error.
   */
  apiServer?: ApiServer;
}

/**
 * Initializes the Octopus SDK with the provided configuration.
 *
 * This function must be called before using any other Octopus SDK features. It sets up the SDK
 * with your API key, connection mode (SSO or Octopus-managed authentication), and optional theme
 * and UI options. For SSO, you also need to set up a token provider with `useUserTokenProvider` or
 * `addUserTokenRequestListener` before calling `connectUser`.
 *
 * @param params - See {@link InitializeParams} (including `theme`, `ui`, `topAppBar`). For theming guide see the main README.
 * @see {@link connectUser} – connect a user after initialization (SSO mode).
 *
 * @example
 * ```typescript
 * await initialize({
 *   apiKey: 'your-api-key',
 *   connectionMode: { type: 'sso', appManagedFields: ['username', 'profilePicture'] }
 * });
 * await initialize({
 *   apiKey: 'your-api-key',
 *   connectionMode: { type: 'octopus' }
 * });
 * ```
 */
export function initialize(params: InitializeParams): Promise<void> {
  // A text title and a theme logo are alternatives on the main feed. iOS shows
  // the text, but Android's home screen gives the theme logo precedence and
  // hides the text title. Warn so the divergence is caught at dev time.
  if (
    params.topAppBar?.title?.type === 'text' &&
    params.theme?.logo?.image != null
  ) {
    log(
      LogLevel.WARN,
      "topAppBar.title is 'text' but a theme.logo is set: Android shows the logo " +
        'and hides the text title on the main feed (iOS shows the text). Use ' +
        'either a logo or a text title for consistent behavior.'
    );
  }

  // Rewrite every color to the one hex shape both bridges parse, and warn for the
  // unparseable ones: each bridge falls back to the native default on its own and has
  // no way to report that back to JS.
  const themeWithCanonicalColors = normalizeThemeColors(params.theme);

  // Automatically detect the current color scheme and add it to the params
  const colorScheme = Appearance.getColorScheme();

  // Pre-process font configuration to avoid duplication in native layers
  const processedTheme = themeWithCanonicalColors
    ? {
        ...themeWithCanonicalColors,
        fonts: themeWithCanonicalColors.fonts
          ? {
              ...themeWithCanonicalColors.fonts,
              parsedConfig: parseFontConfig(themeWithCanonicalColors.fonts),
            }
          : undefined,
      }
    : undefined;

  const paramsWithColorScheme = {
    ...params,
    theme: processedTheme,
    // A force set through setThemeMode() before initialize() is the scheme the native side
    // must start from — the Android theme config is built from this value, and a system value
    // here would overwrite the force one native call after it was pushed.
    colorScheme:
      colorSchemeManager.getForcedColorScheme() ?? (colorScheme || undefined),
  };

  // Set the theme in the color scheme manager for dual-mode support
  colorSchemeManager.setTheme(processedTheme || null);

  // Start listening to color scheme changes for automatic updates
  colorSchemeManager.startListening();

  // Start tracking the reactive state channels (profile, groups, connection state, initialization)
  // before handing over to the native side, so a value published *during* initialization is
  // captured rather than missed. This is the counterpart of the Flutter wrapper calling
  // `_initializeEventChannel()` on entry to `initialize()`.
  attachStateChannels();

  return OctopusReactNativeSdk.initialize(paramsWithColorScheme).then(() => {
    // Re-push an active setThemeMode() force now that the native side exists (iOS holds the
    // override outside of initialize; a re-initialize() rebuilt the Android config).
    colorSchemeManager.pushForcedColorScheme();
    // Parity wave — lifecycle: client-side, optimistic mirror consumed synchronously by
    // `isInitialised()` — see `internals/initialisationState.ts`.
    setIsInitialised(true);
    // Parity wave — state streams: Flutter sets `_lastIsInitialised = true` right after its own
    // await, without waiting for the native event. Do the same: the native sides disagree on
    // whether `isInitialisedChanged(true)` reaches JS before or after this promise resolves, and
    // publishing here makes the `addIsInitialisedListener` channel deterministic on both. A
    // native event carrying the same value is collapsed as a duplicate.
    publishIsInitialised(true);
  });
}
