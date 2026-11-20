package com.octopuscommunity.octopusreactnativesdk

import android.util.Log
import androidx.navigation.NavController
import androidx.navigation.NavGraph
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.domain.model.OctopusLocalizedText
import com.octopuscommunity.sdk.ui.OctopusDestination
import com.octopuscommunity.sdk.ui.navigateToOctopusActivity
import com.octopuscommunity.sdk.ui.navigateToOctopusActivityByClientUserId
import com.octopuscommunity.sdk.ui.navigateToOctopusGroup
import com.octopuscommunity.sdk.ui.navigateToOctopusPost
import com.octopuscommunity.sdk.ui.navigateToOctopusProfileByClientUserId
import org.json.JSONObject

internal const val BRIDGE_HOME_ROUTE = "OctopusHome"

/**
 * The NavHost's start route for the bridge: the editor for [createPostInfo] (with the native
 * SDK's prefill route arguments), else the destination for [initialScreen] (the same routes as
 * the SDK's `navigateToOctopus…` helpers), else [BRIDGE_HOME_ROUTE], the main feed.
 * [createPostInfo] wins: the two are exclusive on the wire (see [BridgeInitialScreen]).
 */
internal fun bridgeStartRoute(
  createPostInfo: CreatePostScreenInfo?,
  initialScreen: BridgeInitialScreen?,
): Any {
  if (createPostInfo != null) {
    val post = createPostInfo.prefilledPost
    val perLanguageLabel = post?.cta?.localizedLabel as? OctopusLocalizedText.PerLanguage
    return OctopusDestination.CreatePost(
      groupId = post?.topicId,
      prefilledText = post?.text,
      prefilledImageUris = post?.images.orEmpty().map { it.toString() },
      prefilledCustomActionLabel = post?.cta?.label,
      prefilledCustomActionUrl = post?.cta?.url?.toString(),
      prefilledCustomActionLabelLanguage = perLanguageLabel?.defaultLanguageCode,
      prefilledCustomActionLabelTranslations = perLanguageLabel?.let(::encodeLabelTranslations),
    )
  }
  return when (initialScreen) {
    null -> BRIDGE_HOME_ROUTE
    is BridgeInitialScreen.Post -> OctopusDestination.PostDetails(
      postId = initialScreen.postId,
      origin = OctopusDestination.Origin.CLIENT_APP,
    )
    is BridgeInitialScreen.Group -> OctopusDestination.GroupDetails(
      groupId = initialScreen.groupId,
      origin = OctopusDestination.Origin.CLIENT_APP,
    )
    is BridgeInitialScreen.MemberActivity -> initialScreen.clientUserId
      ?.let { OctopusDestination.Activity(clientUserId = it) }
      ?: OctopusDestination.Activity(userId = initialScreen.profileId)
    is BridgeInitialScreen.Profile -> initialScreen.clientUserId
      ?.let { OctopusDestination.ProfileSummary(clientUserId = it) }
      // No id: the connected user's own, editable profile (a nested graph).
      ?: OctopusDestination.CurrentUserProfileGraph
  }
}

/**
 * The CTA labels of the languages other than the default one, in the form the native
 * `CreatePost` route reads them: a compact JSON object of language code to label, `null` when
 * there is none (a route argument cannot be a map). The default language's label rides
 * `prefilledCustomActionLabel`.
 */
internal fun encodeLabelTranslations(label: OctopusLocalizedText.PerLanguage): String? {
  val others = label.textsByLanguageCode - label.defaultLanguageCode
  return if (others.isEmpty()) null else JSONObject(others).toString()
}

/**
 * Selects the bridge's initial screen as the graph root, so no main feed sits underneath it —
 * iso with the iOS bridge, which hands every initial screen to the native SDK as its root.
 *
 * At that root the native SDK routes its top-bar back icon and system back to the host `onBack`
 * (the per-view `onBackRequested` event, or closing the fullscreen activity) instead of
 * revealing a feed. See [bridgeStartRoute] for the routes.
 */
internal fun NavGraph.setBridgeInitialDestination(
  createPostInfo: CreatePostScreenInfo?,
  initialScreen: BridgeInitialScreen? = null,
) {
  val route = bridgeStartRoute(createPostInfo, initialScreen)
  if (route !is String) setStartDestination(route)
}

/**
 * Puts [startRoute] back when the back stack is empty. At its start destination the native SDK's
 * `NavigateUp` pops the last entry (`popBackStack()` empties the stack and returns `false`)
 * before it delegates to the host `onBack`, which would leave a blank view — for good if the
 * host keeps the view mounted, or for the length of its dismissal animation otherwise.
 */
internal fun NavController.restoreBridgeRoot(startRoute: Any) {
  if (currentBackStackEntry != null) return
  try {
    if (startRoute is String) navigate(startRoute) else navigate(startRoute)
  } catch (e: Exception) {
    Log.w("OctopusContent", "Could not restore the root screen (${e.javaClass.simpleName})")
  }
}

/**
 * Pushes [screen] over the current destination — the main feed — instead of making it the root.
 * Only for an embedded view without `onBackRequested` (OctopusContent's `initialScreenAsRoot`):
 * system back then pops to the feed first and reaches the host from there. Uses the native SDK's
 * `navigateToOctopus…` helpers; a navigation failure is logged and leaves the feed in place.
 */
internal fun NavController.pushBridgeInitialScreen(screen: BridgeInitialScreen) {
  try {
    when (screen) {
      is BridgeInitialScreen.Post -> navigateToOctopusPost(postId = screen.postId)
      is BridgeInitialScreen.Group -> navigateToOctopusGroup(groupId = screen.groupId)
      is BridgeInitialScreen.MemberActivity ->
        screen.clientUserId
          ?.let { navigateToOctopusActivityByClientUserId(it) }
          ?: screen.profileId?.let { navigateToOctopusActivity(it) }
      is BridgeInitialScreen.Profile ->
        screen.clientUserId
          ?.let { navigateToOctopusProfileByClientUserId(it) }
          // No id: the connected user's own, editable profile.
          ?: navigate(OctopusDestination.CurrentUserProfileGraph)
    }
  } catch (e: Exception) {
    Log.w("OctopusContent", "Initial screen navigation failed: ${screen.javaClass.simpleName} (${e.javaClass.simpleName})")
  }
}

/**
 * The decoded `initialScreen` payload carried from [OctopusUIController.openUI] to
 * [OctopusContent] through [OctopusActivity]'s Intent extras — and, on the embedded path, from
 * the `initialScreen` prop of [OctopusUIViewManager] straight into [OctopusContent].
 *
 * Each case becomes the NavHost's root through [setBridgeInitialDestination]; `mainFeed` is the
 * absence of an initial screen (`null`), and `createPost` rides the existing
 * `EXTRA_CREATE_POST_*` extras into [OctopusContent]'s `createPostInfo` parameter, so neither
 * needs a case. Ids arrive already trimmed and validated by the JS producer
 * (`normalizeInitialScreen`); the decoders here only reject structurally impossible payloads
 * (blank required id, activity without exactly one id), folding to the main feed with a warning
 * rather than crashing the host app.
 */
internal sealed interface BridgeInitialScreen {
  data class Post(val postId: String) : BridgeInitialScreen

  data class Group(val groupId: String) : BridgeInitialScreen

  /** Exactly one of [profileId] / [clientUserId] is non-null. */
  data class MemberActivity(val profileId: String?, val clientUserId: String?) :
    BridgeInitialScreen

  /** [clientUserId] `null` means the connected user's own, editable profile. */
  data class Profile(val clientUserId: String?) : BridgeInitialScreen
}

/**
 * Decodes a `type` plus a string accessor into a [BridgeInitialScreen]. `mainFeed`, `createPost`
 * (handled through `createPostInfo`) and an absent type all decode to `null`.
 *
 * Source-agnostic on purpose: the fullscreen path reads Intent extras and the embedded path reads
 * a `ReadableMap` prop, so each supplies its own [string] accessor and both get the exact same
 * folding rules. Ids are forwarded verbatim — the JS producer already trimmed and validated them.
 *
 * @param string reads one payload field; `null` when absent.
 * @param tag log tag identifying the calling path.
 */
internal fun decodeBridgeInitialScreen(
  type: String?,
  tag: String,
  string: (String) -> String?
): BridgeInitialScreen? {
  fun foldMalformed(reason: String): BridgeInitialScreen? {
    Log.w(tag, "Malformed initialScreen ($reason) — opening the main feed")
    return null
  }
  return when (type) {
    null, "mainFeed", "createPost" -> null
    "post" -> {
      val postId = string("postId")
      if (postId.isNullOrBlank()) foldMalformed("post without postId")
      else BridgeInitialScreen.Post(postId)
    }
    "group" -> {
      val groupId = string("groupId")
      if (groupId.isNullOrBlank()) foldMalformed("group without groupId")
      else BridgeInitialScreen.Group(groupId)
    }
    "activity" -> {
      val profileId = string("profileId")?.takeUnless { it.isBlank() }
      val clientUserId = string("clientUserId")?.takeUnless { it.isBlank() }
      if ((profileId != null) == (clientUserId != null)) {
        foldMalformed("activity without exactly one member id")
      } else {
        BridgeInitialScreen.MemberActivity(profileId = profileId, clientUserId = clientUserId)
      }
    }
    "profile" -> BridgeInitialScreen.Profile(
      clientUserId = string("clientUserId")?.takeUnless { it.isBlank() }
    )
    // Never echo the received type: a direct native caller can put anything there, URLs included.
    else -> foldMalformed("unknown type")
  }
}
