/**
 * Overrides the leading (top-left) icon on the Octopus UI's top app bar.
 *
 * - `'close'` — renders a close (X) icon.
 * - `'back'` — renders a back arrow.
 *
 * Supported on both platforms (native Android SDK 1.12.1+ via
 * `leadingNavigationIcon`, native iOS SDK 1.12.2+ via `navBarLeadingAction`).
 *
 * **Tap behavior differs by entry point — this is an outstanding gap, not
 * the intended design.** Issue #36 asks for the tap to fire the SDK's
 * existing back event to JS (the same path the default back arrow already
 * uses on Android, `onBack`) rather than dismissing anything by itself. RN
 * does not yet have that event wired for either icon variant:
 * - `openUI()` — the tap dismisses the fullscreen UI directly (native-side),
 *   without emitting anything to JS.
 * - `<OctopusUIView>` — the tap is inert; there is no per-instance channel
 *   back to JS on the embedded view yet.
 *
 * Wiring the back event through is tracked as remaining work on #36.
 *
 * @see {@link https://github.com/Octopus-Community/octopus-sdk-react-native-private/issues/36 | issue #36}
 */
export type OctopusNavBarLeadingAction = 'close' | 'back';
