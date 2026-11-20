package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.ClientPost
import com.octopuscommunity.sdk.domain.model.OctopusItem
import com.octopuscommunity.sdk.domain.model.OctopusLocalizedText
import com.octopuscommunity.sdk.domain.model.OctopusPost
import com.octopuscommunity.sdk.domain.model.OctopusReactionKind
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.domain.repository.ClientPostError
import java.util.Locale

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
   * The deprecated single `attachment` becomes the only element of `medias`, which is what the
   * native SDK reads it as (`images` is `medias`, else the attachment). Both at once are refused
   * here (`require`, reported as `INVALID_ARGS`). More than the native maximum is not counted
   * here: the native SDK refuses it with a `FileError`.
   *
   * The button label arrives as the flat fields of [decodeLocalizedText]: the deprecated
   * `viewObjectButtonText` alone is an auto-translated label, as the native `String`
   * constructors make it.
   *
   * @throws OctopusLocalizedText.ValidationError when the per-language button label is invalid;
   * the caller rejects with its own code (see [rejectLocalizedText]).
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
    val attachment = map.getMapOrNull("attachment")?.let { decodeAttachment(context, it, "attachment") }
    val medias = decodeMedias(context, map)
    require(attachment == null || medias.isEmpty()) { "Set medias only: attachment is deprecated." }
    val viewObjectButton = decodeLocalizedText(
      text = map.getStringOrNull("viewObjectButtonText"),
      language = map.getStringOrNull("viewObjectButtonLanguage"),
      texts = PrefilledPostBuilder.readStringMap(map, "viewObjectButtonTexts"),
    )
    return ClientPost(
      objectId = objectId,
      viewObjectButton = viewObjectButton,
      text = text,
      catchPhrase = map.getStringOrNull("catchPhrase"),
      groupId = map.getStringOrNull("groupId"),
      medias = medias.ifEmpty { listOfNotNull(attachment) },
    )
  }

  /** Decodes the JS `medias` array, each entry with [decodeAttachment]'s fail-fast rule. */
  private fun decodeMedias(context: Context, map: ReadableMap): List<Resource> {
    if (!map.hasKey("medias") || map.isNull("medias")) return emptyList()
    val array = map.getArray("medias") ?: return emptyList()
    return (0 until array.size()).map { index ->
      val entry = if (array.isNull(index)) null else runCatching { array.getMap(index) }.getOrNull()
      entry?.let { decodeAttachment(context, it, "medias[$index]") }
        ?: throw IllegalArgumentException("medias[$index] must be an attachment object")
    }
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
   * @param field Names the attachment in error messages: `attachment` or `medias[<index>]`.
   * @throws IllegalArgumentException when the attachment cannot be resolved.
   */
  private fun decodeAttachment(context: Context, map: ReadableMap, field: String): Resource {
    when (val type = map.getStringOrNull("type")) {
      "remoteImage" -> {
        val url = map.getStringOrNull("url")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("$field.url is required and must be non-empty")
        return Resource.Remote(url = url)
      }

      "localImage" -> {
        val uri = map.getStringOrNull("uri")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("$field.uri is required and must be non-empty")
        val resolved = resolveLocalImageUri(context, uri)
          ?: throw IllegalArgumentException("$field.uri could not be resolved: $uri")
        return Resource.Local(uri = resolved)
      }

      else -> throw IllegalArgumentException(
        "$field.type must be 'remoteImage' or 'localImage', got: ${type ?: "none"}"
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

/**
 * Builds the native [OctopusLocalizedText] from the flat wire fields the JS
 * `localizedTextToWire` sends (`src/internals/localizedText.ts`): per language as soon as
 * [language] or [texts] is set, else [text] auto-translated, else `null`.
 *
 * Each language tag goes through [languageTagLocale] (an underscore read as a hyphen, then
 * [Locale.forLanguageTag], as the iOS bridge does with `Locale(identifier:)`), and the native
 * [OctopusLocalizedText.PerLanguage] does the validation, so the rules — and the codes the
 * caller rejects with — are the native SDK's. One rule needs help here: two tags giving the same
 * [Locale] (`en-US` and `en-us`, `pt-BR` and `pt_BR`) would silently collapse into one map entry,
 * so the collision is reported here, as the iOS bridge reports it rather than trap on a duplicate
 * dictionary key. When the shared locale has no language (`""`, `"und"`, `"x"`, `"123"` all give
 * [Locale.ROOT]), it is reported as [OctopusLocalizedText.ValidationError.EmptyLanguage], the
 * reason the native SDK gives for each of those tags; otherwise as the native SDK's own
 * [OctopusLocalizedText.ValidationError.DuplicateLanguage]. The tags are read in sorted order,
 * as on iOS, so the error reported does not depend on the order of [texts].
 *
 * @throws OctopusLocalizedText.ValidationError when the per-language text is invalid.
 */
internal fun decodeLocalizedText(
  text: String?,
  language: String?,
  texts: Map<String, String>?,
): OctopusLocalizedText? {
  if (language == null && texts == null) return text?.let { OctopusLocalizedText.AutoTranslated(it) }
  val byLocale = LinkedHashMap<Locale, String>()
  texts.orEmpty().toSortedMap().forEach { (tag, label) ->
    val locale = languageTagLocale(tag)
    if (byLocale.put(locale, label) != null) {
      // Tags without a language all give Locale.ROOT: the native SDK refuses each of them as
      // EmptyLanguage, so their collision is not a duplicate.
      if (locale.language.isEmpty()) throw OctopusLocalizedText.ValidationError.EmptyLanguage
      // The code the native SDK sends for this locale, asked of the native SDK itself.
      val code = OctopusLocalizedText.PerLanguage(mapOf(locale to label), locale).defaultLanguageCode
      throw OctopusLocalizedText.ValidationError.DuplicateLanguage(code)
    }
  }
  return OctopusLocalizedText.PerLanguage(
    texts = byLocale,
    defaultLanguage = languageTagLocale(language ?: ""),
  )
}

/**
 * The [Locale] of a language tag as JS gives it. The only conversion both bridges make, the same
 * way: `_` becomes `-`, so `pt_BR` is the language tag `pt-BR` (which [Locale.forLanguageTag]
 * would otherwise read as no language at all). Everything else is the native SDK's to judge.
 */
internal fun languageTagLocale(tag: String): Locale = Locale.forLanguageTag(tag.replace('_', '-'))

/**
 * Maps an [OctopusLocalizedText.ValidationError] to its `LOCALIZED_TEXT_…` code, the same in
 * `ClientPostErrorCode` and `NavigateToOctopusCreatePostErrorCode`. Exhaustive on purpose: a new
 * native reason should fail the build here rather than reach JS unmapped.
 */
internal fun OctopusLocalizedText.ValidationError.toBridgeErrorCode(): String = when (this) {
  OctopusLocalizedText.ValidationError.EmptyTexts -> "LOCALIZED_TEXT_EMPTY_TEXTS"
  is OctopusLocalizedText.ValidationError.BlankText -> "LOCALIZED_TEXT_BLANK_TEXT"
  OctopusLocalizedText.ValidationError.EmptyLanguage -> "LOCALIZED_TEXT_EMPTY_LANGUAGE"
  is OctopusLocalizedText.ValidationError.DuplicateLanguage -> "LOCALIZED_TEXT_DUPLICATE_LANGUAGE"
  is OctopusLocalizedText.ValidationError.DefaultLanguageMissing ->
    "LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING"
}

/** The language a validation error names, when it names one. */
internal val OctopusLocalizedText.ValidationError.faultyLanguageCode: String?
  get() = when (this) {
    is OctopusLocalizedText.ValidationError.BlankText -> languageCode
    is OctopusLocalizedText.ValidationError.DuplicateLanguage -> languageCode
    is OctopusLocalizedText.ValidationError.DefaultLanguageMissing -> languageCode
    OctopusLocalizedText.ValidationError.EmptyTexts,
    OctopusLocalizedText.ValidationError.EmptyLanguage -> null
  }

/**
 * Rejects with the code of [error], its language code in `userInfo.languageCode` — which the JS
 * side copies onto the error as `languageCode`, as iOS does.
 *
 * @param userInfo The map to fill; a parameter only so a JVM test, which cannot load the native
 * map `Arguments.createMap` builds, can pass its own.
 */
internal fun Promise.rejectLocalizedText(
  error: OctopusLocalizedText.ValidationError,
  userInfo: WritableMap = Arguments.createMap(),
) {
  error.faultyLanguageCode?.let { userInfo.putString("languageCode", it) }
  reject(error.toBridgeErrorCode(), error.message, error, userInfo)
}
