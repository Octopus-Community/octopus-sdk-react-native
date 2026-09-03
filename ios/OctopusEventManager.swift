import React
import Octopus

class OctopusEventManager {
  private weak var bridge: RCTBridge?

  init(bridge: RCTBridge?) {
    self.bridge = bridge
  }

  func emitLoginRequired() {
    sendEvent(name: "loginRequired", body: nil)
  }

  func emitEditUser(profileField: ConnectionMode.SSOConfiguration.ProfileField?) {
    let fieldToEdit = ProfileFieldMapper.toReactNativeString(profileField)
    sendEvent(name: "editUser", body: ["fieldToEdit": fieldToEdit])
  }

  func emitNavigateToProfile(clientUserId: String) {
    sendEvent(name: "navigateToProfile", body: ["clientUserId": clientUserId])
  }

  func emitUserTokenRequest(requestId: String) {
    sendEvent(name: "userTokenRequest", body: ["requestId": requestId])
  }

  func emitBridgeShareTokenRequest(requestId: String, bridgeFingerprint: String) {
    sendEvent(
      name: "bridgeShareTokenRequest",
      body: ["requestId": requestId, "bridgeFingerprint": bridgeFingerprint]
    )
  }

  func emitNotSeenNotificationsCountChanged(count: Int) {
    sendEvent(name: "notSeenNotificationsCountChanged", body: ["count": count])
  }

  func emitHasAccessToCommunityChanged(hasAccess: Bool) {
    sendEvent(name: "hasAccessToCommunityChanged", body: ["hasAccess": hasAccess])
  }

  func emitSDKEvent(eventData: [String: Any]) {
    sendEvent(name: "sdkEvent", body: eventData)
  }

  func emitNavigateToUrl(url: String) {
    sendEvent(name: "navigateToUrl", body: ["url": url])
  }

  func emitCommunityDataChanged(data: OctopusCommunityData?) {
    sendEvent(name: "communityDataChanged", body: data.map { CommunityDataMapper.toDictionary($0) })
  }

  // Parity wave — groups & entitlements

  /// Always emitted once `wireGroupAccessDeniedCallback()` has assigned
  /// `OctopusSDK.set(groupAccessDeniedCallback:)`, regardless of whether JS currently holds a
  /// `setGroupAccessDeniedCallback` callback — see the doc comment on `sendEvent` below.
  func emitGroupAccessDenied(groupId: String) {
    sendEvent(name: "groupAccessDenied", body: ["groupId": groupId])
  }

  // Parity wave — client-object bridge

  /// One channel shared by every active `addClientObjectRelatedPostListener` subscription,
  /// each emission tagged with the `observationId` that JS filters on. A channel per
  /// subscription is not an option: `NativeEventEmitter` event names are a global namespace,
  /// and minting one per subscription would leak names no listener ever removes.
  func emitClientObjectPostChanged(observationId: String, post: [String: Any]?) {
    sendEvent(
      name: "clientObjectPostChanged",
      body: ["observationId": observationId, "post": post as Any]
    )
  }

  func emitNavigateToClientObject(objectId: String) {
    sendEvent(name: "navigateToClientObject", body: ["objectId": objectId])
  }

  // Parity wave — state streams

  /// Payload shapes below are shared with the Android `OctopusEventEmitter` and with the Flutter
  /// plugin's event channel, so the JS decoders in `internals/stateChannels.ts` read one wire
  /// format on both platforms. Keys are additive only.
  func emitProfileChanged(profile: OctopusProfile?) {
    sendEvent(
      name: "profileChanged",
      body: [
        "profile": profile.map {
          [
            "entitlements": Array($0.entitlements),
            "clientUserId": $0.clientUserId as Any,
          ]
        } as Any
      ]
    )
  }

  func emitGroupsChanged(groups: [OctopusGroup]) {
    sendEvent(
      name: "groupsChanged",
      body: [
        "groups": groups.map {
          [
            "id": $0.id,
            "name": $0.name,
            "isFollowed": $0.isFollowed,
            "canChangeFollowStatus": $0.canChangeFollowStatus,
            "canAccess": $0.canAccess,
            "canCreateChildren": $0.canCreateChildren,
          ]
        }
      ]
    )
  }

  /// The iOS public SDK has no dedicated connection-state publisher, so the caller derives the
  /// state from `profile` — "profile is set → connected" — and reads the guest flag from
  /// `OctopusProfile.isGuest` (iOS public surface since native SDK 1.12.6). Same derivation as the
  /// Flutter plugin's `startObservingConnectionState`.
  func emitConnectionStateChanged(profile: OctopusProfile?) {
    if let profile {
      sendEvent(name: "connectionStateChanged", body: ["connected": true, "isGuest": profile.isGuest])
    } else {
      sendEvent(name: "connectionStateChanged", body: ["connected": false])
    }
  }

  func emitIsInitialisedChanged(isInitialised: Bool) {
    sendEvent(name: "isInitialisedChanged", body: ["isInitialised": isInitialised])
  }

  /// `NativeEventEmitter` offers no reliable way to know whether JS still holds a listener,
  /// so this class does not try to count them. `removeListeners(_:)` carries no event name,
  /// while `removeAllListeners(event)` forwards `RCTDeviceEventEmitter.listenerCount(event)`
  /// — a count over a globally scoped event name that also covers listeners registered
  /// outside this module. A single tally of those callbacks therefore cannot describe the
  /// event names emitted here: it could reach zero while a listener was still live,
  /// silently starving it.
  ///
  /// Emitting to a JS side that happens to have no listener is harmless, so nothing here
  /// tries to gate on liveness either. In particular **do not** guard on `bridge.isValid`:
  /// under the New Architecture (bridgeless, the default since RN 0.74) a legacy
  /// `RCTBridgeModule` is handed an `RCTBridgeProxy`, whose `valid` returns `NO` by design
  /// for the whole lifetime of the app. Such a guard therefore drops **every** event on
  /// iOS, silently — it is what broke `navigateToProfile` (and every state stream) in
  /// 1.13.0. `eventDispatcher()` on the proxy does forward to a working dispatcher, so the
  /// emission below is the one path that holds on both architectures.
  ///
  /// `eventDispatcher()` is optional-chained because the header declares it outside any
  /// `NS_ASSUME_NONNULL` region (imported as implicitly-unwrapped): on a real `RCTBridge` it
  /// resolves through `moduleForClass:`, which returns nil once the bridge is invalidated —
  /// the old `isValid` guard used to shadow exactly that window on old-arch hosts and dev
  /// reloads, and without the `?` those would trap instead of no-op.
  private func sendEvent(name: String, body: Any?) {
    guard let bridge = bridge else { return }
    bridge.eventDispatcher()?.sendAppEvent(withName: name, body: body)
  }
}
