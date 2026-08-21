package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.domain.model.CommunityConfig
import com.octopuscommunity.sdk.domain.model.ProfileFieldLockState
import com.octopuscommunity.sdk.domain.model.ProfileFieldsLock

/**
 * Converts the JS-facing debug-override payloads (used only by the `debugOverride*` testing
 * hatches) to their native domain-model equivalents. These are development-only affordances, not
 * part of the stable public API surface — see `InternalOctopusApi` on the native side.
 */
object DebugOverrideMappers {

  fun toProfileFieldsLock(map: ReadableMap?): ProfileFieldsLock? {
    if (map == null) return null
    return ProfileFieldsLock(
      nickname = toProfileFieldLockState(map, "nickname"),
      avatar = toProfileFieldLockState(map, "avatar"),
      bio = toProfileFieldLockState(map, "bio"),
    )
  }

  private fun toProfileFieldLockState(map: ReadableMap, key: String): ProfileFieldLockState {
    return when (map.takeIf { it.hasKey(key) }?.getString(key)) {
      "readOnly" -> ProfileFieldLockState.READ_ONLY
      "disabled" -> ProfileFieldLockState.DISABLED
      else -> ProfileFieldLockState.EDITABLE
    }
  }

  /**
   * Reads the flat `postEnablePictures` / `postEnablePolls` / `commentEnablePictures` /
   * `replyEnablePictures` keys the JS wrapper always sends (see `debugOverrideContentOptions.ts`)
   * — not nested `post` / `comment` / `reply` sub-maps. Each key independently defaults to `true`
   * (the native default) when absent, matching the JS wrapper's own per-field `?? true`.
   */
  fun toContentOptions(map: ReadableMap?): CommunityConfig.ContentOptions? {
    if (map == null) return null
    return CommunityConfig.ContentOptions(
      post = CommunityConfig.ContentOptions.PostOptions(
        enablePictures = map.takeIf { it.hasKey("postEnablePictures") }
          ?.getBoolean("postEnablePictures") ?: true,
        enablePolls = map.takeIf { it.hasKey("postEnablePolls") }
          ?.getBoolean("postEnablePolls") ?: true,
      ),
      comment = CommunityConfig.ContentOptions.CommentOptions(
        enablePictures = map.takeIf { it.hasKey("commentEnablePictures") }
          ?.getBoolean("commentEnablePictures") ?: true,
      ),
      reply = CommunityConfig.ContentOptions.ReplyOptions(
        enablePictures = map.takeIf { it.hasKey("replyEnablePictures") }
          ?.getBoolean("replyEnablePictures") ?: true,
      ),
    )
  }

  fun toTermsAcceptanceMode(mode: String?): CommunityConfig.TermsAcceptanceMode? {
    return when (mode) {
      "implicit" -> CommunityConfig.TermsAcceptanceMode.IMPLICIT
      "explicitMultiCheckbox" -> CommunityConfig.TermsAcceptanceMode.EXPLICIT_MULTI_CHECKBOX
      "explicitSingleCheckbox" -> CommunityConfig.TermsAcceptanceMode.EXPLICIT_SINGLE_CHECKBOX
      else -> null
    }
  }
}
