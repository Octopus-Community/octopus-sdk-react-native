import Octopus

class OctopusSDKInitializer {
  func initialize(options: [String: Any], eventManager: OctopusEventManager) throws -> OctopusSDK {
    guard let apiKey = options["apiKey"] as? String else {
      throw InitializationError.missingAPIKey
    }

    guard let connectionModeMap = options["connectionMode"] as? [String: Any] else {
      throw InitializationError.missingConnectionMode
    }

    let connectionMode = try parseConnectionMode(from: connectionModeMap, eventManager: eventManager)
    return try OctopusSDK(apiKey: apiKey, connectionMode: connectionMode)
  }

  private func parseConnectionMode(from connectionModeMap: [String: Any], eventManager: OctopusEventManager) throws -> ConnectionMode {
    let connectionModeType = connectionModeMap["type"] as? String

    switch connectionModeType {
    case "sso":
      return try createSSOConnectionMode(from: connectionModeMap, eventManager: eventManager)
    case "octopus":
      return .octopus(deepLink: nil)
    default:
      throw InitializationError.invalidConnectionModeType
    }
  }

  private func createSSOConnectionMode(from connectionModeMap: [String: Any], eventManager: OctopusEventManager) throws -> ConnectionMode {
    let appManagedFields = ProfileFieldMapper.fromReactNativeArray(connectionModeMap["appManagedFields"] as? [String])

    return .sso(
      .init(
        appManagedFields: appManagedFields,
        loginRequired: {
          eventManager.emitLoginRequired()
        },
        modifyUser: { profileField in
          eventManager.emitEditUser(profileField: profileField)
        }
      )
    )
  }
}

enum InitializationError: Error, LocalizedError {
  case missingAPIKey
  case missingConnectionMode
  case invalidConnectionModeType

  var errorDescription: String? {
    switch self {
    case .missingAPIKey:
      return "API key is required"
    case .missingConnectionMode:
      return "Connection mode is required"
    case .invalidConnectionModeType:
      return "Invalid connection mode type"
    }
  }
}
