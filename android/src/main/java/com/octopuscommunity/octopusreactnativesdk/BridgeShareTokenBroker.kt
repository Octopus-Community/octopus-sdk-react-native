package com.octopuscommunity.octopusreactnativesdk

import android.util.Log
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume

/**
 * Drives the `bridgeShareTokenRequest` round-trip that signs a prefilled (Bridge /
 * Share-in-game) post so the server accepts its image in a community configured to forbid
 * member pictures.
 *
 * Process-static for the same reason [OctopusEventEmitter.instance] is: the editor runs in
 * [OctopusActivity], which is launched separately and holds no reference to the React module
 * that owns the bridge. The native SDK consults the provider at publish time, from the
 * Activity's composition — so the store the reply lands in has to be reachable from both
 * sides.
 *
 * Mirrors [OctopusSSOAuthenticator]'s pending-request handling: a `requestId`-keyed
 * continuation, claimed with an atomic `remove` before being resumed, and a bounded wait so a
 * JS side that never answers cannot hang the publish forever.
 */
object BridgeShareTokenBroker {

  /**
   * How long a `bridgeShareTokenRequest` may stay unanswered before the publish proceeds
   * unsigned. Same value, same unit as [OctopusSSOAuthenticator]'s token-request timeout —
   * `bridgeShareTokenProvider.test.ts` compares it with the iOS bridge's.
   */
  const val TOKEN_REQUEST_TIMEOUT_MS = 60_000L

  private const val TAG = "OctopusBridgeShare"

  /**
   * Whether JS has registered a signer (`addBridgeShareTokenRequestListener`).
   *
   * Read when the editor opens, so the provider is only handed to the native SDK when someone
   * can answer it. Without the flag every host would start paying the round-trip — and its
   * timeout — on every prefilled image publish.
   */
  @Volatile
  var isProviderRegistered: Boolean = false
    private set

  private data class PendingRequest(
    val continuation: Continuation<String?>,
    val tokenProviderId: String?
  )

  private val pendingRequests = ConcurrentHashMap<String, PendingRequest>()

  fun registerProvider() {
    isProviderRegistered = true
  }

  /**
   * Drops the global registration and settles its requests as "unsigned". Per-call signers
   * have their own lifetime and must not be interrupted by a global listener being removed.
   */
  fun unregisterProvider() {
    isProviderRegistered = false
    cancelRequests(tokenProviderId = null)
  }

  /** Releases any unanswered requests belonging to a completed call (or the global signer). */
  fun cancelRequests(tokenProviderId: String?) {
    for ((requestId, pending) in pendingRequests) {
      if (pending.tokenProviderId == tokenProviderId) {
        pendingRequests.remove(requestId)?.continuation?.resume(null)
      }
    }
  }

  /**
   * Uses the call's signer when [tokenProviderId] is provided, otherwise the global signer.
   * Returns `null` when neither exists, so the native SDK sends the post unsigned.
   */
  fun providerOrNull(
    tokenProviderId: String? = null
  ): (suspend (bridgeFingerprint: String) -> String?)? =
    if (tokenProviderId != null || isProviderRegistered) {
      { bridgeFingerprint -> requestToken(bridgeFingerprint, tokenProviderId) }
    } else {
      null
    }

  /** Answers [requestId] with [token], or with "do not sign" when [token] is `null`. */
  fun completeRequest(requestId: String, token: String?) {
    pendingRequests.remove(requestId)?.continuation?.resume(token)
  }

  /**
   * Emits `bridgeShareTokenRequest` and suspends until JS answers it.
   *
   * Every failure mode resolves to `null` (publish unsigned) rather than throwing: this runs
   * inside the native SDK's publish path, and an exception escaping here would surface to the
   * user as an opaque editor error instead of the server's own, actionable rejection. The
   * unsigned post is refused by a pictures-off community anyway, so nothing is silently
   * accepted that should not have been.
   */
  private suspend fun requestToken(bridgeFingerprint: String, tokenProviderId: String?): String? {
    val emitter = OctopusEventEmitter.instance
    if (emitter == null) {
      Log.w(TAG, "No React event emitter available; publishing the share unsigned.")
      return null
    }

    val requestId = UUID.randomUUID().toString()
    return try {
      withTimeout(TOKEN_REQUEST_TIMEOUT_MS) {
        suspendCancellableCoroutine { continuation ->
          pendingRequests[requestId] = PendingRequest(continuation, tokenProviderId)
          continuation.invokeOnCancellation { pendingRequests.remove(requestId) }
          emitter.emitBridgeShareTokenRequest(requestId, bridgeFingerprint, tokenProviderId)
        }
      }
    } catch (e: TimeoutCancellationException) {
      // Must precede the CancellationException branch, which it subclasses. Never logs the
      // fingerprint or any token — only that nobody answered.
      Log.w(
        TAG,
        "No bridge share token after ${TOKEN_REQUEST_TIMEOUT_MS}ms; publishing unsigned. " +
          "Answer the bridgeShareTokenRequest listener, or drop the provider registration."
      )
      null
    }
    // A CancellationException that is NOT the timeout means the publish itself is being
    // cancelled (the editor went away mid-flight). Deliberately not caught: swallowing it
    // would ask the native SDK to carry on inside a coroutine that no longer exists.
  }
}
