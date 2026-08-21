import Octopus
import OctopusUI
import SwiftUI
import CoreGraphics

class OctopusSDKInitializer {
  func initialize(options: [String: Any], eventManager: OctopusEventManager) throws -> OctopusSDK {
    guard let apiKey = options["apiKey"] as? String else {
      throw InitializationError.missingAPIKey
    }

    guard let connectionModeMap = options["connectionMode"] as? [String: Any] else {
      throw InitializationError.missingConnectionMode
    }

    let connectionMode = try parseConnectionMode(from: connectionModeMap, eventManager: eventManager)
    let configuration = try parseConfiguration(from: options)
    return try OctopusSDK(apiKey: apiKey, connectionMode: connectionMode, configuration: configuration)
  }

  // Parity wave — lifecycle

  /// Builds the SDK `Configuration` from the JS `apiServer` option, mirroring the Flutter
  /// plugin's `parseConfiguration` helper. Returns the default configuration (no custom
  /// server) when `apiServer` is absent or malformed.
  func parseConfiguration(from options: [String: Any]) throws -> OctopusSDK.Configuration {
    guard let apiServerMap = options["apiServer"] as? [String: Any],
          let host = apiServerMap["host"] as? String
    else {
      return OctopusSDK.Configuration()
    }
    let port = (apiServerMap["port"] as? NSNumber)?.intValue
      ?? (apiServerMap["port"] as? Int)
      ?? 443
    let apiServer = try OctopusSDK.Configuration.ApiServer(host: host, port: port)
    return OctopusSDK.Configuration(apiServer: apiServer)
  }
  
  func parseTheme(from options: [String: Any]) -> OctopusTheme? {
    guard let themeMap = options["theme"] as? [String: Any] else {
      return nil
    }
    
    var colors: OctopusTheme.Colors?
    var fonts: OctopusTheme.Fonts?
    
    // Parse colors
    if let colorsMap = themeMap["colors"] as? [String: Any] {
      var primarySet: OctopusTheme.Colors.ColorSet?
      var onPrimary: Color?
      var link: Color?
      var background: Color?

      // Check if this is a dual-mode theme (has light and dark properties)
      if let lightColors = colorsMap["light"] as? [String: Any],
         let darkColors = colorsMap["dark"] as? [String: Any] {
        // Dual-mode theme - create adaptive colors that automatically respond to system appearance
        if let lightPrimary = lightColors["primary"] as? String,
           let darkPrimary = darkColors["primary"] as? String,
           let lightPrimaryColor = OctopusColorUtility.color(fromHex: lightPrimary),
           let darkPrimaryColor = OctopusColorUtility.color(fromHex: darkPrimary) {

          // Create adaptive colors using UIColor's dynamic color capabilities
          let adaptivePrimary = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? darkPrimaryColor : lightPrimaryColor
          }

          let lightLowContrast = (lightColors["primaryLowContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? lightPrimaryColor
          let darkLowContrast = (darkColors["primaryLowContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? darkPrimaryColor
          let adaptiveLowContrast = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? darkLowContrast : lightLowContrast
          }

          let lightHighContrast = (lightColors["primaryHighContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.black
          let darkHighContrast = (darkColors["primaryHighContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.black
          let adaptiveHighContrast = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? darkHighContrast : lightHighContrast
          }

          let lightOnPrimary = (lightColors["onPrimary"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.white
          let darkOnPrimary = (darkColors["onPrimary"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.black
          let adaptiveOnPrimary = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? darkOnPrimary : lightOnPrimary
          }

          primarySet = OctopusTheme.Colors.ColorSet(
            main: Color(uiColor: adaptivePrimary),
            lowContrast: Color(uiColor: adaptiveLowContrast),
            highContrast: Color(uiColor: adaptiveHighContrast)
          )
          onPrimary = Color(uiColor: adaptiveOnPrimary)
        } else {
          // No usable primary pair: `onPrimary` alone carries no default to derive, so it
          // is only forwarded when explicitly given.
          onPrimary = adaptiveThemeColor(light: lightColors["onPrimary"], dark: darkColors["onPrimary"])
        }

        link = adaptiveThemeColor(light: lightColors["link"], dark: darkColors["link"])
        background = adaptiveThemeColor(light: lightColors["background"], dark: darkColors["background"])
      } else {
        // Single-mode theme (backward compatibility)
        if let primary = colorsMap["primary"] as? String,
           let primaryColor = OctopusColorUtility.color(fromHex: primary) {
          let lowContrast = (colorsMap["primaryLowContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? primaryColor
          let highContrast = (colorsMap["primaryHighContrast"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.black
          let resolvedOnPrimary = (colorsMap["onPrimary"] as? String).flatMap(OctopusColorUtility.color(fromHex:)) ?? UIColor.white

          primarySet = OctopusTheme.Colors.ColorSet(
            main: Color(uiColor: primaryColor),
            lowContrast: Color(uiColor: lowContrast),
            highContrast: Color(uiColor: highContrast)
          )
          onPrimary = Color(uiColor: resolvedOnPrimary)
        } else {
          onPrimary = themeColor(colorsMap["onPrimary"])
        }

        link = themeColor(colorsMap["link"])
        background = themeColor(colorsMap["background"])
      }

      // A theme carrying only `link` or only `background` must not be dropped, so the
      // color set is built as soon as any one of the four resolved.
      if primarySet != nil || onPrimary != nil || link != nil || background != nil {
        colors = OctopusTheme.Colors(
          primarySet: primarySet,
          onPrimary: onPrimary,
          link: link,
          background: background
        )
      }
    }

    // Parse fonts
    if let fontsMap = themeMap["fonts"] as? [String: Any] {
      // Font customization will be applied through OctopusTypography
      // This is parsed here but applied separately in the UI manager
      fonts = OctopusTheme.Fonts()
    }
    
    // Note: Logo will be handled separately in UI manager due to async loading requirements
    // Only create theme if we have colors or fonts, otherwise return nil
    guard colors != nil || fonts != nil else {
      return nil
    }
    
    return OctopusTheme(
      colors: colors ?? OctopusTheme.Colors(),
      fonts: fonts ?? OctopusTheme.Fonts(),
      assets: OctopusTheme.Assets()
    )
  }
  
  /// Resolves a single hex color coming from the JS theme map.
  /// - Parameter value: the raw dictionary value; anything that is not a parseable hex
  ///                    string yields `nil` so the native default applies.
  private func themeColor(_ value: Any?) -> Color? {
    guard let hex = value as? String,
          let uiColor = OctopusColorUtility.color(fromHex: hex) else {
      return nil
    }
    return Color(uiColor: uiColor)
  }

  /// Builds a light/dark adaptive color from a dual-mode theme.
  ///
  /// A value supplied for one mode only applies to both: these colors are optional and
  /// carry no per-mode default this bridge could reference, and the Android bridge does
  /// the same for its selected color scheme.
  private func adaptiveThemeColor(light: Any?, dark: Any?) -> Color? {
    let lightColor = (light as? String).flatMap(OctopusColorUtility.color(fromHex:))
    let darkColor = (dark as? String).flatMap(OctopusColorUtility.color(fromHex:))
    guard let resolvedLight = lightColor ?? darkColor,
          let resolvedDark = darkColor ?? lightColor else {
      return nil
    }
    let adaptive = UIColor { traitCollection in
      traitCollection.userInterfaceStyle == .dark ? resolvedDark : resolvedLight
    }
    return Color(uiColor: adaptive)
  }

  func getLogoSource(from options: [String: Any]) -> [String: Any]? {
    // First try to get logo from theme
    if let themeMap = options["theme"] as? [String: Any],
       let logoMap = themeMap["logo"] as? [String: Any],
       let imageSource = logoMap["image"] as? [String: Any] {
      return imageSource
    }
    
    // Fallback: try to get logo from root level (for backward compatibility)
    if let logoMap = options["logo"] as? [String: Any],
       let imageSource = logoMap["image"] as? [String: Any] {
      return imageSource
    }
    
    return nil
  }
  
  func getFontConfiguration(from options: [String: Any]) -> [String: Any]? {
    guard let themeMap = options["theme"] as? [String: Any],
          let fontsMap = themeMap["fonts"] as? [String: Any] else {
      return nil
    }
    
    // Use pre-processed configuration from TypeScript layer
    if let parsedConfig = fontsMap["parsedConfig"] as? [String: Any] {
      return ["parsedConfig": parsedConfig]
    }
    
    return nil
  }

  func parseUIConfiguration(from options: [String: Any]) -> OctopusUIConfiguration? {
    guard let uiOptions = options["ui"] as? [String: Any] else {
      return nil
    }

    let supportedKeys = [
      "bottomSafeAreaInset",
      "bottomPadding",
      "contentPadding",
      "contentPaddingBottom",
    ]

    var bottomInset: CGFloat?

    for key in supportedKeys {
      if let value = uiOptions[key] as? NSNumber {
        bottomInset = CGFloat(truncating: value)
        break
      } else if let value = uiOptions[key] as? Double {
        bottomInset = CGFloat(value)
        break
      }
    }

    guard let finalInset = bottomInset else {
      return nil
    }

    return OctopusUIConfiguration(bottomSafeAreaInset: max(0, finalInset))
  }

  func parseTopAppBar(from options: [String: Any]) -> OctopusTopAppBarConfig? {
    guard let map = options["topAppBar"] as? [String: Any] else {
      return nil
    }

    var titleType: String? = nil
    var titleText: String? = nil
    if let title = map["title"] as? [String: Any] {
      titleType = title["type"] as? String
      titleText = title["text"] as? String
    }

    let centered = (map["alignment"] as? String) == "center"
    let coloredBackground = (map["coloredBackground"] as? Bool) ?? false

    return OctopusTopAppBarConfig(
      titleType: titleType,
      titleText: titleText,
      centered: centered,
      coloredBackground: coloredBackground
    )
  }

  // Parity wave — lifecycle: non-private so `switchCommunity` (added on
  // `OctopusReactNativeSdk`) can reuse the same decoding as `initialize`.
  func parseConnectionMode(from connectionModeMap: [String: Any], eventManager: OctopusEventManager) throws -> ConnectionMode {
    let connectionModeType = connectionModeMap["type"] as? String

    switch connectionModeType {
    case "sso":
      return try createSSOConnectionMode(from: connectionModeMap, eventManager: eventManager)
    case "octopus":
      // Parity wave — lifecycle: `deepLink` is a new field added in this PR — the JS
      // `connectionMode: { type: 'octopus' }` shape had no way to carry one before, so this
      // reads it now rather than restoring something that used to work.
      let deepLink = connectionModeMap["deepLink"] as? String
      return .octopus(deepLink: deepLink)
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
