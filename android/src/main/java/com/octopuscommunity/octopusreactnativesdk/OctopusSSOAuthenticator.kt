package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ClientUser
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.domain.repository.ClientUserError
import com.octopuscommunity.sdk.domain.repository.ConnectionRepository.ConnectionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.async
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import android.content.Context
import android.util.Log
import java.io.File
import java.io.IOException
import java.net.URI
import android.net.Uri


class OctopusSSOAuthenticator internal constructor(
  private val context: Context,
  private val emitTokenRequest: (String) -> Unit,
  private val connect: suspend (ClientUser, suspend () -> String) -> OctopusResult<ConnectionState, ClientUserError>,
  private val disconnect: suspend () -> Unit,
  private val pictureLoader: (suspend (String, (File) -> Unit) -> Resource?)? = null
 ) {
  constructor(context: Context, eventEmitter: OctopusEventEmitter) : this(
    context,
    eventEmitter::emitUserTokenRequest,
    { user, provider -> OctopusSDK.connectUser(user = user, tokenProvider = provider) },
    { if (OctopusSDK.isInitialised) OctopusSDK.disconnectUser() }
  )

  private val sessionLock = Any()
  private var disposed = false
  private class Session(val generation: Long) {
    val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    @Volatile var cancellationCode = CODE_CONNECT_USER_ERROR
  }
  private var session = Session(0L)
  // Finite teardown operations must complete even if a later lifecycle call ends a session
  // or disposes the React module. This scope never runs sign-in or token requests.
  private val disconnectScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private data class PendingDisconnect(val generation: Long, val task: Deferred<Unit>)
  private var disconnectTask: PendingDisconnect? = null

  /** Invalidate work before logout, reset, stop, or a community/container change. */
  internal fun endSession(cancellationCode: String = CODE_CONNECT_USER_ERROR) {
    synchronized(sessionLock) {
      if (session.scope.isActive) session.cancellationCode = cancellationCode
      session.scope.cancel()
      for (requestId in pendingTokenRequests.keys) {
        pendingTokenRequests.remove(requestId)
          ?.resumeWithException(CancellationException("The SSO session ended"))
      }
      if (!disposed) session = Session(session.generation + 1)
    }
  }

  internal fun dispose() = synchronized(sessionLock) {
    disposed = true
    endSession()
  }

  private fun checkSession(expected: Session) = synchronized(sessionLock) {
    if (disposed || expected.generation != session.generation) {
      throw CancellationException("The SSO session ended")
    }
  }

  private fun launchInSession(
    promise: Promise,
    block: suspend CoroutineScope.(Session) -> Unit
  ) {
    val current = synchronized(sessionLock) {
      // The first connect after logout belongs to a new generation, even while it is
      // waiting for native teardown. A later logout must not reuse the old logout task.
      if (!disposed && disconnectTask?.generation == session.generation) endSession()
      session
    }
    val started = AtomicBoolean(false)
    current.scope.launch {
      started.set(true)
      block(current)
    }.invokeOnCompletion { error ->
      // A reload can cancel a queued launch before its try/catch ever runs.
      if (error != null && !started.get()) {
        promise.reject(current.cancellationCode, "The SSO session ended before the operation started.", error)
      }
    }
  }
  private val profilePictureCache by lazy {
    ProfilePictureCache(File(context.cacheDir, "octopus-profile-pictures"))
  }
  private val profilePictureLookup = object : ProfilePictureLookup {
    override fun readLocal(uriOrPath: String): ByteArray? {
      try {
        if (uriOrPath.startsWith("/")) return File(uriOrPath).takeIf { it.isFile }?.readBytes()
        val uri = Uri.parse(uriOrPath)
        if (uri.scheme == "file") {
          val path = uri.path ?: return null
          if (path.startsWith("/android_asset/")) {
            return context.assets.open(path.removePrefix("/android_asset/")).use { it.readBytes() }
          }
          return File(URI(uriOrPath)).takeIf { it.isFile }?.readBytes()
        }
        return context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
      } catch (error: IOException) {
        return null
      }
    }

    override fun drawableUri(name: String): String? {
      if (!name.matches(Regex("[A-Za-z0-9_]+"))) return null
      val id = context.resources.getIdentifier(name, "drawable", context.packageName)
      return if (id == 0) null else "android.resource://${context.packageName}/$id"
    }

    override fun readAsset(name: String): ByteArray? = try {
      context.assets.open(name).use { it.readBytes() }
    } catch (error: IOException) {
      null
    }

  }
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
    launchInSession(promise) { current ->
      var cachedPicture: File? = null
      var connected = false
      try {
        val clientUser = parseClientUser(params) { cachedPicture = it }
        val pendingDisconnect = synchronized(sessionLock) { disconnectTask }
        // The logout promise reports its failure. Sign-in only needs teardown to finish.
        pendingDisconnect?.task?.join()
        synchronized(sessionLock) {
          // A newer logout may have replaced the task while this connect was waiting.
          if (disconnectTask === pendingDisconnect) disconnectTask = null
        }
        checkSession(current)

        when (
          val result = connect(
            clientUser,
            { requestTokenFromRN(current) }
          )
        ) {
          is OctopusResult.Success -> {
            checkSession(current)
            connected = true
            promise.resolve(null)
          }
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
          // `cancelTokenRequest` reports that JS declined to sign a
          // token — an answer to report rather than an exception to rethrow.
          promise.reject(
            CODE_TOKEN_REQUEST_CANCELLED,
            e.message ?: "The user token request was cancelled.",
            e
          )
        } else {
          // Session teardown cancels avatar preparation and pending authentication.
          promise.reject(
            current.cancellationCode,
            "The connection attempt was interrupted before it completed.",
            e
          )
          throw e
        }
      } catch (e: ProfilePictureLoadException) {
        Log.w("OctopusReactNativeSdk", "Failed to load profile picture; rejecting connection: ${e.reason}")
        promise.reject(CODE_CONNECT_USER_ERROR, e.message, e)
      } catch (e: Exception) {
        promise.reject(CODE_CONNECT_USER_ERROR, "Failed to connect user: ${e.message}", e)
      } finally {
        withContext(kotlinx.coroutines.NonCancellable + Dispatchers.IO) {
          profilePictureCache.finish(cachedPicture, connected)
        }
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
    val task = synchronized(sessionLock) {
      val previous = disconnectTask
      if (!disposed && previous?.generation == session.generation && !previous.task.isCompleted) {
        previous.task
      } else {
        endSession(CODE_TOKEN_REQUEST_CANCELLED)
        // Serialize distinct logout generations too. A previous failure must not stop a
        // later logout from trying to disconnect the newer session.
        disconnectScope.async {
          previous?.task?.join()
          disconnect()
        }.also { disconnectTask = PendingDisconnect(session.generation, it) }
      }
    }
    disconnectScope.launch {
      try {
        task.await()
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
  private suspend fun requestTokenFromRN(current: Session): String {
    val requestId = UUID.randomUUID().toString()

    val token = withTimeout(TOKEN_REQUEST_TIMEOUT_MS) {
      suspendCancellableCoroutine<String> { continuation ->
        synchronized(sessionLock) {
          // The SDK may retain this provider beyond the connect call. A stale provider
          // must never register a request in the next user's session.
          checkSession(current)
          pendingTokenRequests[requestId] = continuation

          continuation.invokeOnCancellation {
            pendingTokenRequests.remove(requestId)
          }

          emitTokenRequest(requestId)
        }
      }
    }
    checkSession(current)
    return token
  }

  private suspend fun parseClientUser(params: ReadableMap, onCachedPicture: (File) -> Unit): ClientUser {
    val userId = params.getString("userId")
      ?: throw IllegalArgumentException("Missing user id")

    val profile = parseUserProfile(params.getMap("profile"), onCachedPicture)

    return ClientUser(
      userId = userId,
      profile = profile
    )
  }

  private suspend fun parseUserProfile(profileParams: ReadableMap?, onCachedPicture: (File) -> Unit): ClientUser.Profile {
    if (profileParams == null) {
      return ClientUser.Profile()
    }

    val nickname = profileParams.getString("username")
    val bio = profileParams.getString("biography")
    val profilePicture = profileParams.getString("profilePicture")?.let { input ->
      withContext(Dispatchers.IO) {
        (pictureLoader ?: ::loadProfilePictureResource)(input, onCachedPicture)
      }
    }

    return ClientUser.Profile(
      nickname = nickname,
      bio = bio,
      picture = profilePicture
    )
  }

  private suspend fun loadProfilePictureResource(input: String, onCachedPicture: (File) -> Unit): Resource? {
    try {
      return when (val parsed = loadProfilePicture(input, profilePictureLookup)) {
        null -> null
        is LoadedProfilePicture.Remote -> Resource.Remote(url = parsed.url)
        is LoadedProfilePicture.Local -> {
          val uri = if (parsed.uriOrPath.startsWith("/")) File(parsed.uriOrPath).toURI().toString() else parsed.uriOrPath
          Resource.Local(uri)
        }
        is LoadedProfilePicture.Bytes -> {
          val file = profilePictureCache.store(parsed.data)
          onCachedPicture(file)
          Resource.Local(file.toURI().toString())
        }
      }
    } catch (error: CancellationException) {
      throw error
    } catch (error: ProfilePictureLoadException) {
      throw error
    } catch (error: Exception) {
      throw ProfilePictureLoadException(error)
    }
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
