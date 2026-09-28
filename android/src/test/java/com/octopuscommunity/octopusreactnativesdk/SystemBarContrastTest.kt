package com.octopuscommunity.octopusreactnativesdk

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.sqrt

class SystemBarContrastTest {

  @Test
  fun crossoverIsWhereWhiteAndBlackContrastEqually() {
    assertEquals((sqrt(1.05 * 0.05) - 0.05).toFloat(), WCAG_CROSSOVER, 0.0001f)
  }

  @Test
  fun darkNavyGetsLightIcons() {
    assertTrue(prefersLightIcons(Color(0xFF070D17)))
  }

  @Test
  fun greysEitherSideOfTheCrossoverSplit() {
    // #757575 and #767676 bracket the crossover: they are the last grey where white icons
    // still contrast better and the first where black ones do.
    assertTrue(Color(0xFF757575).luminance() < WCAG_CROSSOVER)
    assertTrue(prefersLightIcons(Color(0xFF757575)))
    assertTrue(Color(0xFF767676).luminance() >= WCAG_CROSSOVER)
    assertFalse(prefersLightIcons(Color(0xFF767676)))
  }

  @Test
  fun whiteGetsDarkIcons() {
    assertFalse(prefersLightIcons(Color(0xFFFFFFFF)))
  }

  @Test
  fun translucentColourIsMeasuredOverWhatIsUnderIt() {
    // A 10 %-alpha black over white is near-white on screen: dark icons, although the raw
    // colour (alpha ignored) is black.
    val faintBlack = Color(0x1A000000)
    assertFalse(prefersLightIcons(faintBlack, under = Color.White))
    // The same colour over black stays black.
    assertTrue(prefersLightIcons(faintBlack, under = Color.Black))
  }

  @Test
  fun opaqueColourIgnoresWhatIsUnderIt() {
    assertEquals(Color(0xFF123456), opaqueOver(Color(0xFF123456), Color.White))
  }
}
