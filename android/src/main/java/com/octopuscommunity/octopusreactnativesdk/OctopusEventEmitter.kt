package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.octopuscommunity.sdk.OctopusProfile
import com.octopuscommunity.sdk.domain.model.OctopusCommunityData
import com.octopuscommunity.sdk.domain.model.OctopusGroup
import com.octopuscommunity.sdk.domain.model.ProfileField
import com.octopuscommunity.sdk.domain.repository.ConnectionRepository.ConnectionState

class OctopusEventEmitter(private val reactContext: ReactContext) {

  fun emitLoginRequired() {
    sendEvent("loginRequired", null)
  }

  fun emitEditUser(profileField: ProfileField?) {
    val params = Arguments.createMap()
    params.putString("fieldToEdit", ProfileFieldMapper.toReactNativeString(profileField))
    sendEvent("editUser", params)
  }

  fun emitNavigateToProfile(clientUserId: String) {
    val params = Arguments.createMap()
    params.putString("clientUserId", clientUserId)
    sendEvent("navigateToProfile", params)
  }

  fun emitUserTokenRequest(requestId: String) {
    val params = Arguments.createMap()
    params.putString("requestId", requestId)
    sendEvent("userTokenRequest", params)
  }

  fun emitBridgeShareTokenRequest(requestId: String, bridgeFingerprint: String) {
    val params = Arguments.createMap()
    params.putString("requestId", requestId)
    params.putString("bridgeFingerprint", bridgeFingerprint)
    sendEvent("bridgeShareTokenRequest", params)
  }

  fun emitNotSeenNotificationsCountChanged(count: Int) {
    val params = Arguments.createMap()
    params.putInt("count", count)
    sendEvent("notSeenNotificationsCountChanged", params)
  }

  fun emitHasAccessToCommunityChanged(hasAccess: Boolean) {
    val params = Arguments.createMap()
    params.putBoolean("hasAccess", hasAccess)
    sendEvent("hasAccessToCommunityChanged", params)
  }

  fun emitSDKEvent(eventData: WritableMap) {
    sendEvent("sdkEvent", eventData)
  }

  fun emitNavigateToUrl(url: String) {
    val params = Arguments.createMap()
    params.putString("url", url)
    sendEvent("navigateToUrl", params)
  }

  fun emitCommunityDataChanged(data: OctopusCommunityData?) {
    sendEvent("communityDataChanged", data?.let { CommunityDataMapper.toWritableMap(it) })
  }

  // Parity wave — groups & entitlements

  /**
   * Always emitted once [com.octopuscommunity.sdk.OctopusSDK.setGroupAccessDeniedCallback] is
   * wired (see `OctopusReactModule.wireGroupAccessDeniedCallback`), regardless of whether JS
   * currently holds a `setGroupAccessDeniedCallback` callback — see the KDoc on [sendEvent].
   */
  fun emitGroupAccessDenied(groupId: String) {
    val params = Arguments.createMap()
    params.putString("groupId", groupId)
    sendEvent("groupAccessDenied", params)
  }

  // Parity wave — client-object bridge

  /**
   * One channel shared by every active `addClientObjectRelatedPostListener` subscription,
   * each emission tagged with the [observationId] that JS filters on. A channel per
   * subscription is not an option: `NativeEventEmitter` event names are a global namespace,
   * and minting one per subscription would leak names no listener ever removes.
   */
  fun emitClientObjectPostChanged(observationId: String, post: WritableMap?) {
    val params = Arguments.createMap()
    params.putString("observationId", observationId)
    params.putMap("post", post)
    sendEvent("clientObjectPostChanged", params)
  }

  fun emitNavigateToClientObject(objectId: String) {
    val params = Arguments.createMap()
    params.putString("objectId", objectId)
    sendEvent("navigateToClientObject", params)
  }

  /**
   * Payload shape below is shared with the iOS `OctopusEventManager` and with the Flutter plugin's
   * event channel, so the JS decoders in `internals/stateChannels.ts` read one wire format on both
   * platforms. Keys are additive only.
   */
  fun emitProfileChanged(profile: OctopusProfile?) {
    val params = Arguments.createMap()
    params.putMap("profile", profile?.let { current ->
      Arguments.createMap().apply {
        val entitlements = Arguments.createArray()
        current.entitlements.forEach { entitlement -> entitlements.pushString(entitlement) }
        putArray("entitlements", entitlements)
        putString("clientUserId", current.clientUserId)
      }
    })
    sendEvent("profileChanged", params)
  }

  fun emitGroupsChanged(groups: List<OctopusGroup>) {
    val array = Arguments.createArray()
    groups.forEach { group ->
      val map = Arguments.createMap()
      map.putString("id", group.id)
      map.putString("name", group.name)
      map.putBoolean("isFollowed", group.isFollowed)
      map.putBoolean("canChangeFollowStatus", group.canChangeFollowStatus)
      map.putBoolean("canAccess", group.canAccess)
      map.putBoolean("canCreateChildren", group.canCreateChildren)
      array.pushMap(map)
    }
    val params = Arguments.createMap()
    params.putArray("groups", array)
    sendEvent("groupsChanged", params)
  }

  fun emitConnectionStateChanged(state: ConnectionState) {
    val params = Arguments.createMap()
    when (state) {
      is ConnectionState.NotConnected -> params.putBoolean("connected", false)
      is ConnectionState.Connected -> {
        params.putBoolean("connected", true)
        params.putBoolean("isGuest", state.isGuest)
      }
    }
    sendEvent("connectionStateChanged", params)
  }

  // Parity wave — navigation & theme (fullscreen back event, issue #36)

  /**
   * The fullscreen UI's root-screen back tap, forwarded to the `onBackRequested` callback JS
   * registered through `openUI({ onBackRequested })` (see `internals/fullscreenBackRequested.ts`).
   *
   * Always emitted, like every other channel here: this class keeps no listener tally — see the
   * KDoc on [sendEvent] for why it cannot. The Activity finishes itself either way, so a JS side
   * with no callback registered simply drops it.
   *
   * The embedded view does NOT come through here: it carries its own per-view direct event
   * instead (`OctopusUIViewManager`), which is what lets one embedded view's callback fire
   * without reaching another's.
   */
  fun emitFullscreenBackRequested() {
    sendEvent("backRequested", null)
  }

  fun emitIsInitialisedChanged(isInitialised: Boolean) {
    val params = Arguments.createMap()
    params.putBoolean("isInitialised", isInitialised)
    sendEvent("isInitialisedChanged", params)
  }

  /**
   * `NativeEventEmitter` offers no reliable way to know whether JS still holds a listener,
   * so this class does not try to count them. `removeListeners(count)` carries no event
   * name, while `removeAllListeners(event)` forwards
   * `RCTDeviceEventEmitter.listenerCount(event)` — a count over a globally scoped event
   * name that also covers listeners registered outside this module. A single tally of those
   * callbacks therefore cannot describe the event names emitted here: it could reach
   * zero while a listener was still live, silently starving it.
   *
   * Emitting to a JS side that happens to have no listener is harmless, so the only
   * condition worth checking is that an instance is there to receive it. What happens
   * without the check depends on the architecture: on the legacy bridge `getJSModule` throws
   * before setup, then drops the call with a warning once torn down; under bridgeless it
   * never throws and both states are dropped with a soft-exception log instead.
   * `hasActiveReactInstance()` reports false in both states on both architectures.
   */
  private fun sendEvent(eventName: String, params: WritableMap?) {
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  companion object {
    var instance: OctopusEventEmitter? = null
  }
}
