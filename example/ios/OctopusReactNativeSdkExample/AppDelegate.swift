import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "OctopusReactNativeSdkExample"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    // Native push: become the notification delegate and ask iOS to register
    // with APNs. The device token + taps are forwarded to JS by OctopusPushModule.
    UNUserNotificationCenter.current().delegate = self
    application.registerForRemoteNotifications()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    OctopusPushModule.shared?.emitToken(hex)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NSLog("[OctopusExample] APNs registration failed: \(error.localizedDescription)")
  }

  // UNUserNotificationCenterDelegate — tap on a delivered notification.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    OctopusPushModule.shared?.emitNotificationOpened(response.notification.request.content.userInfo)
    completionHandler()
  }

  // UNUserNotificationCenterDelegate — notification arriving in foreground.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    OctopusPushModule.shared?.emitNotificationOpened(notification.request.content.userInfo)
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound])
    } else {
      completionHandler([.alert, .sound])
    }
  }

  override func createRootViewController() -> UIViewController {
    let controller = SampleRootViewController()
    SampleSystemBars.rootViewController = controller
    return controller
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

/// The RN shell owns its status bar; fullscreen SDK controllers own theirs.
final class SampleRootViewController: UIViewController {
  var statusBarStyle: UIStatusBarStyle = .lightContent {
    didSet { setNeedsStatusBarAppearanceUpdate() }
  }

  override var preferredStatusBarStyle: UIStatusBarStyle { statusBarStyle }
}

/// Sample-only bridge. RN's built-in StatusBar writes UIApplication state, which is
/// deliberately disabled now that native presentations use controller-based appearance.
@objc(SampleSystemBars)
class SampleSystemBars: NSObject {
  static weak var rootViewController: SampleRootViewController?

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func setStyle(_ style: String) {
    DispatchQueue.main.async {
      Self.rootViewController?.statusBarStyle = style == "dark" ? .darkContent : .lightContent
    }
  }
}
