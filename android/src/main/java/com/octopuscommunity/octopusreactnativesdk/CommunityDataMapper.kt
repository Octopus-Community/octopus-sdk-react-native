package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.OctopusCommunityData
import com.octopuscommunity.sdk.domain.network.OctopusResult

/**
 * Serializes [OctopusCommunityData] to the JS-facing `OctopusCommunityData` shape.
 *
 * The native property is named `userId`; the JS type calls it `profileId` (matching the
 * cross-platform wrapper naming already used for the Flutter SDK) — this mapper is where that
 * rename happens.
 */
object CommunityDataMapper {

  /** Only a successful lookup may resolve null; failures match iOS's SERVER_ERROR rejection. */
  fun resolveFetchResult(result: OctopusResult<OctopusCommunityData?, Nothing>, promise: Promise) {
    when (result) {
      is OctopusResult.Success -> promise.resolve(result.data?.let { toWritableMap(it) })
      is OctopusResult.Failure -> {
        val message = when (result) {
          is OctopusResult.Failure.NoNetwork -> "No network"
          is OctopusResult.Failure.UserNotAuthenticated -> result.reason ?: "User not authenticated"
          is OctopusResult.Failure.PermissionDenied -> result.reason ?: "Permission denied"
          is OctopusResult.Failure.ContentUnavailable -> "Content unavailable"
          is OctopusResult.Failure.StatusError -> result.description ?: "Server error ${result.code}"
          is OctopusResult.Failure.InvalidArguments -> result.errorMessage
        }
        val error = (result as? OctopusResult.Failure.StatusError)?.exception
        promise.reject("SERVER_ERROR", message, error)
      }
    }
  }

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
