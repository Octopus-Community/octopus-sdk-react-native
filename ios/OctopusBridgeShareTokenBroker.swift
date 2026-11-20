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
    let tokenProviderId: String?
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
  /// Read when the editor is about to open. It has to be consulted rather than assumed: wiring
  /// the native `OctopusPrefilledPost` signing closure while nobody is listening would emit a
  /// `bridgeShareTokenRequest` no one answers, and hold every prefilled image publish for the
  /// whole timeout before it goes out unsigned.
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

  /// Drops the global registration and settles its requests as "declined". Per-call signers
  /// have their own lifetime and must not be interrupted by a global listener being removed.
  func unregisterProvider() {
    lock.lock()
    providerRegistered = false
    lock.unlock()

    cancelRequests(tokenProviderId: nil)
  }

  /// Releases unanswered requests belonging to a completed call (or the global signer).
  func cancelRequests(tokenProviderId: String?) {
    lock.lock()
    let requestIds = pendingRequests.compactMap { key, pending in
      pending.tokenProviderId == tokenProviderId ? key : nil
    }
    let requests = requestIds.compactMap { pendingRequests.removeValue(forKey: $0) }
    lock.unlock()
    for pending in requests {
      settle(pending, with: nil)
    }
  }

  /// The closure handed to `OctopusPrefilledPost`'s `sign:` (and to
  /// `fetchOrCreateClientObjectRelatedPost`'s `tokenProvider`), or `nil` when there is no signer
  /// to ask — in which case the native SDK sends the post unsigned, exactly as it did before this
  /// feature existed.
  ///
  /// With a `tokenProviderId`, every request is routed to that call's JS provider only; without
  /// one, to the globally registered signer, if any.
  ///
  /// A declined signature (JS answered `null`, its signer threw, or nobody answered within the
  /// timeout) returns `nil`, which the native SDK reads as "send unsigned": the server then
  /// publishes the post where member pictures are allowed and refuses it where they are not.
  /// That is what Android's `bridgeShareTokenProvider` does with a `null` reply, so both
  /// platforms honour the JS contract the same way.
  func signClosureOrNil(
    tokenProviderId: String? = nil
  ) -> (@Sendable (_ bridgeFingerprint: String) async throws -> String?)? {
    guard tokenProviderId != nil || isProviderRegistered else { return nil }
    return { [weak self] bridgeFingerprint in
      guard let self else { throw BridgeShareSignError.brokerDeallocated }
      return await self.requestToken(
        bridgeFingerprint: bridgeFingerprint, tokenProviderId: tokenProviderId
      )
    }
  }

  /// Answers `requestId` with `token`, or with "do not sign" when `token` is `nil`.
  func completeRequest(requestId: String, token: String?) {
    if let pending = takePendingRequest(requestId) {
      settle(pending, with: token)
    }
  }

  /// Emits `bridgeShareTokenRequest` and suspends until JS answers it, or the wait times out.
  private func requestToken(bridgeFingerprint: String, tokenProviderId: String?) async -> String? {
    let requestId = UUID().uuidString

    return await withCheckedContinuation { continuation in
      storePendingRequest(continuation, for: requestId, tokenProviderId: tokenProviderId)
      eventManager?.emitBridgeShareTokenRequest(
        requestId: requestId, bridgeFingerprint: bridgeFingerprint, tokenProviderId: tokenProviderId
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
    for requestId: String,
    tokenProviderId: String?
  ) {
    lock.lock()
    defer { lock.unlock() }
    pendingRequests[requestId] = PendingRequest(
      continuation: continuation, tokenProviderId: tokenProviderId
    )
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

/// Why a prefilled share could not be signed. Raised from the `OctopusPrefilledPost` signing
/// closure, which the native SDK reports as a failed publish — the editor stays open with an
/// alert. A declined signature is not one of these: it sends the post unsigned instead.
enum BridgeShareSignError: Error, LocalizedError {
  /// The bridge was torn down while the native SDK was asking it for a signature.
  case brokerDeallocated

  var errorDescription: String? {
    switch self {
    case .brokerDeallocated:
      return "The Octopus bridge was torn down before the share could be signed."
    }
  }
}
