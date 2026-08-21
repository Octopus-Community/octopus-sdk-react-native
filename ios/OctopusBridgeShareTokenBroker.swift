import Foundation

/// Drives the `bridgeShareTokenRequest` round-trip that signs a prefilled (Bridge /
/// Share-in-game) post so the server accepts its image in a community configured to forbid
/// member pictures.
///
/// Mirrors ``OctopusSSOAuthenticator``'s pending-request handling — a `requestId`-keyed
/// continuation claimed under a lock, resumed exactly once, with a bounded wait so a JS side
/// that never answers cannot leave the editor hanging. The Android counterpart is
/// `BridgeShareTokenBroker.kt`; it needs to be process-static because the editor there runs in
/// its own Activity, whereas on iOS the same bridge instance presents the editor, so this is a
/// plain instance.
class OctopusBridgeShareTokenBroker {

  /// How long a `bridgeShareTokenRequest` may stay unanswered before the signature is given up
  /// on. Same value and unit as `BridgeShareTokenBroker.TOKEN_REQUEST_TIMEOUT_MS`, so the two
  /// cannot drift unnoticed — `bridgeShareTokenProvider.test.ts` compares them.
  static let tokenRequestTimeoutMilliseconds: UInt64 = 60_000

  private weak var eventManager: OctopusEventManager?

  /// A `bridgeShareTokenRequest` waiting for JS, together with the task that will time it out.
  /// Both are claimed at once so answering a request also releases its timer.
  private struct PendingRequest {
    let continuation: CheckedContinuation<String?, Never>
    var timeoutTask: Task<Void, Never>?
  }

  /// Guards ``pendingRequests`` and ``isProviderRegistered``.
  ///
  /// Reached from the bridge queue (`completeRequest`, register/unregister), the native SDK's
  /// signing task, and the timeout task. A continuation is always resumed — and its timeout
  /// task always cancelled — *outside* the lock, since either could re-enter.
  private let lock = NSLock()
  private var pendingRequests: [String: PendingRequest] = [:]
  private var providerRegistered = false

  init(eventManager: OctopusEventManager?) {
    self.eventManager = eventManager
  }

  deinit {
    // An unresumed `CheckedContinuation` is a leak the Swift runtime reports, and nothing else
    // is left to answer these once the broker is gone.
    for pending in takeAllPendingRequests() {
      settle(pending, with: nil)
    }
  }

  /// Whether JS has registered a signer (`addBridgeShareTokenRequestListener`).
  ///
  /// Read when the editor is about to open. It has to be consulted rather than assumed: the
  /// native `OctopusPrefilledPost.sign` closure has **no "proceed unsigned" channel** — it
  /// returns a non-optional `String` and throws — so wiring it while nobody is listening would
  /// turn every prefilled image publish into a client-side failure.
  var isProviderRegistered: Bool {
    lock.lock()
    defer { lock.unlock() }
    return providerRegistered
  }

  func registerProvider() {
    lock.lock()
    providerRegistered = true
    lock.unlock()
  }

  /// Drops the registration and settles every request still in flight as "declined", so a
  /// publish already waiting on JS is not left hanging until its timeout.
  func unregisterProvider() {
    lock.lock()
    providerRegistered = false
    lock.unlock()

    for pending in takeAllPendingRequests() {
      settle(pending, with: nil)
    }
  }

  /// The closure handed to `OctopusPrefilledPost.sign`, or `nil` when JS registered no signer —
  /// in which case the native SDK sends prefilled shares unsigned, exactly as it did before
  /// this feature existed.
  func signClosureOrNil() -> (@Sendable (_ bridgeFingerprint: String) async throws -> String)? {
    guard isProviderRegistered else { return nil }
    return { [weak self] bridgeFingerprint in
      guard let self else { throw BridgeShareSignError.brokerDeallocated }
      guard let token = await self.requestToken(bridgeFingerprint: bridgeFingerprint) else {
        // The shape adapter, and the one place iOS and Android diverge. The JS contract has a
        // `null` reply meaning "publish unsigned", which Android honours; `sign` cannot express
        // it, so a declined signature fails the publish here rather than sending an empty or
        // fabricated token. Documented on `useBridgeShareTokenProvider`.
        throw BridgeShareSignError.notSigned
      }
      return token
    }
  }

  /// Answers `requestId` with `token`, or with "do not sign" when `token` is `nil`.
  func completeRequest(requestId: String, token: String?) {
    if let pending = takePendingRequest(requestId) {
      settle(pending, with: token)
    }
  }

  /// Emits `bridgeShareTokenRequest` and suspends until JS answers it, or the wait times out.
  private func requestToken(bridgeFingerprint: String) async -> String? {
    let requestId = UUID().uuidString

    return await withCheckedContinuation { continuation in
      storePendingRequest(continuation, for: requestId)
      eventManager?.emitBridgeShareTokenRequest(
        requestId: requestId, bridgeFingerprint: bridgeFingerprint
      )
      declineOnTimeout(requestId: requestId)
    }
  }

  /// Declines `requestId` once the timeout elapses, unless it has been answered by then. The
  /// task is recorded against the request so answering it cancels the timer instead of leaving
  /// it asleep for the remainder of the timeout.
  private func declineOnTimeout(requestId: String) {
    let task = Task { [weak self] in
      do {
        try await Task.sleep(nanoseconds: Self.tokenRequestTimeoutMilliseconds * 1_000_000)
      } catch {
        // Cancelled rather than elapsed — the request was answered, so claim nothing.
        return
      }
      guard let self, let pending = self.takePendingRequest(requestId) else { return }
      self.settle(pending, with: nil)
    }

    if !attachTimeoutTask(task, to: requestId) {
      // JS answered before the timer could even be recorded, so nothing will ever claim it.
      task.cancel()
    }
  }

  /// Releases `pending`'s timer, then answers its continuation. Only ever called outside
  /// ``lock``: both `cancel()` and `resume` can re-enter.
  private func settle(_ pending: PendingRequest, with token: String?) {
    pending.timeoutTask?.cancel()
    pending.continuation.resume(returning: token)
  }

  private func storePendingRequest(
    _ continuation: CheckedContinuation<String?, Never>,
    for requestId: String
  ) {
    lock.lock()
    defer { lock.unlock() }
    pendingRequests[requestId] = PendingRequest(continuation: continuation)
  }

  /// Records `task` as `requestId`'s timer, reporting whether the request was still pending.
  /// `false` means it was answered in between, and the caller owns the task.
  private func attachTimeoutTask(_ task: Task<Void, Never>, to requestId: String) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard pendingRequests[requestId] != nil else { return false }
    pendingRequests[requestId]?.timeoutTask = task
    return true
  }

  /// Removes `requestId` and returns it, or `nil` if it was already answered. Claiming under
  /// the lock is what makes "answered exactly once" hold when a reply races the timeout.
  private func takePendingRequest(_ requestId: String) -> PendingRequest? {
    lock.lock()
    defer { lock.unlock() }
    return pendingRequests.removeValue(forKey: requestId)
  }

  private func takeAllPendingRequests() -> [PendingRequest] {
    lock.lock()
    defer { lock.unlock() }
    let pending = Array(pendingRequests.values)
    pendingRequests.removeAll()
    return pending
  }
}

/// Why a prefilled share could not be signed. Raised from the `OctopusPrefilledPost.sign`
/// closure, which the native SDK reports as a failed publish — the editor stays open with an
/// alert rather than sending an unusable token.
enum BridgeShareSignError: Error, LocalizedError {
  /// JS declined to sign (returned `null`, threw, or never answered within the timeout).
  case notSigned
  /// The bridge was torn down while the native SDK was asking it for a signature.
  case brokerDeallocated

  var errorDescription: String? {
    switch self {
    case .notSigned:
      return "The bridge share token provider did not return a token for this post."
    case .brokerDeallocated:
      return "The Octopus bridge was torn down before the share could be signed."
    }
  }
}
