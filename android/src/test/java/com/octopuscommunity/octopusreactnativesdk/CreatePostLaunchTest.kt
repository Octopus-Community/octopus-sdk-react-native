package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class CreatePostLaunchTest {
  @Test
  fun `create post forwards profile interception to the fullscreen configuration`() {
    for (intercept in listOf(true, false, null)) {
      var launched: Intent? = null
      val context = object : BridgeReactContext(RuntimeEnvironment.getApplication()) {
        override fun startActivity(intent: Intent) {
          launched = intent
        }
      }
      var resolutions = 0
      val promise = Proxy.newProxyInstance(
        Promise::class.java.classLoader,
        arrayOf(Promise::class.java)
      ) { _, method, args ->
        when (method.name) {
          "resolve" -> {
            resolutions++
            assertNull(args?.single())
          }
          "reject" -> fail("Create-post launch rejected: ${args?.toList()}")
        }
        null
      } as Promise
      val options = intercept?.let { JavaOnlyMap.of("interceptProfileTaps", it) }

      OctopusReactModule(context).navigateToOctopusCreatePost(options, promise)

      assertEquals(1, resolutions)
      assertNotNull(launched)
      assertEquals(OctopusActivity::class.java.name, launched!!.component?.className)
      assertEquals("createPost", launched!!.getStringExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_TYPE))
      assertEquals(
        intercept == true,
        launched!!.getBooleanExtra(OctopusActivity.EXTRA_INTERCEPT_PROFILE_TAPS, false)
      )
    }
  }
}
