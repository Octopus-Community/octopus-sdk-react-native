import Combine
import CoreGraphics
import SwiftUI

/// Observable box holding the normalized bottom inset handed to an embedded Octopus
/// SwiftUI tree.
///
/// The value changes after mount — the first layout pass resolves the container's safe
/// area, and rotation, iPad multitasking or a host that re-lays the view out change it
/// again later — and it must reach SwiftUI *without* rebuilding the
/// `UIHostingController`'s `rootView`: replacing that drops the identity of the `AnyView`
/// it wraps and resets the SDK's own `@StateObject` managers mid-session.
final class OctopusBottomInsetStore: ObservableObject {
  @Published var value: CGFloat = 0
}

/// Thin `@ObservedObject` shell that re-renders its content when the normalized bottom
/// inset changes.
///
/// Keeping the observation here (rather than inside the SDK screen itself) means the
/// embedded view keeps its position in the view tree, so its `@StateObject` managers
/// survive an inset update: only its `bottomSafeAreaInset` argument changes.
///
/// The screens rendered below it are only safe because the emitted value never reaches 0:
/// the native SDK gates its inset on `bottomSafeAreaInset > 0`, and crossing that boundary
/// swaps a `_ConditionalContent` case, which SwiftUI treats as a different child — it
/// discards the `@State` beneath it, i.e. the displayed screen (feed scroll position, and
/// the text and image already entered in the create-post editor). See
/// `OctopusEmbeddedContainerView.gatePinningInset`.
struct OctopusBottomInsetHost<Content: View>: View {
  @ObservedObject var store: OctopusBottomInsetStore
  let content: (CGFloat) -> Content

  var body: some View { content(store.value) }
}
