package com.octopuscommunity.octopusreactnativesdk

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.octopuscommunity.sdk.ui.OctopusImages

/** Merge only the requested title properties, preserving size, weight and all other base attributes. */
internal fun resolveNavBarTitleStyle(
  base: TextStyle,
  config: OctopusNavBarTitleConfig?,
  resolvedFamily: FontFamily?
): TextStyle {
  if (config == null) return base
  val size = config.fontSize?.takeIf { it.isFinite() && it > 0 }?.sp ?: TextUnit.Unspecified
  return base.merge(TextStyle(fontFamily = resolvedFamily, fontSize = size))
}

/**
 * The home's native `titleText`: an empty title counts as absent, as on iOS (`!text.isEmpty`).
 * Native 1.16 lets any non-null title, even "", win over the logo and then draws nothing.
 */
internal fun homeTitleText(title: String?): String? = title?.takeIf { it.isNotEmpty() }

/** Match the iOS bridge: a non-empty explicit text title wins over the home logo. */
internal fun homeImagesForTitle(images: OctopusImages, title: String?): OctopusImages =
  if (!title.isNullOrEmpty()) images.copy(logo = null) else images
