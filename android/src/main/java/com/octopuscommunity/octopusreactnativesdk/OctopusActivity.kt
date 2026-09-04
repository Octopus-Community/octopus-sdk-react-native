package com.octopuscommunity.octopusreactnativesdk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost
import com.octopuscommunity.sdk.ui.components.NavigationIconType

class OctopusActivity : ComponentActivity() {

  companion object {
    private const val TAG = "OctopusActivity"
    const val EXTRA_INTERCEPT_URLS = "interceptUrls"
    const val EXTRA_INTERCEPT_PROFILE_TAPS = "interceptProfileTaps"
    const val EXTRA_LINK_PATH = "linkPath"
    // Parity wave — navigation & theme
    const val EXTRA_NAV_BAR_LEADING_ACTION = "navBarLeadingAction"
    const val EXTRA_CREATE_POST_TEXT = "createPostText"
    const val EXTRA_CREATE_POST_IMAGE_URI = "createPostImageUri"
    const val EXTRA_CREATE_POST_TOPIC_ID = "createPostTopicId"
    const val EXTRA_CREATE_POST_CTA_URL = "createPostCtaUrl"
    const val EXTRA_CREATE_POST_CTA_LABEL = "createPostCtaLabel"
    const val EXTRA_INITIAL_SCREEN_TYPE = "initialScreenType"
    const val EXTRA_INITIAL_SCREEN_POST_ID = "initialScreenPostId"
    const val EXTRA_INITIAL_SCREEN_GROUP_ID = "initialScreenGroupId"
    const val EXTRA_INITIAL_SCREEN_PROFILE_ID = "initialScreenProfileId"
    const val EXTRA_INITIAL_SCREEN_CLIENT_USER_ID = "initialScreenClientUserId"
  }

  private val closeUIReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      finish()
    }
  }

  // Set by registerCloseUIReceiver(). onCreate can finish before reaching it (see the
  // initialisation guard below), and unregistering a receiver that was never registered throws.
  private var isCloseUIReceiverRegistered = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (!OctopusSDK.isInitialised) {
      // The SDK is initialised from JS only (`initialize()`), never at Application startup. When
      // Android restores the task after a process death (low memory, a crash, "Don't keep
      // activities") with this Activity in the foreground, the new process starts directly here,
      // before React has had any chance to run `initialize()` — and OctopusContent would
      // dereference the SDK's uninitialised Koin container, a `lateinit` with no fallback
      // (`UninitializedPropertyAccessException` in `OctopusSDK.getKoinApp`, issue #234).
      // Finishing hands control back to the host app as the OS restored it beneath this
      // Activity. Nothing below has run yet, so onDestroy has nothing to undo.
      Log.w(TAG, "OctopusActivity started while the SDK is not initialised — finishing")
      finish()
      return
    }
    enableEdgeToEdge()
    registerCloseUIReceiver()
    val interceptUrls = intent.getBooleanExtra(EXTRA_INTERCEPT_URLS, false)
    val interceptProfileTaps = intent.getBooleanExtra(EXTRA_INTERCEPT_PROFILE_TAPS, false)
    val linkPath = intent.getStringExtra(EXTRA_LINK_PATH)
    val createPostText = intent.getStringExtra(EXTRA_CREATE_POST_TEXT)
    val createPostImageUri = intent.getStringExtra(EXTRA_CREATE_POST_IMAGE_URI)
    val createPostTopicId = intent.getStringExtra(EXTRA_CREATE_POST_TOPIC_ID)
    val createPostCtaUrl = intent.getStringExtra(EXTRA_CREATE_POST_CTA_URL)
    val createPostCtaLabel = intent.getStringExtra(EXTRA_CREATE_POST_CTA_LABEL)
    val initialScreenType = intent.getStringExtra(EXTRA_INITIAL_SCREEN_TYPE)
    // Parity wave — navigation & theme. Same string->enum mapping as
    // OctopusUIViewManager.setNavBarLeadingAction, kept in sync manually since the two live on
    // different view types (Activity intent extra vs. ReactProp) with no shared decoder to call.
    val navBarLeadingAction = when (intent.getStringExtra(EXTRA_NAV_BAR_LEADING_ACTION)) {
      "close" -> NavigationIconType.Close
      "back" -> NavigationIconType.Back
      else -> null
    }
    var createPostInfo = if (
      createPostText != null || createPostImageUri != null || createPostTopicId != null ||
      createPostCtaUrl != null || createPostCtaLabel != null
    ) {
      try {
        PrefilledPostBuilder.build(
          context = this,
          text = createPostText,
          imageUri = createPostImageUri,
          topicId = createPostTopicId,
          ctaUrl = createPostCtaUrl,
          ctaLabel = createPostCtaLabel,
          // Attached here rather than in the bridge method: a `suspend` lambda cannot ride an
          // Intent extra. `null` unless JS registered a signer, which keeps hosts that never
          // call `addBridgeShareTokenRequestListener` on the previous unsigned behaviour.
          bridgeShareTokenProvider = BridgeShareTokenBroker.providerOrNull(),
        )
      } catch (e: OctopusPrefilledPost.ValidationError) {
        // The bridge method already validated this payload before launching this Activity —
        // a failure here means the two builds disagree, which should not happen. Fail open on
        // an empty editor rather than crash the host app.
        Log.w(TAG, "Unexpected prefilled-post validation failure", e)
        null
      }
    } else {
      null
    }
    if (initialScreenType == "createPost" && createPostInfo == null) {
      // A createPost initial screen with no prefill: a blank editor, matching the native
      // navigateToOctopusCreatePost default.
      createPostInfo = CreatePostScreenInfo()
    }
    val initialScreen = decodeInitialScreen(initialScreenType)

    setContent {
      OctopusContent(
        backButton = true,
        interceptUrls = interceptUrls,
        interceptProfileTaps = interceptProfileTaps,
        onBack = { finish() },
        linkPath = linkPath,
        createPostInfo = createPostInfo,
        initialScreen = initialScreen,
        // Parity wave — navigation & theme. The fullscreen Activity's `onBack` above already
        // fires on this icon regardless of variant, since OctopusHomeScreen's own
        // leadingNavigationIcon resolution routes both Back and Close taps through the same
        // `onBack` callback — the embedded view reaches the same behaviour through its
        // `onBackRequested` direct event (see OctopusUIViewManager, issue #36).
        navBarLeadingAction = navBarLeadingAction
      )
    }
  }

  /**
   * Decodes the `EXTRA_INITIAL_SCREEN_*` extras into a [BridgeInitialScreen], through the
   * shared [decodeBridgeInitialScreen] the embedded [OctopusUIViewManager] path also uses —
   * so the two entry points cannot fold a malformed payload differently. The accessor remaps
   * the decoder's JS wire field names onto the `EXTRA_INITIAL_SCREEN_*` extra keys; the
   * `else` passthrough keeps a decoder field added without a matching extra readable, at the
   * cost of it silently reading a raw extra name — add the mapping here when adding a field.
   */
  private fun decodeInitialScreen(type: String?): BridgeInitialScreen? =
    decodeBridgeInitialScreen(type = type, tag = TAG) { key ->
      intent.getStringExtra(
        when (key) {
          "postId" -> EXTRA_INITIAL_SCREEN_POST_ID
          "groupId" -> EXTRA_INITIAL_SCREEN_GROUP_ID
          "profileId" -> EXTRA_INITIAL_SCREEN_PROFILE_ID
          "clientUserId" -> EXTRA_INITIAL_SCREEN_CLIENT_USER_ID
          else -> key
        }
      )
    }

  override fun onDestroy() {
    super.onDestroy()
    if (isCloseUIReceiverRegistered) {
      unregisterReceiver(closeUIReceiver)
      isCloseUIReceiverRegistered = false
    }
  }

  private fun registerCloseUIReceiver() {
    val intentFilter = IntentFilter(OctopusUIController.CLOSE_UI_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(closeUIReceiver, intentFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(closeUIReceiver, intentFilter)
    }
    isCloseUIReceiverRegistered = true
  }
}
