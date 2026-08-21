package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.net.Uri
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
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
   * @throws OctopusPrefilledPost.ValidationError when the prefill payload is invalid.
   */
  fun build(
    context: Context,
    text: String?,
    imageUri: String?,
    topicId: String?,
    ctaUrl: String?,
    ctaLabel: String?,
    bridgeShareTokenProvider: (suspend (bridgeFingerprint: String) -> String?)? = null,
  ): CreatePostScreenInfo {
    val cta = if (ctaUrl != null || ctaLabel != null) {
      OctopusPostCTA(url = Uri.parse(ctaUrl ?: ""), label = ctaLabel ?: "")
    } else {
      null
    }
    return CreatePostScreenInfo(
      prefilledPost = OctopusPrefilledPost(
        text = text,
        image = resolveImageUri(context, imageUri),
        topicId = topicId,
        cta = cta,
      ),
      bridgeShareTokenProvider = bridgeShareTokenProvider,
    )
  }

  /**
   * Resolves the `imageUri` convention documented on the JS `OctopusPrefilledPost` type: a bare
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
