package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.BridgeReactContext
import com.octopuscommunity.sdk.domain.model.ConnectionMode
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class OctopusSDKInitializerTest {
  private val initializer = OctopusSDKInitializer()
  private val removedMessage =
    "Octopus-owned authentication was removed. SSO is required (connectionMode.type must be 'sso')."

  @Test
  fun `explicit SSO keeps the native empty managed fields default`() {
    val mode = initializer.parseConnectionMode(
      JavaOnlyMap.of("connectionMode", JavaOnlyMap.of("type", "sso"))
    ) as ConnectionMode.SSO
    assertEquals(emptySet<Any>(), mode.appManagedFields)
  }

  @Test
  fun `removed unknown missing and malformed modes reject instead of falling back`() {
    for (mode in listOf("octopus", "unknown", null, 42)) {
      val options = JavaOnlyMap.of("connectionMode", JavaOnlyMap.of("type", mode))
      val error = assertThrows(Exception::class.java) {
        initializer.parseConnectionMode(options)
      }
      assertEquals(removedMessage, error.message)
    }
  }

  @Test
  fun `initialization rejects legacy and unknown modes through the promise before SDK setup`() {
    for (mode in listOf("octopus", "unknown", null, 42)) {
      val calls = mutableListOf<Pair<String, List<Any?>>>()
      val promise = Proxy.newProxyInstance(
        Promise::class.java.classLoader,
        arrayOf(Promise::class.java)
      ) { _, method, args ->
        calls += method.name to (args?.toList() ?: emptyList())
        null
      } as Promise
      val initialized = initializer.initialize(
        BridgeReactContext(RuntimeEnvironment.getApplication()),
        JavaOnlyMap.of("apiKey", "test-key", "connectionMode", JavaOnlyMap.of("type", mode)),
        promise
      )
      assertFalse(initialized)
      assertEquals(1, calls.size)
      assertEquals("reject", calls.single().first)
      assertEquals("INITIALIZE_ERROR", calls.single().second[0])
      assertEquals(removedMessage, calls.single().second[1])
    }
  }
}
