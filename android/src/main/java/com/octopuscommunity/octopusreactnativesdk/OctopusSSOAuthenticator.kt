package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ClientUser
import com.octopuscommunity.sdk.domain.model.ClientUser.Profile.AgeInformation
import com.octopuscommunity.sdk.domain.model.Image
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.CancellationException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class OctopusSSOAuthenticator(private val eventEmitter: OctopusEventEmitter) {

  private val coroutineScope = CoroutineScope(Dispatchers.Main)
  private val pendingTokenRequests =
    ConcurrentHashMap<String, kotlin.coroutines.Continuation<String>>()

  fun connectUser(params: ReadableMap, promise: Promise) {
    coroutineScope.launch {
      try {
        val clientUser = parseClientUser(params)

        OctopusSDK.connectUser(
          user = clientUser,
          tokenProvider = { requestTokenFromRN() }
        )

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CONNECT_USER_ERROR", "Failed to connect user: ${e.message}", e)
      }
    }
  }

  fun disconnectUser(promise: Promise) {
    coroutineScope.launch {
      try {
        OctopusSDK.disconnectUser()

        // Cancel all pending token requests
        for ((_, continuation) in pendingTokenRequests) {
          continuation.resumeWithException(CancellationException("User disconnected"))
        }
        pendingTokenRequests.clear()

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("DISCONNECT_USER_ERROR", "Failed to disconnect user: ${e.message}", e)
      }
    }
  }

  fun completeTokenRequest(requestId: String, token: String) {
    val continuation = pendingTokenRequests.remove(requestId)
    continuation?.resume(token)
  }

  fun cancelTokenRequest(requestId: String) {
    val continuation = pendingTokenRequests.remove(requestId)
    continuation?.resumeWithException(CancellationException("Token request cancelled"))
  }

  private suspend fun requestTokenFromRN(): String {
    val requestId = UUID.randomUUID().toString()

    return suspendCancellableCoroutine { continuation ->
      pendingTokenRequests[requestId] = continuation

      continuation.invokeOnCancellation {
        pendingTokenRequests.remove(requestId)
      }

      eventEmitter.emitUserTokenRequest(requestId)
    }
  }

  private fun parseClientUser(params: ReadableMap): ClientUser {
    val userId = params.getString("userId")
      ?: throw IllegalArgumentException("Missing user id")

    val profile = parseUserProfile(params.getMap("profile"))

    return ClientUser(
      userId = userId,
      profile = profile
    )
  }

  private fun parseUserProfile(profileParams: ReadableMap?): ClientUser.Profile {
    if (profileParams == null) {
      return ClientUser.Profile()
    }

    val ageInformation = if (profileParams.hasKey("legalAgeReached")) {
      if (profileParams.getBoolean("legalAgeReached")) {
        AgeInformation.LegalAgeReached
      } else {
        AgeInformation.Underage
      }
    } else null

    val profilePicture = profileParams.getString("profilePicture")?.let { pictureUrl ->
      if (pictureUrl.startsWith("http://") || pictureUrl.startsWith("https://")) {
        Image.Remote(pictureUrl)
      } else {
        Image.Local(pictureUrl)
      }
    }

    return ClientUser.Profile(
      nickname = profileParams.getString("username"),
      bio = profileParams.getString("biography"),
      ageInformation = ageInformation,
      avatar = profilePicture
    )
  }
}
