import type { OctopusFonts } from '../initialize';
import { log } from './logger';
import { LogLevel } from '../enums/LogLevel.enum';

/**
 * Parsed font configuration for native platforms
 */
export interface ParsedFontConfig {
  textStyles: Record<
    string,
    {
      fontType?: string;
      fontSize?: number;
    }
  >;
  /**
   * Theme-wide custom font family, forwarded verbatim: it names a *native*
   * resource (an Android `res/font/` name, an iOS PostScript name) that only the
   * native side can resolve.
   */
  fontFamily?: string;
  /** Theme-wide font weight on the 100-900 scale, already validated. */
  fontWeight?: number;
}

/** The lowest and highest weights of the CSS / Android `FontWeight` scale. */
const MIN_FONT_WEIGHT = 100;
const MAX_FONT_WEIGHT = 900;

/**
 * The text style keys that are supported.
 *
 * `navBarItem` is iOS-only: the native iOS theme has a dedicated nav-bar-item
 * font slot, the native Android typography has no counterpart, so the Android
 * bridge never reads that key.
 */
const SUPPORTED_TEXT_STYLES = [
  'title1',
  'title2',
  'body1',
  'body2',
  'caption1',
  'caption2',
  'navBarItem',
];

/**
 * Validates the theme-wide font weight.
 *
 * Both bridges would otherwise have to guess: Android's `FontWeight(Int)` throws
 * outside 100-900, and iOS buckets to a named `Font.Weight`, so an out-of-range
 * value has no meaning either side could agree on. Rejecting here — the one place
 * that can still report back to JS — keeps the two natives consistent.
 */
function validateFontWeight(fontWeight: unknown): number | undefined {
  if (fontWeight == null) {
    return undefined;
  }
  if (
    typeof fontWeight !== 'number' ||
    !Number.isInteger(fontWeight) ||
    fontWeight < MIN_FONT_WEIGHT ||
    fontWeight > MAX_FONT_WEIGHT
  ) {
    log(
      LogLevel.WARN,
      `theme.fonts.fontWeight must be a whole number within ` +
        `${MIN_FONT_WEIGHT}-${MAX_FONT_WEIGHT} (received ${JSON.stringify(
          fontWeight
        )}): it is dropped and the native default weight applies. The scale is ` +
        `the CSS one — 400 is regular, 700 is bold.`
    );
    return undefined;
  }
  return fontWeight;
}

/**
 * Warns when a theme-wide `fontFamily` supersedes per-style `fontType` values.
 *
 * The two are not competing mechanisms — `fontFamily` names an arbitrary
 * registered family for the whole theme, `fontType` picks one of three system
 * designs for one style — but a host setting both cannot see from JS which one
 * won, so name the superseded styles once at init.
 */
function warnOnSupersededFontTypes(
  fontFamily: string,
  textStyles: Record<string, { fontType?: string; fontSize?: number }>
): void {
  const superseded = Object.keys(textStyles).filter(
    (key) => textStyles[key]?.fontType != null
  );
  if (superseded.length === 0) {
    return;
  }
  log(
    LogLevel.WARN,
    `theme.fonts.fontFamily ('${fontFamily}') takes precedence over the ` +
      `fontType of ${superseded.join(', ')}: those fontType values apply only ` +
      `as a fallback, if '${fontFamily}' does not resolve to a font registered ` +
      `natively by the host app.`
  );
}

/**
 * Parse font configuration from the theme and return a simplified structure
 * that can be easily consumed by native platforms.
 *
 * This centralizes the font parsing logic to avoid duplication across platforms.
 */
export function parseFontConfig(fonts?: OctopusFonts): ParsedFontConfig | null {
  if (!fonts) {
    return null;
  }

  const textStyles: Record<string, { fontType?: string; fontSize?: number }> =
    {};

  for (const key of SUPPORTED_TEXT_STYLES) {
    const textStyle = fonts.textStyles?.[key as keyof typeof fonts.textStyles];
    if (textStyle) {
      const parsedStyle: { fontType?: string; fontSize?: number } = {};

      // Parse font type
      if (textStyle.fontType) {
        parsedStyle.fontType = textStyle.fontType;
      }

      // Parse font size
      if (textStyle.fontSize?.size) {
        parsedStyle.fontSize = textStyle.fontSize.size;
      }

      // Only include the style if it has at least one property
      if (parsedStyle.fontType || parsedStyle.fontSize) {
        textStyles[key] = parsedStyle;
      }
    }
  }

  // An empty family name is not an override, it is an unset value.
  const fontFamily =
    typeof fonts.fontFamily === 'string' && fonts.fontFamily.trim() !== ''
      ? fonts.fontFamily.trim()
      : undefined;
  const fontWeight = validateFontWeight(fonts.fontWeight);

  if (fontFamily != null) {
    warnOnSupersededFontTypes(fontFamily, textStyles);
  }

  // `textStyles` is always emitted, even empty: both bridges key off it to
  // recognize a pre-processed config at all, so dropping it on a theme made only
  // of `fontFamily` / `fontWeight` would discard the whole font configuration.
  if (
    Object.keys(textStyles).length === 0 &&
    fontFamily == null &&
    fontWeight == null
  ) {
    return null;
  }

  return {
    textStyles,
    ...(fontFamily != null ? { fontFamily } : {}),
    ...(fontWeight != null ? { fontWeight } : {}),
  };
}
