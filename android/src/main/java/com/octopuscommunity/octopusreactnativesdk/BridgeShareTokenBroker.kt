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

  private val pendingRequests = ConcurrentHashMap<String, Continuation<String?>>()

  fun registerProvider() {
    isProviderRegistered = true
  }

  /**
   * Drops the registration and settles every request still in flight as "unsigned", so a
   * publish already waiting on JS is not left hanging until its timeout.
   */
  fun unregisterProvider() {
    isProviderRegistered = false
    for (requestId in pendingRequests.keys) {
      pendingRequests.remove(requestId)?.resume(null)
    }
  }

  /**
   * The callback handed to `CreatePostScreenInfo.bridgeShareTokenProvider`, or `null` when JS
   * registered no signer — in which case the native SDK sends prefilled shares unsigned,
   * exactly as it did before this feature existed.
   */
  fun providerOrNull(): (suspend (bridgeFingerprint: String) -> String?)? =
    if (isProviderRegistered) {
      { bridgeFingerprint -> requestToken(bridgeFingerprint) }
    } else {
      null
    }

  /** Answers [requestId] with [token], or with "do not sign" when [token] is `null`. */
  fun completeRequest(requestId: String, token: String?) {
    pendingRequests.remove(requestId)?.resume(token)
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
  private suspend fun requestToken(bridgeFingerprint: String): String? {
    val emitter = OctopusEventEmitter.instance
    if (emitter == null) {
      Log.w(TAG, "No React event emitter available; publishing the share unsigned.")
      return null
    }

    val requestId = UUID.randomUUID().toString()
    return try {
      withTimeout(TOKEN_REQUEST_TIMEOUT_MS) {
        suspendCancellableCoroutine { continuation ->
          pendingRequests[requestId] = continuation
          continuation.invokeOnCancellation { pendingRequests.remove(requestId) }
          emitter.emitBridgeShareTokenRequest(requestId, bridgeFingerprint)
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
