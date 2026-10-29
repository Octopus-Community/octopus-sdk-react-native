package com.octopuscommunity.octopusreactnativesdk

import android.content.BroadcastReceiver
import android.content.Context
import android.os.Build
import android.os.Looper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.Promise
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode
import org.robolectric.util.ReflectionHelpers

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [32, 34])
@LooperMode(LooperMode.Mode.PAUSED)
class OctopusUIControllerCloseUITest {
  private fun promise(onResolve: (Any?) -> Unit): Promise = Proxy.newProxyInstance(
    Promise::class.java.classLoader,
    arrayOf(Promise::class.java)
  ) { _, method, args ->
    when (method.name) {
      "resolve" -> onResolve(args?.single())
      "reject" -> fail("closeUI unexpectedly rejected: ${args?.toList()}")
    }
    null
  } as Promise

  @Test
  fun `close broadcasts before resolving then the real receiver finishes the activity`() {
    val application = RuntimeEnvironment.getApplication()
    val broadcasts = shadowOf(application)
    val before = broadcasts.broadcastIntents.size
    val controller = OctopusUIController(BridgeReactContext(application))
    // buildActivity attaches the real Activity. Avoid onCreate's SDK initialization guard
    // and Compose content: register only its production receiver, without a key or SDK setup.
    val activity = Robolectric.buildActivity(OctopusActivity::class.java).get()
    // Below API 33, ContextCompat guards a non-exported receiver with this signature
    // permission. The app manifest grants it through androidx.core; Config.NONE does not.
    broadcasts.grantPermissions(notExportedPermission(application))
    ReflectionHelpers.callInstanceMethod<Void>(activity, "registerCloseUIReceiver")
    try {
      assertCloseReceiverNotExported(application)
      assertFalse(activity.isFinishing)
      var resolutions = 0
      controller.closeUI(promise { value ->
        resolutions += 1
        assertNull(value)
        // Inspect at resolution time: moving resolve before sendBroadcast must fail here.
        val intent = broadcasts.broadcastIntents.drop(before).single()
        assertEquals(OctopusUIController.CLOSE_UI_ACTION, intent.action)
        assertEquals(application.packageName, intent.`package`)
        assertFalse(activity.isFinishing)
        assertFalse(activity.isDestroyed)
      })
      assertEquals(1, resolutions)
      assertFalse(activity.isFinishing)

      shadowOf(Looper.getMainLooper()).idle()
      // Exercise delivery through the real registration and receiver, rather than invoking
      // onReceive directly. Removing finish() must fail this assertion.
      assertTrue(activity.isFinishing)
      assertFalse(activity.isDestroyed)
      assertEquals(1, resolutions)
      assertEquals(1, broadcasts.broadcastIntents.size - before)
    } finally {
      activity.unregisterReceiver(
        ReflectionHelpers.getField<BroadcastReceiver>(activity, "closeUIReceiver")
      )
    }
  }

  private fun notExportedPermission(context: Context) =
    "${context.packageName}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"

  // Going back to an exported registerReceiver call must fail here at both API levels.
  private fun assertCloseReceiverNotExported(context: Context) {
    val registration = shadowOf(RuntimeEnvironment.getApplication()).registeredReceivers
      .single { it.intentFilter.hasAction(OctopusUIController.CLOSE_UI_ACTION) }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      assertTrue(registration.flags and Context.RECEIVER_NOT_EXPORTED != 0)
    } else {
      assertEquals(notExportedPermission(context), registration.broadcastPermission)
    }
  }

  @Test
  fun `close resolves immediately after broadcasting even when no UI is open`() {
    val application = RuntimeEnvironment.getApplication()
    val broadcasts = shadowOf(application)
    val before = broadcasts.broadcastIntents.size
    var resolutions = 0
    OctopusUIController(BridgeReactContext(application)).closeUI(promise { value ->
      resolutions += 1
      assertNull(value)
      val intent = broadcasts.broadcastIntents.drop(before).single()
      assertEquals(OctopusUIController.CLOSE_UI_ACTION, intent.action)
      assertEquals(application.packageName, intent.`package`)
    })
    // No looper drain or Activity callback is needed to settle the promise.
    assertEquals(1, resolutions)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals(1, resolutions)
    assertEquals(1, broadcasts.broadcastIntents.size - before)
  }
}
