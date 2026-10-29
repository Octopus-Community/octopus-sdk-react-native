package com.octopuscommunity.octopusreactnativesdk

import org.junit.Assert.assertEquals
import org.junit.Test

class FontNameForLogTest {
  @Test
  fun `a resource name is logged so the integrator can spot a typo`() {
    assertEquals("'my_brand_font'", fontNameForLog("my_brand_font"))
  }

  @Test
  fun `anything that is not a resource name is redacted`() {
    listOf(
      "https://cdn.example.com/fonts/brand.ttf?token=secret",
      "/data/user/0/app/files/brand.ttf",
      "Brand-Font.ttf",
      "assets/fonts/brand",
      "1font",
    ).forEach { assertEquals(it, "[redacted]", fontNameForLog(it)) }
  }
}
