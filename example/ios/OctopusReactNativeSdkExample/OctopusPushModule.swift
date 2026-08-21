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
  private var pendingToken: String?
  private var bufferedNotification: [String: Any]?

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
    if let token = pendingToken {
      sendEvent(withName: "octopusPushToken", body: token)
      pendingToken = nil
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
      pendingToken = token
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
      bufferedNotification = normalized
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
    let n = bufferedNotification
    bufferedNotification = nil
    resolve(n)
  }

  private static func stringKeyed(_ dict: [AnyHashable: Any]) -> [String: Any] {
    var out: [String: Any] = [:]
    for (k, v) in dict { out[String(describing: k)] = v }
    return out
  }
}
