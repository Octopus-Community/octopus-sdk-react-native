@_spi(OctopusInternalTesting) import Octopus
import OctopusUI
import SwiftUI
import UIKit
import React
import Combine

@objc(OctopusReactNativeSdk)
class OctopusReactNativeSdk: NSObject, RCTBridgeModule {

  // MARK: - Properties

  private var octopusSDK: OctopusSDK?
  private lazy var uiManager = OctopusUIManager()
  private lazy var eventManager = OctopusEventManager(bridge: bridge)
  private let sdkInitializer = OctopusSDKInitializer()
  private var ssoAuthenticator: OctopusSSOAuthenticator?
  private lazy var bridgeShareTokenBroker = OctopusBridgeShareTokenBroker(
    eventManager: eventManager
  )
  private var theme: OctopusTheme?
  private var logoSource: [String: Any]?
  private var fontConfiguration: [String: Any]?
  private var uiConfiguration: OctopusUIConfiguration?
  private var topAppBar: OctopusTopAppBarConfig?
  private var cancellables = Set<AnyCancellable>()
  private var communityDataCancellable: AnyCancellable?

  // Parity wave — client-object bridge
  /// One cancellable per `addClientObjectRelatedPostListener` subscription, keyed by the
  /// `observationId` JS minted. Not the single-value shape `communityDataCancellable` uses: a
  /// host legitimately watches several client objects at once (a list of articles, say), and a
  /// second subscription must not silently unsubscribe the first.
  private var clientObjectPostCancellables: [String: AnyCancellable] = [:]
  /// Whether JS registered a `setNavigateToClientObjectCallback`. Kept because the native
  /// callback is applied at `initialize()` too — JS may register before the SDK exists.
  private var isNavigateToClientObjectRegistered = false

  // MARK: - RCTBridgeModule
  
  @objc var bridge: RCTBridge!
  
  @objc static func moduleName() -> String! {
    return "OctopusReactNativeSdk"
  }
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Initialization

  @objc(initialize:withResolver:withRejecter:)
  func initialize(options: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    do {
      // Drop any sinks attached to a previous SDK instance before creating new ones.
      cancellables.removeAll()

      self.octopusSDK = try sdkInitializer.initialize(options: options, eventManager: eventManager)
      self.ssoAuthenticator = OctopusSSOAuthenticator(octopusSDK: self.octopusSDK!, eventManager: eventManager)
      self.theme = sdkInitializer.parseTheme(from: options)
      self.logoSource = sdkInitializer.getLogoSource(from: options)
      self.fontConfiguration = sdkInitializer.getFontConfiguration(from: options)
      self.uiConfiguration = sdkInitializer.parseUIConfiguration(from: options)
      self.topAppBar = sdkInitializer.parseTopAppBar(from: options)

      // Start observing reactive events after SDK initialization
      startObservingReactiveEvents()
      // Re-apply a navigate-to-client-object registration made before the SDK existed.
      applyNavigateToClientObjectCallback()

      resolve(nil)
    } catch {
      reject("INITIALIZE_ERROR", "Failed to initialize Octopus SDK: \(error.localizedDescription)", error)
    }
  }

  // MARK: - User authentication

  @objc(connectUser:withResolver:withRejecter:)
  func connectUser(params: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("CONNECT_USER_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    Task {
      do {
        try await authenticator.connectUser(params: params)
        resolve(nil)
      } catch let error as ConnectUserBridgeError {
        // Classified failure: reject with the shared code so JS can tell a ban from a bad token.
        reject(error.code, error.message, error)
      } catch {
        reject("CONNECT_USER_ERROR", "Failed to connect user: \(error.localizedDescription)", error)
      }
    }

  }

  @objc(completeUserTokenRequest:withToken:withResolver:withRejecter:)
  func completeUserTokenRequest(requestId: String, token: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("PROVIDE_TOKEN_ERROR", "SDK not initialized", nil)
      return
    }

    authenticator.completeTokenRequest(requestId: requestId, token: token)
    resolve(nil)
  }

  @objc(cancelUserTokenRequest:withResolver:withRejecter:)
  func cancelUserTokenRequest(requestId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("PROVIDE_TOKEN_ERROR", "SDK not initialized", nil)
      return
    }

    authenticator.cancelTokenRequest(requestId: requestId)
    resolve(nil)
  }

  // MARK: - Bridge share signing

  /// Declares that JS can answer `bridgeShareTokenRequest`. Not a listener tally — see
  /// `nativeEventGate.test.ts` for why one cannot be kept honest; this is an explicit,
  /// idempotent statement from `addBridgeShareTokenRequestListener`.
  @objc(registerBridgeShareTokenProvider:withRejecter:)
  func registerBridgeShareTokenProvider(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    bridgeShareTokenBroker.registerProvider()
    resolve(nil)
  }

  @objc(unregisterBridgeShareTokenProvider:withRejecter:)
  func unregisterBridgeShareTokenProvider(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    bridgeShareTokenBroker.unregisterProvider()
    resolve(nil)
  }

  /// Answers one `bridgeShareTokenRequest`. A `nil` `token` means "do not sign", which fails
  /// the publish on this platform — `OctopusPrefilledPost.sign` has no unsigned channel. See
  /// `useBridgeShareTokenProvider`'s platform note.
  @objc(completeBridgeShareTokenRequest:withToken:withResolver:withRejecter:)
  func completeBridgeShareTokenRequest(
    requestId: String,
    token: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    bridgeShareTokenBroker.completeRequest(requestId: requestId, token: token)
    resolve(nil)
  }

  @objc(disconnectUser:withRejecter:)
  func disconnectUser(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("DISCONNECT_USER_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    do {
      try authenticator.disconnectUser()
      resolve(nil)
    } catch {
      reject("DISCONNECT_USER_ERROR", "Failed to disconnect user: \(error.localizedDescription)", error)
    }

  }

  // MARK: - UI management

  @objc(openUI:withResolver:withRejecter:)
  func openUI(options: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let octopus = octopusSDK else {
      reject("OPEN_UI_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    let interceptUrls = (options as? [String: Any])?["interceptUrls"] as? Bool ?? false
    let interceptProfileTaps =
      (options as? [String: Any])?["interceptProfileTaps"] as? Bool ?? false

    var notificationUserInfo: [AnyHashable: Any]? = nil
    if let dict = options as? [String: Any],
       let notif = dict["notification"] as? [String: Any],
       let rawPayload = notif["rawPayload"] as? [String: Any],
       !rawPayload.isEmpty {
      var converted: [AnyHashable: Any] = [:]
      for (k, v) in rawPayload { converted[k as AnyHashable] = v }
      notificationUserInfo = converted
    }

    var initialScreen: BridgeInitialScreen = .home(.mainFeed)
    if let dict = options as? [String: Any],
       let initialScreenMap = dict["initialScreen"] as? [String: Any] {
      if notificationUserInfo != nil {
        // The JS layer already enforces this precedence (it drops the initial screen with a
        // warning before calling the bridge); this is the native-side guard for symmetry with
        // Android, so a payload carrying both can never follow two navigations.
        NSLog(
          "[OctopusReactNativeSdk] openUI: both notification and initialScreen were provided — "
            + "following the notification deep link and dropping the initial screen"
        )
      } else if (initialScreenMap["type"] as? String) == "createPost" {
        // Decoded here rather than in decodeBridgeInitialScreen so an invalid prefill rejects
        // the promise with the same error codes as navigateToOctopusCreatePost, instead of
        // silently folding to the main feed. No prefill fields at all means a blank editor.
        let text = initialScreenMap["text"] as? String
        let imageUri = initialScreenMap["imageUri"] as? String
        let topicId = initialScreenMap["topicId"] as? String
        let ctaUrl = initialScreenMap["ctaUrl"] as? String
        let ctaLabel = initialScreenMap["ctaLabel"] as? String
        let hasPrefill = text != nil || imageUri != nil || topicId != nil
          || ctaUrl != nil || ctaLabel != nil
        if hasPrefill {
          do {
            let prefilledPost = try PrefilledPostBuilder.build(
              text: text, imageUri: imageUri, topicId: topicId, ctaUrl: ctaUrl, ctaLabel: ctaLabel
            )
            initialScreen = .home(.createPost(.init(prefilledPost: prefilledPost)))
          } catch let error as OctopusPrefilledPost.ValidationError {
            reject(error.toBridgeErrorCode(), error.debugDescription, error)
            return
          } catch {
            reject("NAVIGATE_TO_CREATE_POST_ERROR", error.localizedDescription, error)
            return
          }
        } else {
          initialScreen = .home(.createPost(.init(prefilledPost: nil)))
        }
      } else {
        initialScreen = decodeBridgeInitialScreen(initialScreenMap)
      }
    }

    // Parity wave — navigation & theme. `navigationMode` defaults to `.navigationStack` — the
    // TS layer always sends a concrete value (see `openUI.ts`'s `?? 'navigationStack'`), and
    // `decodeNavigationMode`'s own nil/unrecognized fallback matches, deliberately not the
    // native SDK's own `.automatic` default (iso with Flutter — see the type's TSDoc for why).
    // The leading-action tap dismisses the fullscreen UI exactly like the native default back
    // arrow does — mirroring Android's `onBack = { finish() }`, which is unconditionally wired
    // regardless of icon variant.
    let navigationMode = decodeNavigationMode(
      (options as? [String: Any])?["navigationMode"] as? String
    )
    let navBarLeadingAction = decodeNavBarLeadingAction(
      (options as? [String: Any])?["navBarLeadingAction"] as? String,
      onTap: { [weak self] in try? self?.uiManager.closeUI() }
    )

    DispatchQueue.main.async {
      do {
        if interceptUrls {
          octopus.set(onNavigateToURLCallback: { [weak self] url in
            self?.eventManager.emitNavigateToUrl(url: url.absoluteString)
            return .handledByApp
          })
        } else {
          octopus.set(onNavigateToURLCallback: nil)
        }
        self.applyProfileTapInterception(interceptProfileTaps, on: octopus)
        try self.uiManager.openUI(
          octopus: octopus,
          theme: self.theme,
          logoSource: self.logoSource,
          fontConfiguration: self.fontConfiguration,
          uiConfiguration: self.uiConfiguration,
          notificationUserInfo: notificationUserInfo,
          topAppBar: self.topAppBar,
          initialScreen: initialScreen,
          navigationMode: navigationMode,
          navBarLeadingAction: navBarLeadingAction
        )
        resolve(nil)
      } catch {
        reject("OPEN_UI_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Navigation & theme parity helpers

  /// `nil` or an unrecognized wire value both fall back to `.navigationStack` — RN's own
  /// documented default on both entry points (deliberately not the native SDK's own
  /// `.automatic`, which the JS layer always overrides by sending a concrete value; this
  /// fallback only guards against that contract being bypassed, e.g. a stale JS bundle). Same
  /// permissiveness as the rest of this file's string-keyed option decoding: an unrecognized
  /// string is treated the same as absent, rather than rejected.
  private func decodeNavigationMode(_ raw: String?) -> OctopusNavigationMode {
    raw == "automatic" ? .automatic : .navigationStack
  }

  private func decodeNavBarLeadingAction(
    _ raw: String?, onTap: @escaping () -> Void
  ) -> OctopusNavBarLeadingAction? {
    switch raw {
    case "close": return .close(onTap: onTap)
    case "back": return .back(onTap: onTap)
    default: return nil
    }
  }

  /// Same decode as `decodeNavBarLeadingAction`, plus the `showBackButton` backfill
  /// `OctopusUIView` needs and `openUI` does not: `OctopusHomeScreen` only shows its native
  /// default leading icon when `presentationMode.wrappedValue.isPresented` — true for
  /// `openUI`'s modally-presented `UIHostingController`, but always false for the embedded
  /// view's `addChild`-based hosting, which is never a SwiftUI presentation. Without this
  /// backfill, `showBackButton: true` would render no icon at all on the embedded view.
  /// Matches the Flutter iOS bridge's own backfill for the same reason.
  ///
  /// The tap closure is empty (inert): the embedded container has no per-instance channel
  /// back to JS to notify on tap — a known, documented gap (see `OctopusUIView`'s TSDoc and
  /// the matching Android `OctopusUIViewManager` comment).
  private func embeddedNavBarLeadingAction(
    raw: String?, showBackButton: Bool
  ) -> OctopusNavBarLeadingAction? {
    if let action = decodeNavBarLeadingAction(raw, onTap: {}) {
      return action
    }
    return showBackButton ? .back(onTap: {}) : nil
  }

  /// Merges a per-view top-app-bar override onto the global `topAppBar` config from
  /// `initialize()`, mirroring the Android bridge's `OctopusContent` precedence: an explicit
  /// override always wins, an unset one falls back to the global config, which itself falls
  /// back to the native default. A non-nil `titleOverride` always switches the merged config
  /// to text mode, regardless of the global config's own `titleType` — matching Android's
  /// `navBarTitleOverride ?: topAppBarConfig?.takeIf { it.titleType == "text" }?.titleText`
  /// only in effect, not literally: there, a title override is unconditional too.
  private func mergedTopAppBar(
    titleOverride: String?, primaryColorOverride: NSNumber?, centeredOverride: NSNumber?
  ) -> OctopusTopAppBarConfig? {
    guard titleOverride != nil || primaryColorOverride != nil || centeredOverride != nil else {
      return topAppBar
    }
    return OctopusTopAppBarConfig(
      titleType: titleOverride != nil ? "text" : topAppBar?.titleType,
      titleText: titleOverride ?? topAppBar?.titleText,
      centered: centeredOverride?.boolValue ?? topAppBar?.centered ?? false,
      coloredBackground: primaryColorOverride?.boolValue ?? topAppBar?.coloredBackground ?? false
    )
  }

  @objc(handleUrlStrategy:withStrategy:)
  func handleUrlStrategy(url: String, strategy: String) -> Void {
    guard strategy == "handledByOctopus" else { return }
    guard let urlObj = URL(string: url) else { return }
    DispatchQueue.main.async {
      UIApplication.shared.open(urlObj)
    }
  }

  @objc(closeUI:withRejecter:)
  func closeUI(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    DispatchQueue.main.async {
      do {
        try self.uiManager.closeUI()
        resolve(nil)
      } catch {
        reject("CLOSE_UI_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Wires — or unwires — the Unified Profile callbacks on the native SDK.
  ///
  /// Both callbacks are keyed on the same host opt-in (`interceptProfileTaps`), and the opt-in
  /// is what the bridge has instead of a listener count: the native SDK treats a non-nil
  /// callback as the *activation switch* for Unified Profile, so wiring one speculatively
  /// would replace the SDK's own profile screens with a dead end for every host that never
  /// asked for the feature. `NativeEventEmitter` cannot tell us whether a JS listener is live
  /// (see `OctopusEventManager.sendEvent`), so the host says so explicitly.
  ///
  /// `onNavigateToProfileEditCallback` rides along because the Android bridge already routes
  /// profile-edit at every Compose entry point it mounts. Without it, the "Edit my profile"
  /// action on the Unified Profile activity screen would be handled on Android and hidden on
  /// iOS — and the same host code would behave differently per platform. It emits the existing
  /// `editUser` event, so no new JS surface is needed.
  private func applyProfileTapInterception(_ intercept: Bool, on octopus: OctopusSDK) {
    guard intercept else {
      octopus.set(onNavigateToProfileCallback: nil)
      octopus.set(onNavigateToProfileEditCallback: nil)
      return
    }
    octopus.set(onNavigateToProfileCallback: { [weak self] clientUserId in
      self?.eventManager.emitNavigateToProfile(clientUserId: clientUserId)
    })
    octopus.set(onNavigateToProfileEditCallback: { [weak self] fieldToEdit in
      self?.eventManager.emitEditUser(profileField: fieldToEdit)
    })
  }

  /// Called by OctopusUIViewManager's container view to embed the native UI (non-fullscreen).
  @objc func addEmbeddedView(
    containerView: UIView,
    interceptUrls: Bool,
    interceptProfileTaps: Bool,
    notification: [String: Any]? = nil,
    initialScreen initialScreenMap: [String: Any]? = nil,
    // Parity wave — navigation & theme
    showBackButton: Bool = false,
    showNavBar: Bool = true,
    navBarTitle: String? = nil,
    navBarPrimaryColor: NSNumber? = nil,
    titleCentered: NSNumber? = nil,
    navigationMode: String? = nil,
    navBarLeadingAction: String? = nil
  ) {
    guard let octopus = octopusSDK else { return }
    if interceptUrls {
      octopus.set(onNavigateToURLCallback: { [weak self] url in
        self?.eventManager.emitNavigateToUrl(url: url.absoluteString)
        return .handledByApp
      })
    } else {
      octopus.set(onNavigateToURLCallback: nil)
    }
    applyProfileTapInterception(interceptProfileTaps, on: octopus)

    var notificationUserInfo: [AnyHashable: Any]? = nil
    if let rawPayload = notification?["rawPayload"] as? [String: Any], !rawPayload.isEmpty {
      var converted: [AnyHashable: Any] = [:]
      for (k, v) in rawPayload { converted[k as AnyHashable] = v }
      notificationUserInfo = converted
    }

    // Same decode as openUI, minus the promise: a view prop has nothing to reject into, so an
    // invalid createPost prefill degrades to a blank editor with a log instead of surfacing a
    // NavigateToOctopusCreatePostError. Hosts that need that error use
    // navigateToOctopusCreatePost. Matches the Android embedded prop setter and the Flutter
    // embedded platform view.
    var initialScreen: BridgeInitialScreen = .home(.mainFeed)
    if let initialScreenMap {
      if notificationUserInfo != nil {
        // The JS layer already drops the initial screen with a warning before it reaches the
        // bridge; this is the native-side guard, for symmetry with Android and with openUI.
        NSLog(
          "[OctopusReactNativeSdk] OctopusUIView: both notification and initialScreen were "
            + "provided — following the notification deep link and dropping the initial screen"
        )
      } else if (initialScreenMap["type"] as? String) == "createPost" {
        let text = initialScreenMap["text"] as? String
        let imageUri = initialScreenMap["imageUri"] as? String
        let topicId = initialScreenMap["topicId"] as? String
        let ctaUrl = initialScreenMap["ctaUrl"] as? String
        let ctaLabel = initialScreenMap["ctaLabel"] as? String
        let hasPrefill = text != nil || imageUri != nil || topicId != nil
          || ctaUrl != nil || ctaLabel != nil
        if hasPrefill {
          do {
            let prefilledPost = try PrefilledPostBuilder.build(
              text: text, imageUri: imageUri, topicId: topicId, ctaUrl: ctaUrl, ctaLabel: ctaLabel
            )
            initialScreen = .home(.createPost(.init(prefilledPost: prefilledPost)))
          } catch {
            NSLog(
              "[OctopusReactNativeSdk] OctopusUIView: initialScreen.createPost prefill rejected "
                + "(\(error)) — opening a blank editor"
            )
            initialScreen = .home(.createPost(.init(prefilledPost: nil)))
          }
        } else {
          initialScreen = .home(.createPost(.init(prefilledPost: nil)))
        }
      } else {
        initialScreen = decodeBridgeInitialScreen(initialScreenMap)
      }
    }

    // Parity wave — navigation & theme. `showNavBar: false` has no native counterpart here —
    // OctopusHomeScreen's public init takes no such parameter — so it degrades to a warning
    // instead of hiding anything, matching Flutter's own pre-existing "not yet supported on
    // iOS" gap for the same prop.
    if !showNavBar {
      NSLog(
        "[OctopusReactNativeSdk] OctopusUIView: showNavBar: false is not supported on iOS — "
          + "the native top app bar is always shown"
      )
    }

    uiManager.addEmbeddedView(
      to: containerView,
      octopus: octopus,
      theme: theme,
      logoSource: logoSource,
      fontConfiguration: fontConfiguration,
      uiConfiguration: uiConfiguration,
      interceptUrls: interceptUrls,
      notificationUserInfo: notificationUserInfo,
      topAppBar: mergedTopAppBar(
        titleOverride: navBarTitle,
        primaryColorOverride: navBarPrimaryColor,
        centeredOverride: titleCentered
      ),
      initialScreen: initialScreen,
      navigationMode: decodeNavigationMode(navigationMode),
      navBarLeadingAction: embeddedNavBarLeadingAction(
        raw: navBarLeadingAction, showBackButton: showBackButton
      )
    )
  }

  @objc(updateColorScheme:withResolver:withRejecter:)
  func updateColorScheme(colorScheme: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    // iOS uses adaptive colors that automatically respond to system appearance changes
    // No manual updates needed - the theme is applied when UI opens
    resolve(nil)
  }

  // MARK: - Notification management

  @objc(updateNotSeenNotificationsCount:withRejecter:)
  func updateNotSeenNotificationsCount(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let octopus = octopusSDK else {
      reject("UPDATE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    Task {
      do {
        try await octopus.updateNotSeenNotificationsCount()
        resolve(nil)
      } catch {
        reject("UPDATE_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(registerPushNotificationToken:withResolver:withRejecter:)
  func registerPushNotificationToken(
    token: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("REGISTER_TOKEN_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let trimmed = (token as String).trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      reject("INVALID_ARGS", "token is required and must be non-empty", nil)
      return
    }
    octopus.set(notificationDeviceToken: trimmed)
    resolve(nil)
  }

  // MARK: - Analytics (custom events)

  @objc(trackCustomEvent:withProperties:withResolver:withRejecter:)
  func trackCustomEvent(
    name: String,
    properties: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("TRACK_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedName.isEmpty else {
      reject("INVALID_ARGS", "name is required and must be non-empty", nil)
      return
    }
    let props = dictionaryToStringMap(properties) ?? [:]
    let customEvent = CustomEvent(
      name: trimmedName,
      properties: props.mapValues { CustomEvent.PropertyValue(value: $0) }
    )
    Task {
      do {
        try await octopus.track(customEvent: customEvent)
        resolve(nil)
      } catch {
        reject("TRACK_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Converts NSDictionary to [String: String]. Only string values are included.
  private func dictionaryToStringMap(_ dict: NSDictionary?) -> [String: String]? {
    guard let dict = dict as? [String: Any] else { return nil }
    var result: [String: String] = [:]
    for (key, value) in dict {
      if let str = value as? String {
        result[key] = str
      }
    }
    return result
  }

  // MARK: - Community access override

  @objc(overrideCommunityAccess:withResolver:withRejecter:)
  func overrideCommunityAccess(
    hasAccess: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("OVERRIDE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      do {
        try await octopus.overrideCommunityAccess(hasAccess)
        resolve(nil)
      } catch {
        reject("OVERRIDE_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Track community access (analytics only)

  @objc(trackCommunityAccess:withResolver:withRejecter:)
  func trackCommunityAccess(
    hasAccess: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("TRACK_ACCESS_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    octopus.track(hasAccessToCommunity: hasAccess)
    resolve(nil)
  }

  // MARK: - Sync follow groups

  @objc(syncFollowGroups:withResolver:withRejecter:)
  func syncFollowGroups(
    rawActions: NSArray,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("not_connected", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let inputs = rawActions as? [[String: Any]] ?? []
    if inputs.isEmpty {
      resolve([] as [[String: Any]])
      return
    }
    let actions: [OctopusSyncFollowGroup.Action] = inputs.compactMap { m in
      guard let groupId = m["groupId"] as? String,
            let followed = m["followed"] as? Bool,
            let ms = m["actionDateMs"] as? NSNumber
      else {
        NSLog("[OctopusSDK] syncFollowGroups: dropping malformed action \(m). Expected groupId/followed/actionDateMs.")
        return nil
      }
      let date = Date(timeIntervalSince1970: ms.doubleValue / 1000.0)
      return OctopusSyncFollowGroup.Action(groupId: groupId, followed: followed, actionDate: date)
    }
    Task {
      do {
        let nativeResults = try await octopus.syncFollowGroups(actions: actions)
        let payload: [[String: Any]] = nativeResults.map { r in
          ["groupId": r.groupId, "status": r.status.toWireValue()]
        }
        resolve(payload)
      } catch let error as OctopusSyncFollowGroup.Error {
        let code: String
        switch error {
        case .notConnected: code = "not_connected"
        case .noNetwork:    code = "no_network"
        case .server:       code = "server"
        case .other:        code = "other"
        }
        reject(code, String(describing: error), error)
      } catch {
        reject("other", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Locale override

  @objc(overrideDefaultLocale:withCountryCode:withResolver:withRejecter:)
  func overrideDefaultLocale(
    languageCode: NSString?,
    countryCode: NSString?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("LOCALE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let locale: Locale?
    if let lang = languageCode as String? {
      if let country = countryCode as String? {
        locale = Locale(identifier: "\(lang)-\(country)")
      } else {
        locale = Locale(identifier: lang)
      }
    } else {
      locale = nil
    }
    octopus.overrideDefaultLocale(with: locale)
    resolve(nil)
  }

  // MARK: - Reactions

  @objc(setReaction:reaction:withResolver:withRejecter:)
  func setReaction(
    postId: String,
    reaction: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("SET_REACTION_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let reactionKind: OctopusReactionKind?
    if let reaction {
      guard let mapped = ReactionKindMapper.fromReactNativeString(reaction) else {
        reject("UNKNOWN_REACTION", "Unknown reaction: \(reaction)", nil)
        return
      }
      reactionKind = mapped
    } else {
      reactionKind = nil
    }
    Task {
      do {
        try await octopus.set(reaction: reactionKind, postId: postId)
        resolve(nil)
      } catch let error as OctopusSetReactionError {
        let (code, message) = error.toBridgeError()
        reject(code, message, error)
      } catch {
        reject("SET_REACTION_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Community data

  /// `profileId` / `clientUserId` mirror the JS-facing call order (see `fetchCommunityData.ts`).
  /// The JS layer already enforces exactly one is non-null before calling the bridge
  /// (`requireExactlyOneMemberId`); this still defends against a stale/hand-rolled caller.
  @objc(fetchCommunityData:clientUserId:withResolver:withRejecter:)
  func fetchCommunityData(
    profileId: String?,
    clientUserId: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("FETCH_COMMUNITY_DATA_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      do {
        let data: OctopusCommunityData?
        if let profileId, !profileId.isEmpty {
          data = try await octopus.fetchCommunityData(profileId: profileId)
        } else if let clientUserId, !clientUserId.isEmpty {
          data = try await octopus.fetchCommunityData(clientUserId: clientUserId)
        } else {
          reject("INVALID_ARGS", "One of profileId or clientUserId is required", nil)
          return
        }
        resolve(data.map { CommunityDataMapper.toDictionary($0) })
      } catch {
        reject("SERVER_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(startObservingCommunityData:clientUserId:withResolver:withRejecter:)
  func startObservingCommunityData(
    profileId: String?,
    clientUserId: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("START_OBSERVING_COMMUNITY_DATA_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let publisher: AnyPublisher<OctopusCommunityData?, Never>
    if let profileId, !profileId.isEmpty {
      publisher = octopus.communityDataPublisher(profileId: profileId)
    } else if let clientUserId, !clientUserId.isEmpty {
      publisher = octopus.communityDataPublisher(clientUserId: clientUserId)
    } else {
      reject("INVALID_ARGS", "One of profileId or clientUserId is required", nil)
      return
    }
    // A new subscription replaces any previous one — only one observation is ever active,
    // mirroring the Android bridge's single-`Job` behavior.
    communityDataCancellable?.cancel()
    communityDataCancellable = publisher
      .receive(on: DispatchQueue.main)
      .sink { [weak self] data in
        self?.eventManager.emitCommunityDataChanged(data: data)
      }
    resolve(nil)
  }

  @objc(stopObservingCommunityData:withRejecter:)
  func stopObservingCommunityData(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    communityDataCancellable?.cancel()
    communityDataCancellable = nil
    resolve(nil)
  }

  // MARK: - Debug overrides (testing only)

  @objc(debugOverrideProfileFieldsLock:withResolver:withRejecter:)
  func debugOverrideProfileFieldsLock(
    lock: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("OVERRIDE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let mapped = DebugOverrideMappers.toProfileFieldsLock(lock)
    Task { @MainActor in
      octopus.debugOverrideProfileFieldsLock(mapped)
      resolve(nil)
    }
  }

  @objc(debugOverrideContentOptions:withResolver:withRejecter:)
  func debugOverrideContentOptions(
    options: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("OVERRIDE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let mapped = DebugOverrideMappers.toContentOptions(options)
    Task { @MainActor in
      octopus.debugOverrideContentOptions(mapped)
      resolve(nil)
    }
  }

  @objc(debugOverrideTermsAcceptanceMode:withResolver:withRejecter:)
  func debugOverrideTermsAcceptanceMode(
    mode: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("OVERRIDE_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let mapped = DebugOverrideMappers.toTermsAcceptanceMode(mode)
    if mode != nil && mapped == nil {
      reject("INVALID_ARGS", "Unknown terms acceptance mode: \(mode!)", nil)
      return
    }
    Task { @MainActor in
      octopus.debugOverrideTermsAcceptanceMode(mapped)
      resolve(nil)
    }
  }

  // MARK: - Create post

  @objc(navigateToOctopusCreatePost:withResolver:withRejecter:)
  func navigateToOctopusCreatePost(
    options: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("NAVIGATE_TO_CREATE_POST_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    // Flat `ctaUrl` / `ctaLabel` top-level keys — not a nested `cta` dictionary. See
    // `navigateToOctopusCreatePost.ts`, which always sends these flat (mirrors the Android
    // bridge's own `options?.getString("ctaUrl")` / `"ctaLabel"` reads).
    let dict = options as? [String: Any]
    let text = dict?["text"] as? String
    let imageUri = dict?["imageUri"] as? String
    let topicId = dict?["topicId"] as? String
    let ctaUrl = dict?["ctaUrl"] as? String
    let ctaLabel = dict?["ctaLabel"] as? String

    let prefilledPost: OctopusPrefilledPost
    do {
      prefilledPost = try PrefilledPostBuilder.build(
        text: text, imageUri: imageUri, topicId: topicId, ctaUrl: ctaUrl, ctaLabel: ctaLabel,
        // `nil` unless JS registered a signer, which keeps hosts that never call
        // `addBridgeShareTokenRequestListener` on the previous unsigned behaviour.
        sign: bridgeShareTokenBroker.signClosureOrNil()
      )
    } catch let error as OctopusPrefilledPost.ValidationError {
      reject(error.toBridgeErrorCode(), error.debugDescription, error)
      return
    } catch {
      reject("NAVIGATE_TO_CREATE_POST_ERROR", error.localizedDescription, error)
      return
    }

    DispatchQueue.main.async {
      // Prefilled-post navigation never intercepts URLs — matches the Android bridge's default
      // for this flow.
      octopus.set(onNavigateToURLCallback: nil)
      do {
        try self.uiManager.openUI(
          octopus: octopus,
          theme: self.theme,
          logoSource: self.logoSource,
          fontConfiguration: self.fontConfiguration,
          uiConfiguration: self.uiConfiguration,
          topAppBar: self.topAppBar,
          initialScreen: .home(.createPost(.init(prefilledPost: prefilledPost)))
        )
        resolve(nil)
      } catch {
        reject("NAVIGATE_TO_CREATE_POST_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Lifecycle management (Parity wave — lifecycle)

  /// Targets a new community. Mirrors the Flutter plugin's `switchCommunity`/
  /// `switchCommunityOctopusAuth` pair, unified here into a single method whose
  /// `connectionMode` reuses the same shape as `initialize` (divergence accepted — see the
  /// port inventory).
  ///
  /// - If an SDK instance already exists, this calls the native instance-level
  ///   `switchCommunity(apiKey:connectionMode:configuration:)`, which reuses the same
  ///   instance and re-registers its publishers — existing observers stay attached, no
  ///   `startObservingReactiveEvents()` re-wiring needed.
  /// - If no SDK instance exists yet (never initialized, or after `stop()`), this cold-starts
  ///   one exactly like `initialize()` does, minus the theme/logo/UI parsing that
  ///   `switchCommunity`'s params don't carry.
  @objc(switchCommunity:withResolver:withRejecter:)
  func switchCommunity(params: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let apiKey = params["apiKey"] as? String else {
      reject("SWITCH_COMMUNITY_ERROR", "apiKey is required", nil)
      return
    }
    guard let connectionModeMap = params["connectionMode"] as? [String: Any] else {
      reject("SWITCH_COMMUNITY_ERROR", "connectionMode is required", nil)
      return
    }

    do {
      let connectionMode = try sdkInitializer.parseConnectionMode(from: connectionModeMap, eventManager: eventManager)
      let configuration = try sdkInitializer.parseConfiguration(from: params)

      guard let octopus = octopusSDK else {
        // Cold start: no instance to call switchCommunity on yet.
        cancellables.removeAll()
        octopusSDK = try sdkInitializer.initialize(options: params, eventManager: eventManager)
        ssoAuthenticator = OctopusSSOAuthenticator(octopusSDK: octopusSDK!, eventManager: eventManager)
        startObservingReactiveEvents()
        resolve(nil)
        return
      }

      Task {
        do {
          try await octopus.switchCommunity(apiKey: apiKey, connectionMode: connectionMode, configuration: configuration)
          resolve(nil)
        } catch {
          reject("SWITCH_COMMUNITY_ERROR", error.localizedDescription, error)
        }
      }
    } catch {
      reject("SWITCH_COMMUNITY_ERROR", error.localizedDescription, error)
    }
  }

  /// iOS has no native `reset()`; `disconnectUser()` is the closest approximation (clears the
  /// local user/session state) — same approximation the Flutter plugin uses. No-op if never
  /// initialized. The SDK instance itself stays alive.
  ///
  /// Parity wave — lifecycle: uses the `async throws` overload of `disconnectUser()`, awaited
  /// inside a `Task`, and resolves only once it completes — the fire-and-forget sync overload
  /// used to resolve the promise before the disconnect had actually finished, contradicting
  /// `reset()`'s TSDoc ("resolves when the reset completes").
  @objc(reset:withRejecter:)
  func reset(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let octopus = octopusSDK else {
      resolve(nil)
      return
    }
    Task {
      do {
        try await octopus.disconnectUser()
        resolve(nil)
      } catch {
        reject("RESET_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// iOS has no native `stop()`; this tears the bridge down to an uninitialized state the same
  /// way `deinit`/`invalidate` do — same approximation the Flutter plugin uses. No-op if
  /// already stopped. Deliberately does not touch `isInitialised` event emission (owned by a
  /// different parity chantier) — this only performs the underlying teardown.
  ///
  /// Parity wave — lifecycle: same fix as `reset()` above — awaits the `async throws`
  /// `disconnectUser()` overload before tearing down and resolving, instead of the
  /// fire-and-forget sync one.
  @objc(stop:withRejecter:)
  func stop(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let octopus = octopusSDK else {
      cleanup()
      ssoAuthenticator = nil
      resolve(nil)
      return
    }
    Task {
      do {
        try await octopus.disconnectUser()
      } catch {
        // Matches the previous fire-and-forget behaviour's intent for `stop()`: teardown must
        // still happen even if the disconnect itself failed (e.g. already disconnected), so
        // this is logged-and-continued rather than rejected — the same "log, don't propagate"
        // choice the native fire-and-forget overload made internally.
        NSLog("[OctopusReactNativeSdk] stop(): error while disconnecting user, tearing down anyway: \(error)")
      }
      cleanup()
      // `cleanup()` (shared with `deinit`/`invalidate`) does not clear this — those callers
      // don't need to, since the object is gone right after. Here the module survives the call,
      // so a stale authenticator bound to the torn-down instance must not linger for the next
      // `connectUser`.
      ssoAuthenticator = nil
      resolve(nil)
    }
  }

  // MARK: - Groups & entitlements (Parity wave — groups & entitlements)

  /// The four `guard let octopus = octopusSDK` checks below (`fetchGroups`, `followGroup`,
  /// `unfollowGroup`, `refreshEntitlements`) reject with a dedicated `NOT_INITIALIZED` code,
  /// unlike every pre-existing not-initialized guard elsewhere in this file, which rejects with
  /// the call's generic fallback code (`SET_REACTION_ERROR`, `OVERRIDE_ERROR`, …). A business
  /// code was used here at first (`NOT_CONNECTED` / `USER_NOT_CONNECTED`), but those are
  /// documented as "no user is connected" — a host that catches one and prompts for login would
  /// react wrongly to a missing `initialize()`. `NOT_INITIALIZED` matches the Flutter plugin's
  /// own guard for these same two calls, and Android now rejects the same condition with the
  /// same code (see `OctopusReactModule.kt`'s `fetchGroups` doc comment).
  @objc(fetchGroups:withRejecter:)
  func fetchGroups(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      do {
        try await octopus.fetchGroups()
        let payload = octopus.groups.map { $0.toDictionary() }
        resolve(payload)
      } catch {
        let (code, message) = error.toFetchGroupsBridgeError()
        reject(code, message, error)
      }
    }
  }

  /// iOS has no native per-group follow method: this delegates to the batch
  /// `syncFollowGroups` API with a single action, mirroring the approach already shipped by
  /// the Flutter SDK's own iOS plugin (`syncSingleFollowAction`).
  @objc(followGroup:withResolver:withRejecter:)
  func followGroup(
    groupId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      await singleGroupFollowAction(octopus: octopus, groupId: groupId, followed: true, resolve: resolve, reject: reject)
    }
  }

  /// See `followGroup` — same single-action `syncFollowGroups` bridging. iOS has no
  /// equivalent of Android's `LAST_FOLLOWED_GROUP` guard: unfollowing the user's last
  /// followed group succeeds silently here.
  @objc(unfollowGroup:withResolver:withRejecter:)
  func unfollowGroup(
    groupId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      await singleGroupFollowAction(octopus: octopus, groupId: groupId, followed: false, resolve: resolve, reject: reject)
    }
  }

  /// Shared by `followGroup` / `unfollowGroup` — runs a single-action `syncFollowGroups` and
  /// translates the per-action `Status` into the `GroupFollowUnfollowErrorCode` union
  /// documented on `groupFollowUnfollowError.ts`.
  private func singleGroupFollowAction(
    octopus: OctopusSDK,
    groupId: String,
    followed: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) async {
    let action = OctopusSyncFollowGroup.Action(groupId: groupId, followed: followed, actionDate: Date())
    do {
      let results = try await octopus.syncFollowGroups(actions: [action])
      guard let first = results.first else {
        reject("GROUP_FOLLOW_UNFOLLOW_ERROR", "Empty syncFollowGroups response", nil)
        return
      }
      if let (code, message) = first.status.toGroupFollowUnfollowBridgeError() {
        reject(code, message, nil)
      } else {
        resolve(nil)
      }
    } catch let error as OctopusSyncFollowGroup.Error {
      let (code, message) = error.toGroupFollowUnfollowBridgeError()
      reject(code, message, error)
    } catch {
      reject("GROUP_FOLLOW_UNFOLLOW_ERROR", error.localizedDescription, error)
    }
  }

  @objc(refreshEntitlements:withRejecter:)
  func refreshEntitlements(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    Task {
      do {
        try await octopus.refreshEntitlements()
        resolve(nil)
      } catch let error as OctopusRefreshEntitlementsError {
        let (code, message) = error.toBridgeError()
        reject(code, message, error)
      } catch {
        reject("REFRESH_ENTITLEMENTS_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Parity wave — client-object bridge

  /// Fetches the bridge post linked to a client object, creating it on first call.
  ///
  /// The token provider is taken from `OctopusBridgeShareTokenBroker` rather than from a call
  /// parameter: an `async` closure cannot cross the React Native bridge, so JS registers one
  /// signer globally (`addBridgeShareTokenRequestListener`) and every signing path — this one
  /// and the create-post editor's prefilled share — consults it.
  ///
  /// Unlike `OctopusPrefilledPost.sign`, this API's `tokenProvider` returns an **optional**
  /// token, so "publish unsigned" is expressible here. `BridgeShareSignError.notSigned` — the
  /// broker's stand-in for a `null` JS reply, invented because `sign` has no such channel — is
  /// therefore translated back into `nil` instead of failing the call. That is what makes the
  /// JS contract ("return null to skip signing") behave the same on both platforms for this
  /// API, even though it cannot on the editor's.
  @objc(fetchOrCreateClientObjectRelatedPost:withResolver:withRejecter:)
  func fetchOrCreateClientObjectRelatedPost(
    clientPost: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject("CLIENT_POST_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }
    let decoded: ClientPost
    do {
      decoded = try ClientObjectMappers.decodeClientPost((clientPost as? [String: Any]) ?? [:])
    } catch {
      reject("INVALID_ARGS", error.localizedDescription, error)
      return
    }

    let sign = bridgeShareTokenBroker.signClosureOrNil()
    let tokenProvider: @Sendable (String) async throws -> String? = { bridgeFingerprint in
      guard let sign else { return nil }
      do {
        return try await sign(bridgeFingerprint)
      } catch BridgeShareSignError.notSigned {
        return nil
      }
    }

    Task {
      do {
        let post = try await octopus.fetchOrCreateClientObjectRelatedPost(
          content: decoded, tokenProvider: tokenProvider
        )
        resolve(ClientObjectMappers.serializeOctopusPost(post))
      } catch let error as ClientPostError {
        let (code, message) = error.toBridgeError()
        reject(code, message, error)
      } catch {
        reject("CLIENT_POST_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Starts a per-subscription observation of the bridge post for `clientObjectId`, forwarding
  /// each emission (the post, or `null`) as a `clientObjectPostChanged` event tagged with
  /// `observationId`. The first emission replays the current value to the JS listener that just
  /// subscribed.
  @objc(startObservingClientObjectRelatedPost:clientObjectId:withResolver:withRejecter:)
  func startObservingClientObjectRelatedPost(
    observationId: String,
    clientObjectId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    guard let octopus = octopusSDK else {
      reject(
        "START_OBSERVING_CLIENT_OBJECT_POST_ERROR",
        "SDK not initialized. Call initialize() first.",
        nil
      )
      return
    }
    clientObjectPostCancellables.removeValue(forKey: observationId)?.cancel()
    clientObjectPostCancellables[observationId] = octopus
      .getClientObjectRelatedPostPublisher(clientObjectId: clientObjectId)
      .receive(on: DispatchQueue.main)
      .sink { [weak self] post in
        self?.eventManager.emitClientObjectPostChanged(
          observationId: observationId,
          post: post.map { ClientObjectMappers.serializeOctopusPost($0) }
        )
      }
    resolve(nil)
  }

  /// Tears down the observation started under `observationId`. Unknown ids are a no-op.
  @objc(stopObservingClientObjectRelatedPost:withResolver:withRejecter:)
  func stopObservingClientObjectRelatedPost(
    observationId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    clientObjectPostCancellables.removeValue(forKey: observationId)?.cancel()
    resolve(nil)
  }

  @objc(registerNavigateToClientObjectCallback:withRejecter:)
  func registerNavigateToClientObjectCallback(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    isNavigateToClientObjectRegistered = true
    applyNavigateToClientObjectCallback()
    resolve(nil)
  }

  /// Stops delivering `navigateToClientObject` to JS.
  ///
  /// The native callback itself stays installed: `set(displayClientObjectCallback:)` takes a
  /// **non-optional** closure, so iOS has no way to clear it. The "view object" button is keyed
  /// on that callback being non-nil, so on iOS it remains visible until the SDK is
  /// re-initialized, whereas Android hides it the next time the UI is composed. Documented on
  /// `setNavigateToClientObjectCallback`; the flag is what keeps the tap from reaching a JS
  /// callback the host has already withdrawn.
  @objc(unregisterNavigateToClientObjectCallback:withRejecter:)
  func unregisterNavigateToClientObjectCallback(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    isNavigateToClientObjectRegistered = false
    resolve(nil)
  }

  private func applyNavigateToClientObjectCallback() {
    guard isNavigateToClientObjectRegistered, let octopus = octopusSDK else { return }
    octopus.set(displayClientObjectCallback: { [weak self] objectId in
      guard let self, self.isNavigateToClientObjectRegistered else { return }
      self.eventManager.emitNavigateToClientObject(objectId: objectId)
    })
  }

  deinit {
    cleanup()
  }

  private func cleanup() {
    cancellables.removeAll()
    communityDataCancellable?.cancel()
    communityDataCancellable = nil
    // Parity wave — client-object bridge
    clientObjectPostCancellables.values.forEach { $0.cancel() }
    clientObjectPostCancellables.removeAll()
    uiManager.cleanup()
    octopusSDK = nil
  }
  
  private func startObservingReactiveEvents() {
    startObservingNotSeenNotificationsCount()
    startObservingHasAccessToCommunity()
    startObservingEvents()
    wireGroupAccessDeniedCallback()
    startObservingProfile()
    startObservingGroups()
    // iOS has no native `isInitialisedFlow`; the presence of an SDK instance is the source of
    // truth, exactly as in the Flutter plugin's `emitIsInitialised`.
    eventManager.emitIsInitialisedChanged(isInitialised: octopusSDK != nil)
  }

  /// Parity wave — groups & entitlements. Unlike the `startObserving*` methods above, this is
  /// not a Combine subscription to cancel/restart: `OctopusSDK.set(groupAccessDeniedCallback:)`
  /// is a last-write-wins property with no unset operation, so it is simply (re-)assigned here
  /// on every `initialize()`. The event is emitted unconditionally — see
  /// `OctopusEventManager.sendEvent` and `setGroupAccessDeniedCallback.ts` for why no
  /// listener-liveness tracking is needed.
  private func wireGroupAccessDeniedCallback() {
    guard let octopus = octopusSDK else { return }
    octopus.set(groupAccessDeniedCallback: { [weak self] groupId in
      self?.eventManager.emitGroupAccessDenied(groupId: groupId)
    })
  }

  /// Observes `octopus.$profile`, which feeds two channels: `profileChanged` and — derived from the
  /// same value, see `OctopusEventManager.emitConnectionStateChanged(profile:)` —
  /// `connectionStateChanged`.
  ///
  /// One sink rather than two on the same publisher: two would let the profile and the connection
  /// state derived from it reach JS interleaved with a later value's pair, and there is nothing to
  /// gain from observing the same publisher twice.
  private func startObservingProfile() {
    guard let octopus = octopusSDK else { return }
    octopus.$profile
      .receive(on: DispatchQueue.main)
      .sink { [weak self] profile in
        self?.eventManager.emitProfileChanged(profile: profile)
        self?.eventManager.emitConnectionStateChanged(profile: profile)
      }
      .store(in: &cancellables)
  }

  private func startObservingGroups() {
    guard let octopus = octopusSDK else { return }
    octopus.$groups
      .receive(on: DispatchQueue.main)
      .sink { [weak self] groups in
        self?.eventManager.emitGroupsChanged(groups: groups)
      }
      .store(in: &cancellables)
  }

  /// Re-emits the current value of every reactive state channel — the counterpart of the Android
  /// module's method of the same name, and of the Flutter plugin re-sending its snapshot from
  /// `onListen`. `NativeEventEmitter` gives this module no usable "a listener attached" signal
  /// (see `nativeEventGate.test.ts`), so the JS layer asks explicitly the first time it attaches.
  @objc(requestStateSnapshot:withRejecter:)
  func requestStateSnapshot(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    DispatchQueue.main.async {
      self.eventManager.emitIsInitialisedChanged(isInitialised: self.octopusSDK != nil)
      if let octopus = self.octopusSDK {
        self.eventManager.emitProfileChanged(profile: octopus.profile)
        self.eventManager.emitGroupsChanged(groups: octopus.groups)
        self.eventManager.emitConnectionStateChanged(profile: octopus.profile)
      }
      resolve(nil)
    }
  }
  
  private func startObservingNotSeenNotificationsCount() {
    guard let octopus = octopusSDK else { return }
    octopus.$notSeenNotificationsCount
      .receive(on: DispatchQueue.main)
      .sink { [weak self] count in
        self?.eventManager.emitNotSeenNotificationsCountChanged(count: count)
      }
      .store(in: &cancellables)
  }
  
  private func startObservingHasAccessToCommunity() {
    guard let octopus = octopusSDK else { return }
    octopus.$hasAccessToCommunity
      .receive(on: DispatchQueue.main)
      .sink { [weak self] hasAccess in
        self?.eventManager.emitHasAccessToCommunityChanged(hasAccess: hasAccess)
      }
      .store(in: &cancellables)
  }
  
  private func startObservingEvents() {
    guard let octopus = octopusSDK else { return }
    octopus.eventPublisher
      .receive(on: DispatchQueue.main)
      .sink { [weak self] event in
        if let eventData = OctopusEventSerializer.serializeEvent(event) {
          self?.eventManager.emitSDKEvent(eventData: eventData)
        }
      }
      .store(in: &cancellables)
  }

  @objc func invalidate() {
    cleanup()
  }
  
  // MARK: - Event Listener Support for NativeEventEmitter
  
  /// Required by `NativeEventEmitter`, which calls it on every `addListener`. Deliberately a
  /// no-op: the counts it reports cannot be attributed to an event name, so
  /// `OctopusEventManager` gates on bridge validity instead of tracking them. Do not delete
  /// — `NativeEventEmitter` warns at runtime when the native module lacks it.
  @objc func addListener(_ eventName: String) {
    // No-op. See the comment above, and `OctopusEventManager.sendEvent`.
  }

  /// Required by `NativeEventEmitter`. Deliberately a no-op — see `addListener(_:)`.
  @objc func removeListeners(_ count: Int) {
    // No-op. See the comment above, and `OctopusEventManager.sendEvent`.
  }
}

private extension OctopusSyncFollowGroup.Status {
  func toWireValue() -> String {
    switch self {
    case .applied:           return "applied"
    case .skipped:           return "skipped"
    case .groupNotFound:     return "group_not_found"
    case .notFollowable:     return "not_followable"
    case .notUnfollowable:   return "not_unfollowable"
    case .alreadyFollowed:   return "already_followed"
    case .alreadyUnfollowed: return "already_unfollowed"
    case .unknownError:      return "unknown_error"
    @unknown default:        return "unknown_error"
    }
  }

  /// Maps a single-action `syncFollowGroups` status to the `GroupFollowUnfollowErrorCode`
  /// union documented on `groupFollowUnfollowError.ts`. `nil` means success — `.applied` and
  /// `.skipped` are both idempotent-success statuses, matching the Flutter iOS plugin's
  /// `syncSingleFollowAction`. iOS has no equivalent of Android's `LAST_FOLLOWED_GROUP` guard.
  func toGroupFollowUnfollowBridgeError() -> (code: String, message: String)? {
    switch self {
    case .applied, .skipped:
      return nil
    case .groupNotFound:
      return ("MISSING_GROUP", "Group not found")
    case .notFollowable, .notUnfollowable:
      return ("UNFOLLOWABLE_GROUP", "Group follow state cannot be changed")
    case .alreadyFollowed:
      return ("GROUP_ALREADY_FOLLOWED", "Group is already followed")
    case .alreadyUnfollowed:
      return ("GROUP_ALREADY_UNFOLLOWED", "Group is already not followed")
    case .unknownError:
      return ("GROUP_FOLLOW_UNFOLLOW_ERROR", "Unknown server error")
    @unknown default:
      return ("GROUP_FOLLOW_UNFOLLOW_ERROR", "Unhandled status")
    }
  }
}

private extension OctopusSetReactionError {
  /// Maps to the JS-facing `SetReactionErrorCode` union documented on `setReaction`.
  func toBridgeError() -> (code: String, message: String) {
    switch self {
    case .unknownReaction:
      return ("UNKNOWN_REACTION", "Unknown reaction.")
    case .postNotFound:
      return ("POST_NOT_FOUND", "Post not found.")
    case .notConnected:
      return ("NOT_CONNECTED", "User is not connected.")
    case .noNetwork:
      return ("NO_NETWORK", "No network connection.")
    case .serverError:
      return ("SERVER_ERROR", debugDescription)
    case .other:
      return ("SET_REACTION_ERROR", debugDescription)
    }
  }
}

// MARK: - Parity wave — groups & entitlements

private extension OctopusGroup {
  /// Converts to the lean, cross-platform-shared wire shape matching `OctopusGroup` in
  /// `src/types/group.ts`.
  func toDictionary() -> [String: Any] {
    [
      "id": id,
      "name": name,
      "isFollowed": isFollowed,
      "canChangeFollowStatus": canChangeFollowStatus,
      "canAccess": canAccess,
      "canCreateChildren": canCreateChildren,
    ]
  }
}

private extension Error {
  /// `fetchGroups()` throws an untyped `Error` on iOS — no native SDK classifies this failure
  /// beyond connection-level codes. This mirrors the string-sniffing workaround already
  /// shipped by the Flutter SDK's own iOS plugin (`encodeUntypedConnectionFailure`).
  func toFetchGroupsBridgeError() -> (code: String, message: String) {
    let message = "\(self)"
    if message.range(of: "noNetwork", options: .caseInsensitive) != nil {
      return ("NO_NETWORK", "No network")
    }
    if message.range(of: "notAuthenticated", options: .caseInsensitive) != nil
      || message.range(of: "notConnected", options: .caseInsensitive) != nil
    {
      return ("NOT_CONNECTED", localizedDescription)
    }
    return ("SERVER_ERROR", localizedDescription)
  }
}

private extension OctopusSyncFollowGroup.Error {
  /// RPC-level `syncFollowGroups` failures translate to the same connection-level codes used
  /// elsewhere on this bridge, so `followGroup` / `unfollowGroup` callers handle them the same
  /// way as any other SDK call.
  func toGroupFollowUnfollowBridgeError() -> (code: String, message: String) {
    switch self {
    case .noNetwork:
      return ("NO_NETWORK", "No network connection.")
    case .notConnected:
      return ("NOT_CONNECTED", "User is not connected.")
    case .server(let underlying):
      return ("SERVER_ERROR", "\(underlying)")
    case .other(let underlying):
      return ("GROUP_FOLLOW_UNFOLLOW_ERROR", underlying.map { "\($0)" } ?? "Unknown error")
    }
  }
}

private extension OctopusRefreshEntitlementsError {
  /// Maps to the JS-facing `RefreshEntitlementsErrorCode` union documented on
  /// `refreshEntitlements`.
  func toBridgeError() -> (code: String, message: String) {
    switch self {
    case .noClientTokenProvider:
      return ("NO_CLIENT_TOKEN_PROVIDER", debugDescription)
    case .userNotConnected:
      return ("USER_NOT_CONNECTED", debugDescription)
    case .noNetwork:
      return ("NO_NETWORK", debugDescription)
    case .userBanned:
      return ("USER_BANNED", debugDescription)
    case .serverError:
      return ("SERVER_ERROR", debugDescription)
    }
  }
}

private extension OctopusPrefilledPost.ValidationError {
  /// Maps to the JS-facing `NavigateToOctopusCreatePostErrorCode` union documented on
  /// `navigateToOctopusCreatePost`.
  func toBridgeErrorCode() -> String {
    switch self {
    case .contentEmpty:       return "NAVIGATE_TO_CREATE_POST_ERROR"
    case .textTooShort:       return "TEXT_TOO_SHORT"
    case .textTooLong:        return "TEXT_TOO_LONG"
    case .imageInvalid:       return "IMAGE_INVALID"
    case .imageRatioTooLarge: return "IMAGE_RATIO_TOO_LARGE"
    case .imageTooSmall:      return "IMAGE_TOO_SMALL"
    case .ctaLabelEmpty:      return "CTA_LABEL_EMPTY"
    case .ctaUrlEmpty:        return "CTA_URL_EMPTY"
    }
  }
}
