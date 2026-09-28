package com.octopuscommunity.sdk.reactnative.sample

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "OctopusReactNativeSdkExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Native screens first, then JS. The embedded community (`OctopusUIView`) pops its own
   * sub-screens through callbacks on this activity's `OnBackPressedDispatcher`. Whether
   * `ReactActivity` ever asks that dispatcher depends on the DEVICE as well as the target:
   * React Native 0.81 registers its own dispatcher callback only when the device runs API 36+
   * AND the app targets 36+ (`AndroidVersion.isAtLeastTargetSdk36`, internal to RN). There,
   * the later-registered native callbacks already run before RN's, so nothing is needed.
   * Everywhere else — this sample (targetSdk 36) on any device up to API 35 — Back reaches
   * `ReactActivity.onBackPressed` directly and goes to JS first, which would pop the tab the
   * community sits in instead of the post the user is reading. In that case the dispatcher is
   * asked first here, and JS only gets the press when no native callback is enabled.
   *
   * The price of that order, below API 36: ANY native callback that stays enabled takes every
   * Back press before JS sees it — the sample's tabs, Settings pages and Scenario routes stop
   * popping. That holds whoever registers it: a future SDK root-screen `BackHandler`, a
   * third-party library, or a callback left enabled after its screen is gone. The contract this
   * relies on is that the native community root never consumes Back when the host set no
   * `onBack`. Regression check on an API 35 (or lower) device: open the Community tab, open a
   * post, press Back twice — the first press returns to the feed, the second to Home.
   */
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (!reactHandlesBackThroughDispatcher() && onBackPressedDispatcher.hasEnabledCallbacks()) {
      onBackPressedDispatcher.onBackPressed()
      return
    }
    @Suppress("DEPRECATION")
    super.onBackPressed()
  }

  /**
   * Mirrors React Native's `AndroidVersion.isAtLeastTargetSdk36` exactly: `true` when
   * `ReactActivity` routes Back through the `OnBackPressedDispatcher` itself.
   */
  private fun reactHandlesBackThroughDispatcher(): Boolean =
    Build.VERSION.SDK_INT >= RN_DISPATCHER_BACK_SDK &&
      applicationInfo.targetSdkVersion >= RN_DISPATCHER_BACK_SDK

  /**
   * What JS falls back to when nothing in the sample had a level to pop — Back on Home, or on
   * the first-launch Config screen. The default finishes the activity below Android 12 (and
   * loses the session); a host app is backgrounded instead, the way the launcher's own Back
   * leaves it, so coming back resumes exactly where the tester was.
   */
  override fun invokeDefaultOnBackPressed() {
    moveTaskToBack(true)
  }

  private companion object {
    /**
     * The SDK level that the device AND the app's targetSdk must both reach before
     * `ReactActivity` handles Back through the dispatcher (Android 16, API 36).
     */
    const val RN_DISPATCHER_BACK_SDK = 36
  }
}
