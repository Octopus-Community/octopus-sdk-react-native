/**
 * Theme-related types used by the example app for Octopus SDK configuration.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
/**
 * Which colour set is handed to `initialize()`.
 *
 * `octopusNavy` is the preset the Config screen offers next to `none`: the sample's own navy,
 * applied to the SDK so a tester can see a themed community without walking into the Theme
 * scenario. `theme1`–`theme3` stay the scenario's own arbitrary sets, which exist to prove the
 * SDK repaints at all rather than to look like anything.
 */
export type ThemeSet = 'octopusNavy' | 'theme1' | 'theme2' | 'theme3' | 'none';
export type FontType = 'default' | 'serif' | 'monospace';
export type LogoMode = 'enabled' | 'disabled';
export type FontSizeMode = 'default' | 'small' | 'large';
/**
 * Link (URL) and community background colors: native defaults, or the example's custom
 * pair. `custom` applies on its own when no color set is selected, which exercises a
 * theme carrying neither `primary` nor a logo.
 */
export type LinkBackgroundMode = 'default' | 'custom';
/**
 * Theme-wide font override: the native default, a bold weight alone, or a custom family
 * plus that weight.
 *
 * `weight` needs no native font registration and therefore behaves identically on both
 * platforms. `family` does need one, and this example deliberately ships no font file:
 * {@link EXAMPLE_FONT_FAMILY} resolves on iOS (it is a PostScript name iOS registers
 * itself) and does not on Android, where it exercises the documented
 * "not found under res/font/, keeping the default SDK font" warning instead.
 */
export type FontOverrideMode = 'default' | 'weight' | 'family';

/**
 * A font family name for the `family` override above. Registered by iOS itself, so it
 * needs no `UIAppFonts` entry; on Android it has no `res/font/` counterpart in this
 * example — see {@link FontOverrideMode}.
 */
export const EXAMPLE_FONT_FAMILY = 'Georgia';

/** The weight both non-default overrides apply, on the 100-900 scale. */
export const EXAMPLE_FONT_WEIGHT = 700;

/**
 * Bottom safe area inset preset: `unset` (omit `ui.bottomSafeAreaInset` entirely — the
 * default, and the only preset that exercises the Android mount-point resolution), an explicit
 * `0` (opt back out of that resolution), or a total of 20pt or 70pt.
 *
 * The two numeric presets bracket the system bottom safe area of a device that has one
 * (~34pt on a home-indicator iPhone), which is what makes the iOS normalization visible on an
 * embedded view: `20` lands below it, so the band is the safe area alone, and `70` lands
 * above it, so the band is exactly 70.
 */
export type BottomInsetPreset = 'unset' | 'none' | '20' | '70';

/**
 * Numeric value for each preset that has one. `unset` deliberately has none: App.tsx omits
 * the `ui.bottomSafeAreaInset` key entirely for it rather than passing `0`, since on Android
 * an absent key and an explicit `0` are no longer equivalent (see OctopusContent.kt).
 */
export const BOTTOM_INSET_VALUES: Record<
  Exclude<BottomInsetPreset, 'unset'>,
  number
> = {
  'none': 0,
  '20': 20,
  '70': 70,
};
