package com.octopuscommunity.octopusreactnativesdk

import com.octopuscommunity.sdk.domain.model.OctopusReactionKind

/**
 * Converts between the JS-facing `OctopusReactionKind` string union and the native
 * [OctopusReactionKind]. Mirrors [ProfileFieldMapper]'s string-mapping pattern.
 */
object ReactionKindMapper {

  /**
   * @return the matching [OctopusReactionKind], or `null` when [reaction] does not match any
   * known value. Callers must distinguish this from a `null` input (which means "no reaction")
   * themselves — this function only maps non-null strings.
   */
  fun fromReactNativeString(reaction: String): OctopusReactionKind? {
    return when (reaction) {
      "heart" -> OctopusReactionKind.Heart
      "joy" -> OctopusReactionKind.Joy
      "mouthOpen" -> OctopusReactionKind.MouthOpen
      "clap" -> OctopusReactionKind.Clap
      "cry" -> OctopusReactionKind.Cry
      "rage" -> OctopusReactionKind.Rage
      else -> null
    }
  }
}
