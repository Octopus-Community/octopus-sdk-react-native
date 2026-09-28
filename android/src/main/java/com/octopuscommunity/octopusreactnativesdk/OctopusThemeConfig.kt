package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap

data class OctopusTextStyleConfig(
  val fontType: String?, // "serif", "monospace", or "default"
  val fontSize: Double? // Font size in points
)

data class OctopusFontsConfig(
  val textStyles: Map<String, OctopusTextStyleConfig>?,
  /**
   * Theme-wide custom font family: the name of a font resource shipped by the host app
   * under `res/font/`, resolved by name at render time. Null keeps the SDK's own font.
   */
  val fontFamily: String? = null,
  /**
   * Theme-wide font weight on the 100-900 scale (already validated by the TypeScript
   * layer). Null keeps the SDK's own weight.
   */
  val fontWeight: Int? = null
)

/**
 * One mode's colors out of a dual-mode `theme.colors.{light,dark}` set, kept raw so the
 * selection can be redone every time the effective mode changes — see
 * [OctopusThemeConfig.resolvedFor].
 */
data class OctopusModeColors(
  val primary: String?,
  val primaryLowContrast: String?,
  val primaryHighContrast: String?,
  val onPrimary: String?,
  val link: String?,
  val background: String?,
  val grays: OctopusGrayRamp = OctopusGrayRamp.NONE
)

/**
 * The optional `gray100` / `gray200` / `gray300` / `gray700` overrides of the native gray
 * ramp. Each null slot keeps the native default. Unlike `link` and `background`, a dual-mode
 * theme never borrows these from the other mode: the ramp is tuned per appearance.
 */
data class OctopusGrayRamp(
  val gray100: String? = null,
  val gray200: String? = null,
  val gray300: String? = null,
  val gray700: String? = null
) {
  val isEmpty: Boolean
    get() = gray100 == null && gray200 == null && gray300 == null && gray700 == null

  companion object {
    val NONE = OctopusGrayRamp()
  }
}

data class OctopusThemeConfig(
  val primaryColor: String?,
  val primaryLowContrastColor: String?,
  val primaryHighContrastColor: String?,
  val onPrimaryColor: String?,
  /** Color of links (URLs rendered in posts and comments). Null keeps the native default. */
  val linkColor: String?,
  /** Background color of the community screens. Null keeps the native default. */
  val backgroundColor: String?,
  val logoSource: ReadableMap?,
  val colorScheme: String?, // "light" or "dark"
  val fonts: OctopusFontsConfig?,
  /**
   * Raw light / dark sets of a dual-mode theme, both non-null or both null. The flat color
   * slots above hold the set selected at `initialize()` for the scheme known then; a render
   * calls [resolvedFor] to re-select for the mode in effect *now*.
   */
  val lightColors: OctopusModeColors? = null,
  val darkColors: OctopusModeColors? = null,
  /** Gray-ramp overrides for the selected mode; [OctopusGrayRamp.NONE] keeps every default. */
  val grays: OctopusGrayRamp = OctopusGrayRamp.NONE,
  /**
   * `theme.icons` overrides as the TypeScript layer flattened them: iOS dotted slot path
   * (`content.post.commentCount`, `common.radio.on`, ...) to image URI. Null keeps the
   * native icon set untouched; `OctopusIconOverrides.kt` maps each path onto the Android
   * `OctopusIcons` field.
   */
  val iconSources: Map<String, String>? = null
) {
  /**
   * This config with its flat color slots re-selected for [isDark]. Only a dual-mode theme
   * changes: a single-mode theme has no other set to pick from and is returned as is.
   * Called at render time by `OctopusContent`, so a `setThemeMode()` or a system appearance
   * change after `initialize()` re-selects the matching set instead of keeping the one chosen
   * once at init — which left the light `primaryLow` behind unread notifications in dark
   * mode (rn#215). Same fallback as at init: `link` and `background` given for one mode only
   * apply to both; the gray ramp never crosses modes.
   */
  fun resolvedFor(isDark: Boolean): OctopusThemeConfig {
    val light = lightColors ?: return this
    val dark = darkColors ?: return this
    val selected = if (isDark) dark else light
    val other = if (isDark) light else dark
    return copy(
      primaryColor = selected.primary,
      primaryLowContrastColor = selected.primaryLowContrast,
      primaryHighContrastColor = selected.primaryHighContrast,
      onPrimaryColor = selected.onPrimary,
      linkColor = selected.link ?: other.link,
      backgroundColor = selected.background ?: other.background,
      grays = selected.grays
    )
  }

  companion object {
    /** A config carrying no customization at all — the base for a `colorScheme`-only update. */
    val EMPTY = OctopusThemeConfig(
      primaryColor = null,
      primaryLowContrastColor = null,
      primaryHighContrastColor = null,
      onPrimaryColor = null,
      linkColor = null,
      backgroundColor = null,
      logoSource = null,
      colorScheme = null,
      fonts = null
    )
  }
}
