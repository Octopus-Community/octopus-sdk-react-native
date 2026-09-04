package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost

class OctopusUIController(private val reactContext: ReactApplicationContext) {

  fun openUI(options: ReadableMap?, promise: Promise) {
    // Same contract as iOS (`OPEN_UI_ERROR`, same message): a host that calls openUI() before
    // initialize() gets a rejection it can act on rather than a resolved promise and an Activity
    // that finishes itself on arrival. The guard in OctopusActivity.onCreate stays regardless —
    // it covers the task-restore path, where no promise exists to reject (issue #234).
    if (!OctopusSDK.isInitialised) {
      promise.reject("OPEN_UI_ERROR", "SDK not initialized. Call initialize() first.", null)
      return
    }
    try {
      val intent = Intent(reactContext, OctopusActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val interceptUrls = options?.hasKey("interceptUrls") == true &&
        options.getBoolean("interceptUrls")
      intent.putExtra(OctopusActivity.EXTRA_INTERCEPT_URLS, interceptUrls)
      val interceptProfileTaps = options?.hasKey("interceptProfileTaps") == true &&
        options.getBoolean("interceptProfileTaps")
      intent.putExtra(OctopusActivity.EXTRA_INTERCEPT_PROFILE_TAPS, interceptProfileTaps)

      // Parity wave — navigation & theme. `navigationMode` is iOS-only (see
      // OctopusUIViewManager.setNavigationMode) and intentionally not read here either — the
      // fullscreen path is the same Compose NavHost as the embedded one.
      val navBarLeadingAction = options?.takeIf { it.hasKey("navBarLeadingAction") }
        ?.getString("navBarLeadingAction")
      navBarLeadingAction?.let {
        intent.putExtra(OctopusActivity.EXTRA_NAV_BAR_LEADING_ACTION, it)
      }

      val linkPath = options
        ?.takeIf { it.hasKey("notification") }
        ?.getMap("notification")
        ?.takeIf { it.hasKey("linkPath") }
        ?.getString("linkPath")
      if (!linkPath.isNullOrBlank()) {
        intent.putExtra(OctopusActivity.EXTRA_LINK_PATH, linkPath)
      }

      val initialScreen = options
        ?.takeIf { it.hasKey("initialScreen") }
        ?.getMap("initialScreen")
      if (initialScreen != null) {
        if (!linkPath.isNullOrBlank()) {
          // The JS layer already enforces this precedence (it drops the initial screen with a
          // warning before calling the bridge); this is the native-side guard for symmetry with
          // iOS, so a payload carrying both can never follow two navigations.
          Log.w(
            TAG,
            "openUI: both notification and initialScreen were provided — following the " +
              "notification deep link and dropping the initial screen"
          )
        } else if (!putInitialScreenExtras(intent, initialScreen, promise)) {
          // The promise was already rejected (invalid createPost prefill).
          return
        }
      }

      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OPEN_UI_ERROR", "Failed to open Octopus UI", e)
    }
  }

  /**
   * Copies the flat `initialScreen` wire payload (produced by JS `normalizeInitialScreen`) onto
   * [intent] as [OctopusActivity] extras. A `createPost` screen rides the existing
   * `EXTRA_CREATE_POST_*` extras and is validated here — exactly like
   * `navigateToOctopusCreatePost` — so an invalid prefill rejects with the same error codes
   * instead of opening the UI.
   *
   * @return `false` when the promise has been rejected and the UI must not open.
   */
  private fun putInitialScreenExtras(
    intent: Intent,
    initialScreen: ReadableMap,
    promise: Promise
  ): Boolean {
    fun optionalString(key: String): String? =
      initialScreen.takeIf { it.hasKey(key) }?.getString(key)

    val type = optionalString("type")
    if (type == "createPost") {
      val text = optionalString("text")
      val imageUri = optionalString("imageUri")
      val topicId = optionalString("topicId")
      val ctaUrl = optionalString("ctaUrl")
      val ctaLabel = optionalString("ctaLabel")
      val hasPrefill = text != null || imageUri != null || topicId != null ||
        ctaUrl != null || ctaLabel != null
      if (hasPrefill) {
        try {
          // Validate up front so a bad prefill rejects instead of opening the UI, mirroring
          // navigateToOctopusCreatePost. OctopusActivity repeats this exact build once launched.
          PrefilledPostBuilder.build(reactContext, text, imageUri, topicId, ctaUrl, ctaLabel)
        } catch (e: OctopusPrefilledPost.ValidationError) {
          promise.reject(e.toBridgeErrorCode(), e.message, e)
          return false
        } catch (e: Exception) {
          promise.reject("NAVIGATE_TO_CREATE_POST_ERROR", e.message ?: "Invalid prefilled post", e)
          return false
        }
        text?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TEXT, it) }
        imageUri?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_IMAGE_URI, it) }
        topicId?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TOPIC_ID, it) }
        ctaUrl?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_URL, it) }
        ctaLabel?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL, it) }
      }
      intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_TYPE, type)
      return true
    }

    // The remaining screens forward verbatim: ids were trimmed and validated by the JS
    // producer, and OctopusActivity's decoder folds anything malformed to the main feed.
    type?.let { intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_TYPE, it) }
    optionalString("postId")?.let {
      intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_POST_ID, it)
    }
    optionalString("groupId")?.let {
      intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_GROUP_ID, it)
    }
    optionalString("profileId")?.let {
      intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_PROFILE_ID, it)
    }
    optionalString("clientUserId")?.let {
      intent.putExtra(OctopusActivity.EXTRA_INITIAL_SCREEN_CLIENT_USER_ID, it)
    }
    return true
  }

  fun closeUI(promise: Promise) {
    try {
      val intent = Intent(CLOSE_UI_ACTION)
      intent.setPackage(reactContext.packageName)
      reactContext.sendBroadcast(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CLOSE_UI_ERROR", "Failed to close Octopus UI", e)
    }
  }

  fun openUrlInBrowser(url: String) {
    try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      // Ignore if no app can handle the URL
    }
  }

  companion object {
    private const val TAG = "OctopusUIController"
    const val CLOSE_UI_ACTION = "com.octopuscommunity.octopusreactnativesdk.CLOSE_UI"
  }
}
