package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class OctopusUIController(private val reactContext: ReactApplicationContext) {

  fun openUI(promise: Promise) {
    try {
      val intent = Intent(reactContext, OctopusUIActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OPEN_UI_ERROR", "Failed to open Octopus UI", e)
    }
  }

  fun closeUI(promise: Promise) {
    try {
      val intent = Intent(CLOSE_UI_ACTION)
      intent.setPackage(reactContext.packageName)
      reactContext.sendBroadcast(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CLOSE_UI_ERROR", "Failed to close Octopus UI", e)
    }
  }

  companion object {
    const val CLOSE_UI_ACTION = "com.octopuscommunity.octopusreactnativesdk.CLOSE_UI"
  }
}
