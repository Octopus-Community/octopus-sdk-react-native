package com.octopuscommunity.octopusreactnativesdk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLog

/** A malformed `initialScreen` folds to the main feed with a fixed warning, never the input. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class BridgeInitialScreenLogTest {
  private val tag = "BridgeInitialScreenLogTest"

  @Before
  fun clearLogs() {
    ShadowLog.clear()
  }

  @Test
  fun `an unknown type is logged without the received value`() {
    val type = "https://example.com/secret?token=abc"

    assertNull(decodeBridgeInitialScreen(type = type, tag = tag) { null })

    val logs = ShadowLog.getLogsForTag(tag)
    assertEquals(1, logs.size)
    assertEquals("Malformed initialScreen (unknown type) — opening the main feed", logs[0].msg)
    assertFalse(logs[0].msg.contains("example.com"))
  }

  @Test
  fun `a known type logs nothing`() {
    decodeBridgeInitialScreen(type = "post", tag = tag) { "post-1" }

    assertEquals(0, ShadowLog.getLogsForTag(tag).size)
  }
}
