package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ClientUser
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.domain.repository.ClientUserError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import android.content.Context


class OctopusSSOAuthenticator(
  private val context: Context,
  private val eventEmitter: OctopusEventEmitter
 ) {

  private val coroutineScope = CoroutineScope(Dispatchers.Main)
  private val pendingTokenRequests =
    ConcurrentHashMap<String, kotlin.coroutines.Continuation<String>>()

  /**
   * Connects the client user, forwarding the native outcome to JS.
   *
   * `OctopusSDK.connectUser` reports a refused connection as an
   * [OctopusResult.Failure] **return value**, not as an exception — a banned user or an
   * unusable token therefore looks exactly like a success unless the result is inspected.
   * The promise resolves only on [OctopusResult.Success]; every failure rejects with a
   * stable code (see [toBridgeError]) so the host app can tell "connected" from
   * "still anonymous".
   *
   * The promise settles only once the native SDK has finished authenticating, which
   * includes the `userTokenRequest` round-trip through JS. A token provider must
   * therefore already be registered when this is called; if none answers, the wait is
   * bounded by [TOKEN_REQUEST_TIMEOUT_MS] so the promise always settles.
   */
  fun connectUser(params: ReadableMap, promise: Promise) {
    coroutineScope.launch {
      try {
        val clientUser = parseClientUser(params)

        when (
          val result = OctopusSDK.connectUser(
            user = clientUser,
            tokenProvider = { requestTokenFromRN() }
          )
        ) {
          is OctopusResult.Success -> promise.resolve(null)
          is OctopusResult.Failure -> {
            val (code, message) = result.toBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: TimeoutCancellationException) {
        // Must precede the CancellationException branch: TimeoutCancellationException is a
        // subclass of it, and reporting a timeout as a cancellation would blame JS for a
        // listener that simply never answered.
        promise.reject(
          CODE_TOKEN_REQUEST_TIMEOUT,
          "The user token request timed out after ${TOKEN_REQUEST_TIMEOUT_MS}ms. Register a " +
            "userTokenRequest listener before calling connectUser, and answer it with " +
            "completeUserTokenRequest or cancelUserTokenRequest.",
          e
        )
      } catch (e: CancellationException) {
        if (isActive) {
          // The scope is alive, so this is not a scope cancellation: it is how
          // `cancelTokenRequest` (or `disconnectUser`) reports that JS declined to sign a
          // token — an answer to report rather than an exception to rethrow.
          promise.reject(
            CODE_TOKEN_REQUEST_CANCELLED,
            e.message ?: "The user token request was cancelled.",
            e
          )
        } else {
          // The scope itself was cancelled. Nothing in this module cancels `coroutineScope`
          // today, so this branch is defence in depth rather than a path with a known
          // trigger: settle the promise so JS never waits forever, then honour the
          // cancellation instead of swallowing it.
          promise.reject(
            CODE_CONNECT_USER_ERROR,
            "The connection attempt was interrupted before it completed.",
            e
          )
          throw e
        }
      } catch (e: Exception) {
        promise.reject(CODE_CONNECT_USER_ERROR, "Failed to connect user: ${e.message}", e)
      }
    }
  }

  /**
   * Maps a native connection failure onto the `(code, message)` pair rejected to JS.
   *
   * Codes are shared with the iOS bridge, which maps the equivalent
   * `OctopusConnectUserError` cases. Only [CODE_USER_BANNED] carries a backend-provided,
   * user-facing message; the other messages are diagnostics for the host developer.
   */
  private fun OctopusResult.Failure<ClientUserError>.toBridgeError(): Pair<String, String> =
    when (this) {
      is OctopusResult.Failure.NoNetwork ->
        CODE_NO_NETWORK to "No network connection available."

      is OctopusResult.Failure.ContentUnavailable ->
        CODE_CONTENT_UNAVAILABLE to "The requested content is unavailable."

      is OctopusResult.Failure.UserNotAuthenticated ->
        CODE_USER_NOT_AUTHENTICATED to (reason ?: "The user is not authenticated.")

      is OctopusResult.Failure.PermissionDenied ->
        CODE_PERMISSION_DENIED to (reason ?: "Permission denied.")

      is OctopusResult.Failure.StatusError ->
        CODE_SERVER_ERROR to (description ?: "Server error (HTTP ${this.code}).")

      is OctopusResult.Failure.InvalidArguments -> clientUserErrorToBridgeError(errors)
    }

  /**
   * Picks the most actionable error of an [OctopusResult.Failure.InvalidArguments] batch.
   *
   * The native SDK may report several errors at once and does not order them, so a ban is
   * searched for across the whole list rather than read off the first entry — mirroring the
   * iOS SDK, which looks the ban reason up the same way.
   */
  private fun clientUserErrorToBridgeError(
    errors: List<ClientUserError>
  ): Pair<String, String> {
    errors.filterIsInstance<ClientUserError.UserBanned>().firstOrNull()?.let { banned ->
      return CODE_USER_BANNED to banned.errorMessage
    }
    errors.filterIsInstance<ClientUserError.MissingToken>().firstOrNull()?.let { missing ->
      return CODE_MISSING_TOKEN to missing.errorMessage
    }
    errors.filterIsInstance<ClientUserError.ProfileError>().firstOrNull()?.let { profile ->
      return CODE_PROFILE_ERROR to profile.errorMessage
    }
    return CODE_CONNECT_USER_ERROR to
      (errors.firstOrNull()?.errorMessage ?: "Failed to connect user.")
  }

  fun disconnectUser(promise: Promise) {
    coroutineScope.launch {
      try {
        OctopusSDK.disconnectUser()

        // Claim each continuation with an atomic `remove` before resuming it, the same way
        // `completeTokenRequest` does. Without the claim, a `completeTokenRequest` arriving on
        // the native-modules thread while this runs on the main thread can resume the same
        // continuation, and the second resume throws "Already resumed" — which the catch
        // below would report to JS as a spurious DISCONNECT_USER_ERROR. Entries added while
        // this loop runs are deliberately left alone rather than dropped by a `clear()`: an
        // unclaimed request still settles, on its own timeout.
        for (requestId in pendingTokenRequests.keys) {
          pendingTokenRequests
            .remove(requestId)
            ?.resumeWithException(CancellationException("User disconnected"))
        }

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

  /**
   * Emits `userTokenRequest` and suspends until JS answers it.
   *
   * The wait is bounded by [TOKEN_REQUEST_TIMEOUT_MS]. JS may never answer — no listener is
   * registered, or a listener drops the `requestId` — and the native event channel has no
   * buffer, so an unbounded wait would leave `connectUser`'s promise pending forever. On
   * expiry the continuation is cancelled, `invokeOnCancellation` drops the pending entry, and
   * the [TimeoutCancellationException] travels back out through the native SDK (which
   * rethrows any non-gRPC exception raised by the token provider) to `connectUser`.
   */
  private suspend fun requestTokenFromRN(): String {
    val requestId = UUID.randomUUID().toString()

    return withTimeout(TOKEN_REQUEST_TIMEOUT_MS) {
      suspendCancellableCoroutine { continuation ->
        pendingTokenRequests[requestId] = continuation

        continuation.invokeOnCancellation {
          pendingTokenRequests.remove(requestId)
        }

        eventEmitter.emitUserTokenRequest(requestId)
      }
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

    val profilePicture = profileParams.getString("profilePicture")?.let { pictureUrl ->
      if (pictureUrl.startsWith("http://") || pictureUrl.startsWith("https://")) {
        Resource.Remote(url = pictureUrl)
      } else if (pictureUrl.startsWith("file") || pictureUrl.startsWith("android.resource")) {
        Resource.Local(pictureUrl)
      } else if(pictureUrl.isNotBlank()) {
        // Asset names like "assets_images_logo" need conversion
        // Convert to drawable resource URI
        val resourceId = context.resources.getIdentifier(pictureUrl, "drawable", context.packageName)
        Resource.Local(
          if (resourceId != 0) {
            "android.resource://${context.packageName}/$resourceId"
          } else {
            // Fallback: try assets folder
            "file:///android_asset/$pictureUrl"
          }
        )
      } else {
        null
      }
    }

    return ClientUser.Profile(
      nickname = profileParams.getString("username"),
      bio = profileParams.getString("biography"),
      picture = profilePicture
    )
  }

  /**
   * Rejection codes for `connectUser`. This list is one third of a three-sided contract:
   * the iOS bridge rejects with the same strings, and `ConnectUserErrorCode` in
   * `src/types/connectUserError.ts` is the union JS consumers match on. Changing a value
   * here without changing the other two sides breaks the public API silently.
   *
   * Not every code is reachable on both platforms — the native SDKs classify failures
   * differently. The TS type documents which platform emits what.
   */
  private companion object {
    const val CODE_CONNECT_USER_ERROR = "CONNECT_USER_ERROR"
    const val CODE_USER_BANNED = "USER_BANNED"
    const val CODE_MISSING_TOKEN = "MISSING_TOKEN"
    const val CODE_PROFILE_ERROR = "PROFILE_ERROR"
    const val CODE_NO_NETWORK = "NO_NETWORK"
    const val CODE_SERVER_ERROR = "SERVER_ERROR"
    const val CODE_USER_NOT_AUTHENTICATED = "USER_NOT_AUTHENTICATED"
    const val CODE_PERMISSION_DENIED = "PERMISSION_DENIED"
    const val CODE_CONTENT_UNAVAILABLE = "CONTENT_UNAVAILABLE"
    const val CODE_TOKEN_REQUEST_CANCELLED = "TOKEN_REQUEST_CANCELLED"
    const val CODE_TOKEN_REQUEST_TIMEOUT = "TOKEN_REQUEST_TIMEOUT"

    /**
     * How long a `userTokenRequest` may stay unanswered before `connectUser` gives up.
     *
     * The iOS bridge bounds the same wait with the same value, expressed in the same unit so
     * the two cannot drift unnoticed — `connectUserErrorParity.test.ts` compares them.
     */
    const val TOKEN_REQUEST_TIMEOUT_MS = 60_000L
  }
}
