import Foundation
import React
import UserNotifications

/// Bridges native APNs registration + notification taps to JS, replacing the
/// Firebase Messaging convenience layer on iOS. Octopus delivers via direct APNs,
/// so the example only needs to (1) hand the APNs device token to the SDK and
/// (2) forward a tapped notification's userInfo to JS.
@objc(OctopusPushModule)
class OctopusPushModule: RCTEventEmitter {
  /// Set so the AppDelegate can reach the live instance from its callbacks.
  @objc static weak var shared: OctopusPushModule?

  private var hasListeners = false
  private static var pendingToken: String?

  static func tokenReceived(_ token: String) {
    DispatchQueue.main.async {
      if let module = shared { module.emitToken(token) }
      else { pendingToken = token }
    }
  }
  private static var bufferedNotification: [String: Any]?

  static func notificationOpened(_ userInfo: [AnyHashable: Any], id: String) {
    DispatchQueue.main.async {
      var payload = userInfo
      payload["sample_push_id"] = id
      if let module = shared { module.emitNotificationOpened(payload) }
      else { bufferedNotification = stringKeyed(payload) }
    }
  }

  override init() {
    super.init()
    OctopusPushModule.shared = self
  }

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["octopusPushToken", "octopusNotificationOpened"]
  }

  override func startObserving() {
    hasListeners = true
    if let token = Self.pendingToken {
      sendEvent(withName: "octopusPushToken", body: token)
      Self.pendingToken = nil
    }
  }

  override func stopObserving() {
    hasListeners = false
  }

  /// Called from the AppDelegate when APNs returns the device token.
  func emitToken(_ token: String) {
    if hasListeners {
      sendEvent(withName: "octopusPushToken", body: token)
    } else {
      Self.pendingToken = token
    }
  }

  /// Called from the AppDelegate on a notification tap or foreground delivery.
  /// If JS listeners aren't attached yet (cold start), buffer it for
  /// `getInitialNotification`.
  func emitNotificationOpened(_ userInfo: [AnyHashable: Any]) {
    let normalized = OctopusPushModule.stringKeyed(userInfo)
    if hasListeners {
      sendEvent(withName: "octopusNotificationOpened", body: normalized)
    } else {
      Self.bufferedNotification = normalized
    }
  }

  @objc(requestPermissions:rejecter:)
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current()
      .requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
        resolve(granted)
      }
  }

  @objc(getInitialNotification:rejecter:)
  func getInitialNotification(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let n = Self.bufferedNotification
      Self.bufferedNotification = nil
      resolve(n)
    }
  }

  private static func stringKeyed(_ dict: [AnyHashable: Any]) -> [String: Any] {
    var out: [String: Any] = [:]
    for (k, v) in dict { out[String(describing: k)] = v }
    return out
  }
}
