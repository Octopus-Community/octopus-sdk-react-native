package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ConnectionMode
import android.graphics.Color

class OctopusSDKInitializer {

  fun initialize(context: ReactApplicationContext, options: ReadableMap, promise: Promise) {
    val apiKey = options.getString("apiKey")
    if (apiKey == null) {
      promise.reject("INITIALIZE_ERROR", "Missing API key")
      return
    }

    try {
      val connectionMode = parseConnectionMode(options)
      
      // Store theme configuration for later use in UI
      val themeConfig = parseThemeConfig(options)
      OctopusThemeManager.setThemeConfig(themeConfig)
      
      OctopusSDK.initialize(
        context = context,
        apiKey = apiKey,
        connectionMode = connectionMode
      )
      promise.resolve(null)
    } catch (e: InvalidConnectionModeException) {
      promise.reject("INITIALIZE_ERROR", e.message, e)
    } catch (e: Exception) {
      promise.reject("INITIALIZE_ERROR", "Failed to initialize Octopus SDK", e)
    }
  }
  
  private fun parseThemeConfig(options: ReadableMap): OctopusThemeConfig? {
    val themeMap = options.getMap("theme") ?: return null
    
    val colorsMap = themeMap.getMap("colors")
    val logoMap = themeMap.getMap("logo")
    
    var primaryColor: String? = null
    var primaryLowContrastColor: String? = null
    var primaryHighContrastColor: String? = null
    var onPrimaryColor: String? = null
    var logoSource: ReadableMap? = null
    
    colorsMap?.let { colors ->
      primaryColor = parseColor(colors.getString("primary"))
      primaryLowContrastColor = parseColor(colors.getString("primaryLowContrast"))
      primaryHighContrastColor = parseColor(colors.getString("primaryHighContrast"))
      onPrimaryColor = parseColor(colors.getString("onPrimary"))
    }
    
    // Handle logo - only support Image.resolveAssetSource() approach
    logoMap?.let { logo ->
      val imageSource = logo.getMap("image")
      if (imageSource != null) {
        logoSource = imageSource
      }
    }
    
    // Only create theme config if we have at least one customization
    if (primaryColor != null || logoSource != null) {
      return OctopusThemeConfig(
        primaryColor = primaryColor,
        primaryLowContrastColor = primaryLowContrastColor,
        primaryHighContrastColor = primaryHighContrastColor,
        onPrimaryColor = onPrimaryColor,
        logoSource = logoSource
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

  private fun parseConnectionMode(options: ReadableMap): ConnectionMode {
    val connectionModeMap = options.getMap("connectionMode")
    return when (val connectionModeType = connectionModeMap?.getString("type")) {
      "sso" -> {
        ConnectionMode.SSO(
          appManagedFields = ProfileFieldMapper.fromReactNativeArray(
            connectionModeMap.getArray("appManagedFields")
          )
        )
      }

      "octopus" -> {
        ConnectionMode.Octopus
      }

      else -> {
        throw InvalidConnectionModeException("Invalid connection mode type: $connectionModeType")
      }
    }
  }

  private class InvalidConnectionModeException(message: String) : Exception(message)
}
