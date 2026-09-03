/**
 * Overrides the leading (top-left) icon on the Octopus UI's top app bar.
 *
 * - `'close'` — renders a close (X) icon.
 * - `'back'` — renders a back arrow.
 *
 * Supported on both platforms (native Android SDK 1.12.1+ via
 * `leadingNavigationIcon`, native iOS SDK 1.12.2+ via `navBarLeadingAction`).
 *
 * **Tap behavior differs by entry point.** Issue #36 asks for the tap to
 * fire the SDK's existing back event to JS rather than dismissing anything
 * by itself:
 * - `<OctopusUIView>` — on the SDK's root screen, tapping either variant
 *   now fires the {@link OctopusUIViewProps.onBackRequested} prop, same as
 *   the default back arrow (`showBackButton`). Sub-screens still pop the
 *   SDK's own internal navigation stack first.
 * - `openUI()` — the tap still dismisses the fullscreen UI directly
 *   (native-side), without emitting anything to JS. Wiring that path
 *   through is tracked as remaining parity work with the native SDKs.
 */
export type OctopusNavBarLeadingAction = 'close' | 'back';
