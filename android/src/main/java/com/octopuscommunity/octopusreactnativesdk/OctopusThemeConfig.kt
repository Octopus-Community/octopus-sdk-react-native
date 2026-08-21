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
  val fonts: OctopusFontsConfig?
)
