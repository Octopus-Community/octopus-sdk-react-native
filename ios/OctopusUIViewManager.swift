import React
import UIKit

/// Container view that embeds the native Octopus UI when added to a window.
/// The `interceptUrls` and `interceptProfileTaps` properties are set by React Native via
/// RCT_EXPORT_VIEW_PROPERTY (KVC on the view).
@objc final class OctopusEmbeddedContainerView: UIView {
  weak var bridge: RCTBridge?
  @objc var interceptUrls: Bool = false
  @objc var interceptProfileTaps: Bool = false
  @objc var notification: NSDictionary? = nil
  /// Flat `initialScreen` wire payload produced by the JS `normalizeInitialScreen`. Consumed
  /// once, in `didMoveToWindow()`, when the embedded view is built — like every other prop
  /// here, a later write reconfigures nothing (the JS side documents the `key` remount).
  @objc var initialScreen: NSDictionary? = nil

  // Parity wave — navigation & theme. Same "read once in didMoveToWindow()" contract as the
  // props above — a later write reconfigures nothing.
  @objc var showBackButton: Bool = false
  @objc var showNavBar: Bool = true
  @objc var navBarTitle: NSString? = nil
  @objc var navBarPrimaryColor: NSNumber? = nil
  @objc var titleCentered: NSNumber? = nil
  @objc var navigationMode: NSString? = nil
  @objc var navBarLeadingAction: NSString? = nil

  /// Direct event fired when the embedded top app bar's leading icon (back arrow or close)
  /// is tapped on the SDK's root screen — the RN analog of Flutter's Dart-level `onBack`
  /// (issue #36). Unlike the props above, this is NOT read once in `didMoveToWindow()`: the
  /// tap closure handed to the SDK reads it at tap time (weakly, through the container), so
  /// React can rebind the JS handler on re-render without a remount.
  @objc var onBackRequested: RCTDirectEventBlock? = nil

  private var hasEmbedded = false

  /// Total bottom padding (points) the host asked for through
  /// `initialize({ ui: { bottomSafeAreaInset } })`, once it is known to be positive.
  ///
  /// `nil` when the host asked for none: the historical behaviour then applies untouched
  /// (0 forwarded to the native SDK, its inset gate off) and no normalization runs at all,
  /// so hosts that never used the option keep byte-identical layout.
  private var requestedBottomSafeAreaInset: CGFloat?

  /// Normalized value handed to the embedded SwiftUI tree. Owned here because only the
  /// container knows the safe area the SDK is actually laid out in.
  let bottomInsetStore = OctopusBottomInsetStore()

  /// Floor applied to every host-provided inset so the value stays strictly positive for
  /// the view's whole lifetime.
  ///
  /// The native SDK gates its inset on a `@ViewBuilder` condition
  /// (`insetableMainNavigationView`: `if bottomSafeAreaInset > 0`). Crossing that boundary
  /// swaps a `_ConditionalContent` case, and SwiftUI treats the result as a different
  /// child: it discards the `@State` beneath it, which here is the displayed screen — feed
  /// scroll position, and the text and image already entered in the create-post editor.
  ///
  /// Normalization legitimately reaches exactly 0 whenever the system inset already covers
  /// what the host asked for, which is the common case. Pinning the gate on instead of
  /// freezing the value is what makes live tracking safe, and live tracking is necessary:
  /// the container's own geometry can lag the window's, and no size-based "the layout looks
  /// settled now" test tells a stale frame apart from a settled one.
  ///
  /// 0.01 pt renders nothing.
  ///
  /// **Known divergence.** Normalization does move the native keyboard threshold. The
  /// native SDK compares `keyboardHeight` against the same `bottomSafeAreaInset` it uses as
  /// a height, so changing the value from `R` to `R - S` changes that comparison too. The
  /// outcome differs for any reported `keyboardHeight` in `(R - S, R]`, and is identical
  /// everywhere else. For any realistic bottom chrome — `R` well below a keyboard's height —
  /// a full-height software keyboard falls outside that band and is unaffected; a host
  /// asking to reserve a band as tall as a keyboard would not be. The reachable case is a
  /// **hardware keyboard** (iPad, or a Bluetooth keyboard
  /// on iPhone), which reports only the accessory bar: with `R = 70` and `S = 20`, a
  /// reported 55 pt means `55 <= 70` used to keep the band while `55 <= 50` now drops it,
  /// so host bottom chrome can overlap the composer while typing.
  ///
  /// This cannot be fixed from the bridge: one scalar drives both the reserved height and
  /// the threshold, and no single value satisfies both meanings. Resolving it properly needs
  /// the native SDK to take the total and the threshold separately — out of scope here,
  /// since the native additive contract is public API owned upstream.
  private static let gatePinningInset: CGFloat = 0.01

  /// Starts converting the host's *total* bottom padding into the *additive* inset the
  /// native SDK expects, and keeps it up to date as the container's geometry changes.
  ///
  /// Call this **before** the SwiftUI tree is built: the first value must already be in the
  /// store, otherwise the native `bottomSafeAreaInset > 0` gate flips after the first frame
  /// and SwiftUI discards the displayed screen's state.
  ///
  /// That ordering trades one transient for the state loss: the container's safe area is not
  /// resolved yet, so the first stored value can be the total unchanged (`systemInset == 0`),
  /// and the first layout pass corrects it downwards. At worst the band is briefly too tall —
  /// never too short, and the gate stays on throughout.
  func startNormalizingBottomInset(totalRequested: CGFloat) {
    requestedBottomSafeAreaInset = totalRequested
    updateNormalizedBottomInset()
  }

  /// The container's safe area is not resolved when `didMoveToWindow()` fires, and it keeps
  /// changing afterwards — rotation, iPad multitasking, and a host that re-lays the view
  /// out. Re-normalize on both signals; `gatePinningInset` is what keeps that safe.
  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    updateNormalizedBottomInset()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updateNormalizedBottomInset()
  }

  /// Converts the host-facing *total* bottom padding into the *additive* inset the native
  /// SDK expects.
  ///
  /// `OctopusHomeScreen(bottomSafeAreaInset:)` applies its value through SwiftUI's
  /// `.safeAreaInset(edge: .bottom)`, which stacks **on top of** the safe area the view
  /// already has. The Android bridge instead consumes the system insets before mounting
  /// (`consumeWindowInsets(WindowInsets.systemBars)` in `OctopusUIViewManager.kt`), so there
  /// the host's value is the only bottom padding.
  ///
  /// Subtracting the safe area this container actually sits in makes the two bridges agree:
  /// `bottomSafeAreaInset: 56` reserves 56 points of bottom padding on both platforms. When
  /// the system already reserves at least as much as the host asked for, the result is `0`
  /// and no extra inset is added — the system inset alone already satisfies the request, so
  /// iOS lands on `max(requested, systemInset)` where Android lands on `requested`.
  ///
  /// `systemInset` is the safe area of the view the SDK is embedded in — the *container's*,
  /// not the window's: a host that already lays the embedded view out above the home
  /// indicator has `0` here and correctly receives the full requested value.
  private func normalizedBottomInset(for requested: CGFloat, systemInset: CGFloat) -> CGFloat {
    max(0, requested - systemInset)
  }

  /// Recomputes the inset from the container's current geometry.
  ///
  /// Idempotent, and a no-op for hosts that asked for no bottom padding. There is no
  /// feedback path back into `safeAreaInsets`: the hosting controller's view is a child
  /// pinned to this container's edges, and `.safeAreaInset(edge: .bottom)` only affects the
  /// safe area *inside* the SwiftUI subtree, so writing the store cannot change the input
  /// that produced it.
  private func updateNormalizedBottomInset() {
    guard let requested = requestedBottomSafeAreaInset else { return }
    let normalized = max(
      normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom),
      Self.gatePinningInset
    )
    guard bottomInsetStore.value != normalized else { return }
    bottomInsetStore.value = normalized
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, !hasEmbedded else { return }
    guard let bridge = bridge else { return }

    guard let module = bridge.module(for: OctopusReactNativeSdk.self) as? OctopusReactNativeSdk else {
      return
    }
    module.addEmbeddedView(
      containerView: self,
      interceptUrls: interceptUrls,
      interceptProfileTaps: interceptProfileTaps,
      notification: notification as? [String: Any],
      initialScreen: initialScreen as? [String: Any],
      // Parity wave — navigation & theme
      showBackButton: showBackButton,
      showNavBar: showNavBar,
      navBarTitle: navBarTitle as String?,
      navBarPrimaryColor: navBarPrimaryColor,
      titleCentered: titleCentered,
      navigationMode: navigationMode as String?,
      navBarLeadingAction: navBarLeadingAction as String?,
      // Read at tap time, not captured now: React rebinds the block on every re-render.
      onBackTap: { [weak self] in self?.onBackRequested?([:]) }
    )
    hasEmbedded = true
  }
}

@objc(OctopusUIViewManager)
class OctopusUIViewManager: RCTViewManager {

  override func view() -> UIView! {
    let view = OctopusEmbeddedContainerView()
    view.bridge = bridge
    view.backgroundColor = .clear
    return view
  }

  override static func moduleName() -> String! {
    return "OctopusUIView"
  }
}
