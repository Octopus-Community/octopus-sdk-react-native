package com.octopuscommunity.octopusreactnativesdk

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.luminance

/**
 * Relative luminance at which white and black foregrounds reach the same WCAG contrast
 * ratio: `(1 + 0.05) / (L + 0.05) == (L + 0.05) / (0 + 0.05)` gives `L = sqrt(0.0525) - 0.05`.
 * Below it white icons contrast better, at or above it black ones do.
 */
internal const val WCAG_CROSSOVER = 0.1791f

/**
 * Whether the system-bar icons drawn over [barColor] should be light (white).
 *
 * `luminance()` ignores alpha, so a translucent bar colour is first composited over
 * [under] — the opaque surface the bar is actually drawn on — and the icon choice is made
 * on what the user sees. An opaque [barColor] is measured as is.
 */
internal fun prefersLightIcons(barColor: Color, under: Color = Color.Black): Boolean =
  opaqueOver(barColor, under).luminance() < WCAG_CROSSOVER

/** [color] as seen over [under]: unchanged when opaque, alpha-composited otherwise. */
internal fun opaqueOver(color: Color, under: Color): Color =
  if (color.alpha >= 1f) color else color.compositeOver(under.copy(alpha = 1f))
