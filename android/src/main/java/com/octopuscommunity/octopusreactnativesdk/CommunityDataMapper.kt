package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.OctopusCommunityData

/**
 * Serializes [OctopusCommunityData] to the JS-facing `OctopusCommunityData` shape.
 *
 * The native property is named `userId`; the JS type calls it `profileId` (matching the
 * cross-platform wrapper naming already used for the Flutter SDK) — this mapper is where that
 * rename happens.
 */
object CommunityDataMapper {

  fun toWritableMap(data: OctopusCommunityData): WritableMap {
    val map = Arguments.createMap()
    map.putString("profileId", data.userId)
    // Bound to a local val before the null check: `data.messageCount` is a property declared in
    // a different module (the SDK library), so Kotlin cannot smart-cast it directly even right
    // after a null check on the property access itself.
    val messageCount = data.messageCount
    if (messageCount != null) {
      map.putInt("messageCount", messageCount)
    } else {
      map.putNull("messageCount")
    }
    val gamification = data.gamification
    if (gamification != null) {
      val gamificationMap = Arguments.createMap()
      gamificationMap.putInt("level", gamification.level)
      val score = gamification.score
      if (score != null) {
        gamificationMap.putInt("score", score)
      } else {
        gamificationMap.putNull("score")
      }
      map.putMap("gamification", gamificationMap)
    } else {
      map.putNull("gamification")
    }
    return map
  }
}
