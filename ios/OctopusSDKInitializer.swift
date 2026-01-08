import Octopus
import OctopusUI
import SwiftUI

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
  
  func parseTheme(from options: [String: Any]) -> OctopusTheme? {
    guard let themeMap = options["theme"] as? [String: Any] else {
      return nil
    }
    
    var colors: OctopusTheme.Colors?
    
    // Parse colors
    if let colorsMap = themeMap["colors"] as? [String: Any] {
      var primarySet: OctopusTheme.Colors.ColorSet?
      
      if let primary = colorsMap["primary"] as? String,
         let primaryColor = OctopusColorUtility.color(fromHex: primary) {
        let lowContrast = (colorsMap["primaryLowContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? primaryColor
        let highContrast = (colorsMap["primaryHighContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.black
        let onPrimary = (colorsMap["onPrimary"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.white
        
        primarySet = OctopusTheme.Colors.ColorSet(
          main: Color(uiColor: primaryColor),
          lowContrast: Color(uiColor: lowContrast),
          highContrast: Color(uiColor: highContrast)
        )
        
        colors = OctopusTheme.Colors(
          primarySet: primarySet,
          onPrimary: Color(uiColor: onPrimary)
        )
      }
    }
    
    // Note: Logo will be handled separately in UI manager due to async loading requirements
    // Only create theme if we have colors, otherwise return nil
    guard let colors = colors else {
      return nil
    }
    
    return OctopusTheme(
      colors: colors,
      fonts: OctopusTheme.Fonts(),
      assets: OctopusTheme.Assets()
    )
  }
  
  func getLogoSource(from options: [String: Any]) -> [String: Any]? {
    guard let themeMap = options["theme"] as? [String: Any],
          let logoMap = themeMap["logo"] as? [String: Any] else {
      return nil
    }
    
    // Only support Image.resolveAssetSource() approach
    if let imageSource = logoMap["image"] as? [String: Any] {
      return imageSource
    }
    
    return nil
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
