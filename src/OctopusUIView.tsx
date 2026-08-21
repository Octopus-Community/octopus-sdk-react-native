import {
  requireNativeComponent,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  resolveInitialScreen,
  type NativeInitialScreen,
} from './internals/initialScreen';
import type { OctopusInitialScreen } from './types/octopusInitialScreen';
import type { OctopusNotification } from './types/octopusNotification';
// Parity wave — navigation & theme
import type { OctopusNavBarLeadingAction } from './types/octopusNavBarLeadingAction';
import type { OctopusNavigationMode } from './types/octopusNavigationMode';

type NativeProps = {
  interceptUrls?: boolean;
  interceptProfileTaps?: boolean;
  notification?: { linkPath: string; rawPayload: Record<string, string> };
  initialScreen?: NativeInitialScreen;
  style?: StyleProp<ViewStyle>;
  // Parity wave — navigation & theme
  showBackButton?: boolean;
  showNavBar?: boolean;
  navBarTitle?: string;
  navBarPrimaryColor?: boolean;
  titleCentered?: boolean;
  navigationMode?: OctopusNavigationMode;
  navBarLeadingAction?: OctopusNavBarLeadingAction;
};

export interface OctopusUIViewProps {
  /**
   * When `true`, URLs tapped inside the community UI are not opened by the SDK.
   * Instead, a `navigateToUrl` event is emitted. Subscribe with
   * `addNavigateToUrlListener` to receive the URL.
   *
   * @default false
   */
  interceptUrls?: boolean;

  /**
   * When `true`, profile taps inside the community UI are not handled by the
   * SDK. Instead, a `navigateToProfile` event is emitted with the tapped
   * member's `clientUserId`, so your app can show its own profile screen
   * (Unified Profile). Subscribe with `addNavigateToProfileListener`.
   *
   * Requires the community to be configured to expose client user ids. On iOS
   * the prop is read **on mount** only, like the other embedded props.
   *
   * @default false
   */
  interceptProfileTaps?: boolean;

  /**
   * When provided, the embedded UI mounts at the deep-linked content carried
   * by the notification. On iOS the prop is read **on mount** only; on Android
   * updating it to a new `linkPath` also navigates an already-mounted view.
   * For consistent cross-platform re-deep-linking, force a remount by adding
   * `key={notification.linkPath}`.
   */
  notification?: OctopusNotification;

  /**
   * The screen the embedded UI mounts on: the main feed (the default), a
   * specific post or group (bridge mode), one member's posts (`activity`) or
   * profile (`profile`), or the post editor (`createPost`). Same union — and
   * same per-variant contract — as `openUI({ initialScreen })`: see
   * {@link OctopusInitialScreen}.
   *
   * Read **on mount** only, on both platforms, like the other embedded props:
   * the native side consumes it when it builds the view, and a later prop
   * change reconfigures nothing. To mount on a different screen, force a
   * remount with a `key` derived from the screen — e.g.
   * `key={initialScreen.type + postId}`.
   *
   * Ignored (with a warning) when {@link notification} is also provided — the
   * deep link wins, exactly as in `openUI()`.
   *
   * Unlike `openUI()`, a prop cannot reject a promise: a `createPost` screen
   * whose `prefilledPost` fails native validation opens a **blank** editor and
   * logs natively, instead of surfacing a
   * {@link NavigateToOctopusCreatePostError}. Use
   * {@link navigateToOctopusCreatePost} when you need that error back.
   *
   * @throws A plain `Error` synchronously, while rendering, when the screen is
   *   structurally invalid (blank `postId` / `groupId`, or an `activity` member
   *   violating the exactly-one-id contract).
   *
   * @example
   * ```tsx
   * // Mount the embedded view directly on a post
   * <OctopusUIView
   *   initialScreen={{ type: 'post', postId }}
   *   key={postId}
   *   style={StyleSheet.absoluteFill}
   * />
   * ```
   */
  initialScreen?: OctopusInitialScreen;

  style?: StyleProp<ViewStyle>;

  // Parity wave — navigation & theme

  /**
   * Whether the embedded UI's top app bar shows a back button. Matches the
   * Flutter `OctopusHomeScreen` widget's `showBackButton`.
   *
   * **Known gap**: unlike `openUI()`'s equivalent icon (which closes the
   * fullscreen UI), tapping this icon on the embedded root is currently
   * inert — there is no callback yet to notify your app, since the embedded
   * view has no per-instance channel back to JS (Flutter's Dart-level
   * `onBack` callback has no RN equivalent here). Only set this to `true`
   * where the SDK's own internal navigation makes the icon meaningful
   * (e.g. after pushing to a sub-screen), not to let your app react to the
   * tap.
   *
   * @default false
   */
  showBackButton?: boolean;

  /**
   * When `false`, the embedded UI renders with no top app bar at all — your
   * app is then expected to provide its own title chrome. Matches the
   * Flutter `OctopusHomeScreen` widget's `showNavBar`.
   *
   * **iOS**: not supported yet — the native top app bar always renders; the
   * prop is accepted for API parity but has no visible effect on iOS.
   *
   * @default true
   */
  showNavBar?: boolean;

  /**
   * Overrides the top app bar title for this view only. When omitted, the
   * title configured globally in `initialize({ topAppBar })` (if any) is
   * used, falling back to the community name.
   */
  navBarTitle?: string;

  /**
   * When `true`, the top app bar background uses the theme's primary color
   * for this view only, overriding the global `initialize({ topAppBar })`
   * setting. When omitted, the global setting (or the default) applies.
   */
  navBarPrimaryColor?: boolean;

  /**
   * When `true`, centers the top app bar title for this view only,
   * overriding the global `initialize({ topAppBar })` setting. When
   * omitted, the global setting (or the default, leading-aligned) applies.
   */
  titleCentered?: boolean;

  /**
   * How the embedded UI hosts its internal navigation stack. iOS only —
   * Android ignores the value (no-op), since it always drives the SDK
   * through its own navigation host regardless.
   *
   * Defaults to `'navigationStack'`, not the native SDK's own `'automatic'`
   * default — matches the Flutter reference's `embeddedView`, whose doc
   * comment spells out why: every host embeds this view inside its own
   * navigation/layout tree, and the legacy `'automatic'` container silently
   * drops sub-navigation pushes when that tree reparents the view (a modal
   * route, hot reload, a push from elsewhere). Pass `'automatic'` explicitly
   * to opt back into the native default.
   *
   * @default 'navigationStack'
   * @see {@link OctopusNavigationMode}
   */
  navigationMode?: OctopusNavigationMode;

  /**
   * Overrides the leading (top-left) icon on the top app bar with a close
   * (X) or back arrow, regardless of {@link showBackButton}. Subject to the
   * same known gap as {@link showBackButton}: tapping it is currently inert
   * on the embedded root (no JS callback exists yet) — use it to restyle the
   * icon the SDK's own navigation already reacts to, not to add a new
   * app-level dismissal.
   *
   * When omitted, the native default applies: a back arrow gated by
   * {@link showBackButton}.
   *
   * @see {@link OctopusNavBarLeadingAction}
   */
  navBarLeadingAction?: OctopusNavBarLeadingAction;
}

const NativeOctopusUIView =
  requireNativeComponent<NativeProps>('OctopusUIView');

/**
 * Embeds the Octopus Community UI as a native view inside your screen.
 * Use this when you want to keep your app navigation (e.g. bottom tab bar) visible
 * instead of opening the SDK in fullscreen with `openUI()`.
 *
 * You must call `initialize()` before rendering this component.
 *
 * @example
 * ```tsx
 * function CommunityTab() {
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <OctopusUIView interceptUrls={true} style={StyleSheet.absoluteFill} />
 *     </View>
 *   );
 * }
 * ```
 */
export function OctopusUIView({
  interceptUrls = false,
  interceptProfileTaps = false,
  notification,
  initialScreen,
  style,
  showBackButton,
  showNavBar,
  navBarTitle,
  navBarPrimaryColor,
  titleCentered,
  navigationMode = 'navigationStack',
  navBarLeadingAction,
}: OctopusUIViewProps) {
  const nativeNotification = notification
    ? { linkPath: notification.linkPath, rawPayload: notification.rawPayload }
    : undefined;
  // Same producer as openUI(): one normalization, one notification-wins rule,
  // so the embedded and fullscreen entry points cannot drift on either.
  const nativeInitialScreen = resolveInitialScreen(
    initialScreen,
    nativeNotification !== undefined,
    'OctopusUIView'
  );
  return (
    <NativeOctopusUIView
      interceptUrls={interceptUrls}
      interceptProfileTaps={interceptProfileTaps}
      notification={nativeNotification}
      initialScreen={nativeInitialScreen}
      style={StyleSheet.flatten([styles.default, style])}
      // Parity wave — navigation & theme. Left undefined when the host does not
      // set them, so each native side's own default (unchanged from before this
      // wave) applies rather than a JS-side default overriding it — except
      // `navigationMode`, which always resolves to a concrete value (see the
      // destructured default above) and is therefore always sent, iso with
      // Flutter's `embeddedView`: it always emits the wire key precisely so a
      // host that says nothing still gets the non-buggy default, not the
      // native SDK's own `.automatic`.
      showBackButton={showBackButton}
      showNavBar={showNavBar}
      navBarTitle={navBarTitle}
      navBarPrimaryColor={navBarPrimaryColor}
      titleCentered={titleCentered}
      navigationMode={navigationMode}
      navBarLeadingAction={navBarLeadingAction}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    flex: 1,
  },
});
