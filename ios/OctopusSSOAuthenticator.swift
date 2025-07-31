import Octopus

class OctopusSSOAuthenticator {
  private weak var octopusSDK: OctopusSDK?
  private weak var eventManager: OctopusEventManager?
  private var pendingTokenRequests: [String: CheckedContinuation<String, Error>] = [:]

  init(octopusSDK: OctopusSDK, eventManager: OctopusEventManager) {
    self.octopusSDK = octopusSDK
    self.eventManager = eventManager
  }

  func connectUser(params: [String: Any]) async throws {
    guard let octopus = octopusSDK else {
      throw AuthenticationError.sdkNotInitialized
    }

    do {
      let clientUser = try await parseClientUser(from: params)
      octopus.connectUser(clientUser) {
        return try await self.requestTokenFromRN()
      }
    } catch let error as AuthenticationError {
      throw error
    } catch {
      throw AuthenticationError.unknownError(error)
    }
  }

  func completeTokenRequest(requestId: String, token: String) {
    if let continuation = pendingTokenRequests.removeValue(forKey: requestId) {
      continuation.resume(returning: token)
    }
  }

  func cancelTokenRequest(requestId: String) {
    if let continuation = pendingTokenRequests.removeValue(forKey: requestId) {
      continuation.resume(throwing: CancellationError())
    }
  }

  private func requestTokenFromRN() async throws -> String {
    let requestId = UUID().uuidString

    return try await withCheckedThrowingContinuation { continuation in
      pendingTokenRequests[requestId] = continuation
      eventManager?.emitUserTokenRequest(requestId: requestId)
    }
  }

  func disconnectUser() throws {
    guard let octopus = octopusSDK else {
      throw AuthenticationError.sdkNotInitialized
    }

    octopus.disconnectUser()

    // Cancel all pending token requests
    for (_, continuation) in pendingTokenRequests {
      continuation.resume(throwing: CancellationError())
    }
    pendingTokenRequests.removeAll()
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
    let legalAgeReached = profileParams["legalAgeReached"] as? Bool

    let ageInformation: ClientUser.AgeInformation? = legalAgeReached != nil ? (legalAgeReached! ? .legalAgeReached : .underaged) : nil

    var profilePictureData: Data? = nil
    if let pictureUrl = profileParams["profilePicture"] as? String {
      profilePictureData = try await loadImageData(from: pictureUrl)
    }

    return ClientUser.Profile(
      nickname: username,
      bio: biography,
      picture: profilePictureData,
      ageInformation: ageInformation
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
