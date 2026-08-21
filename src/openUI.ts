import { resolveInitialScreen } from './internals/initialScreen';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusInitialScreen } from './types/octopusInitialScreen';
import type { OctopusNotification } from './types/octopusNotification';
// Parity wave — navigation & theme
import type { OctopusNavBarLeadingAction } from './types/octopusNavBarLeadingAction';
import type { OctopusNavigationMode } from './types/octopusNavigationMode';

/**
 * Options for opening the Octopus UI.
 */
export interface OpenUIOptions {
  /**
   * When `true`, URLs tapped inside the community UI are not opened by the SDK.
   * Instead, a `navigateToUrl` event is emitted. Subscribe with
   * `addNavigateToUrlListener` to receive the URL and decide whether to handle
   * it in-app or delegate back to the SDK (system browser).
   *
   * @default false
   */
  interceptUrls?: boolean;

  /**
   * When `true`, profile taps inside the community UI do not open the SDK's own
   * profile screens. Instead, a `navigateToProfile` event is emitted with the
   * tapped member's `clientUserId`, so your app can show its own profile screen
   * (Unified Profile). Subscribe with `addNavigateToProfileListener`.
   *
   * Also routes the Unified Profile activity screen's "edit my profile" action
   * to the existing `editUser` event, in any connection mode.
   *
   * Requires the community to be configured to expose client user ids. Leave it
   * off — or leave the community unconfigured — to keep the SDK's own profile
   * screens.
   *
   * @default false
   */
  interceptProfileTaps?: boolean;

  /**
   * When provided, opens the SDK at the deep-linked content carried by the
   * notification (e.g. a specific post or comment). Pair with `openNotification`
   * for push-tap handling — see the push-notification docs.
   *
   * A notification always wins over {@link initialScreen}: when both are
   * provided the deep link is followed and the initial screen is dropped with
   * a warning.
   */
  notification?: OctopusNotification;

  /**
   * The screen the UI opens on: the main feed (the default), a specific post
   * or group (bridge mode), one member's posts (`activity`) or profile
   * (`profile`), or the post editor (`createPost`). See
   * {@link OctopusInitialScreen} for each variant's contract.
   *
   * Ignored (with a warning) when {@link notification} is also provided — the
   * deep link wins.
   *
   * @example
   * ```typescript
   * // Open directly on a post (bridge mode)
   * await openUI({ initialScreen: { type: 'post', postId: 'post-1' } });
   *
   * // Open one member's Octopus posts (Unified Profile)
   * await openUI({
   *   initialScreen: { type: 'activity', member: { clientUserId: 'user-42' } },
   * });
   *
   * // Open the connected user's own profile
   * await openUI({ initialScreen: { type: 'profile' } });
   * ```
   */
  initialScreen?: OctopusInitialScreen;

  // Parity wave — navigation & theme

  /**
   * How the UI hosts its internal navigation stack. iOS only — Android
   * ignores the value (no-op), since it always drives the SDK through its
   * own navigation host regardless.
   *
   * Defaults to `'navigationStack'`, not the native SDK's own `'automatic'`
   * default — `openUI()` always presents through a modally-hosted, full-screen
   * controller (`UIHostingController` with `modalPresentationStyle =
   * .fullScreen`), which is exactly the hosting shape the legacy
   * `'automatic'` container silently drops sub-navigation pushes under. Matches
   * the Flutter reference, whose full-screen route (`showOctopusHomeScreen`)
   * inherits `OctopusHomeScreen`'s own `navigationStack` default without
   * overriding it away. Pass `'automatic'` explicitly to opt back into the
   * native default.
   *
   * @default 'navigationStack'
   * @see {@link OctopusNavigationMode}
   */
  navigationMode?: OctopusNavigationMode;

  /**
   * Overrides the leading (top-left) icon on the top app bar with a close
   * (X) or back arrow. Tapping it closes the UI, exactly like the default
   * back arrow does. Useful when `openUI()` is presented from a modal and a
   * close affordance reads better than a back arrow, or vice-versa.
   *
   * When omitted, the native default back arrow applies.
   *
   * @see {@link OctopusNavBarLeadingAction}
   */
  navBarLeadingAction?: OctopusNavBarLeadingAction;
}

/**
 * Opens the Octopus UI home screen.
 *
 * @param options - Optional configuration. Use `interceptUrls: true` to receive
 *   URL taps via `addNavigateToUrlListener` instead of having the SDK open them,
 *   `interceptProfileTaps: true` to receive profile taps via
 *   `addNavigateToProfileListener` instead of having the SDK open its own profile
 *   screens, `notification` to open directly on deep-linked content, and
 *   `initialScreen` to open on a specific screen (a post, a group, one
 *   member's posts or profile, or the post editor).
 * @returns A promise that resolves when the UI has been opened.
 * @throws A plain `Error` synchronously when `initialScreen` is structurally
 *   invalid (blank `postId` / `groupId`, or an `activity` member violating the
 *   exactly-one-id contract), and a {@link NavigateToOctopusCreatePostError}
 *   when a `createPost` initial screen's `prefilledPost` fails native
 *   validation.
 *
 * @example
 * ```typescript
 * // Open UI with default behaviour (SDK opens links in system browser)
 * await openUI();
 *
 * // Open UI with URL interception (app receives links via addNavigateToUrlListener)
 * await openUI({ interceptUrls: true });
 *
 * // Open UI with the host's own profile screens (Unified Profile)
 * await openUI({ interceptProfileTaps: true });
 *
 * // Open UI on the content carried by a tapped push notification
 * await openUI({ notification });
 *
 * // Open UI directly on a specific post (bridge mode)
 * await openUI({ initialScreen: { type: 'post', postId: 'post-1' } });
 * ```
 */
export function openUI(options?: OpenUIOptions): Promise<void> {
  const opts = options ?? {};
  const interceptUrls = opts.interceptUrls === true;
  const interceptProfileTaps = opts.interceptProfileTaps === true;
  const notification = opts.notification
    ? {
        linkPath: opts.notification.linkPath,
        rawPayload: opts.notification.rawPayload,
      }
    : undefined;
  // A tapped notification always wins over an initial screen — see
  // resolveInitialScreen, shared with the embedded <OctopusUIView> so neither
  // the two platforms nor the two entry points can drift on that precedence.
  const initialScreen = resolveInitialScreen(
    opts.initialScreen,
    notification !== undefined,
    'openUI'
  );
  return OctopusReactNativeSdk.openUI({
    interceptUrls,
    interceptProfileTaps,
    notification,
    initialScreen,
    // Parity wave — navigation & theme. `navigationMode` always resolves to a
    // concrete value — defaulting to `'navigationStack'` when unset, per the
    // TSDoc above — rather than left `undefined` for the native side to
    // default away: iso with Flutter's `embeddedView`, which always emits the
    // wire key precisely so a host that says nothing still gets the
    // non-buggy default, not the native SDK's own `.automatic`.
    navigationMode: opts.navigationMode ?? 'navigationStack',
    navBarLeadingAction: opts.navBarLeadingAction,
  });
}
