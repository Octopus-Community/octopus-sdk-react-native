import Octopus
import OctopusUI
import SwiftUI
import UIKit
import React

class OctopusUIManager {
  /// Additive bottom padding an *embedded* view applies when the host passed no
  /// `ui.bottomSafeAreaInset` at all — the same historical 10 pt default the Flutter
  /// bridge applies in that state (`SafeHostingContainerView`), so the profile bubble
  /// and create-post button never sit flush against the bottom of the embedded view.
  /// An explicit 0 from the host still means "reserve nothing" and bypasses it.
  static let embeddedDefaultBottomInset: CGFloat = 10

  private weak var presentedViewController: UIViewController?

  /// Hosting controllers created by `addEmbeddedView` and still alive, so a later
  /// `setForcedInterfaceStyle` reaches every mounted `<OctopusUIView>`, not only the
  /// fullscreen one.
  private let embeddedHostingControllers = NSHashTable<UIViewController>.weakObjects()

  /// The interface style `setThemeMode()` forces, `.unspecified` while following the system.
  /// Applied to every hosting controller at creation and, live, to the ones already on screen.
  /// The theme's adaptive colors resolve against the controller's trait collection, so
  /// overriding it re-selects the dual-mode set with no theme rebuild — and it is scoped to
  /// the SDK's own controllers, the host app's appearance is untouched.
  private var forcedInterfaceStyle: UIUserInterfaceStyle = .unspecified

  func setForcedInterfaceStyle(_ style: UIUserInterfaceStyle) {
    forcedInterfaceStyle = style
    OctopusInterfaceStyleStore.shared.colorScheme = style.forcedColorScheme
    presentedViewController?.overrideUserInterfaceStyle = style
    for controller in embeddedHostingControllers.allObjects {
      controller.overrideUserInterfaceStyle = style
    }
  }

  func openUI(
    octopus: OctopusSDK,
    theme: OctopusUI.OctopusTheme?,
    logoSource: [String: Any]?,
    fontConfiguration: [String: Any]?,
    uiConfiguration: OctopusUIConfiguration?,
    notificationUserInfo: [AnyHashable: Any]? = nil,
    topAppBar: OctopusTopAppBarConfig? = nil,
    initialScreen: BridgeInitialScreen = .home(.mainFeed),
    // Parity wave — navigation & theme
    navigationMode: OctopusNavigationMode = .automatic,
    navBarLeadingAction: OctopusNavBarLeadingAction? = nil
  ) throws {
    guard let presentingViewController = RCTPresentedViewController() else {
      throw NSError(domain: "OPEN_UI_ERROR", code: 0, userInfo: [NSLocalizedDescriptionKey: "Could not find presenting view controller"])
    }

    // Create custom theme with font configuration
    let customTheme = createCustomTheme(baseTheme: theme, fontConfiguration: fontConfiguration)
    let bottomSafeAreaInset = uiConfiguration?.bottomSafeAreaInset
    let initialTheme = (theme != nil || fontConfiguration != nil) ? customTheme : nil

    let hostingController = UIHostingController(
      rootView: OctopusThemedRoot {
        makeHomeScreenView(octopus: octopus, theme: initialTheme, bottomSafeAreaInset: bottomSafeAreaInset, notificationUserInfo: notificationUserInfo, topAppBar: topAppBar, initialScreen: initialScreen, navigationMode: navigationMode, navBarLeadingAction: navBarLeadingAction)
      }
    )
    hostingController.modalPresentationStyle = .fullScreen
    hostingController.overrideUserInterfaceStyle = forcedInterfaceStyle

    // Apply theme if provided
    if let _ = theme {
      // Apply theme immediately (without logo) to avoid delay
      hostingController.rootView = OctopusThemedRoot {
        self.makeHomeScreenView(
          octopus: octopus,
          theme: customTheme,
          bottomSafeAreaInset: bottomSafeAreaInset,
          notificationUserInfo: notificationUserInfo,
          topAppBar: topAppBar,
          initialScreen: initialScreen,
          navigationMode: navigationMode,
          navBarLeadingAction: navBarLeadingAction
        )
      }

      // Then load logo asynchronously and update theme if logo loads
      if let logoSource = logoSource {
        loadLogo(from: logoSource) { [weak hostingController] logoImage in
          DispatchQueue.main.async {
            if let logoImage = logoImage {
              let updatedTheme = OctopusUI.OctopusTheme(
                colors: customTheme.colors,
                fonts: customTheme.fonts,
                assets: OctopusUI.OctopusTheme.Assets(logo: logoImage)
              )
              hostingController?.rootView = OctopusThemedRoot {
                self.makeHomeScreenView(
                  octopus: octopus,
                  theme: updatedTheme,
                  bottomSafeAreaInset: bottomSafeAreaInset,
                  notificationUserInfo: notificationUserInfo,
                  topAppBar: topAppBar,
                  initialScreen: initialScreen,
                  navigationMode: navigationMode,
                  navBarLeadingAction: navBarLeadingAction
                )
              }
            } else {
              // Theme is already applied, no need to do anything
            }
          }
        }
      }
    } else if let logoSource = logoSource {
      // No theme but there's a logo - load it and create a theme with just the logo
      loadLogo(from: logoSource) { [weak hostingController] logoImage in
        DispatchQueue.main.async {
          if let logoImage = logoImage {
            let logoTheme = OctopusUI.OctopusTheme(
              colors: OctopusUI.OctopusTheme.Colors(),
              fonts: OctopusUI.OctopusTheme.Fonts(),
              assets: OctopusUI.OctopusTheme.Assets(logo: logoImage)
            )
            hostingController?.rootView = OctopusThemedRoot {
              self.makeHomeScreenView(
                octopus: octopus,
                theme: logoTheme,
                bottomSafeAreaInset: bottomSafeAreaInset,
                notificationUserInfo: notificationUserInfo,
                topAppBar: topAppBar,
                initialScreen: initialScreen,
                navigationMode: navigationMode,
                navBarLeadingAction: navBarLeadingAction
              )
            }
          }
        }
      }
    }

    presentedViewController = hostingController

    presentingViewController.present(hostingController, animated: true)
  }
  
  private func loadLogo(from source: [String: Any], completion: @escaping (UIImage?) -> Void) {
    // Handle React Native image source with URI (from Image.resolveAssetSource)
    guard let uri = source["uri"] as? String else {
      completion(nil)
      return
    }
    
    // Remote URL
    if uri.hasPrefix("http") {
      guard let url = URL(string: uri) else {
        completion(nil)
        return
      }
      
      URLSession.shared.dataTask(with: url) { data, response, error in
        guard let data = data, error == nil else {
          completion(nil)
          return
        }
        
        let image = UIImage(data: data)
        completion(image)
      }.resume()
    } else {
      // Local file path (from Image.resolveAssetSource)
      if let image = loadImageFromLocalPath(uri) {
        completion(image)
      } else {
        completion(nil)
      }
    }
  }

  private func loadImageFromLocalPath(_ path: String) -> UIImage? {
    // Handle absolute file URLs (file://) first
    if path.hasPrefix("file://"), let url = URL(string: path),
       let image = UIImage(contentsOfFile: url.path) {
        return image
    }

    // Try raw absolute path next
    if path.hasPrefix("/"), FileManager.default.fileExists(atPath: path),
      let image = UIImage(contentsOfFile: path) {
      return image
    }

    // For React Native bundled assets the path is relative (e.g. assets/assets/logo.png)
    let nsPath = path as NSString
    let directory = nsPath.deletingLastPathComponent
    let filename = nsPath.lastPathComponent
    let nameWithoutExtension = (filename as NSString).deletingPathExtension
    let fileExtension = (filename as NSString).pathExtension

    if let bundlePath = Bundle.main.path(forResource: nameWithoutExtension, ofType: fileExtension.isEmpty ? nil : fileExtension, inDirectory: directory.isEmpty ? nil : directory) ,
      let image = UIImage(contentsOfFile: bundlePath) {
        return image
    }

    // Final fallback: let UIKit try to resolve it by name (works for assets catalog entries)
    return UIImage(named: nameWithoutExtension)
  }

  func closeUI() throws {
    guard let presentedVC = presentedViewController else {
      throw NSError(domain: "CLOSE_UI_ERROR", code: 0, userInfo: [NSLocalizedDescriptionKey: "No UI is currently presented"])
    }

    presentedVC.dismiss(animated: true) {
      self.presentedViewController = nil
    }
  }

  func cleanup() {
    if let presentedVC = presentedViewController {
      presentedVC.dismiss(animated: false, completion: nil)
      presentedViewController = nil
    }
  }

  /// Embeds the Octopus UI into the given container view (for use in ViewManager / non-fullscreen).
  /// Caller is responsible for setting octopus.set(onNavigateToURLCallback:) when interceptUrls is true.
  ///
  /// `initialScreen` is the screen the embedded view mounts on, already decoded by the caller
  /// (the `initialScreen` prop of `OctopusUIView`) — `.home(.mainFeed)` is the default and what
  /// every pre-existing caller gets.
  func addEmbeddedView(
    to containerView: UIView,
    octopus: OctopusSDK,
    theme: OctopusUI.OctopusTheme?,
    logoSource: [String: Any]?,
    fontConfiguration: [String: Any]?,
    uiConfiguration: OctopusUIConfiguration?,
    interceptUrls: Bool,
    notificationUserInfo: [AnyHashable: Any]? = nil,
    topAppBar: OctopusTopAppBarConfig? = nil,
    initialScreen: BridgeInitialScreen = .home(.mainFeed),
    // Parity wave — navigation & theme
    navigationMode: OctopusNavigationMode = .automatic,
    navBarLeadingAction: OctopusNavBarLeadingAction? = nil
  ) {
    let customTheme = createCustomTheme(baseTheme: theme, fontConfiguration: fontConfiguration)
    let requestedBottomInset = uiConfiguration?.bottomSafeAreaInset
    let initialTheme = (theme != nil || fontConfiguration != nil) ? customTheme : nil

    // For an embedded view the host-facing `bottomSafeAreaInset` is a *total* bottom
    // padding — that is what the Android bridge renders, since it consumes the system
    // insets before mounting — while the native iOS SDK applies its value *on top of* the
    // safe area the view already sits in. Only the container knows that safe area, so it
    // owns the conversion and keeps it current as its geometry changes.
    //
    // Three host states, matching the Flutter bridge (`SafeHostingContainerView`):
    //  - a value > 0 is a *total*: the container normalizes it live below;
    //  - an explicit 0 is the edge-to-edge opt-out: 0 forwarded, native gate off;
    //  - no key at all means "the host expressed no preference": the embedded view
    //    then keeps the additive 10 pt default the Flutter bridge has always applied,
    //    instead of forwarding 0 — which leaves the native `> 0` gate off and glues
    //    the profile bubble and create-post button to the very bottom of the view.
    //    The 10 pt is constant and additive (no normalization), exactly as on Flutter.
    // The `.profile` initial screen mounts `OctopusProfileScreen`, which pins its own bottom
    // inset to 0 and therefore ignores the store entirely — see `makeHomeScreenView`. The
    // normalization below still runs (harmlessly) so a host that later remounts on the home
    // screen finds an already-converged value.
    let bottomSafeAreaInset = requestedBottomInset ?? Self.embeddedDefaultBottomInset
    let bottomInsetStore: OctopusBottomInsetStore? = {
      guard let container = containerView as? OctopusEmbeddedContainerView,
            let requested = requestedBottomInset,
            requested > 0
      else { return nil }
      container.startNormalizingBottomInset(totalRequested: requested)
      return container.bottomInsetStore
    }()

    let hostingController = UIHostingController(
      rootView: OctopusThemedRoot {
        makeHomeScreenView(octopus: octopus, theme: initialTheme, bottomSafeAreaInset: bottomSafeAreaInset, bottomInsetStore: bottomInsetStore, notificationUserInfo: notificationUserInfo, topAppBar: topAppBar, initialScreen: initialScreen, navigationMode: navigationMode, navBarLeadingAction: navBarLeadingAction)
      }
    )
    hostingController.overrideUserInterfaceStyle = forcedInterfaceStyle
    embeddedHostingControllers.add(hostingController)
    hostingController.view.backgroundColor = .clear
    containerView.addSubview(hostingController.view)
    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hostingController.view.topAnchor.constraint(equalTo: containerView.topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
      hostingController.view.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
      hostingController.view.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
    ])

    if let parentVC = containerView.findViewController() {
      parentVC.addChild(hostingController)
      hostingController.didMove(toParent: parentVC)
    }

    if let _ = theme, let logoSource = logoSource {
      loadLogo(from: logoSource) { [weak hostingController] logoImage in
        DispatchQueue.main.async {
          if let logoImage = logoImage {
            let updatedTheme = OctopusUI.OctopusTheme(
              colors: customTheme.colors,
              fonts: customTheme.fonts,
              assets: OctopusUI.OctopusTheme.Assets(logo: logoImage)
            )
            hostingController?.rootView = OctopusThemedRoot {
              self.makeHomeScreenView(
                octopus: octopus,
                theme: updatedTheme,
                bottomSafeAreaInset: bottomSafeAreaInset,
                bottomInsetStore: bottomInsetStore,
                notificationUserInfo: notificationUserInfo,
                topAppBar: topAppBar,
                initialScreen: initialScreen,
                navigationMode: navigationMode,
                navBarLeadingAction: navBarLeadingAction
              )
            }
          }
        }
      }
    } else if let logoSource = logoSource {
      loadLogo(from: logoSource) { [weak hostingController] logoImage in
        DispatchQueue.main.async {
          if let logoImage = logoImage {
            let logoTheme = OctopusUI.OctopusTheme(
              colors: OctopusUI.OctopusTheme.Colors(),
              fonts: OctopusUI.OctopusTheme.Fonts(),
              assets: OctopusUI.OctopusTheme.Assets(logo: logoImage)
            )
            hostingController?.rootView = OctopusThemedRoot {
              self.makeHomeScreenView(
                octopus: octopus,
                theme: logoTheme,
                bottomSafeAreaInset: bottomSafeAreaInset,
                bottomInsetStore: bottomInsetStore,
                notificationUserInfo: notificationUserInfo,
                topAppBar: topAppBar,
                initialScreen: initialScreen,
                navigationMode: navigationMode,
                navBarLeadingAction: navBarLeadingAction
              )
            }
          }
        }
      }
    }
  }

  /// Builds the SwiftUI tree handed to a `UIHostingController`.
  ///
  /// `bottomSafeAreaInset` drives the fullscreen path, where the value is forwarded as-is:
  /// the native SDK adds it on top of the system safe area, which is also what the Android
  /// `OctopusActivity` does (its scaffold applies the safe-drawing insets and the host's
  /// `contentPadding` on top), so both platforms already agree there.
  ///
  /// `bottomInsetStore`, when non-nil, replaces it with a live value for the embedded path —
  /// see `OctopusEmbeddedContainerView` for why that conversion is needed and why the value
  /// must keep tracking the container's geometry.
  private func makeHomeScreenView(
    octopus: OctopusSDK,
    theme: OctopusUI.OctopusTheme?,
    bottomSafeAreaInset: CGFloat?,
    bottomInsetStore: OctopusBottomInsetStore? = nil,
    notificationUserInfo: [AnyHashable: Any]? = nil,
    topAppBar: OctopusTopAppBarConfig? = nil,
    initialScreen: BridgeInitialScreen = .home(.mainFeed),
    // Parity wave — navigation & theme
    navigationMode: OctopusNavigationMode = .automatic,
    navBarLeadingAction: OctopusNavBarLeadingAction? = nil
  ) -> AnyView {
    // The `profile` initial screen mounts a different native view entirely:
    // `OctopusProfileScreen`, which iOS ships outside its `OctopusInitialScreen` enum. It has
    // no `bottomSafeAreaInset` parameter (it pins its own to 0 internally), no main-feed
    // nav-bar title, and no notification deep-link input — so none of the home-screen wiring
    // below applies to it, only the theme environment.
    if case let .profile(clientUserId) = initialScreen {
      // Parity wave — navigation & theme. `OctopusProfileScreen` accepts the same two
      // parameters as `OctopusHomeScreen` (v1.13.2, `Profile/OctopusProfileScreen.swift`)
      // and Flutter wires them here too (`octopus_profile_screen.dart:137,173`) — dropping
      // them silently discarded `navBarLeadingAction` (no leading icon at all on this path,
      // including the `showBackButton` embedded backfill below) and mis-documented this
      // path's default: unlike `OctopusHomeScreen`'s `.automatic`, this screen's native
      // default is `.navigationStack`, so an explicit `.automatic` was silently ignored too.
      let screen = OctopusProfileScreen(
        octopus: octopus,
        clientUserId: clientUserId,
        navigationMode: navigationMode,
        navBarLeadingAction: navBarLeadingAction
      )
      if let theme {
        return AnyView(screen.environment(\.octopusTheme, theme))
      }
      return AnyView(screen)
    }
    guard case let .home(homeInitialScreen) = initialScreen else {
      // Unreachable: the only non-`home` case returned above.
      return AnyView(EmptyView())
    }
    // Native SDK reads userInfo["data"][...], so the flat rawPayload from JS
    // (Android-FCM-shaped: keys at top level) needs wrapping under "data"
    // before being handed to OctopusHomeScreen. If the caller already supplied
    // a "data" envelope (full APNs userInfo passed through), honor it.
    let wrapped: [AnyHashable: Any]? = {
      guard let raw = notificationUserInfo, !raw.isEmpty else { return nil }
      if raw["data"] is [AnyHashable: Any] || raw["data"] is [String: Any] {
        return raw
      }
      return ["data": raw]
    }()

    // Build the nav-bar title from config (defaults: logo, leading).
    let placement: OctopusMainFeedTitle.Placement =
      (topAppBar?.centered == true) ? .center : .leading
    let mainFeedTitle: OctopusMainFeedTitle = {
      if topAppBar?.titleType == "text", let text = topAppBar?.titleText, !text.isEmpty {
        return OctopusMainFeedTitle(content: .text(.init(text: text)), placement: placement)
      }
      return OctopusMainFeedTitle(content: .logo, placement: placement)
    }()
    let coloredNavBar = topAppBar?.coloredBackground ?? false

    // Single canonical 1.11 init for every path. `notificationUserInfo` is
    // `.constant(nil)` when there is no push deep-link.
    let makeScreen = { (inset: CGFloat) in
      OctopusHomeScreen(
        octopus: octopus,
        bottomSafeAreaInset: inset,
        mainFeedNavBarTitle: mainFeedTitle,
        mainFeedColoredNavBar: coloredNavBar,
        initialScreen: homeInitialScreen,
        // Parity wave — navigation & theme
        navigationMode: navigationMode,
        navBarLeadingAction: navBarLeadingAction,
        notificationUserInfo: .constant(wrapped)
      )
    }

    if let bottomInsetStore {
      let reactive = OctopusBottomInsetHost(store: bottomInsetStore, content: makeScreen)
      if let theme {
        return AnyView(reactive.environment(\.octopusTheme, theme))
      }
      return AnyView(reactive)
    }

    let screen = makeScreen(bottomSafeAreaInset ?? 0)

    if let theme {
      return AnyView(screen.environment(\.octopusTheme, theme))
    }
    return AnyView(screen)
  }
  
  private func createCustomTheme(baseTheme: OctopusUI.OctopusTheme?, fontConfiguration: [String: Any]?) -> OctopusUI.OctopusTheme {
    // If no font configuration, return the base theme or default
    guard let fontConfig = fontConfiguration else {
      return baseTheme ?? OctopusUI.OctopusTheme()
    }
    
    // Use pre-processed configuration from TypeScript layer
    if let parsedConfig = fontConfig["parsedConfig"] as? [String: Any],
       let textStyles = parsedConfig["textStyles"] as? [String: [String: Any]] {

      // Theme-wide overrides. `fontFamily` is resolved once here rather than per
      // slot: `UIFont(name:size:)` is the only existence check available and the
      // warning it guards must be logged once, not six times.
      let requestedFamily = (parsedConfig["fontFamily"] as? String).flatMap { $0.isEmpty ? nil : $0 }
      let fontFamily = resolveFontFamily(requestedFamily)
      // Read through `NSNumber` rather than `as? Int`: the bridge hands JS numbers over as
      // `NSNumber`, and the TypeScript layer has already rejected anything non-integral.
      let fontWeight = resolveFontWeight(from: (parsedConfig["fontWeight"] as? NSNumber)?.intValue)

      let customFonts = OctopusUI.OctopusTheme.Fonts(
        title1: createFontFromPreProcessedStyle(textStyles["title1"], defaultSize: 26, family: fontFamily, weight: fontWeight),
        title2: createFontFromPreProcessedStyle(textStyles["title2"], defaultSize: 22, family: fontFamily, weight: fontWeight),
        body1: createFontFromPreProcessedStyle(textStyles["body1"], defaultSize: 18, family: fontFamily, weight: fontWeight),
        body2: createFontFromPreProcessedStyle(textStyles["body2"], defaultSize: 16, family: fontFamily, weight: fontWeight),
        caption1: createFontFromPreProcessedStyle(textStyles["caption1"], defaultSize: 14, family: fontFamily, weight: fontWeight),
        caption2: createFontFromPreProcessedStyle(textStyles["caption2"], defaultSize: 12, family: fontFamily, weight: fontWeight),
        // The native theme has exposed a dedicated `navBarItem` font since
        // 1.0.3; this wrapper had simply been hardwiring it to body1. Honour an
        // explicit style when the host sets one, and otherwise keep that
        // long-standing fallback: nav-bar items follow the body1 style.
        navBarItem: createFontFromPreProcessedStyle(textStyles["navBarItem"] ?? textStyles["body1"], defaultSize: 17, family: fontFamily, weight: fontWeight)
      )

      return OctopusUI.OctopusTheme(
        colors: baseTheme?.colors ?? OctopusUI.OctopusTheme.Colors(),
        fonts: customFonts,
        assets: baseTheme?.assets ?? OctopusUI.OctopusTheme.Assets()
      )
    }
    
    return baseTheme ?? OctopusUI.OctopusTheme()
  }
  
  /// Checks that a theme-wide `fontFamily` names a font this process can actually use,
  /// returning it only then.
  ///
  /// The name is **never** resolved from the JavaScript bundle: the SDK's screens are a
  /// native SwiftUI tree, so the font must be the exact PostScript name of a font added
  /// to the Xcode project and declared under `UIAppFonts` in `Info.plist` — which is what
  /// linking it with `react-native-asset` does. `UIFont(name:size:)` doubles as the
  /// existence check `getIdentifier` serves on the Android side; when it fails we log a
  /// warning and keep the system font rather than silently ignoring the request.
  private func resolveFontFamily(_ family: String?) -> String? {
    guard let family = family else { return nil }
    // The probe size is irrelevant — only whether the name resolves at all.
    if UIFont(name: family, size: 12) != nil {
      return family
    }
    NSLog(
      "[OctopusReactNative] theme.fonts.fontFamily '\(family)' is not a registered " +
      "PostScript name (add the font to the Xcode project and declare it under " +
      "UIAppFonts in Info.plist); keeping the default SDK font."
    )
    return nil
  }

  /// Resolves a `Font.Weight` from the 100 (thinnest) - 900 (boldest) scale, bucketing to
  /// the nearest of SwiftUI's fixed named cases: `Font.Weight` — unlike Android's
  /// `FontWeight` — has no arbitrary-Int initializer. The range itself is validated in the
  /// TypeScript layer, so an out-of-range value never reaches here.
  private func resolveFontWeight(from value: Int?) -> Font.Weight? {
    guard let value = value else { return nil }
    switch value {
    case ..<150: return .ultraLight
    case ..<250: return .thin
    case ..<350: return .light
    case ..<450: return .regular
    case ..<550: return .medium
    case ..<650: return .semibold
    case ..<750: return .bold
    case ..<850: return .heavy
    default: return .black
    }
  }

  /// Builds the `Font` for one slot from its pre-processed style plus the theme-wide
  /// family/weight overrides.
  ///
  /// `family` is already known to resolve (see `resolveFontFamily`), and it wins over the
  /// style's own `fontType`: `fontType` can only name one of three *system* designs, so a
  /// custom family is the more specific request. When the family did not resolve, `family`
  /// arrives as `nil` and each slot falls back to its `fontType` exactly as before, which
  /// is why a `fontType` set alongside a `fontFamily` is still worth reading.
  private func createFontFromPreProcessedStyle(
    _ textStyle: [String: Any]?, defaultSize: CGFloat, family: String? = nil,
    weight: Font.Weight? = nil
  ) -> Font {
    let fontSize = (textStyle?["fontSize"] as? Double).map { CGFloat($0) } ?? defaultSize

    if let family = family {
      // `fixedSize:`, not `size:` — the plain `Font.custom(_:size:)` scales with Dynamic
      // Type relative to `.body`, while every `Font.system(size:)` path below is fixed.
      return applyWeight(Font.custom(family, fixedSize: fontSize), weight)
    }

    switch textStyle?["fontType"] as? String {
    case "serif":
      return applyWeight(Font.system(size: fontSize, design: .serif), weight)
    case "monospace":
      return applyWeight(Font.system(size: fontSize, design: .monospaced), weight)
    default:
      return applyWeight(Font.system(size: fontSize), weight)
    }
  }

  private func applyWeight(_ font: Font, _ weight: Font.Weight?) -> Font {
    guard let weight = weight else { return font }
    return font.weight(weight)
  }

}

// MARK: - Helper to find parent view controller for embedding
extension UIView {
  func findViewController() -> UIViewController? {
    if let nextResponder = self.next as? UIViewController {
      return nextResponder
    }
    if let nextResponder = self.next as? UIView {
      return nextResponder.findViewController()
    }
    return nil
  }
}

// MARK: - Forced color scheme (setThemeMode)

/// The color scheme `setThemeMode()` forces, `nil` while following the system. Observed by
/// `OctopusThemedRoot` so a change re-renders every SDK root already on screen.
final class OctopusInterfaceStyleStore: ObservableObject {
  static let shared = OctopusInterfaceStyleStore()
  @Published var colorScheme: ColorScheme?
}

/// Wraps an SDK root view and pins its SwiftUI `colorScheme` environment to the forced scheme.
/// `overrideUserInterfaceStyle` on the hosting controller covers the controller's own hierarchy
/// but not what it *presents* — UIKit presentations do not inherit the override — whereas the
/// SwiftUI environment does flow into sheets and full-screen covers the SDK opens (post
/// composer, image viewer…). Both are applied so the forced scheme holds everywhere the SDK
/// draws. Same modifier in both states — `nil` falls back to the ambient scheme — so toggling
/// never changes the view identity and never resets navigation state.
struct OctopusThemedRoot<Content: View>: View {
  @ObservedObject private var store = OctopusInterfaceStyleStore.shared
  @Environment(\.colorScheme) private var ambientColorScheme
  private let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    content.environment(\.colorScheme, store.colorScheme ?? ambientColorScheme)
  }
}

extension UIUserInterfaceStyle {
  /// `.light` / `.dark` as a SwiftUI scheme, `nil` for `.unspecified` (follow the system).
  var forcedColorScheme: ColorScheme? {
    switch self {
    case .light: return .light
    case .dark: return .dark
    default: return nil
    }
  }
}
