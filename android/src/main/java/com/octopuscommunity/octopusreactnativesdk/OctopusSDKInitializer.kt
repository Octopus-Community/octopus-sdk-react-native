package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.ConnectionMode

class OctopusSDKInitializer {

  fun initialize(context: ReactApplicationContext, options: ReadableMap, promise: Promise) {
    val apiKey = options.getString("apiKey")
    if (apiKey == null) {
      promise.reject("INITIALIZE_ERROR", "Missing API key")
      return
    }

    try {
      val connectionMode = parseConnectionMode(options)
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
