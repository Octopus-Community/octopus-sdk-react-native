package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.ClientPost
import com.octopuscommunity.sdk.domain.model.OctopusItem
import com.octopuscommunity.sdk.domain.model.OctopusPost
import com.octopuscommunity.sdk.domain.model.OctopusReactionKind
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.domain.repository.ClientPostError

/**
 * Wire mapping for the client-object bridge: `fetchOrCreateClientObjectRelatedPost`,
 * `startObservingClientObjectRelatedPost` and the navigate-to-client-object callback.
 *
 * Lives in its own file rather than inside [OctopusReactModule] for the same reason
 * [CommunityDataMapper] does: the serializers are pure and get exercised straight from the
 * bridge methods and from [OctopusContent]'s composition, which holds no module reference.
 */
object ClientObjectBridge {

  /**
   * Whether JS registered a navigate-to-client-object callback
   * (`setNavigateToClientObjectCallback`).
   *
   * Process-static for the same reason [BridgeShareTokenBroker.isProviderRegistered] is: the
   * embedded UI composes inside [OctopusActivity], launched separately and holding no
   * reference to the React module. Read at composition time by [OctopusContent] — the native
   * SDK keys the "view object" button's visibility on `onNavigateToClientObject` being
   * non-null, so handing it a callback that emits into a JS side with nobody listening would
   * show a button that leads nowhere. That read-at-composition is also why registering after
   * the UI is on screen only takes effect the next time it opens; documented on the JS side.
   */
  @Volatile
  var isNavigateCallbackRegistered: Boolean = false
    private set

  fun registerNavigateCallback() {
    isNavigateCallbackRegistered = true
  }

  fun unregisterNavigateCallback() {
    isNavigateCallbackRegistered = false
  }

  /**
   * The `onNavigateToClientObject` callback handed to the embedded UI, or `null` when JS
   * registered none — in which case the native SDK hides the "view object" button, exactly as
   * it did before this feature existed.
   */
  fun navigateCallbackOrNull(): ((String) -> Unit)? =
    if (isNavigateCallbackRegistered) {
      { objectId -> OctopusEventEmitter.instance?.emitNavigateToClientObject(objectId) }
    } else {
      null
    }

  /**
   * Decodes the JS `ClientPost` object into the native model.
   *
   * @throws IllegalArgumentException when a required field is missing, so the caller can
   * reject with `INVALID_ARGS` rather than letting the native SDK report a content error for
   * what is really a wiring mistake.
   */
  fun decodeClientPost(context: Context, map: ReadableMap): ClientPost {
    // Blank is rejected as well as absent, and the value is forwarded untrimmed: a
    // whitespace-only objectId would key a post nobody can look up again, and trimming the
    // text here would silently edit content the host meant to publish. iOS applies the same
    // two rules so INVALID_ARGS means the same thing on both platforms.
    val objectId = map.getStringOrNull("objectId")?.takeIf { it.isNotBlank() }
      ?: throw IllegalArgumentException("objectId is required and must be non-empty")
    val text = map.getStringOrNull("text")?.takeIf { it.isNotBlank() }
      ?: throw IllegalArgumentException("text is required and must be non-empty")
    return ClientPost(
      objectId = objectId,
      text = text,
      attachment = map.getMapOrNull("attachment")?.let { decodeAttachment(context, it) },
      catchPhrase = map.getStringOrNull("catchPhrase"),
      viewObjectButtonText = map.getStringOrNull("viewObjectButtonText"),
      groupId = map.getStringOrNull("groupId")
    )
  }

  /**
   * Maps the JS attachment discriminator onto [Resource].
   *
   * `localImage.uri` follows [PrefilledPostBuilder]'s convention — a bare name is a bundled
   * drawable, anything else is parsed as a URI.
   *
   * An attachment that is **present but unresolvable** (unknown discriminator, blank url,
   * drawable not found) throws, so the caller rejects with `INVALID_ARGS` and no post is
   * created. This is deliberately *not* [PrefilledPostBuilder]'s silent-drop rule: the
   * prefilled editor hands the draft to a human who can still see the image is missing and
   * fix it, whereas this post is created once and never rewritten — a dropped image here is
   * permanent, and the host would learn about it only by looking at its own community.
   * Fail-fast is the only outcome that lets them retry with a working URI.
   *
   * @throws IllegalArgumentException when the attachment cannot be resolved.
   */
  private fun decodeAttachment(context: Context, map: ReadableMap): Resource {
    when (val type = map.getStringOrNull("type")) {
      "remoteImage" -> {
        val url = map.getStringOrNull("url")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("attachment.url is required and must be non-empty")
        return Resource.Remote(url = url)
      }

      "localImage" -> {
        val uri = map.getStringOrNull("uri")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("attachment.uri is required and must be non-empty")
        val resolved = resolveLocalImageUri(context, uri)
          ?: throw IllegalArgumentException("attachment.uri could not be resolved: $uri")
        return Resource.Local(uri = resolved)
      }

      else -> throw IllegalArgumentException(
        "attachment.type must be 'remoteImage' or 'localImage', got: ${type ?: "none"}"
      )
    }
  }

  /** Same resolution rule as [PrefilledPostBuilder]'s `resolveImageUri`. */
  private fun resolveLocalImageUri(context: Context, imageUri: String?): Uri? {
    if (imageUri.isNullOrBlank()) return null
    if (imageUri.contains("://")) return Uri.parse(imageUri)
    val resourceId = context.resources.getIdentifier(imageUri, "drawable", context.packageName)
    if (resourceId == 0) return null
    return Uri.parse("android.resource://${context.packageName}/$resourceId")
  }

  /** Serializes a native post into the JS `OctopusPost` shape. */
  fun serializeOctopusPost(post: OctopusPost): WritableMap {
    val map = Arguments.createMap()
    map.putString("id", post.id)
    map.putInt("commentCount", post.commentCount)
    map.putInt("viewCount", post.viewCount)
    val reactions = Arguments.createArray()
    post.reactions.forEach { reaction ->
      val entry = Arguments.createMap()
      entry.putString("reactionKind", reactionKindToWire(reaction.reactionKind))
      entry.putInt("count", reaction.count)
      reactions.pushMap(entry)
    }
    map.putArray("reactions", reactions)
    map.putString("userReactionKind", post.userReactionKind?.let { reactionKindToWire(it) })
    return map
  }

  /**
   * The read-side counterpart of [ReactionKindMapper.fromReactNativeString].
   *
   * Kept here rather than added to [ReactionKindMapper] because it maps a *wider* domain: a
   * kind this SDK version does not know reaches JS as the **raw server value**, which is not a
   * member of the JS `OctopusReactionKind` write union. `OctopusReactionCount.reactionKind` is
   * typed as an open string for exactly this. Forwarding the raw value rather than a flat
   * `"unknown"` keeps the same information the Flutter plugin carries in its
   * `{kind, serverValue}` pair, in the shape RN reads more naturally. `"unknown"` is the
   * fallback for the degenerate case of a blank server value, so the field is never empty.
   */
  fun reactionKindToWire(kind: OctopusReactionKind): String =
    when (val k = kind as? OctopusItem.Reaction.Kind) {
      is OctopusItem.Reaction.Kind.Heart -> "heart"
      is OctopusItem.Reaction.Kind.Joy -> "joy"
      is OctopusItem.Reaction.Kind.MouthOpen -> "mouthOpen"
      is OctopusItem.Reaction.Kind.Clap -> "clap"
      is OctopusItem.Reaction.Kind.Cry -> "cry"
      is OctopusItem.Reaction.Kind.Rage -> "rage"
      is OctopusItem.Reaction.Kind.Unknown -> k.unicode.ifBlank { "unknown" }
      null -> kind.unicode.ifBlank { "unknown" }
    }

  private fun ReadableMap.getStringOrNull(key: String): String? =
    if (hasKey(key) && !isNull(key)) getString(key) else null

  private fun ReadableMap.getMapOrNull(key: String): ReadableMap? =
    if (hasKey(key) && !isNull(key)) getMap(key) else null
}

/**
 * Maps a native [ClientPostError] leaf onto the JS-facing `ClientPostErrorCode` documented in
 * `src/types/clientPostError.ts`.
 *
 * The native hierarchy has **21 leaves** and the JS union **16 content codes**: the four
 * `…Unknown` leaves and `OtherError` all collapse onto `CLIENT_POST_ERROR`, the same fold the
 * Flutter plugin applies onto its `other` wire tag. Exhaustive on purpose — a new native leaf
 * should fail the build here rather than silently reach JS as an unrecognised code.
 */
internal fun ClientPostError.toBridgeErrorCode(): String = when (this) {
  is ClientPostError.TextError.Missing -> "TEXT_MISSING"
  is ClientPostError.TextError.MaxCharLimitReached -> "TEXT_TOO_LONG"
  is ClientPostError.TextError.Unknown -> "CLIENT_POST_ERROR"
  is ClientPostError.FileError.EmptyFile -> "FILE_EMPTY"
  is ClientPostError.FileError.FileSizeTooBig -> "FILE_TOO_LARGE"
  is ClientPostError.FileError.BadFileFormat -> "FILE_BAD_FORMAT"
  is ClientPostError.FileError.UploadIssue -> "FILE_UPLOAD"
  is ClientPostError.FileError.DownloadIssue -> "FILE_DOWNLOAD"
  is ClientPostError.FileError.Unknown -> "CLIENT_POST_ERROR"
  is ClientPostError.ClientObjectError.MissingId -> "MISSING_OBJECT_ID"
  is ClientPostError.ClientObjectError.MissingCta -> "MISSING_CTA"
  is ClientPostError.ClientObjectError.PostUnavailable -> "POST_UNAVAILABLE"
  is ClientPostError.ClientObjectError.PostNotFound -> "POST_NOT_FOUND"
  is ClientPostError.ClientObjectError.PostAlreadyExists -> "POST_ALREADY_EXISTS"
  is ClientPostError.ClientObjectError.InvalidGroupId -> "INVALID_GROUP_ID"
  is ClientPostError.ClientObjectError.InvalidAuthor -> "INVALID_AUTHOR"
  is ClientPostError.ClientObjectError.Unknown -> "CLIENT_POST_ERROR"
  is ClientPostError.TokenError.Invalid -> "TOKEN_INVALID"
  is ClientPostError.TokenError.Expired -> "TOKEN_EXPIRED"
  is ClientPostError.TokenError.Unknown -> "CLIENT_POST_ERROR"
  is ClientPostError.OtherError -> "CLIENT_POST_ERROR"
}

/**
 * Maps a failed `OctopusSDK.fetchOrCreateClientObjectRelatedPost` result to the bridge
 * (code, message) pair matching `ClientPostErrorCode` in `src/types/clientPostError.ts`.
 *
 * Same shape as this module's `toSetReactionBridgeError`: connection failures flatten onto the
 * three connection codes, content errors travel inside
 * [OctopusResult.Failure.InvalidArguments]. The rejected code comes from the **first** error
 * while the message is the bullet-joined `errorMessage` of all of them, so a multi-error
 * validation failure still surfaces every reason.
 *
 * The `else` is redundant today and Kotlin says so, but it is kept deliberately — and for the
 * opposite reason to [toBridgeErrorCode]'s exhaustiveness. That one maps a closed set the JS
 * union mirrors leaf for leaf, so a new native leaf *should* break the build and force a
 * mapping decision. This one maps the SDK-wide [OctopusResult.Failure] hierarchy, where a new
 * transport branch is not a client-post concern: folding it onto `SERVER_ERROR` is the right
 * answer, and failing the build on a native bump would only be noise. Same call as
 * `OctopusEventSerializer.kt` and `toSetReactionBridgeError`.
 */
internal fun OctopusResult.Failure<ClientPostError>.toClientPostBridgeError(): Pair<String, String> =
  when (this) {
    is OctopusResult.Failure.NoNetwork -> "NO_NETWORK" to "No network"
    is OctopusResult.Failure.UserNotAuthenticated ->
      "NOT_CONNECTED" to (reason ?: "User not authenticated")
    is OctopusResult.Failure.PermissionDenied ->
      "NOT_CONNECTED" to (reason ?: "Permission denied")
    is OctopusResult.Failure.StatusError -> "SERVER_ERROR" to (description ?: "Server error $code")
    is OctopusResult.Failure.ContentUnavailable -> "SERVER_ERROR" to "Content unavailable"
    is OctopusResult.Failure.InvalidArguments -> error.toBridgeErrorCode() to errorMessage
    else -> "SERVER_ERROR" to toString()
  }
