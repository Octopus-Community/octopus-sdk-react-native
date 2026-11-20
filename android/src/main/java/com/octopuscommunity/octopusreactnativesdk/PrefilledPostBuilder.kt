package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.domain.model.OctopusLocalizedText
import com.octopuscommunity.sdk.domain.model.OctopusPostCTA
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost

/**
 * Builds a [CreatePostScreenInfo] from the raw, JS-facing prefill fields shared by
 * `OctopusReactModule.navigateToOctopusCreatePost`'s early validation and [OctopusActivity]'s
 * re-entry point. Keeping both call sites on this one builder is what makes the second build
 * (inside the Activity) a safe, idempotent repeat of the first (inside the bridge method).
 */
object PrefilledPostBuilder {

  /**
   * @param bridgeShareTokenProvider Signs this prefilled share so a community that forbids
   * member pictures accepts its image. `null` — the default, and what the bridge method's
   * validation-only build passes — leaves the share unsigned. Only [OctopusActivity]'s build
   * supplies one, from [BridgeShareTokenBroker]: the provider is a `suspend` lambda and cannot
   * ride an Intent extra, so it is attached on the far side rather than travelling with the
   * raw fields.
   * @param imageUris The JS `imageUris`, in display order. Each entry follows the [resolveImageUri]
   * convention; one that resolves to nothing is dropped, as a blank one is.
   * @param ctaLabel The auto-translated CTA label; ignored when [ctaLabelLanguage] or
   * [ctaLabelTexts] is set.
   * @param ctaLabelLanguage The default language of a per-language CTA label.
   * @param ctaLabelTexts The texts of a per-language CTA label by language tag, default included.
   * @throws OctopusPrefilledPost.ValidationError when the prefill payload is invalid.
   * @throws OctopusLocalizedText.ValidationError when the per-language CTA label is invalid.
   * @throws OctopusPrefilledPost.TooManyImagesError when more images than a post carries are left.
   */
  fun build(
    context: Context,
    text: String?,
    imageUris: List<String>?,
    topicId: String?,
    ctaUrl: String?,
    ctaLabel: String?,
    ctaLabelLanguage: String? = null,
    ctaLabelTexts: Map<String, String>? = null,
    bridgeShareTokenProvider: (suspend (bridgeFingerprint: String) -> String?)? = null,
  ): CreatePostScreenInfo {
    val hasCta = ctaUrl != null || ctaLabel != null || ctaLabelLanguage != null ||
      ctaLabelTexts != null
    val cta = if (hasCta) {
      // An absent label stays an empty auto-translated one, so the native SDK refuses it with
      // CtaLabelEmpty exactly as it refused the empty `String` label before.
      val label = decodeLocalizedText(ctaLabel, ctaLabelLanguage, ctaLabelTexts)
        ?: OctopusLocalizedText.AutoTranslated("")
      OctopusPostCTA(url = Uri.parse(ctaUrl ?: ""), localizedLabel = label)
    } else {
      null
    }
    return CreatePostScreenInfo(
      prefilledPost = OctopusPrefilledPost(
        text = text,
        topicId = topicId,
        cta = cta,
        images = imageUris.orEmpty().mapNotNull { resolveImageUri(context, it) },
      ),
      bridgeShareTokenProvider = bridgeShareTokenProvider,
    )
  }

  /**
   * Reads a JS `Record<string, string>` (the `ctaLabelTexts` of a prefill payload, the
   * `viewObjectButtonTexts` of a client post): `null` when the key is absent or `null`. An entry
   * whose value is not a string is skipped; the JS producer only sends strings.
   */
  fun readStringMap(map: ReadableMap?, key: String): Map<String, String>? {
    if (map == null || !map.hasKey(key) || map.isNull(key)) return null
    val entries = map.getMap(key) ?: return null
    val result = LinkedHashMap<String, String>()
    val iterator = entries.keySetIterator()
    while (iterator.hasNextKey()) {
      val entryKey = iterator.nextKey()
      if (entries.isNull(entryKey)) continue
      runCatching { entries.getString(entryKey) }.getOrNull()?.let { result[entryKey] = it }
    }
    return result
  }

  /**
   * Reads the `imageUris` array of a prefill payload: `null` when it is absent, `null` or empty,
   * so a payload without images counts as no prefill at all. Non-string entries are skipped.
   */
  fun readImageUris(map: ReadableMap?, key: String = "imageUris"): ArrayList<String>? {
    if (map == null || !map.hasKey(key) || map.isNull(key)) return null
    val array = map.getArray(key) ?: return null
    val uris = ArrayList<String>(array.size())
    for (index in 0 until array.size()) {
      if (array.isNull(index)) continue
      runCatching { array.getString(index) }.getOrNull()?.let { uris.add(it) }
    }
    return uris.takeIf { it.isNotEmpty() }
  }

  /**
   * Resolves the `imageUris` entry convention documented on the JS `OctopusPrefilledPost` type: a bare
   * name with no scheme is looked up as a bundled drawable resource; anything else (expected to
   * be a `file://` URI) is parsed as-is. Returns `null` when [imageUri] is `null`/blank, or when
   * a bare name does not match any drawable resource.
   */
  private fun resolveImageUri(context: Context, imageUri: String?): Uri? {
    if (imageUri.isNullOrBlank()) return null
    if (imageUri.contains("://")) return Uri.parse(imageUri)
    val resourceId = context.resources.getIdentifier(imageUri, "drawable", context.packageName)
    if (resourceId == 0) return null
    return Uri.parse("android.resource://${context.packageName}/$resourceId")
  }
}

/**
 * The raw, JS-facing prefill fields of a `createPost` payload, as one value so the four places
 * that carry them — `navigateToOctopusCreatePost`, the `openUI` initial screen, the
 * [OctopusActivity] Intent extras and the embedded view's prop — read and forward the same set.
 */
data class RawPrefilledPost(
  val text: String? = null,
  val imageUris: ArrayList<String>? = null,
  val topicId: String? = null,
  val ctaUrl: String? = null,
  val ctaLabel: String? = null,
  val ctaLabelLanguage: String? = null,
  val ctaLabelTexts: Map<String, String>? = null,
) {
  /** Whether no field is set: a blank editor rather than a prefilled one. */
  val isEmpty: Boolean
    get() = text == null && imageUris == null && topicId == null && ctaUrl == null &&
      ctaLabel == null && ctaLabelLanguage == null && ctaLabelTexts == null

  /** See [PrefilledPostBuilder.build], whose exceptions it throws. */
  fun build(
    context: Context,
    bridgeShareTokenProvider: (suspend (bridgeFingerprint: String) -> String?)? = null,
  ): CreatePostScreenInfo = PrefilledPostBuilder.build(
    context = context,
    text = text,
    imageUris = imageUris,
    topicId = topicId,
    ctaUrl = ctaUrl,
    ctaLabel = ctaLabel,
    ctaLabelLanguage = ctaLabelLanguage,
    ctaLabelTexts = ctaLabelTexts,
    bridgeShareTokenProvider = bridgeShareTokenProvider,
  )

  /** Writes the set fields as [OctopusActivity] extras, read back by [fromIntent]. */
  fun putExtras(intent: Intent) {
    text?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TEXT, it) }
    imageUris?.let { intent.putStringArrayListExtra(OctopusActivity.EXTRA_CREATE_POST_IMAGE_URIS, it) }
    topicId?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TOPIC_ID, it) }
    ctaUrl?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_URL, it) }
    ctaLabel?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL, it) }
    ctaLabelLanguage?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL_LANGUAGE, it) }
    ctaLabelTexts?.let { texts ->
      // A Bundle rather than a Serializable map: its order is not kept, which a map of
      // language to text does not need, and it needs no deprecated typed getter to read back.
      val bundle = Bundle()
      texts.forEach { (language, label) -> bundle.putString(language, label) }
      intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL_TEXTS, bundle)
    }
  }

  companion object {
    /** Reads the flat prefill keys of a JS payload; every field `null` when [map] is. */
    fun read(map: ReadableMap?): RawPrefilledPost {
      fun optionalString(key: String): String? =
        map?.takeIf { it.hasKey(key) && !it.isNull(key) }?.getString(key)
      return RawPrefilledPost(
        text = optionalString("text"),
        imageUris = PrefilledPostBuilder.readImageUris(map),
        topicId = optionalString("topicId"),
        ctaUrl = optionalString("ctaUrl"),
        ctaLabel = optionalString("ctaLabel"),
        ctaLabelLanguage = optionalString("ctaLabelLanguage"),
        ctaLabelTexts = PrefilledPostBuilder.readStringMap(map, "ctaLabelTexts"),
      )
    }

    /** Reads back what [putExtras] wrote. */
    fun fromIntent(intent: Intent): RawPrefilledPost {
      val textsBundle = intent.getBundleExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL_TEXTS)
      return RawPrefilledPost(
        text = intent.getStringExtra(OctopusActivity.EXTRA_CREATE_POST_TEXT),
        imageUris = intent.getStringArrayListExtra(OctopusActivity.EXTRA_CREATE_POST_IMAGE_URIS),
        topicId = intent.getStringExtra(OctopusActivity.EXTRA_CREATE_POST_TOPIC_ID),
        ctaUrl = intent.getStringExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_URL),
        ctaLabel = intent.getStringExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL),
        ctaLabelLanguage = intent.getStringExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL_LANGUAGE),
        ctaLabelTexts = textsBundle?.let { bundle ->
          bundle.keySet().mapNotNull { key -> bundle.getString(key)?.let { key to it } }.toMap()
        },
      )
    }
  }
}
