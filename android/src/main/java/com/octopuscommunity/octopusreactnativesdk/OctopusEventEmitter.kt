package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.octopuscommunity.sdk.domain.model.ProfileField

class OctopusEventEmitter(private val reactContext: ReactContext) {

  private var listenerCount = 0

  fun addListener(eventName: String) {
    listenerCount += 1
  }

  fun removeListeners(count: Int) {
    listenerCount -= count
  }

  fun emitLoginRequired() {
    sendEvent("loginRequired", null)
  }

  fun emitEditUser(profileField: ProfileField?) {
    val params = Arguments.createMap()
    params.putString("fieldToEdit", ProfileFieldMapper.toReactNativeString(profileField))
    sendEvent("editUser", params)
  }

  fun emitUserTokenRequest(requestId: String) {
    val params = Arguments.createMap()
    params.putString("requestId", requestId)
    sendEvent("userTokenRequest", params)
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    if (listenerCount > 0) {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    }
  }

  companion object {
    var instance: OctopusEventEmitter? = null
  }
}
