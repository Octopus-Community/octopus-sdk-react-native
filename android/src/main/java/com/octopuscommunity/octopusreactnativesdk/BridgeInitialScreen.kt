package com.octopuscommunity.octopusreactnativesdk

import android.util.Log

/**
 * The decoded `initialScreen` payload carried from [OctopusUIController.openUI] to
 * [OctopusContent] through [OctopusActivity]'s Intent extras — and, on the embedded path, from
 * the `initialScreen` prop of [OctopusUIViewManager] straight into [OctopusContent].
 *
 * Only the screens that navigate on top of the home NavHost are modeled here; `mainFeed` is the
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
    else -> foldMalformed("unknown type \"$type\"")
  }
}
