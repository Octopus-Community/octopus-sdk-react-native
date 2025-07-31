package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class OctopusReactNativeSdkModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val sdkInitializer = OctopusSDKInitializer()
  private val eventEmitter = OctopusEventEmitter(reactContext)
  private val uiController = OctopusUIController(reactContext)
  private val ssoAuthenticator = OctopusSSOAuthenticator(eventEmitter)

  override fun getName(): String = NAME

  @ReactMethod
  fun initialize(options: ReadableMap, promise: Promise) {
    sdkInitializer.initialize(reactApplicationContext, options, promise)
  }

  @ReactMethod
  fun openUI(promise: Promise) {
    uiController.openUI(promise)
  }

  @ReactMethod
  fun closeUI(promise: Promise) {
    uiController.closeUI(promise)
  }

  @ReactMethod
  fun connectUser(params: ReadableMap, promise: Promise) {
    ssoAuthenticator.connectUser(params, promise)
  }

  @ReactMethod
  fun disconnectUser(promise: Promise) {
    ssoAuthenticator.disconnectUser(promise)
  }

  @ReactMethod
  fun completeUserTokenRequest(requestId: String, token: String, promise: Promise) {
    ssoAuthenticator.completeTokenRequest(requestId, token)
    promise.resolve(null)
  }

  @ReactMethod
  fun cancelUserTokenRequest(requestId: String, promise: Promise) {
    ssoAuthenticator.cancelTokenRequest(requestId)
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    eventEmitter.addListener(eventName)
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    eventEmitter.removeListeners(count)
  }

  companion object {
    const val NAME = "OctopusReactNativeSdk"
  }

  init {
    OctopusEventEmitter.instance = eventEmitter
  }
}
