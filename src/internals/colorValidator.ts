import { log } from './logger';
import { LogLevel } from '../enums/LogLevel.enum';
import type { OctopusColorSet, OctopusTheme } from '../initialize';

/**
 * Every hex-color key of {@link OctopusColorSet}. Adding a color to that interface
 * without adding it here leaves the new key unnormalized, i.e. forwarded raw.
 */
const COLOR_KEYS: readonly (keyof OctopusColorSet)[] = [
  'primary',
  'primaryLowContrast',
  'primaryHighContrast',
  'onPrimary',
  'link',
  'background',
];

/**
 * The hex forms accepted from the host: 3, 6 or 8 digits, with or without the leading
 * `#`. An 8-digit value is read as `AARRGGBB` — alpha first, the order both natives
 * use — not the `RRGGBBAA` of CSS.
 */
const HEX_COLOR = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Rewrites an accepted hex form into the one shape both bridges parse: `#RRGGBB`, or
 * `#AARRGGBB` when the input carries alpha.
 *
 * This is not cosmetic. iOS (`OctopusColorUtility`) accepts all six forms, but Android
 * validates with `Color.parseColor` and applies with `String.toColorInt()`, both of
 * which require a leading `#` and a length of exactly 7 or 9 — so `'1D9BD1'` and
 * `'#F63'` would be honored on iOS and dropped on Android. Canonicalizing here is what
 * makes one input mean one color on both platforms.
 *
 * @param value an already-validated hex string (see {@link HEX_COLOR}).
 */
function canonicalizeHex(value: string): string {
  const digits = value.trim().replace(/^#/, '').toUpperCase();
  if (digits.length === 3) {
    // #RGB is shorthand for #RRGGBB: each digit is doubled, never zero-padded.
    return `#${digits.replace(/./g, (digit) => digit + digit)}`;
  }
  return `#${digits}`;
}

/**
 * Returns `set` with every valid color canonicalized, warning for the invalid ones.
 *
 * Invalid values are forwarded untouched rather than stripped: each bridge already
 * drops what it cannot parse, and removing the key here would also silently disable
 * the Android-only named colors (`'red'`) that `Color.parseColor` still accepts.
 */
function normalizeColorSet<T extends OctopusColorSet>(set: T, path: string): T {
  let normalized: T | undefined;
  for (const key of COLOR_KEYS) {
    const value: unknown = set[key];
    if (value == null) {
      continue;
    }
    if (typeof value !== 'string' || !HEX_COLOR.test(value.trim())) {
      log(
        LogLevel.WARN,
        `theme.${path}.${key} is not a valid hex color (received ${JSON.stringify(
          value
        )}): it is dropped and the SDK default applies. Expected 3, 6 or 8 hex ` +
          "digits, e.g. '#FF6B35', 'FF6B35' or '#F63' (8 digits are read as " +
          'AARRGGBB, alpha first).'
      );
      continue;
    }
    const canonical = canonicalizeHex(value);
    if (canonical !== value) {
      normalized = normalized ?? { ...set };
      normalized[key] = canonical as T[keyof OctopusColorSet];
    }
  }
  return normalized ?? set;
}

/**
 * Canonicalizes every color of a theme to the single hex shape both bridges parse, and
 * warns at init for every value that is not a parseable hex string.
 *
 * Both bridges fall back to the native default on an unparseable color and neither can
 * report back to JS, so this is the only place an invalid value can be surfaced.
 *
 * @returns the same theme object when nothing had to be rewritten, a shallow copy
 * otherwise — the caller's object is never mutated.
 */
export function normalizeThemeColors(
  theme: OctopusTheme | undefined
): OctopusTheme | undefined {
  const colors = theme?.colors;
  if (theme == null || colors == null) {
    return theme;
  }
  const dual = colors as { light?: OctopusColorSet; dark?: OctopusColorSet };
  // Both bridges treat a `colors` map as dual-mode only when it carries *both* sides;
  // anything else is read as a single color set.
  if (dual.light != null && dual.dark != null) {
    const light = normalizeColorSet(dual.light, 'colors.light');
    const dark = normalizeColorSet(dual.dark, 'colors.dark');
    if (light === dual.light && dark === dual.dark) {
      return theme;
    }
    return { ...theme, colors: { ...dual, light, dark } };
  }
  const single = normalizeColorSet(colors as OctopusColorSet, 'colors');
  return single === colors ? theme : { ...theme, colors: single };
}
