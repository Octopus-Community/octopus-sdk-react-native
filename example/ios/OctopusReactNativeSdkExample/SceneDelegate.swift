import UIKit
import React
import React_RCTAppDelegate

/// Owns the example's only window. Apps built with the iOS 27 SDK must adopt the UIScene
/// life cycle or UIKit terminates them at launch, so the window comes from the
/// `UIWindowScene` here instead of from `AppDelegate`.
///
/// React Native itself is not owned here: the scene starts it through the AppDelegate's
/// single `RCTReactNativeFactory`, so reconnecting a scene never builds a second runtime.
/// The root view controller is not retained for reuse: reconnecting remounts the JS root
/// on that runtime and resets its React state.
///
/// This example has no inbound URLs. Hosts with inbound URLs must forward
/// `scene(_:openURLContexts:)` and cold-start `connectionOptions.urlContexts` to
/// `RCTLinkingManager.application(_:open:options:)`. Forward `scene(_:continue:)` and
/// cold-start `connectionOptions.userActivities` to
/// `RCTLinkingManager.application(_:continue:restorationHandler:)`.
///
/// Notifications: a tap that cold-launches the app also shows up in
/// `connectionOptions.notificationResponse`, but `AppDelegate` is the
/// `UNUserNotificationCenter` delegate from `didFinishLaunching` on, so iOS still calls its
/// `userNotificationCenter(_:didReceive:withCompletionHandler:)` for that same tap. That
/// callback stays the single route to JS — forwarding the connection option as well would
/// deliver the cold-start tap twice.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let moduleName = appDelegate.moduleName
    else {
      NSLog("[OctopusExample] Scene setup failed: expected a UIWindowScene, AppDelegate, and moduleName.")
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // RCTAppDelegate exposes `window`; keep it pointing at the live one for code that
    // still reads it from the application delegate.
    appDelegate.window = window

    appDelegate.reactNativeFactory.startReactNative(
      withModuleName: moduleName,
      in: window,
      initialProperties: appDelegate.initialProps,
      launchOptions: nil
    )
  }
}
