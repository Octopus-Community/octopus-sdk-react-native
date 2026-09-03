package com.octopuscommunity.sdk.reactnative.sample.update

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.InstallException
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallErrorCode
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Asks Play whether a newer sample build is available, and starts Play's own
 * update flow when the tester taps for it.
 *
 * Written here rather than pulled from npm on purpose. The published wrappers
 * carry transitive native dependencies this sample has no other use for, and —
 * more to the point — they hand JavaScript a formatted error string instead of
 * the numeric [InstallErrorCode]. That number is the whole decision: three of
 * its values mean "Play does not own this install", which is a normal outcome
 * for a Gradle-installed build and not a failure a tester can retry. Keeping
 * the module in the sample keeps the number intact, so this leg does not have
 * to parse it back out of a message the way the Flutter one does.
 *
 * The mapping is the Android sample's `AppUpdateChecker`, deliberately
 * identical: same three no-ownership codes, same refusal to report a build Play
 * will not install as up to date.
 */
class AppUpdateModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /**
   * Resolves with `{ status, availableVersionCode?, errorCode? }`. Never
   * rejects: every outcome Play can produce is one this sample has something to
   * say about, and a rejected promise would push that decision into JavaScript
   * catch blocks where the numeric code is already gone.
   */
  @ReactMethod
  fun checkForUpdate(promise: Promise) {
    val manager = AppUpdateManagerFactory.create(reactApplicationContext)
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        val available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
        val immediateAllowed = info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
        promise.resolve(
          when {
            !available -> result(STATUS_UP_TO_DATE)
            !immediateAllowed -> result(STATUS_NOT_INSTALLABLE)
            else -> result(STATUS_AVAILABLE).apply {
              putInt("availableVersionCode", info.availableVersionCode())
            }
          },
        )
      }
      .addOnFailureListener { error ->
        val code = (error as? InstallException)?.errorCode
        promise.resolve(
          when (code) {
            InstallErrorCode.ERROR_INSTALL_NOT_ALLOWED,
            InstallErrorCode.ERROR_APP_NOT_OWNED,
            InstallErrorCode.ERROR_PLAY_STORE_NOT_FOUND,
            -> result(STATUS_NOT_FROM_PLAY_STORE)

            else -> result(STATUS_ERROR).apply {
              if (code != null) putInt("errorCode", code)
            }
          },
        )
      }
  }

  /**
   * Hands control to Play. Only ever reached from a tap — nothing in this
   * module launches the flow on its own, which is the rule the shared contract
   * binds. The result is not reported back: Play returns through the activity,
   * and the JavaScript side re-checks rather than trusting a remembered answer.
   */
  @ReactMethod
  fun startImmediateUpdate(promise: Promise) {
    // Read through the context rather than the module's own `currentActivity`:
    // that accessor is not visible from Kotlin here, and the context's is the
    // same activity by construction.
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }
    val manager = AppUpdateManagerFactory.create(reactApplicationContext)
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        val startable =
          info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
            info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
        if (!startable) {
          promise.resolve(false)
          return@addOnSuccessListener
        }
        runCatching {
          manager.startUpdateFlowForResult(info, AppUpdateType.IMMEDIATE, activity, REQUEST_CODE)
        }.onSuccess { promise.resolve(true) }
          .onFailure { promise.resolve(false) }
      }
      .addOnFailureListener { promise.resolve(false) }
  }

  private fun result(status: String): WritableMap =
    Arguments.createMap().apply { putString("status", status) }

  companion object {
    const val NAME = "OctopusSampleAppUpdate"

    private const val REQUEST_CODE = 4711

    private const val STATUS_UP_TO_DATE = "upToDate"
    private const val STATUS_AVAILABLE = "available"
    private const val STATUS_NOT_INSTALLABLE = "notInstallable"
    private const val STATUS_NOT_FROM_PLAY_STORE = "notFromPlayStore"
    private const val STATUS_ERROR = "error"
  }
}
