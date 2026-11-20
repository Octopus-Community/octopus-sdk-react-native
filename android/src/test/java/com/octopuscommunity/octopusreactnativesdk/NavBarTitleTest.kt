package com.octopuscommunity.octopusreactnativesdk

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.facebook.react.bridge.JavaOnlyMap
import com.octopuscommunity.sdk.ui.OctopusImagesDefaults
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLog

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class NavBarTitleTest {
  private val ambient = TextStyle(
    fontFamily = FontFamily.SansSerif, fontSize = 22.sp,
    fontWeight = FontWeight.Medium, letterSpacing = 0.5.sp, textAlign = TextAlign.Center
  )

  @Test
  fun `unset keeps the exact original style`() {
    assertSame(ambient, resolveNavBarTitleStyle(ambient, null, null))
  }

  @Test
  fun `size only preserves the ambient title font and other attributes`() {
    assertEquals(
      ambient.copy(fontSize = 25.sp),
      resolveNavBarTitleStyle(ambient, OctopusNavBarTitleConfig(fontSize = 25.0), null)
    )
  }

  @Test
  fun `font only keeps the bar size instead of falling back to body text`() {
    assertEquals(
      ambient.copy(fontFamily = FontFamily.Serif),
      resolveNavBarTitleStyle(ambient, OctopusNavBarTitleConfig(fontFamily = "title"), FontFamily.Serif)
    )
  }

  @Test
  fun `family and size both override the bar`() {
    assertEquals(
      ambient.copy(fontFamily = FontFamily.Monospace, fontSize = 27.sp),
      resolveNavBarTitleStyle(ambient, OctopusNavBarTitleConfig("title", 27.0), FontFamily.Monospace)
    )
  }

  @Test
  fun `unresolved resource warns keeps base family and still applies size`() {
    val context = RuntimeEnvironment.getApplication()
    ShadowLog.clear()
    val family = resolveFontFamily("missing_title_font", context, "theme.fonts.navBarTitle.fontFamily")
    assertNull(family)
    assertTrue(ShadowLog.getLogsForTag("OctopusContent").any {
      it.type == android.util.Log.WARN && it.msg.contains("theme.fonts.navBarTitle.fontFamily")
    })
    assertEquals(
      ambient.copy(fontSize = 24.sp),
      resolveNavBarTitleStyle(ambient, OctopusNavBarTitleConfig("missing_title_font", 24.0), family)
    )
  }

  @Test
  fun `title override wins over global family and body size while keeping global weight`() {
    val global = ambient.copy(fontFamily = FontFamily.Serif, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    assertEquals(
      global.copy(fontFamily = FontFamily.Monospace, fontSize = 26.sp),
      resolveNavBarTitleStyle(global, OctopusNavBarTitleConfig("title", 26.0), FontFamily.Monospace)
    )
    assertEquals(
      global.copy(fontSize = 26.sp),
      resolveNavBarTitleStyle(global, OctopusNavBarTitleConfig(fontSize = 26.0), null)
    )
    assertEquals(
      global.copy(fontFamily = FontFamily.Monospace),
      resolveNavBarTitleStyle(global, OctopusNavBarTitleConfig("title"), FontFamily.Monospace)
    )
  }

  @Test
  fun `non-positive and non-finite sizes keep the current title size`() {
    for (size in listOf(0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY)) {
      assertEquals(ambient, resolveNavBarTitleStyle(ambient, OctopusNavBarTitleConfig(fontSize = size), null))
    }
  }

  private fun parse(title: JavaOnlyMap, globals: JavaOnlyMap = JavaOnlyMap()): OctopusFontsConfig? {
    globals.putMap("textStyles", JavaOnlyMap())
    globals.putMap("navBarTitle", title)
    return OctopusSDKInitializer().parseThemeConfig(JavaOnlyMap.of(
      "theme", JavaOnlyMap.of("fonts", JavaOnlyMap.of("parsedConfig", globals))
    ))?.fonts
  }

  @Test
  fun `bridge retains a title-only config and keeps global options separate`() {
    assertEquals(OctopusNavBarTitleConfig("title", 24.0), parse(JavaOnlyMap.of(
      "fontFamily", "title", "fontSize", 24.0
    ))?.navBarTitle)
    val config = parse(JavaOnlyMap.of("fontSize", 23.0), JavaOnlyMap.of(
      "fontFamily", "global", "fontWeight", 700
    ))!!
    assertEquals("global", config.fontFamily)
    assertEquals(700, config.fontWeight)
    assertEquals(OctopusNavBarTitleConfig(fontSize = 23.0), config.navBarTitle)
    assertTrue(config.textStyles!!.isEmpty())
  }

  @Test
  fun `bridge ignores empty title overrides and invalid sizes`() {
    assertNull(parse(JavaOnlyMap()))
    for (size in listOf(0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY)) {
      assertNull(parse(JavaOnlyMap.of("fontSize", size)))
    }
  }

  @Test
  fun `home explicit text beats logo while absent or empty title preserves logo and icons`() {
    val images = OctopusImagesDefaults.images(logo = { ColorPainter(Color.Red) })
    val withText = homeImagesForTitle(images, "Community")
    assertNull(withText.logo)
    assertSame(images.icons, withText.icons)
    assertSame(images, homeImagesForTitle(images, null))
    assertSame(images, homeImagesForTitle(images, ""))
    assertNotNull(images.logo)
  }

  @Test
  fun `an empty home title is passed to the native screen as absent`() {
    assertNull(homeTitleText(""))
    assertNull(homeTitleText(null))
    assertEquals("Community", homeTitleText("Community"))
  }
}
