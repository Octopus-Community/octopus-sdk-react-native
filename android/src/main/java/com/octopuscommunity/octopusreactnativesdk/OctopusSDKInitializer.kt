package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.ApiServer
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ConnectionMode
import android.graphics.Color

class OctopusSDKInitializer {

  fun initialize(context: ReactApplicationContext, options: ReadableMap, promise: Promise): Boolean {
    val apiKey = options.getString("apiKey")
    if (apiKey == null) {
      promise.reject("INITIALIZE_ERROR", "Missing API key")
      return false
    }

    try {
      val connectionMode = parseConnectionMode(options)
      // Parity wave — lifecycle
      val deepLinksBasePaths = parseDeepLinksBasePaths(options)
      val apiServer = parseApiServer(options)

      // Store theme configuration for later use in UI
      val themeConfig = parseThemeConfig(options)
      OctopusThemeManager.setThemeConfig(themeConfig)

      // Store UI configuration separately
      val uiConfiguration = parseUIConfiguration(options)
      OctopusUIConfigurationManager.setUIConfiguration(uiConfiguration)

      val topAppBarConfig = parseTopAppBarConfig(options)
      OctopusTopAppBarManager.setConfig(topAppBarConfig)

      OctopusSDK.initialize(
        context = context,
        apiKey = apiKey,
        connectionMode = connectionMode,
        deepLinksBasePaths = deepLinksBasePaths,
        apiServer = apiServer
      )
      promise.resolve(null)
      return true
    } catch (e: InvalidConnectionModeException) {
      promise.reject("INITIALIZE_ERROR", e.message, e)
      return false
    } catch (e: Exception) {
      // Parity wave — lifecycle: was a fixed string, discarding e.message. That message is now
      // the only place an invalid `apiServer` host (thrown from the native `ApiServer`
      // constructor — see parseApiServer below) surfaces on Android, matching iOS forwarding
      // `error.localizedDescription`.
      promise.reject("INITIALIZE_ERROR", e.message ?: "Failed to initialize Octopus SDK", e)
      return false
    }
  }

  fun parseThemeConfig(options: ReadableMap): OctopusThemeConfig? {

    val themeMap = options.getMap("theme")
    val colorScheme = options.getString("colorScheme") // Get colorScheme from React Native

    var primaryColor: String? = null
    var primaryLowContrastColor: String? = null
    var primaryHighContrastColor: String? = null
    var onPrimaryColor: String? = null
    var linkColor: String? = null
    var backgroundColor: String? = null
    var logoSource: ReadableMap? = null
    var fontsConfig: OctopusFontsConfig? = null
    var lightSet: OctopusModeColors? = null
    var darkSet: OctopusModeColors? = null

    // Parse colors from theme if available
    themeMap?.let { theme ->
      val colorsMap = theme.getMap("colors")
      colorsMap?.let { colors ->
        // Check if this is a dual-mode theme (has light and dark properties)
        val lightColors = colors.getMap("light")
        val darkColors = colors.getMap("dark")

        if (lightColors != null && darkColors != null) {
          // Dual-mode theme. Both raw sets are kept on the config so the render can re-select
          // for the mode in effect then (OctopusThemeConfig.resolvedFor); the flat slots below
          // are the selection for the scheme known now, kept for the first render.
          lightSet = modeColors(lightColors)
          darkSet = modeColors(darkColors)
          val selectedColors = if (colorScheme == "dark") darkColors else lightColors
          val otherColors = if (colorScheme == "dark") lightColors else darkColors
          primaryColor = colorFrom(selectedColors, "primary")
          primaryLowContrastColor = colorFrom(selectedColors, "primaryLowContrast")
          primaryHighContrastColor = colorFrom(selectedColors, "primaryHighContrast")
          onPrimaryColor = colorFrom(selectedColors, "onPrimary")
          // `link` and `background` are optional in a way `primary` is not: a value given
          // for one mode only applies to both, matching the single-value contract iOS
          // implements through its adaptive colors.
          linkColor = colorFrom(selectedColors, "link") ?: colorFrom(otherColors, "link")
          backgroundColor = colorFrom(selectedColors, "background") ?: colorFrom(otherColors, "background")
        } else {
          // Single-mode theme (backward compatibility)
          primaryColor = colorFrom(colors, "primary")
          primaryLowContrastColor = colorFrom(colors, "primaryLowContrast")
          primaryHighContrastColor = colorFrom(colors, "primaryHighContrast")
          onPrimaryColor = colorFrom(colors, "onPrimary")
          linkColor = colorFrom(colors, "link")
          backgroundColor = colorFrom(colors, "background")
        }
      }

      // Handle logo from theme
      val logoMap = theme.getMap("logo")
      logoMap?.let { logo ->
        val imageSource = logo.getMap("image")
        if (imageSource != null) {
          logoSource = imageSource
        }
      }

      // Handle fonts from theme - use pre-processed configuration from TypeScript layer
      val fontsMap = theme.getMap("fonts")
      fontsMap?.let { fonts ->
        val parsedConfig = fonts.getMap("parsedConfig")
        if (parsedConfig != null) {
          fontsConfig = parsePreProcessedFontsConfig(parsedConfig)
        }
      }
    }

    // Handle logo at root level (for backward compatibility)
    if (logoSource == null) {
      val rootLogoMap = options.getMap("logo")
      rootLogoMap?.let { logo ->
        val imageSource = logo.getMap("image")
        if (imageSource != null) {
          logoSource = imageSource
        }
      }
    }

    // Only create theme config if we have at least one customization. `link` and
    // `background` count: a theme carrying only one of them must not be dropped.
    if (primaryColor != null || linkColor != null || backgroundColor != null ||
      logoSource != null || colorScheme != null || fontsConfig != null
    ) {
      return OctopusThemeConfig(
        primaryColor = primaryColor,
        primaryLowContrastColor = primaryLowContrastColor,
        primaryHighContrastColor = primaryHighContrastColor,
        onPrimaryColor = onPrimaryColor,
        linkColor = linkColor,
        backgroundColor = backgroundColor,
        logoSource = logoSource,
        colorScheme = colorScheme,
        fonts = fontsConfig,
        lightColors = lightSet,
        darkColors = darkSet
      )
    }

    return null
  }

  fun parseUIConfiguration(options: ReadableMap): OctopusUIConfiguration? {
    val uiMap = options.getMap("ui")
    var bottomContentPadding: Double? = null

    uiMap?.let { uiOptions ->
      val candidateKeys = listOf("bottomSafeAreaInset", "bottomPadding", "contentPadding", "contentPaddingBottom")
      for (key in candidateKeys) {
        if (uiOptions.hasKey(key)) {
          bottomContentPadding = try {
            uiOptions.getDouble(key).coerceAtLeast(0.0)
          } catch (e: Exception) {
            null
          }
          if (bottomContentPadding != null) {
            break
          }
        }
      }
    }

    return if (bottomContentPadding != null) {
      OctopusUIConfiguration(bottomContentPadding = bottomContentPadding)
    } else {
      null
    }
  }

  fun parseTopAppBarConfig(options: ReadableMap): OctopusTopAppBarConfig? {
    val map = options.getMap("topAppBar") ?: return null

    var titleType: String? = null
    var titleText: String? = null
    map.getMap("title")?.let { title ->
      titleType = if (title.hasKey("type")) title.getString("type") else null
      titleText = if (title.hasKey("text")) title.getString("text") else null
    }

    val centered = map.hasKey("alignment") && map.getString("alignment") == "center"
    val coloredBackground = map.hasKey("coloredBackground") && map.getBoolean("coloredBackground")

    return OctopusTopAppBarConfig(
      titleType = titleType,
      titleText = titleText,
      centered = centered,
      coloredBackground = coloredBackground
    )
  }

  private fun parsePreProcessedFontsConfig(parsedConfig: ReadableMap): OctopusFontsConfig? {
    val textStylesMap = parsedConfig.getMap("textStyles")
    val textStyles = mutableMapOf<String, OctopusTextStyleConfig>()

    // Parse pre-processed font configuration from TypeScript layer
    textStylesMap?.let { textStylesMap ->
      // `navBarItem` is deliberately NOT read here: the native iOS theme has a
      // dedicated `OctopusTheme.Fonts.navBarItem` slot, but the native Android
      // `OctopusTypography` has no counterpart (title1/title2/body1/body2/
      // caption1/caption2 only), so there is nothing to map it onto. Do NOT
      // approximate it by resizing another slot — that would change text the
      // host did not ask to change.
      val textStyleKeys = arrayOf("title1", "title2", "body1", "body2", "caption1", "caption2")

      textStyleKeys.forEach { key ->
        val textStyleMap = textStylesMap.getMap(key)
        textStyleMap?.let { style ->
          val fontType = style.getString("fontType")
          val fontSize = if (style.hasKey("fontSize")) style.getDouble("fontSize") else Double.NaN

          if (fontType != null || (!fontSize.isNaN() && fontSize > 0)) {
            textStyles[key] = OctopusTextStyleConfig(
              fontType = fontType,
              fontSize = if (fontSize.isNaN() || fontSize <= 0) null else fontSize
            )
          }
        }
      }
    }

    // Theme-wide overrides. Both are forwarded verbatim: `fontFamily` names a `res/font/`
    // resource only the render pass can look up, and `fontWeight` has already been
    // validated against the 100-900 scale by the TypeScript layer.
    val fontFamily = parsedConfig.getString("fontFamily")?.takeIf { it.isNotBlank() }
    val fontWeight = if (parsedConfig.hasKey("fontWeight") && !parsedConfig.isNull("fontWeight")) {
      parsedConfig.getDouble("fontWeight").toInt()
    } else {
      null
    }

    // Only create fonts config if we have text styles or a theme-wide override: a theme
    // made only of `fontFamily` / `fontWeight` must not be dropped.
    if (textStyles.isNotEmpty() || fontFamily != null || fontWeight != null) {
      return OctopusFontsConfig(
        textStyles = textStyles,
        fontFamily = fontFamily,
        fontWeight = fontWeight
      )
    }

    return null
  }


  private fun extractResourceNameFromUri(uri: String): String? {
    // Extract resource name from React Native image URI
    // Examples: "logo.png" -> "logo", "images/logo.png" -> "logo"
    return try {
      val fileName = uri.substringAfterLast("/")
      fileName.substringBeforeLast(".")
    } catch (e: Exception) {
      null
    }
  }

  private fun modeColors(colors: ReadableMap) = OctopusModeColors(
    primary = colorFrom(colors, "primary"),
    primaryLowContrast = colorFrom(colors, "primaryLowContrast"),
    primaryHighContrast = colorFrom(colors, "primaryHighContrast"),
    onPrimary = colorFrom(colors, "onPrimary"),
    link = colorFrom(colors, "link"),
    background = colorFrom(colors, "background")
  )

  private fun colorFrom(colors: ReadableMap, key: String): String? =
    parseColor(if (colors.hasKey(key)) colors.getString(key) else null)

  private fun parseColor(colorString: String?): String? {
    if (colorString == null) return null

    return try {
      // Validate that the color string is a valid hex color
      Color.parseColor(colorString)
      // Return the original string if parsing succeeds
      colorString
    } catch (e: IllegalArgumentException) {
      // Invalid color format - return null to skip this color
      null
    }
  }

  fun parseConnectionMode(options: ReadableMap): ConnectionMode {
    val connectionModeMap = options.getMap("connectionMode")
    return when (val connectionModeType = connectionModeMap?.getString("type")) {
      "sso" -> {
        ConnectionMode.SSO(
          appManagedFields = ProfileFieldMapper.fromReactNativeArray(
            if (connectionModeMap.hasKey("appManagedFields")) connectionModeMap.getArray("appManagedFields") else null
          )
        )
      }

      "octopus" -> {
        // Parity wave — lifecycle: this used to return null here, relying on
        // OctopusSDK.initialize()'s default parameter value for `connectionMode` — which is
        // ConnectionMode.SSO(), NOT OctopusAuth. That silently put every "octopus" mode caller
        // into SSO mode with an empty appManagedFields set. Construct the correct value
        // explicitly instead.
        ConnectionMode.OctopusAuth
      }

      else -> {
        throw InvalidConnectionModeException("Invalid connection mode type: $connectionModeType")
      }
    }
  }

  /**
   * Parity wave — lifecycle.
   *
   * Extracts the deep link base paths forwarded to native `initialize`/`switchCommunity` as
   * `deepLinksBasePaths`. Only the octopus-managed connection mode carries a `deepLink` option
   * on the TS side (`InitializeParams.connectionMode` / `SwitchCommunityParams.connectionMode`),
   * used by the native SDK to build the magic-link confirmation redirect
   * (`OctopusDeepLinks.octopusAppNavDeepLinks`). The single value maps onto the native
   * `List<String>` parameter as its sole entry; `emptyList()` when absent, matching the native
   * default.
   */
  fun parseDeepLinksBasePaths(options: ReadableMap): List<String> {
    val connectionModeMap = options.getMap("connectionMode") ?: return emptyList()
    if (connectionModeMap.getString("type") != "octopus") return emptyList()
    val deepLink = if (connectionModeMap.hasKey("deepLink")) {
      connectionModeMap.getString("deepLink")
    } else {
      null
    }
    return listOfNotNull(deepLink)
  }

  /**
   * Parity wave — lifecycle.
   *
   * Parses an optional custom server endpoint from `options.apiServer`. This is a pure
   * passthrough — validation (`ApiServer`'s host/port rules) happens natively: an invalid
   * value throws from the `ApiServer` constructor and is caught by the generic `Exception`
   * handler in [initialize] / by `OctopusReactModule.switchCommunity`.
   */
  fun parseApiServer(options: ReadableMap): ApiServer? {
    val apiServerMap = options.getMap("apiServer") ?: return null
    val host = apiServerMap.getString("host") ?: return null
    return if (apiServerMap.hasKey("port") && !apiServerMap.isNull("port")) {
      ApiServer(host = host, port = apiServerMap.getInt("port"))
    } else {
      ApiServer(host = host)
    }
  }

  private class InvalidConnectionModeException(message: String) : Exception(message)
}
