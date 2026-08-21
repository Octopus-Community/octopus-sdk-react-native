import Octopus

class OctopusSSOAuthenticator {
  /// How long a `userTokenRequest` may stay unanswered before `connectUser` gives up.
  ///
  /// The Android bridge bounds the same wait with the same value, expressed in the same unit so
  /// the two cannot drift unnoticed — `connectUserErrorParity.test.ts` compares them.
  static let tokenRequestTimeoutMilliseconds: UInt64 = 60_000

  private weak var octopusSDK: OctopusSDK?
  private weak var eventManager: OctopusEventManager?

  /// A `userTokenRequest` waiting for JS, together with the task that will time it out.
  ///
  /// Both are claimed at once so answering a request also releases its timer, instead of
  /// leaving a sleeping task behind for the rest of the timeout.
  private struct PendingTokenRequest {
    let continuation: CheckedContinuation<String, Error>
    var timeoutTask: Task<Void, Never>?
  }

  /// Guards ``pendingTokenRequests``.
  ///
  /// The dictionary is reached from three unrelated contexts: the bridge queue
  /// (`completeTokenRequest`, `cancelTokenRequest`, `disconnectUser`), the native SDK's
  /// token-provider task, and the timeout task started by ``requestTokenFromRN()``. A
  /// continuation is always resumed — and its timeout task always cancelled — *outside* the
  /// lock, since either could re-enter.
  private let pendingTokenRequestsLock = NSLock()
  private var pendingTokenRequests: [String: PendingTokenRequest] = [:]

  init(octopusSDK: OctopusSDK, eventManager: OctopusEventManager) {
    self.octopusSDK = octopusSDK
    self.eventManager = eventManager
  }

  deinit {
    // A request pending here would otherwise never be answered: the timeout task holds `self`
    // weakly and gives up as soon as it is gone, so nothing is left to resume the continuation —
    // and an unresumed `CheckedContinuation` is a leak the Swift runtime reports. The whole bridge
    // is being torn down, hence the same error the token provider raises for that case.
    for pending in takeAllPendingTokenRequests() {
      settle(pending, with: .failure(AuthenticatorDeallocatedError()))
    }
  }

  /// Connects the client user and waits for the native outcome.
  ///
  /// `OctopusSDK.connectUser` is overloaded: a fire-and-forget variant that only
  /// `Logger.connection.debug`s a refused connection, and the typed-throws async variant used
  /// here. The bridge awaits the latter so a banned user or an unusable token reaches JS as a
  /// rejection instead of looking like a success.
  ///
  /// The two overloads take identical parameter lists, so which one runs is decided by the call
  /// site alone: `try await` selects the throwing one. That is not incidental — reaching the
  /// fire-and-forget twin now requires an explicit cast, which is how this bridge used to
  /// silence every failure.
  ///
  /// The promise therefore settles only once the native SDK has finished authenticating,
  /// including the `userTokenRequest` round-trip through JS — a token provider must already be
  /// registered when this is called, and if none answers the wait is bounded by
  /// ``tokenRequestTimeoutMilliseconds`` so the promise always settles.
  ///
  /// One native behaviour survives this and cannot be fixed from the bridge: when the token
  /// exchange fails while nothing is connected yet, `SSOConnectionRepository.connect()` falls back
  /// to `connectAsGuest()` and returns normally, so a token-provider failure resolves the promise
  /// instead of rejecting it. The rejection does arrive when a connection already exists, because
  /// that path rethrows. The same `connect()` also opens with `guard !isConnecting else { return }`
  /// while its caller only *samples* that flag, so a concurrent guest connection can make the call
  /// return without ever requesting a token — no request is created on that path, so nothing is
  /// left unsettled, but the promise resolves all the same.
  /// `ConnectUserErrorCode` documents the consequence for JS consumers.
  func connectUser(params: [String: Any]) async throws {
    guard let octopus = octopusSDK else {
      throw AuthenticationError.sdkNotInitialized
    }

    do {
      let clientUser = try await parseClientUser(from: params)
      let tokenProvider: @Sendable () async throws -> String = { [weak self] in
        // Deliberately not a `CancellationError`: that is how JS declining a request is
        // reported, and a torn-down authenticator is not JS declining anything.
        guard let self else { throw AuthenticatorDeallocatedError() }
        return try await self.requestTokenFromRN()
      }
      try await octopus.connectUser(clientUser, tokenProvider: tokenProvider)
    } catch let error as AuthenticationError {
      throw error
    } catch let error as OctopusConnectUserError {
      throw ConnectUserBridgeError(from: error)
    } catch {
      throw AuthenticationError.unknownError(error)
    }
  }
  
  func completeTokenRequest(requestId: String, token: String) {
    if let pending = takePendingTokenRequest(requestId) {
      settle(pending, with: .success(token))
    }
  }

  func cancelTokenRequest(requestId: String) {
    if let pending = takePendingTokenRequest(requestId) {
      settle(pending, with: .failure(CancellationError()))
    }
  }

  /// Releases `pending`'s timer, then answers its continuation.
  ///
  /// Only ever called outside ``pendingTokenRequestsLock``: `cancel()` resumes a sleeping task
  /// that itself claims from the dictionary, and `resume` hands control back to the native SDK,
  /// so doing either under the lock could re-enter it.
  private func settle(_ pending: PendingTokenRequest, with result: Result<String, Error>) {
    pending.timeoutTask?.cancel()
    pending.continuation.resume(with: result)
  }

  /// Emits `userTokenRequest` and suspends until JS answers it.
  ///
  /// The wait is bounded by ``tokenRequestTimeoutMilliseconds``. JS may never answer — no
  /// listener is registered, or a listener drops the `requestId` — and the native event channel
  /// has no buffer, so an unbounded wait would leave `connectUser`'s promise pending forever.
  private func requestTokenFromRN() async throws -> String {
    let requestId = UUID().uuidString

    return try await withCheckedThrowingContinuation { continuation in
      storePendingTokenRequest(continuation, for: requestId)
      eventManager?.emitUserTokenRequest(requestId: requestId)
      failTokenRequestOnTimeout(requestId: requestId)
    }
  }

  /// Fails `requestId` once the timeout elapses, unless it has been answered by then.
  ///
  /// The resulting ``TokenRequestTimeoutError`` travels out through the native SDK, which wraps
  /// any error it does not recognise in `OctopusConnectUserError.other`, and is unwrapped back
  /// into a `TOKEN_REQUEST_TIMEOUT` rejection by ``ConnectUserBridgeError``.
  ///
  /// The task is recorded against the request so answering the request cancels the timer
  /// instead of leaving it asleep for the remainder of the timeout — which is what the Android
  /// bridge's `withTimeout` does on normal completion.
  private func failTokenRequestOnTimeout(requestId: String) {
    let task = Task { [weak self] in
      do {
        try await Task.sleep(nanoseconds: Self.tokenRequestTimeoutMilliseconds * 1_000_000)
      } catch {
        // Cancelled rather than elapsed — the request was answered, so claim nothing.
        return
      }
      guard let self, let pending = self.takePendingTokenRequest(requestId) else { return }
      self.settle(
        pending,
        with: .failure(
          TokenRequestTimeoutError(timeoutMilliseconds: Self.tokenRequestTimeoutMilliseconds)
        )
      )
    }

    if !attachTimeoutTask(task, to: requestId) {
      // JS answered before the timer could even be recorded, so nothing will ever claim it.
      task.cancel()
    }
  }

  private func storePendingTokenRequest(
    _ continuation: CheckedContinuation<String, Error>,
    for requestId: String
  ) {
    pendingTokenRequestsLock.lock()
    defer { pendingTokenRequestsLock.unlock() }
    pendingTokenRequests[requestId] = PendingTokenRequest(continuation: continuation)
  }

  /// Records `task` as `requestId`'s timer, reporting whether the request was still pending.
  ///
  /// `false` means it was answered in between, in which case the caller owns the task and must
  /// cancel it — nothing else holds a reference to it any more.
  private func attachTimeoutTask(_ task: Task<Void, Never>, to requestId: String) -> Bool {
    pendingTokenRequestsLock.lock()
    defer { pendingTokenRequestsLock.unlock() }
    guard pendingTokenRequests[requestId] != nil else { return false }
    pendingTokenRequests[requestId]?.timeoutTask = task
    return true
  }

  /// Removes `requestId` and returns it, or `nil` if it was already answered.
  ///
  /// Claiming under the lock is what makes "answered exactly once" hold: a
  /// `completeTokenRequest` racing the timeout task means one of them gets `nil`.
  private func takePendingTokenRequest(_ requestId: String) -> PendingTokenRequest? {
    pendingTokenRequestsLock.lock()
    defer { pendingTokenRequestsLock.unlock() }
    return pendingTokenRequests.removeValue(forKey: requestId)
  }

  private func takeAllPendingTokenRequests() -> [PendingTokenRequest] {
    pendingTokenRequestsLock.lock()
    defer { pendingTokenRequestsLock.unlock() }
    let pending = Array(pendingTokenRequests.values)
    pendingTokenRequests.removeAll()
    return pending
  }

  func disconnectUser() throws {
    guard let octopus = octopusSDK else {
      throw AuthenticationError.sdkNotInitialized
    }
    
    octopus.disconnectUser()

    // Cancel all pending token requests
    for pending in takeAllPendingTokenRequests() {
      settle(pending, with: .failure(CancellationError()))
    }
  }
  
  private func parseClientUser(from params: [String: Any]) async throws -> ClientUser {
    guard let userId = params["userId"] as? String else {
      throw AuthenticationError.invalidUserParams
    }
    
    let profile = try await parseUserProfile(from: params["profile"] as? [String: Any])
    
    return ClientUser(
      userId: userId,
      profile: profile
    )
  }
  
  private func parseUserProfile(from profileParams: [String: Any]?) async throws -> ClientUser.Profile {
    guard let profileParams = profileParams else {
      return ClientUser.Profile()
    }
    
    let username = profileParams["username"] as? String
    let biography = profileParams["biography"] as? String
    
    var profilePictureData: Data? = nil
    if let pictureUrl = profileParams["profilePicture"] as? String, !pictureUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      profilePictureData = try await loadImageData(from: pictureUrl)
    }
    
    return ClientUser.Profile(
      nickname: username,
      bio: biography,
      picture: profilePictureData
    )
  }
  
  private func loadImageData(from urlString: String) async throws -> Data? {
    if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
      guard let url = URL(string: urlString) else { return nil }
      do {
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
      } catch {
        throw AuthenticationError.profilePictureLoadError
      }
    } else if urlString.hasPrefix("file://") {
      guard let url = URL(string: urlString) else { return nil }
      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.global(qos: .userInitiated).async {
          do {
            let data = try Data(contentsOf: url)
            continuation.resume(returning: data)
          } catch {
            continuation.resume(throwing: AuthenticationError.profilePictureLoadError)
          }
        }
      }
    } else {
      let url = URL(fileURLWithPath: urlString)
      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.global(qos: .userInitiated).async {
          do {
            let data = try Data(contentsOf: url)
            continuation.resume(returning: data)
          } catch {
            continuation.resume(throwing: AuthenticationError.profilePictureLoadError)
          }
        }
      }
    }
  }
}

/// A refused connection, carried to the `@objc` surface with the code JS matches on.
///
/// The codes are one third of a three-sided contract: `OctopusSSOAuthenticator.kt` rejects with
/// the same strings, and `ConnectUserErrorCode` in `src/types/connectUserError.ts` is the union
/// JS consumers switch on. Changing a value here without the other two sides breaks the public
/// API silently. Not every code is reachable on both platforms — the native SDKs classify
/// failures differently, and the TS type documents which platform emits what.
struct ConnectUserBridgeError: Error, LocalizedError {
  let code: String
  let message: String

  var errorDescription: String? { message }

  init(from error: OctopusConnectUserError) {
    switch error {
    case let .userBanned(reason):
      // The only case carrying a backend-provided, user-facing string.
      code = "USER_BANNED"
      message = reason
    case .jwtError:
      code = "INVALID_TOKEN"
      message = "The JWT returned by the token provider was rejected (bad signature or algorithm)."
    case let .profileError(errors):
      code = "PROFILE_ERROR"
      message = errors.isEmpty
        ? "The profile sent with the user was rejected."
        : errors.map { error in
            error.field.map { "\($0): \(error.message)" } ?? error.message
          }.joined(separator: "\n")
    case .communityAccessDenied:
      code = "COMMUNITY_ACCESS_DENIED"
      message = "The user does not have access to the community."
    case .noNetwork:
      code = "NO_NETWORK"
      message = "No network connection available."
    case let .server(serverError):
      code = "SERVER_ERROR"
      // `String(describing:)` rather than `localizedDescription`: these errors are not
      // `LocalizedError`, so the localized form collapses to a generic "operation could not be
      // completed" that names neither the domain nor the code.
      message = "Server error: \(String(describing: serverError))"
    case let .other(underlyingError):
      // `.other` is the native SDK's catch-all for anything it does not recognise, which
      // includes the two errors this bridge itself raises from the token provider. Unwrap them
      // so JS gets the specific code rather than the generic one.
      if let timeout = underlyingError as? TokenRequestTimeoutError {
        code = "TOKEN_REQUEST_TIMEOUT"
        message = timeout.localizedDescription
      } else if underlyingError is CancellationError {
        code = "TOKEN_REQUEST_CANCELLED"
        message = "The user token request was cancelled."
      } else {
        code = "CONNECT_USER_ERROR"
        message = underlyingError.map { "Failed to connect user: \(String(describing: $0))" }
          ?? "Failed to connect user."
      }
    }
  }
}

/// Raised when JS never answers a `userTokenRequest` within the bridge's timeout.
///
/// It is `LocalizedError` so the single copy of the remediation text lives here, and it is
/// unwrapped from `OctopusConnectUserError.other` by ``ConnectUserBridgeError``.
struct TokenRequestTimeoutError: Error, LocalizedError {
  let timeoutMilliseconds: UInt64

  var errorDescription: String? {
    "The user token request timed out after \(timeoutMilliseconds)ms. Register a "
      + "userTokenRequest listener before calling connectUser, and answer it with "
      + "completeUserTokenRequest or cancelUserTokenRequest."
  }
}

/// Raised when the authenticator is torn down while the native SDK is asking it for a token.
///
/// Deliberately distinct from `CancellationError`: that one means JS declined the request and is
/// reported as `TOKEN_REQUEST_CANCELLED`, whereas this is the bridge itself going away. It has no
/// case of its own in ``ConnectUserBridgeError`` and falls through to `CONNECT_USER_ERROR`, which
/// is the honest classification — nothing about the host app's handling caused it.
struct AuthenticatorDeallocatedError: Error, LocalizedError {
  var errorDescription: String? {
    "The Octopus bridge was torn down before the user token request could be answered."
  }
}

enum AuthenticationError: Error, LocalizedError {
  case sdkNotInitialized
  case invalidUserParams
  case profilePictureLoadError
  case unknownError(Error)
  
  var errorDescription: String? {
    switch self {
    case .sdkNotInitialized:
      return "SDK not initialized"
    case .invalidUserParams:
      return "Invalid user parameters"
    case .profilePictureLoadError:
      return "Failed to load profile picture"
    case .unknownError(let underlyingError):
      return "Unknown error: \(underlyingError.localizedDescription)"
    }
  }
}
