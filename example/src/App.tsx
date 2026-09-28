import { sampleSupport } from './config/sampleSupport';
/* eslint-disable react-native/no-inline-styles */
import * as Octopus from '@octopus-community/react-native';
import {
  useUserTokenProvider,
  useBridgeShareTokenProvider,
  UrlOpeningStrategy,
  overrideDefaultLocale,
  registerPushNotificationToken,
  type OctopusIcons,
} from '@octopus-community/react-native';
import {
  View,
  Image,
  useColorScheme,
  StyleSheet,
  Modal,
  Platform,
  Text,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SampleSystemBars } from './components/SampleSystemBars';
import { WebView } from 'react-native-webview';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppBar } from './components/AppBar';
import { DarkHalo } from './components/DarkHalo';
import { TabBar, type TabId } from './components/TabBar';
import { AppUpdateSnackbar } from './components/AppUpdateSnackbar';
import { chromeColors, OCTOPUS_SDK_THEME } from './theme/branding';
import { restoreThemeMode } from './theme/themeMode';
import { runAppUpdateCheck } from './update/appUpdateStore';
import { isAppUpdateSupported } from './update/appUpdate';
import { setupOctopusPush } from './push';
import {
  resolveShellBack,
  resolveWebViewBack,
} from './navigation/backDispatcher';
import {
  useHardwareBack,
  useHardwareBackListener,
} from './navigation/useHardwareBack';
import {
  SettingsScreen,
  type UrlOpeningMode,
  type ProfileTapMode,
  type DisplayMode,
  type CommunityLocaleOverride,
} from './screens/SettingsScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import type { ConfigScreenMode } from './screens/ConfigScreen';
import { DebugScreen } from './screens/DebugScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ScenariosScreen } from './screens/ScenariosScreen';
import { ClientProfileScreen } from './screens/ClientProfileScreen';
import type { ExposeClientUserIdOverride } from './scenarios/unifiedProfile';
import { ProductionWarningBanner } from './components/ProductionWarningBanner';
import type {
  AppThemeChoice,
  DemoConfig,
  EntitlementVariant,
  SwitchCommunityTarget,
} from './config/demoConfig';
import {
  apiKeySourceLabel,
  applySwitchedCommunity,
  communityLabel,
  ENTITLEMENT_LABELS,
  octopusApiServer,
  octopusHostLabel,
  octopusServerLabel,
  octopusIsProdServer,
  octopusUserId,
  octopusUserTokens,
  resolveApiKey,
} from './config/demoConfig';
import {
  clearPersistedDemoConfig,
  loadPersistedDemoConfig,
  persistDemoConfig,
} from './config/configStorage';
import { buildDebugInfoCards } from './debug/debugInfo';
import { debugLog } from './debug/debugLog';
import {
  sampleBuild,
  sampleVersion,
  sampleVersionLabel,
} from './config/sampleVersion';
import { nextNavRequest } from './navigation/anchors';
import type {
  ConfigSection,
  DebugView,
  NavRequest,
  ScenarioSectionId,
  SettingsPage,
} from './navigation/anchors';
import { formatSDKEvent } from './utils/formatSDKEvent';
import type {
  ThemeMode,
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
  BottomInsetPreset,
  LinkBackgroundMode,
  FontOverrideMode,
} from './types/theme';
import {
  BOTTOM_INSET_VALUES,
  EXAMPLE_FONT_FAMILY,
  EXAMPLE_FONT_WEIGHT,
} from './types/theme';

const resolvedLogo = Image.resolveAssetSource(
  require('../assets/images/logo.png')
);

/**
 * A minimal `theme.icons` override, sent with the custom logo: two tinted glyphs replacing the
 * post's "comment" action and the "more actions" button, plus the custom logo on empty lists.
 * Every other slot keeps its SDK default.
 */
const exampleIcons: OctopusIcons = {
  screenStates: {
    emptyContent: resolvedLogo,
  },
  content: {
    comment: {
      creation: {
        open: Image.resolveAssetSource(
          require('../assets/images/icon-comment.png')
        ),
      },
    },
  },
  common: {
    moreActions: Image.resolveAssetSource(
      require('../assets/images/icon-more.png')
    ),
  },
};

/** App bar title per tab — the tab's own label, so the bar never contradicts the bar below. */
const TAB_TITLES: Record<TabId, string> = {
  home: 'Home',
  scenarios: 'Scenarios',
  community: 'Community',
  settings: 'Settings',
};

/** How the app's own appearance choice reads on a summary row. */
const APPEARANCE_LABELS: Record<AppThemeChoice, string> = {
  system: 'Follow system',
  light: 'Light',
  dark: 'Dark',
};

/** How the SDK colour preset reads on a summary row. */
const THEME_SET_LABELS: Record<ThemeSet, string> = {
  none: 'SDK default',
  octopusNavy: 'Octopus navy',
  theme1: 'Theme 1',
  theme2: 'Theme 2',
  theme3: 'Theme 3',
};

/** How the community language override reads on a summary row. */
const COMMUNITY_LOCALE_LABELS: Record<CommunityLocaleOverride, string> = {
  system: 'Follow system',
  fr: 'French',
  en: 'English',
};

// The sample's own navy, handed to the SDK — the one preset that is a *design*, not a probe.
// It is what the Config screen offers opposite "SDK default", so the community can be made to
// look like the host around it without opening the Theme scenario.
//
// Values are `OCTOPUS_SDK_THEME` — the SDK brand theme block of the shared sample design
// contract, a token group deliberately disjoint from the sample's own chrome palette in the
// same file, same as the Theme scenario's own probe sets below, so a future change to one
// doesn't silently repaint the other.
const lightOctopusNavyColors = OCTOPUS_SDK_THEME.light;

const darkOctopusNavyColors = OCTOPUS_SDK_THEME.dark;

// Theme color sets for SDK initialization
const lightTheme1Colors = {
  primary: '#3B82F6',
  primaryLowContrast: '#60A5FA',
  primaryHighContrast: '#1D4ED8',
  onPrimary: '#FFFFFF',
};

const darkTheme1Colors = {
  primary: '#60A5FA',
  primaryLowContrast: '#93C5FD',
  primaryHighContrast: '#3B82F6',
  onPrimary: '#000000',
};

const lightTheme2Colors = {
  primary: '#8B5CF6',
  primaryLowContrast: '#A78BFA',
  primaryHighContrast: '#7C3AED',
  onPrimary: '#FFFFFF',
};

const darkTheme2Colors = {
  primary: '#A78BFA',
  primaryLowContrast: '#C4B5FD',
  primaryHighContrast: '#8B5CF6',
  onPrimary: '#000000',
};

const lightTheme3Colors = {
  primary: '#10B981',
  primaryLowContrast: '#34D399',
  primaryHighContrast: '#059669',
  onPrimary: '#FFFFFF',
};

const darkTheme3Colors = {
  primary: '#34D399',
  primaryLowContrast: '#6EE7B7',
  primaryHighContrast: '#10B981',
  onPrimary: '#000000',
};

// Link (URL) and community background colors, layered on top of the selected color set —
// and applied alone when the set is "None", so the bridges are exercised with a theme
// carrying neither a primary color nor a logo.
const lightLinkBackgroundColors = {
  link: '#C2410C',
  background: '#FFF7ED',
};

const darkLinkBackgroundColors = {
  link: '#FDBA74',
  background: '#1C1917',
};

export default function App() {
  // Null until Start is tapped on the Config screen — that is what gates the whole shell.
  // Restored from device storage at launch when there is something to restore; a pasted
  // key never is, so a `custom` config comes back needing its key re-entered.
  const [config, setConfig] = useState<DemoConfig | null>(null);
  // The restored config the app could NOT auto-start — today only the `custom` case, whose
  // key isn't persisted. It seeds the Config screen so only the key has to be re-answered.
  const [restoredConfig, setRestoredConfig] = useState<DemoConfig | null>(null);
  // The community a runtime `switchCommunity` re-targeted the SDK at, or null while the
  // session is still on the community the Config screen started it on. Held beside `config`
  // rather than inside it: the Config screen owns that object, and a switch must not read as
  // if the user had gone back through the screen.
  const [switchedCommunity, setSwitchedCommunity] =
    useState<SwitchCommunityTarget | null>(null);
  // Read inside the initialize effect without being one of its dependencies — the switch has
  // already re-entered the SDK on the new key by the time this is set, and listing it would
  // make every switch initialize twice.
  const switchedCommunityRef = useRef<SwitchCommunityTarget | null>(
    switchedCommunity
  );
  switchedCommunityRef.current = switchedCommunity;
  // Bumped on every switch. `switchCommunity` is a reset + initialize natively, so every
  // mounted `OctopusUIView` is still bound to the community that no longer exists — the SDK's
  // documented contract is to remount them, and this nonce is what keys that remount.
  const [communitySessionNonce, setCommunitySessionNonce] = useState(0);
  // The configuration the session is actually running on — what every screen reads. Equal to
  // `config` until a switch happens, and folded through {@link applySwitchedCommunity} after
  // one, so the community and key-source rows keep describing the live SDK.
  const activeConfig = useMemo(
    () =>
      config === null || switchedCommunity === null
        ? config
        : applySwitchedCommunity(config, switchedCommunity),
    [config, switchedCommunity]
  );
  // Which of the Config screen's two accesses is showing. One screen, two consequences:
  // "Start SDK" before the shell exists, "Apply" when Settings sent the user back to it.
  const [configMode, setConfigMode] = useState<ConfigScreenMode>('onboarding');
  // True while the launch restore is still in flight. The app holds a splash for that
  // window so a saved session doesn't flash the Config screen on its way in.
  const [isRestoringConfig, setIsRestoringConfig] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  // Bumped by the Community tab's blocking band. `initialize()` is idempotent and the effect
  // below already re-runs on every theme change, so a nonce in its deps is the whole of Retry
  // — there is no separate retry path to keep in step with the normal one.
  const [initNonce, setInitNonce] = useState(0);
  const handleRetryInit = useCallback(() => {
    setInitError(null);
    setInitNonce((n) => n + 1);
    debugLog.apiCall('initialize', 'retry requested from the Community tab');
  }, []);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  // Which of Developer tools' two destinations the modal shows. Kept apart from visibility
  // so the view does not flip to its default while the modal slides out.
  const [debugView, setDebugView] = useState<DebugView>('events');
  const openDebug = useCallback((view: DebugView) => {
    setDebugView(view);
    setIsDebugVisible(true);
  }, []);
  const [isInitializationTriggered, setIsInitializationTriggered] =
    useState(false);
  const [isConnectingUser, setIsConnectingUser] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const [selectedThemeSet, setSelectedThemeSet] = useState<ThemeSet>('none');
  const [selectedFontType, setSelectedFontType] = useState<FontType>('default');
  const [selectedLogoMode, setSelectedLogoMode] =
    useState<LogoMode>('disabled');
  const [selectedFontSizeMode, setSelectedFontSizeMode] =
    useState<FontSizeMode>('default');
  const [bottomInsetPreset, setBottomInsetPreset] =
    useState<BottomInsetPreset>('unset');
  const [linkBackgroundMode, setLinkBackgroundMode] =
    useState<LinkBackgroundMode>('default');
  const [fontOverrideMode, setFontOverrideMode] =
    useState<FontOverrideMode>('default');
  const [notSeenNotificationsCount, setNotSeenNotificationsCount] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  // Scenarios-tab-only result feedback: SettingsScreen surfaces its failures through
  // showUserCallbackMessage and doesn't read these, so adding them here doesn't change
  // that tab's behavior. Every write also lands in the Debug console.
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [localeOverrideError, setLocaleOverrideError] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<TabId>('home');
  // Anchors: where a link inside the app asked to land. Each screen applies its request on
  // mount and on every new nonce; the tab bar clears them, so a plain tab visit opens the
  // screen at its top instead of replaying the last link.
  const [configRequest, setConfigRequest] =
    useState<NavRequest<ConfigSection> | null>(null);
  const [settingsRequest, setSettingsRequest] =
    useState<NavRequest<SettingsPage> | null>(null);
  const [scenariosRequest, setScenariosRequest] =
    useState<NavRequest<ScenarioSectionId> | null>(null);
  const openSettingsPage = useCallback((page: SettingsPage) => {
    setSettingsRequest((previous) => nextNavRequest(previous, page));
    setActiveTab('settings');
  }, []);
  const openScenariosSection = useCallback((section: ScenarioSectionId) => {
    setScenariosRequest((previous) => nextNavRequest(previous, section));
    setActiveTab('scenarios');
  }, []);
  useEffect(() => {
    if (activeTab !== 'settings' && activeTab !== 'scenarios') {
      sampleSupport.breadcrumb = activeTab === 'home' ? 'Home' : 'Community';
    }
  }, [activeTab]);

  const [hasAccessToCommunity, setHasAccessToCommunity] = useState<
    boolean | null
  >(null);
  const [isMockUserConnected, setIsMockUserConnected] = useState(false);
  // What the SDK itself reports, as opposed to what the sample last asked for: `null` until
  // the first value crosses the bridge, which is a third state Home has to be able to show.
  const [connectionState, setConnectionState] =
    useState<Octopus.OctopusConnectionState | null>(null);
  const [profile, setProfile] = useState<Octopus.OctopusProfile | null>(null);
  // When `initialize()` last resolved — the session's start, which Home reports.
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  // The entitlement variant the pending connectUser is for. A ref, not state: the token
  // provider is called by the SDK during `connectUser`, before any re-render could publish
  // a new state value to it.
  const connectVariantRef = useRef<EntitlementVariant>('none');
  // Host callbacks (Config §5) — each one gates whether the sample provides an
  // implementation to the SDK. ON is the shared default for the five that are actually
  // wired; `onNavigateToContent`/`onNavigateToProfile` keep their existing mode-string
  // shape since other props (interceptUrls/interceptProfileTaps) already key off it.
  const [urlOpeningMode, setUrlOpeningMode] =
    useState<UrlOpeningMode>('inAppWebView');
  const [profileTapMode, setProfileTapMode] =
    useState<ProfileTapMode>('appScreens');
  // Debug-only: the `exposeClientUserId` community flag (Unified Profile activation)
  // through `debugOverrideExposeClientUserId` — `null` follows the backend, `true`/`false`
  // force it. Driven from Scenarios › Sign-in & user › Unified Profile, applied live.
  // Session-only, like on Android — never persisted.
  const [exposeClientUserIdOverride, setExposeClientUserIdOverride] =
    useState<ExposeClientUserIdOverride>(null);
  // The member a Unified Profile tap handed to the host: non-null shows the host's own
  // profile screen, the way a real host app would push it.
  const [hostProfileClientUserId, setHostProfileClientUserId] = useState<
    string | null
  >(null);
  const [isAuthRequiredCallbackEnabled, setIsAuthRequiredCallbackEnabled] =
    useState(true);
  // Read inside the initialize effect's listener without adding the toggle to that
  // effect's dependency array — flipping it should not restart the SDK.
  const isAuthRequiredCallbackEnabledRef = useRef(
    isAuthRequiredCallbackEnabled
  );
  isAuthRequiredCallbackEnabledRef.current = isAuthRequiredCallbackEnabled;
  const [isUnreadCountCallbackEnabled, setIsUnreadCountCallbackEnabled] =
    useState(true);
  // Analytics is opt-in: OFF by default, unlike the other four wired callbacks.
  const [isEventCallbackEnabled, setIsEventCallbackEnabled] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('embed');
  const [communityLocaleOverride, setCommunityLocaleOverride] =
    useState<CommunityLocaleOverride>('system');
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  // Last `canGoBack` the WebView reported. A ref, not state: only hardware Back reads it,
  // and every page load would otherwise re-render the whole App.
  const webViewCanGoBackRef = useRef(false);
  const [userCallbackMessage, setUserCallbackMessage] = useState<string | null>(
    null
  );
  const userCallbackMessageTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  /**
   * Surfaces a transient message on Settings › Account — the page that carries "Connect
   * user", which is why the SDK's host callbacks land there, and the only page that renders
   * the message. The text must say what the SDK asked and what to do next: a bare listener
   * name reads as a bug to a tester who just tapped Activity as a guest and got sent to
   * Settings. Stable, so effects can depend on it.
   */
  const showUserCallbackMessage = useCallback((message: string) => {
    if (userCallbackMessageTimeoutRef.current) {
      clearTimeout(userCallbackMessageTimeoutRef.current);
      userCallbackMessageTimeoutRef.current = null;
    }
    setSettingsRequest((previous) => nextNavRequest(previous, 'account'));
    setActiveTab('settings');
    setUserCallbackMessage(message);
    userCallbackMessageTimeoutRef.current = setTimeout(() => {
      setUserCallbackMessage(null);
      userCallbackMessageTimeoutRef.current = null;
    }, 8000);
  }, []);

  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const colorScheme = themeMode ?? systemColorScheme;
  // undefined for the 'unset' preset — see BOTTOM_INSET_VALUES and the `ui` spread below.
  const bottomSafeAreaInset = BOTTOM_INSET_VALUES[bottomInsetPreset];

  /** The selected color set, without the optional link/background pair. */
  const getBaseThemeColors = useCallback(() => {
    if (selectedThemeSet === 'octopusNavy') {
      return { light: lightOctopusNavyColors, dark: darkOctopusNavyColors };
    }
    if (selectedThemeSet === 'theme1') {
      return { light: lightTheme1Colors, dark: darkTheme1Colors };
    }
    if (selectedThemeSet === 'theme2') {
      return { light: lightTheme2Colors, dark: darkTheme2Colors };
    }
    if (selectedThemeSet === 'theme3') {
      return { light: lightTheme3Colors, dark: darkTheme3Colors };
    }
    return undefined;
  }, [selectedThemeSet]);

  /** What is handed to `initialize`: the color set plus the link/background pair. */
  const getCurrentThemeColors = useCallback(() => {
    const base = getBaseThemeColors();
    if (linkBackgroundMode === 'default') {
      return base;
    }
    return {
      light: { ...base?.light, ...lightLinkBackgroundColors },
      dark: { ...base?.dark, ...darkLinkBackgroundColors },
    };
  }, [getBaseThemeColors, linkBackgroundMode]);

  const getCurrentThemeFonts = useCallback(() => {
    if (
      selectedFontType === 'default' &&
      selectedFontSizeMode === 'default' &&
      fontOverrideMode === 'default'
    ) {
      return undefined;
    }
    // The theme-wide overrides are independent of the per-style sizes: `weight` and
    // `family` are exercised on their own too, which is the shape a host most often
    // sends (a brand font, no size changes at all).
    const fontFamily =
      fontOverrideMode === 'family' ? EXAMPLE_FONT_FAMILY : undefined;
    const fontWeight =
      fontOverrideMode === 'default' ? undefined : EXAMPLE_FONT_WEIGHT;
    if (selectedFontType === 'default' && selectedFontSizeMode === 'default') {
      return { fontFamily, fontWeight };
    }
    const multiplier =
      selectedFontSizeMode === 'small'
        ? 0.85
        : selectedFontSizeMode === 'large'
          ? 1.4
          : 1.0;
    const hasFontType = selectedFontType !== 'default';
    const baseStyles = {
      title1: { fontSize: { size: 28 * multiplier } },
      title2: { fontSize: { size: 22 * multiplier } },
      body1: { fontSize: { size: 16 * multiplier } },
      body2: { fontSize: { size: 14 * multiplier } },
      caption1: { fontSize: { size: 12 * multiplier } },
      caption2: { fontSize: { size: 10 * multiplier } },
      // iOS only: Android's typography has no nav-bar-item slot. When omitted,
      // iOS nav-bar items follow body1 — set explicitly here so the dedicated
      // slot is exercised by the example.
      navBarItem: { fontSize: { size: 16 * multiplier } },
    };
    if (hasFontType) {
      (Object.keys(baseStyles) as (keyof typeof baseStyles)[]).forEach(
        (key) => {
          (baseStyles[key] as Record<string, unknown>).fontType =
            selectedFontType;
        }
      );
    }
    return { fontFamily, fontWeight, textStyles: baseStyles };
  }, [selectedFontType, selectedFontSizeMode, fontOverrideMode]);

  /**
   * The single place the host's light/dark appearance is set.
   *
   * Every path that adopts a theme choice goes through it — the Theme control, Start,
   * and the launch restore. A path that only wrote `themeMode` and skipped
   * `Appearance.setColorScheme` would leave the picker showing one appearance and the
   * screen rendering the other.
   *
   * It takes an `unknown` on purpose: one of its callers replays a value read back from
   * device storage, and the launch restore is the path where a bad or failing appearance
   * repeats on every cold start instead of once (issue #257). `restoreThemeMode` narrows
   * and applies it, never throws, and returns the mode actually in effect — which is what
   * the picker is set from, so the control can never show an appearance that was refused.
   */
  const handleThemeModeChange = useCallback((mode: unknown) => {
    const applied = restoreThemeMode(mode);
    setThemeMode(applied === 'system' ? null : applied);
  }, []);

  // In-app update. The card itself lives in Settings — a tab a tester running a
  // scenario has no reason to open — so the shell announces a new build once,
  // with `<AppUpdateSnackbar>` (mounted below) and its `Update` action. The
  // store hands out a versionCode at most once per build, so re-checks do not
  // re-announce. This effect only drives the checks.
  //
  // Re-checked when the app comes back to the foreground: unlike a check on
  // every render, `active` transitions are rare, and a tester who leaves to
  // install from Play returns through exactly this path.
  useEffect(() => {
    if (!isAppUpdateSupported()) return;
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        runAppUpdateCheck();
      }
    });
    runAppUpdateCheck();
    return () => {
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    const subAccess = Octopus.addHasAccessToCommunityListener((hasAccess) => {
      setHasAccessToCommunity(hasAccess);
    });
    return () => {
      subAccess.remove();
    };
  }, []);

  // onUnreadCountChanged (Config §5) — disabled means the sample simply never learns
  // about a count change, same as a host that never wired the callback.
  useEffect(() => {
    if (!isUnreadCountCallbackEnabled) return;
    const subCount = Octopus.addNotSeenNotificationsCountListener((count) => {
      setNotSeenNotificationsCount(count);
    });
    return () => subCount.remove();
  }, [isUnreadCountCallbackEnabled]);

  // onEvent (Config §5) — OFF by default, unlike the other wired callbacks: it is the
  // only one that surfaces every SDK event rather than one specific concern.
  useEffect(() => {
    if (!isEventCallbackEnabled) return;
    const subEvents = Octopus.addSDKEventListener((event) => {
      const { title, details } = formatSDKEvent(event);
      debugLog.event(title, details);
    });
    return () => subEvents.remove();
  }, [isEventCallbackEnabled]);

  // URL interception: listener must live in App so it stays active on any tab (Settings, Community embed/fullscreen).
  useEffect(() => {
    if (urlOpeningMode !== 'inAppWebView') return;
    const subscription = Octopus.addNavigateToUrlListener(async (url) => {
      // Only closeUI in fullscreen (it throws "No UI is currently presented" in embed mode).
      try {
        await Octopus.closeUI();
      } catch {
        // Embed mode: nothing to close, continue to open WebView.
      }
      webViewCanGoBackRef.current = false;
      setWebViewUrl(url);
      return UrlOpeningStrategy.handledByApp;
    });
    return () => subscription.remove();
  }, [urlOpeningMode]);

  // Unified Profile: same shape as the URL listener above — it has to live in App so it
  // stays active whichever tab or presentation mode the SDK is showing in.
  useEffect(() => {
    if (profileTapMode !== 'appScreens') return;
    const subscription = Octopus.addNavigateToProfileListener(
      ({ clientUserId }) => {
        // What a real host does: close the presented community, push its own profile
        // screen for that member — the Android sample's ClientProfileScreen.
        if (displayMode === 'fullscreen') {
          Octopus.closeUI().catch(() => {
            // Embed mode: nothing is presented, nothing to close.
          });
        }
        debugLog.apiCall('navigateToProfile', `clientUserId=${clientUserId}`);
        setHostProfileClientUserId(clientUserId);
      }
    );
    return () => subscription.remove();
  }, [profileTapMode, displayMode]);

  const closeWebView = useCallback(() => {
    webViewCanGoBackRef.current = false;
    setWebViewUrl(null);
  }, []);

  // Hardware Back in the WebView modal behaves like a browser tab: one page back while there
  // is history, close only once it is empty. The Modal receives the press through
  // `onRequestClose` (its own Android window), so this is wired there, not on the dispatcher.
  const onWebViewHardwareBack = useCallback(() => {
    if (resolveWebViewBack(webViewCanGoBackRef.current) === 'goBackInHistory') {
      webViewRef.current?.goBack();
      return;
    }
    closeWebView();
  }, [closeWebView]);

  // Registered at mount, deliberately before anything can call `initialize()`: the bridge's
  // event emitter is unbuffered, so a state listener added after initialization can miss the
  // first value the native side pushes. Both channels replay their current value, so nothing
  // is lost by subscribing this early either.
  useEffect(() => {
    const subConnection = Octopus.addConnectionStateListener((state) => {
      setConnectionState(state);
      debugLog.event(
        'connectionState',
        state.connected
          ? state.isGuest
            ? 'connected (guest)'
            : 'connected'
          : 'not connected'
      );
    });
    const subProfile = Octopus.addProfileListener((next) => {
      setProfile(next);
      debugLog.event(
        'profile',
        next === null
          ? 'no profile'
          : `clientUserId=${next.clientUserId ?? '—'} entitlements=[${next.entitlements.join(', ')}]`
      );
    });
    return () => {
      subConnection.remove();
      subProfile.remove();
    };
  }, []);

  // Re-runs on every theme change (that is how the sample applies a theme: `initialize`
  // takes it), so it must stay idempotent — and it does nothing at all until the Config
  // screen has produced a config.
  useEffect(() => {
    if (config === null) return;
    // A runtime switch outranks the config: this effect re-runs on every theme change, and
    // re-resolving from `config` there would silently drag the session back to the community
    // it started on the next time an appearance control moved.
    const apiKey = switchedCommunityRef.current?.key ?? resolveApiKey(config);
    if (apiKey === '') {
      // Defence in depth behind the Config screen's Start gate. `initialize` would
      // resolve here: the Android bridge only rejects a `null` key and neither native
      // SDK validates the value, so a keyless start would report "Initialized" while
      // every call failed. Refuse instead, and say so where Home can render it.
      const message =
        'No API key resolved. Set OCTOPUS_COMMUNITY_API_KEY in example/.env, or paste a key on the Config screen.';
      setInitError(message);
      setIsInitializationTriggered(true);
      debugLog.apiCall('initialize', `✕ not called — ${message}`);
      return;
    }

    const currentThemeColors = getCurrentThemeColors();
    const currentThemeFonts = getCurrentThemeFonts();
    const hasLogo = resolvedLogo != null && selectedLogoMode === 'enabled';

    const theme =
      currentThemeColors || currentThemeFonts || hasLogo
        ? {
            ...(currentThemeColors && { colors: currentThemeColors }),
            ...(currentThemeFonts && { fonts: currentThemeFonts }),
            ...(hasLogo && {
              logo: { image: resolvedLogo },
              icons: exampleIcons,
            }),
          }
        : undefined;

    Octopus.initialize({
      apiKey,
      connectionMode:
        config.authMode === 'octopus'
          ? { type: 'octopus' }
          : { type: 'sso', appManagedFields: ['profilePicture'] },
      // `unset` must drop the key rather than send `0`: on Android, an absent
      // `bottomSafeAreaInset` now resolves the inset from where <OctopusUIView> is mounted
      // (issue #120), while an explicit `0` opts back out of that resolution.
      ...(bottomSafeAreaInset !== undefined && { ui: { bottomSafeAreaInset } }),
      ...(theme && { theme }),
      // The whole server story of this sample: the published native SDKs are pinned
      // to production, and this is what reroutes them (issue #188). Always sent —
      // a build that declares no OCTOPUS_API_HOST resolves to the demo backend, so
      // there is no case left where the SDK falls back to its production default.
      apiServer: octopusApiServer,
    })
      .then(() => {
        setInitError(null);
        setIsInitializationTriggered(true);
        setSessionStartedAt(Date.now());
        debugLog.apiCall('initialize', 'SDK initialized');
        setupOctopusPush({ onToken: setPushToken }).catch((err) =>
          console.error('Octopus push setup error', err)
        );
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Octopus init error', err);
        setInitError(message);
        // The shell opens anyway: Home is what reports the failure, and Settings' "Back
        // to Config" is the way out — more useful than a dead-end Config screen.
        setIsInitializationTriggered(true);
        debugLog.apiCall('initialize', `failed — ${message}`);
      });

    // `closeUI` rejects when there is no fullscreen UI to close — a race the host
    // cannot prevent, and not worth surfacing: the callback message below is the point.
    const subEdit = Octopus.addEditUserListener(() => {
      if (displayMode === 'fullscreen') {
        Octopus.closeUI().catch(() => {});
      }
      showUserCallbackMessage(
        'Profile edit requested — the SDK handed profile editing to the app (editUser listener).'
      );
    });
    // onAuthenticationRequired (Config §5) — disabled means the sample keeps the
    // subscription (the SDK always emits it) but never acts on it, which is the
    // observable equivalent of the callback not being wired to a host implementation.
    const subLogin = Octopus.addLoginRequiredListener(() => {
      if (!isAuthRequiredCallbackEnabledRef.current) return;
      if (displayMode === 'fullscreen') {
        Octopus.closeUI().catch(() => {});
      }
      showUserCallbackMessage(
        'Login required — the SDK asked the app to sign the user in (loginRequired listener). Connect a user below to continue.'
      );
    });
    return () => {
      subEdit.remove();
      subLogin.remove();
      if (userCallbackMessageTimeoutRef.current) {
        clearTimeout(userCallbackMessageTimeoutRef.current);
      }
    };
  }, [
    config,
    colorScheme,
    selectedThemeSet,
    selectedFontType,
    selectedLogoMode,
    selectedFontSizeMode,
    linkBackgroundMode,
    getCurrentThemeColors,
    getCurrentThemeFonts,
    bottomSafeAreaInset,
    displayMode,
    showUserCallbackMessage,
    initNonce,
  ]);

  useUserTokenProvider(async () => {
    if (!isMockUserConnected) throw new Error('No user connected');
    const variant = connectVariantRef.current;
    const token = octopusUserTokens[variant];
    if (token === '') {
      // The sample signs nothing itself, so a missing variant is a build fact, not a
      // transient failure — say which one so the log names the fix.
      const message = `No token injected for the "${ENTITLEMENT_LABELS[variant]}" entitlement variant`;
      debugLog.apiCall('userTokenProvider', `✕ ${message}`);
      throw new Error(message);
    }
    // Deliberate delay: proves the SDK tolerates a slow host token provider.
    await new Promise<void>((r) => setTimeout(r, 2000));
    debugLog.apiCall(
      'userTokenProvider',
      `✓ token served (${ENTITLEMENT_LABELS[variant]})`
    );
    return token;
  });

  // Signs a prefilled share so a community that forbids member pictures accepts its image.
  // The SDK only asks in that configuration, so on the demo community this never fires.
  //
  // A REAL HOST SIGNS ON ITS BACKEND: it POSTs the fingerprint to an endpoint that holds the
  // community's signing secret and returns an HS256 JWT. The secret must never be shipped in
  // the app bundle — anything in the bundle is readable by anyone who downloads the app. This
  // sample deliberately carries no secret and no signing code at all: it just replays an
  // optional, hand-supplied token from `.env` so the round-trip can be exercised end to end.
  useBridgeShareTokenProvider(async (bridgeFingerprint) => {
    const presignedToken = process.env.OCTOPUS_BRIDGE_SHARE_TOKEN;
    if (!presignedToken) {
      // Declining is a legitimate answer, and its effect differs per platform (see the hook's
      // documentation): Android publishes unsigned and lets the server refuse, iOS fails the
      // publish client-side.
      console.log(
        'Octopus bridge share: no OCTOPUS_BRIDGE_SHARE_TOKEN set, declining to sign'
      );
      return null;
    }
    // Logged as a length only — a fingerprint identifies the exact content being published.
    console.log(
      `Octopus bridge share: signing a ${bridgeFingerprint.length}-char fingerprint`
    );
    return presignedToken;
  });

  // Shared connectUser mechanics, with no opinion on how a failure gets reported — every
  // caller below decides that for itself. Returns null on success, the formatted error
  // message on failure.
  const connectUserCore = useCallback(
    async (
      variant: EntitlementVariant,
      overrides?: { userId?: string; nickname?: string }
    ): Promise<string | null> => {
      // Set before the call: the token provider reads it while `connectUser` runs.
      connectVariantRef.current = variant;
      // Raised before the call on purpose: the token provider above refuses to sign a token
      // while this is false.
      setIsMockUserConnected(true);
      setIsConnectingUser(true);
      try {
        await Octopus.connectUser({
          userId: overrides?.userId ?? config?.userId ?? octopusUserId,
          profile: {
            username: overrides?.nickname ?? 'John Doe',
            profilePicture: 'https://i.pravatar.cc/150',
          },
        });
        debugLog.apiCall(
          'connectUser',
          `✓ connected (${ENTITLEMENT_LABELS[variant]})`
        );
        return null;
      } catch (error) {
        // A refused connection leaves the user anonymous in the community, so undo the
        // optimistic flag instead of showing them as connected.
        setIsMockUserConnected(false);
        console.error('Octopus connectUser failed', error);
        const message = Octopus.isConnectUserError(error)
          ? `connectUser failed — ${error.code}: ${error.message}`
          : `connectUser failed — ${String(error)}`;
        debugLog.apiCall('connectUser', `✕ ${message}`);
        return message;
      } finally {
        setIsConnectingUser(false);
      }
    },
    [config?.userId]
  );

  // Used by the Settings tab. Unchanged behavior: a failure goes through the same transient
  // callback-message channel as the SDK's own listeners (editUser/loginRequired), which also
  // jumps the app to the Settings tab so the message is seen.
  const handleConnectUser = useCallback(async () => {
    const errorMessage = await connectUserCore('none');
    if (errorMessage) {
      showUserCallbackMessage(errorMessage);
    }
  }, [connectUserCore, showUserCallbackMessage]);

  // Used by the Scenarios tab. Deliberately does NOT go through showUserCallbackMessage:
  // that channel force-switches the active tab to Settings, which would navigate away from the
  // Scenarios screen before its connection-result panel could ever show the failure. The
  // outcome is captured locally instead, for that panel to render directly.
  const handleConnectUserForScenarios = useCallback(
    async (
      variant: EntitlementVariant,
      overrides?: { userId?: string; nickname?: string }
    ) => {
      const errorMessage = await connectUserCore(variant, overrides);
      setConnectionError(errorMessage);
      if (errorMessage) throw new Error(errorMessage);
    },
    [connectUserCore]
  );

  // Used by the Scenarios tab. Rethrows so the connection-result panel there can render
  // the failure directly, mirroring `handleConnectUserForScenarios` above.
  const handleDisconnectUserForScenarios = useCallback(async () => {
    setIsMockUserConnected(false);
    setConnectionError(null);
    try {
      await Octopus.disconnectUser();
      debugLog.apiCall('disconnectUser', 'disconnected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setConnectionError(message);
      debugLog.apiCall('disconnectUser', `failed — ${message}`);
      throw err;
    }
  }, []);

  // Used by the Settings tab and by `handleReconfigure`, both of which call this
  // fire-and-forget: absorbs the error (already recorded in `connectionError` above)
  // instead of rejecting, so neither caller needs an unhandled-rejection handler.
  const handleDisconnectUser = useCallback(async () => {
    await handleDisconnectUserForScenarios().catch(() => {});
  }, [handleDisconnectUserForScenarios]);

  /** Start on the Config screen: hold the config, let the init effect above run. */
  const handleStart = useCallback(
    (next: DemoConfig) => {
      setInitError(null);
      setConfigRequest(null);
      setActiveTab('home');
      handleThemeModeChange(next.theme);
      setRestoredConfig(null);
      // A config coming out of the Config screen names the community itself, so any earlier
      // runtime switch is over — kept, it would outrank the answer just given.
      setSwitchedCommunity(null);
      setConfig(next);
      // Not awaited: the run must not wait on device storage, and the write is
      // best-effort by design — it logs its own failure and swallows it.
      // Not written at all on a production build: the launch restore erases it
      // unread, so persisting there only leaves a config blob on a device that
      // reaches client communities.
      if (!octopusIsProdServer) persistDemoConfig(next);
    },
    [handleThemeModeChange]
  );

  // Launch restore. Runs once, before anything is on screen: `config` starts null, so
  // without this the app would show the Config screen for a session it could resume.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A build that names the production backend never auto-restores. Both flavors
      // share an application id, so a demo build's blob is still sitting in the same
      // store after a demo→prod reinstall — this mirrors the Android sample's
      // `SampleApplication`, which erases a persisted env on a `prod`-flavor launch
      // regardless of which flavor wrote it. Reaching a client-facing backend must
      // take passing the Config screen, banner included, every time.
      if (octopusIsProdServer) {
        await clearPersistedDemoConfig();
        if (!cancelled) setIsRestoringConfig(false);
        debugLog.apiCall(
          'restoreConfig',
          'production build — persisted config erased, starting blank'
        );
        return;
      }
      const restored = await loadPersistedDemoConfig();
      if (cancelled) return;
      if (restored === null) {
        setIsRestoringConfig(false);
        return;
      }
      // Only auto-start a config that still resolves to a key. A `custom` one never
      // does — the pasted key isn't persisted — and starting it would re-enter the SDK
      // on an empty key, which resolves and then fails every later call. Land on the
      // Config screen seeded with the restored choices instead.
      if (resolveApiKey(restored) === '') {
        setRestoredConfig(restored);
        // The screen the user lands on is seeded with the restored choices, so it has
        // to *look* like them too: the Theme picker shows the restored appearance, and
        // without this the screen would still render in the system one.
        handleThemeModeChange(restored.theme);
        // Last, so the Config screen never mounts before its seed exists: it reads
        // `restoredConfig` from `useState` initializers, which run on the first render
        // only. Ordering, not batching, is what makes that safe.
        setIsRestoringConfig(false);
        debugLog.apiCall(
          'restoreConfig',
          'restored a config with no resolvable key — asking for it'
        );
        return;
      }
      handleStart(restored);
      setIsRestoringConfig(false);
      debugLog.apiCall('restoreConfig', 'restored the previous session');
    })().catch((e) => {
      // The one path in this app that repeats itself on every cold start: whatever it
      // throws, it throws again on the next launch, so an unhandled rejection here is a
      // crash-loop and not an incident (issue #257). Land on a blank Config screen
      // instead — the state the app would be in with nothing persisted at all — and say
      // so where a tester can read it.
      if (cancelled) return;
      setIsRestoringConfig(false);
      debugLog.apiCall(
        'restoreConfig',
        `failed — starting blank (${e instanceof Error ? e.message : String(e)})`
      );
    });
    return () => {
      cancelled = true;
    };
  }, [handleStart, handleThemeModeChange]);

  /**
   * Back to the Config screen from Settings.
   *
   * Without this the gate is one-way: a wrong key, or the wrong auth mode, could only be
   * corrected by killing the process. Re-initializing in place is what the theme controls
   * already do on every change, and the native SDK stops and rebuilds itself when
   * `initialize` is called again.
   *
   * Forgets the persisted config too, so a kill from here starts blank rather than
   * auto-restoring the configuration the user just walked out of — while the screen
   * itself is still seeded with it, so only what changes has to be re-answered.
   */
  const handleReconfigure = useCallback(async () => {
    // Awaited: a disconnect still in flight while the next `initialize` runs would
    // race the SDK teardown it is part of. A failed disconnect is not fatal to
    // reconfiguring — `handleDisconnectUser` already recorded the failure in
    // `connectionError` (cleared below) and is fire-and-forget, so it never rejects.
    if (isMockUserConnected) {
      await handleDisconnectUser();
    }
    setIsInitializationTriggered(false);
    setInitError(null);
    setConnectionError(null);
    // Streamed values belong to the SDK instance being torn down: kept, they would be
    // read on Home as if they described the next one.
    setHasAccessToCommunity(null);
    setNotSeenNotificationsCount(0);
    setPushToken(null);
    // Outcomes of calls made on the instance being torn down.
    setLocaleOverrideError(null);
    // `communityLocaleOverride` is deliberately NOT cleared: the native override is
    // persisted (Android stores it in DataStore, so it outlives both a re-`initialize`
    // and the process), and showing "none" while it is still in force would be the lie.
    setActiveTab('home');
    setConfigMode('revisit');
    // Seeded with the community the session was actually on, switch included, so the screen
    // asks about the one being left rather than the one it was started on.
    setRestoredConfig(activeConfig);
    // Cleared before the screen is dropped: `setConfig(null)` renders the Config
    // screen, from which Start writes a fresh blob — a clear still in flight would
    // land after that write and erase the config the user just started.
    await clearPersistedDemoConfig();
    setConfig(null);
    // After `setConfig(null)`, never before: dropping the switch while `config` still
    // holds the pre-switch object would have Home and Settings name the community the
    // session started on for as long as the storage clear above takes.
    setSwitchedCommunity(null);
    debugLog.apiCall('reconfigure', 'back to the Config screen');
  }, [activeConfig, isMockUserConnected, handleDisconnectUser]);
  // A link that names one Config section: the request is set first, so the screen that
  // `handleReconfigure` brings up mounts with it. No need to clear it on the plain path —
  // `handleStart`, the only way out of Config, already did.
  const openConfigSection = useCallback(
    (section: ConfigSection) => {
      setConfigRequest((previous) => nextNavRequest(previous, section));
      handleReconfigure();
    },
    [handleReconfigure]
  );

  /**
   * Cancels a Settings → Change Configuration revisit, leaving the running session alone.
   *
   * Only reachable in `revisit` mode: `handleReconfigure` always seeds `restoredConfig`
   * with the config that was running before it tore the SDK down, so re-`handleStart`ing
   * that same object re-initializes the identical session rather than resuming the old
   * one in place — the closest this app bar back can get to "nothing happened", short of
   * never having called `initialize()` again at all.
   */
  const handleCancelReconfigure = useCallback(() => {
    if (restoredConfig === null) return;
    handleStart(restoredConfig);
    debugLog.apiCall('reconfigure', 'cancelled — resumed the previous session');
  }, [restoredConfig, handleStart]);

  /**
   * `refreshEntitlements()` — the session-preserving half of the pair Account offers.
   *
   * Where Reconnect re-runs `connectUser` and therefore re-enters the token provider,
   * this asks the SDK to re-read what the current session is entitled to. The result is
   * observed, not returned: the profile listener publishes the new entitlement list.
   */
  const handleRefreshEntitlements = useCallback(async () => {
    try {
      await Octopus.refreshEntitlements();
      debugLog.apiCall('refreshEntitlements', 'requested');
      showUserCallbackMessage('Entitlements refreshed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog.apiCall('refreshEntitlements', `failed — ${message}`);
      showUserCallbackMessage(`Refresh failed — ${message}`);
    }
  }, [showUserCallbackMessage]);

  /**
   * Danger zone: forget everything this sample saved and start over on the Config screen.
   *
   * Local only. `Octopus.reset()` disconnects and clears the SDK's own cached data; nothing
   * is deleted in the community itself, and the confirmation dialog says so. On top of that
   * it drops the sample's own selections, which `handleReconfigure` deliberately keeps —
   * that path is "change one answer", this one is "as if freshly installed".
   */
  const handleResetData = useCallback(async () => {
    try {
      await Octopus.reset();
      debugLog.apiCall('reset', 'sample data reset from Settings');
    } catch (err) {
      // Best-effort: the SDK may not be initialized at all, and the sample's own state
      // still has to be cleared either way.
      const message = err instanceof Error ? err.message : String(err);
      debugLog.apiCall('reset', `failed — ${message}`);
    }
    setIsMockUserConnected(false);
    setIsInitializationTriggered(false);
    setInitError(null);
    setConnectionError(null);
    setHasAccessToCommunity(null);
    setNotSeenNotificationsCount(0);
    setPushToken(null);
    setLocaleOverrideError(null);
    setConnectionState(null);
    setProfile(null);
    setSessionStartedAt(null);
    setSelectedThemeSet('none');
    handleThemeModeChange('system');
    setUrlOpeningMode('defaultBrowser');
    setProfileTapMode('sdkScreens');
    setDisplayMode('embed');
    setActiveTab('home');
    setConfigMode('onboarding');
    setRestoredConfig(null);
    setSwitchedCommunity(null);
    await clearPersistedDemoConfig();
    setConfig(null);
  }, [handleThemeModeChange]);

  /**
   * Scenarios → Lifecycle: re-target the running SDK at another community.
   *
   * Natively a reset + initialize, so everything the previous community's session held is
   * gone by the time this resolves — the state cleared below is the sample's own copy of it,
   * which would otherwise describe a community the SDK has left. Rejections propagate: the
   * scenario's Result panel is what reports them.
   */
  const handleSwitchCommunity = useCallback(
    async (target: SwitchCommunityTarget) => {
      if (config === null) {
        // Unreachable — Scenarios only mounts on a resolved config — but resolving here
        // would have the Result panel report a success for a switch that never ran.
        throw new Error('No configuration to switch from.');
      }
      // Cleared BEFORE the call, not after: both are fed by the unbuffered native event
      // channel, and the new community's first values can land while `switchCommunity` is
      // still in flight (on iOS the SDK re-registers its publishers inside it). Clearing
      // afterwards would overwrite them, and neither event has a getter or re-emits a
      // deduped value — the screen would stay blank for the rest of the session.
      setHasAccessToCommunity(null);
      setNotSeenNotificationsCount(0);
      await Octopus.switchCommunity({
        apiKey: target.key,
        connectionMode:
          config.authMode === 'octopus'
            ? { type: 'octopus' }
            : { type: 'sso', appManagedFields: ['profilePicture'] },
        apiServer: octopusApiServer,
      });
      setSwitchedCommunity(target);
      // Remounts every embedded view: they are bound to the community that was just left.
      setCommunitySessionNonce((n) => n + 1);
      setIsMockUserConnected(false);
      setConnectionError(null);
      setInitError(null);
      // A new SDK instance is a new session, and Home reports when it started.
      setSessionStartedAt(Date.now());
      // Same refusal as `handleStart`: nothing is written on a production build. A pasted key
      // is never persisted either — `configStorage` drops it — so a switch onto the free-text
      // fallback restores as "key needed", exactly like a pasted key from the Config screen.
      if (!octopusIsProdServer) {
        persistDemoConfig(applySwitchedCommunity(config, target));
      }
      // `switchCommunity` is a reset + initialize natively, so the push token registration
      // `setupOctopusPush` did against the previous community is gone with it — re-send the
      // token the sample already holds, directly, rather than calling `setupOctopusPush`
      // again: that would re-attach its onMessage/onTokenRefresh/onForegroundEvent handlers a
      // second time (pre-existing stacking issue, out of scope here).
      if (pushToken) {
        registerPushNotificationToken(pushToken).catch((err) =>
          console.error('Octopus push token re-registration error', err)
        );
      } else {
        debugLog.apiCall(
          'registerPushNotificationToken',
          'skipped — no push token yet'
        );
      }
      debugLog.apiCall('switchCommunity', `switched to ${target.label}`);
    },
    [config, pushToken]
  );

  const handleUpdateNotifications = useCallback(async () => {
    if (!isInitializationTriggered) return;
    try {
      await Octopus.updateNotSeenNotificationsCount();
      debugLog.apiCall(
        'updateNotSeenNotificationsCount',
        '✓ not-seen count refreshed'
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Update notification count failed', e);
      debugLog.apiCall('updateNotSeenNotificationsCount', `✕ ${message}`);
      throw e;
    }
  }, [isInitializationTriggered]);

  const handleCommunityLocaleOverrideChange = useCallback(
    async (mode: CommunityLocaleOverride) => {
      setCommunityLocaleOverride(mode);
      setLocaleOverrideError(null);
      try {
        if (mode === 'system') {
          await overrideDefaultLocale(null);
        } else {
          await overrideDefaultLocale({ languageCode: mode });
        }
        debugLog.apiCall('overrideDefaultLocale', `✓ ${mode}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Override default locale failed', e);
        setLocaleOverrideError(message);
        debugLog.apiCall('overrideDefaultLocale', `✕ ${message}`);
        throw e;
      }
    },
    []
  );

  const isDark = colorScheme === 'dark';
  // The host's own brand, never the color set handed to `initialize`: the Theme scenario
  // repaints the Octopus UI, and the sample's shell around it stays put — which is what an
  // integration actually looks like.
  const chrome = chromeColors(isDark);
  // Active-control FILL for switches/segments/spinners across the sample — the design
  // contract reserves `accent` (navy in light mode) for buttons and for ink, and keeps
  // this one blue per appearance. Its ink is `onControl`, not `onAccent`: white fails the
  // 4.5:1 floor on this fill in both themes.
  //
  // Fill only. A label or an icon on a light background never draws in it (3.50:1) — that
  // ink is `chrome.accent`, and the two must not be crossed: `onControl` belongs on a
  // `control` fill, `onAccent` on an `accent` fill.
  const primaryColor = chrome.control;
  const onPrimaryColor = chrome.onControl;
  const backgroundColor = chrome.background;
  // Every example-owned screen paints this at its root: transparent in dark, so the shell's
  // page colour and top-right halo show through (see `DarkHalo`).
  const screenColor = chrome.screen;
  const tabBarBg = chrome.navSurface;

  // A connectable demo user needs an injected token; the user id always has a fallback.
  const hasSsoUser = octopusUserTokens.none !== '';
  const isSsoAuth = config === null || config.authMode === 'sso';
  const debugInfoCards = useMemo(
    () =>
      activeConfig === null
        ? []
        : buildDebugInfoCards({
            sampleVersionLabel,
            sdkVersion: sampleVersion,
            build: sampleBuild,
            serverLabel: octopusServerLabel,
            host: octopusHostLabel,
            community: communityLabel(activeConfig),
            apiKeySource: apiKeySourceLabel(activeConfig),
            authMode: activeConfig.authMode,
            userId: activeConfig.userId,
            displayMode,
            urlOpeningMode,
            profileTapMode,
          }),
    [activeConfig, displayMode, urlOpeningMode, profileTapMode]
  );
  // What the SDK actually is, not merely what was attempted: a refused `initialize` — or
  // one the sample refused to make — leaves nothing initialized.
  const isSdkInitialized = isInitializationTriggered && initError === null;

  // Applies (or clears) the debug override as soon as the SDK is up and whenever the
  // toggle flips. `sessionStartedAt` is a dependency on purpose: a community switch or a
  // reconfigure re-initializes the SDK while `isSdkInitialized` never changes value, and
  // the native override does not survive a new SDK instance on iOS — this is what
  // re-applies it there.
  useEffect(() => {
    if (!isSdkInitialized) return;
    Octopus.debugOverrideExposeClientUserId(exposeClientUserIdOverride).catch(
      (err) => console.error('debugOverrideExposeClientUserId error', err)
    );
  }, [isSdkInitialized, exposeClientUserIdOverride, sessionStartedAt]);

  // The Scenarios choice: records it (the effect above re-applies it to every new SDK
  // instance) and applies it right away, so the section's read-out can re-read the
  // effective flag once the native side has it.
  const handleExposeClientUserIdOverrideChange = useCallback(
    async (next: ExposeClientUserIdOverride) => {
      setExposeClientUserIdOverride(next);
      if (!isSdkInitialized) return;
      try {
        await Octopus.debugOverrideExposeClientUserId(next);
        debugLog.apiCall(
          'debugOverrideExposeClientUserId',
          `✓ ${next === null ? 'backend value' : String(next)}`
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        debugLog.apiCall('debugOverrideExposeClientUserId', `✕ ${message}`);
      }
    },
    [isSdkInitialized]
  );
  const showTabBar = config !== null && isInitializationTriggered;
  // One app bar for the whole shell, so its title is the only thing that varies: the tab's
  // own name once the SDK is up, and "Configuration" for the one screen mounted at both
  // its pre-shell and Settings-revisit accesses — same title either way, per spec.
  const appBarTitle = showTabBar ? TAB_TITLES[activeTab] : 'Configuration';
  // Readable current values, not identifiers: these are what the configuration summary and
  // the Settings rows show, and both read them the same way.
  //
  // Reads the live `themeMode` state, not `config.theme` — the latter is a snapshot from
  // the moment Start (or the last Apply) ran, and every appearance change on the Theme
  // control after that only writes `themeMode` via `handleThemeModeChange`. Reading
  // `config.theme` here left this summary stale the instant a tester changed appearance
  // without re-running Config.
  const themeSummary = `${APPEARANCE_LABELS[themeMode ?? 'system']} · ${THEME_SET_LABELS[selectedThemeSet]}`;
  const languageSummary = COMMUNITY_LOCALE_LABELS[communityLocaleOverride];

  /**
   * Presents the community fullscreen.
   *
   * Awaited and caught on purpose: fired and forgotten, a rejection here is an unhandled
   * promise, no on-screen message and — from the tab bar, which deliberately does not
   * switch tabs in fullscreen mode — a tap that does nothing at all.
   */
  const openCommunityFullscreen = useCallback(async () => {
    try {
      await Octopus.openUI({
        interceptUrls: urlOpeningMode === 'inAppWebView',
        interceptProfileTaps: profileTapMode === 'appScreens',
      });
      debugLog.apiCall('openUI', '✓ presented fullscreen');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      debugLog.apiCall('openUI', `✕ ${message}`);
      showUserCallbackMessage(`openUI failed — ${message}`);
    }
  }, [urlOpeningMode, profileTapMode, showUserCallbackMessage]);

  /**
   * Shows the community embedded in the app, from Home's dock.
   *
   * Forces the display mode as well as switching tabs: the Community tab honours whichever
   * mode is selected, so from a fullscreen-mode build this button would otherwise present
   * fullscreen and contradict its own label.
   */
  const openCommunityEmbedded = useCallback(() => {
    setDisplayMode('embed');
    setActiveTab('community');
  }, []);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === 'community' && displayMode === 'fullscreen') {
        openCommunityFullscreen();
        return;
      }
      // A tab-bar visit is not a link: drop what the last link asked for.
      setSettingsRequest(null);
      setScenariosRequest(null);
      setActiveTab(tab);
    },
    [displayMode, openCommunityFullscreen]
  );

  const communityOwnsTopBar = showTabBar && activeTab === 'community';
  const communityColors = getCurrentThemeColors()?.[isDark ? 'dark' : 'light'];
  const communityBackground =
    communityColors && 'background' in communityColors
      ? communityColors.background
      : isDark
        ? '#000000'
        : '#FFFFFF';
  // The dark halo belongs to the example's own screens; the embedded native community
  // view draws its own surfaces, so the glow stops at its tab.
  const showHalo = isDark && !communityOwnsTopBar;
  // Dark: the page colour, under the halo, so the transparent header and the status-bar
  // strip glow as one surface. Light: the navy bar colour.
  const topBackground = communityOwnsTopBar
    ? communityBackground
    : isDark
      ? backgroundColor
      : chrome.appBar;

  // Android hardware / gesture Back. One listener for the whole sample; the screens register
  // their own sub-navigation with it (Settings pages, Scenario routes) and are asked first.
  // What is left is the shell: Config revisit → Cancel, a root tab → Home, and on Home the
  // press goes to the platform, which backgrounds the app (`MainActivity`).
  const canCancelConfig =
    config === null && configMode === 'revisit' && restoredConfig !== null;
  useHardwareBackListener();
  useHardwareBack('shell', () => {
    switch (
      resolveShellBack({
        isOnConfig: !isRestoringConfig && activeConfig === null,
        canCancelConfig,
        isShellVisible: showTabBar,
        activeTab,
      })
    ) {
      case 'cancelReconfigure':
        handleCancelReconfigure();
        return true;
      case 'goHome':
        setActiveTab('home');
        return true;
      case 'none':
        return false;
    }
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: topBackground }}
      edges={['top']}
    >
      {/* First child, so everything below paints over it: fixed to the window (it lives
          outside every ScrollView) and centred on its top-right corner. */}
      <DarkHalo visible={showHalo} />
      <SampleSystemBars
        statusBar={
          communityOwnsTopBar &&
          !isDebugVisible &&
          webViewUrl === null &&
          !isDark
            ? 'dark'
            : 'light'
        }
        isDark={isDark}
      />
      {!communityOwnsTopBar && (
        <SafeAreaView
          edges={['left', 'right']}
          style={{ backgroundColor: chrome.header }}
        >
          <AppBar
            title={appBarTitle}
            isDark={isDark}
            // Only the revisit access can go "back" — the pre-shell one has no running
            // session to return to, and `restoredConfig` is what Cancel resumes.
            onBack={canCancelConfig ? handleCancelReconfigure : undefined}
            backTestID="config-cancel-button"
          />
        </SafeAreaView>
      )}
      {/* Under the app bar but above every screen, Config included: the server a build talks
          to is a property of the build, so the warning is true before the SDK is started. */}
      <SafeAreaView edges={['left', 'right']}>
        <ProductionWarningBanner />
      </SafeAreaView>
      <View
        style={{
          flex: 1,
          backgroundColor: screenColor,
          paddingBottom: showTabBar ? 0 : insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        {isRestoringConfig ? (
          // Held rather than falling through to the Config screen: a resumable session
          // would otherwise flash the form for the length of one storage read.
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : activeConfig === null ? (
          <ConfigScreen
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            mode={configMode}
            initialConfig={restoredConfig}
            onStart={handleStart}
            sectionRequest={configRequest}
            themeSet={selectedThemeSet}
            onThemeSetChange={setSelectedThemeSet}
            urlOpeningMode={urlOpeningMode}
            onUrlOpeningModeChange={setUrlOpeningMode}
            profileTapMode={profileTapMode}
            onProfileTapModeChange={setProfileTapMode}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            isAuthRequiredCallbackEnabled={isAuthRequiredCallbackEnabled}
            onAuthRequiredCallbackEnabledChange={
              setIsAuthRequiredCallbackEnabled
            }
            isUnreadCountCallbackEnabled={isUnreadCountCallbackEnabled}
            onUnreadCountCallbackEnabledChange={setIsUnreadCountCallbackEnabled}
            isEventCallbackEnabled={isEventCallbackEnabled}
            onEventCallbackEnabledChange={setIsEventCallbackEnabled}
          />
        ) : !isInitializationTriggered ? (
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={[styles.loadingText, { color: chrome.textSecondary }]}>
              Initializing Octopus…
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                config={activeConfig}
                isDark={isDark}
                isInitialized={isSdkInitialized}
                initError={initError}
                connectionState={connectionState}
                clientUserId={profile?.clientUserId ?? null}
                entitlements={profile?.entitlements ?? []}
                hasFailedConnection={connectionError !== null}
                themeSummary={themeSummary}
                languageSummary={languageSummary ?? communityLocaleOverride}
                sessionStartedAt={sessionStartedAt}
                effectiveApiKey={
                  switchedCommunity?.key ?? resolveApiKey(activeConfig)
                }
                onEditConfig={handleReconfigure}
                onOpenCommunity={openCommunityFullscreen}
                onOpenEmbeddedCommunity={openCommunityEmbedded}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsScreen
                hasSsoUser={hasSsoUser}
                isSsoAuth={isSsoAuth}
                onReconfigure={handleReconfigure}
                onOpenConfigSection={openConfigSection}
                onOpenScenariosSection={openScenariosSection}
                onOpenDebug={openDebug}
                pageRequest={settingsRequest}
                isConnectingUser={isConnectingUser}
                isMockUserConnected={isMockUserConnected}
                isUserConnected={
                  connectionState?.connected === true &&
                  !connectionState.isGuest
                }
                isGuest={
                  connectionState?.connected === true && connectionState.isGuest
                }
                clientUserId={activeConfig.userId}
                entitlements={profile?.entitlements ?? []}
                communityLocaleOverride={communityLocaleOverride}
                onConnectUser={handleConnectUser}
                onDisconnectUser={handleDisconnectUser}
                onRefreshEntitlements={handleRefreshEntitlements}
                appearance={themeMode ?? 'system'}
                themeSet={selectedThemeSet}
                communitySummary={`${communityLabel(activeConfig)} · ${octopusServerLabel}`}
                onResetData={handleResetData}
                isDark={isDark}
                primaryColor={primaryColor}
                userCallbackMessage={userCallbackMessage}
              />
            )}
            {activeTab === 'scenarios' && (
              <ScenariosScreen
                isDark={isDark}
                primaryColor={primaryColor}
                onPrimaryColor={onPrimaryColor}
                interceptUrls={urlOpeningMode === 'inAppWebView'}
                interceptProfileTaps={profileTapMode === 'appScreens'}
                exposeClientUserIdOverride={exposeClientUserIdOverride}
                onExposeClientUserIdOverrideChange={
                  handleExposeClientUserIdOverrideChange
                }
                clientUserId={activeConfig.userId}
                isSsoAuth={isSsoAuth}
                onVerifyInCommunity={() => handleTabChange('community')}
                onOpenConfigSection={openConfigSection}
                sectionRequest={scenariosRequest}
                isMockUserConnected={isMockUserConnected}
                isConnectingUser={isConnectingUser}
                onConnectUser={handleConnectUserForScenarios}
                onDisconnectUser={handleDisconnectUserForScenarios}
                connectionError={connectionError}
                hasAccessToCommunity={hasAccessToCommunity}
                pushToken={pushToken}
                notSeenNotificationsCount={notSeenNotificationsCount}
                onRefreshNotifications={handleUpdateNotifications}
                communityLocaleOverride={communityLocaleOverride}
                onCommunityLocaleOverrideChange={
                  handleCommunityLocaleOverrideChange
                }
                localeOverrideError={localeOverrideError}
                themeMode={themeMode}
                onThemeModeChange={handleThemeModeChange}
                themeSet={selectedThemeSet}
                onThemeSetChange={setSelectedThemeSet}
                fontType={selectedFontType}
                onFontTypeChange={setSelectedFontType}
                logoMode={selectedLogoMode}
                onLogoModeChange={setSelectedLogoMode}
                fontSizeMode={selectedFontSizeMode}
                onFontSizeModeChange={setSelectedFontSizeMode}
                bottomInsetPreset={bottomInsetPreset}
                onBottomInsetPresetChange={setBottomInsetPreset}
                linkBackgroundMode={linkBackgroundMode}
                onLinkBackgroundModeChange={setLinkBackgroundMode}
                fontOverrideMode={fontOverrideMode}
                onFontOverrideModeChange={setFontOverrideMode}
                onSwitchCommunity={handleSwitchCommunity}
                activeCommunityLabel={communityLabel(activeConfig)}
                activeApiKeyId={
                  activeConfig.apiKeySource === 'custom'
                    ? null
                    : activeConfig.selectedKeyId
                }
                activeCustomApiKey={
                  activeConfig.apiKeySource === 'custom'
                    ? activeConfig.customApiKey
                    : null
                }
                communitySessionNonce={communitySessionNonce}
              />
            )}
            {activeTab === 'community' && (
              <CommunityScreen
                interceptUrls={urlOpeningMode === 'inAppWebView'}
                interceptProfileTaps={profileTapMode === 'appScreens'}
                isDark={isDark}
                initError={initError}
                onRetryInit={handleRetryInit}
                // A guest session is connected and still read-only, so the degraded band
                // has to survive it: `connected` alone would hide the band in exactly the
                // state it exists for. Same expression Settings reads.
                isUserConnected={
                  connectionState?.connected === true &&
                  !connectionState.isGuest
                }
                isSsoAuth={isSsoAuth}
                onConnectUser={() => openSettingsPage('account')}
                communitySessionNonce={communitySessionNonce}
              />
            )}
          </>
        )}
        {/* Last child of the content area, so it floats over every screen but always above
            the tab bar, which is a sibling below this view. Without the tab bar (Config,
            before the shell is up) the content area runs to the bottom of the window —
            the root only pads the top edge — so the offset has to clear the system bar
            itself. */}
        <AppUpdateSnackbar
          isDark={isDark}
          bottomOffset={showTabBar ? 8 : insets.bottom + 8}
        />
      </View>

      {showTabBar && (
        <View
          style={{
            width: '100%',
            backgroundColor: tabBarBg,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: chrome.border,
          }}
        >
          <TabBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            badgeRingColor={chrome.navSurface}
            activeColor={chrome.navActive}
            inactiveColor={chrome.navInactive}
            indicatorColor={chrome.navIndicator}
            notSeenNotificationsCount={notSeenNotificationsCount}
          />
        </View>
      )}

      {/* Debug console: a modal, not a tab — the shared catalog names exactly four tabs and
          opens the console from `debug-open-button`. */}
      <Modal
        visible={isDebugVisible}
        animationType="slide"
        onRequestClose={() => setIsDebugVisible(false)}
        statusBarTranslucent
        // Keep status-bar ownership with the sample root controller on iOS.
        presentationStyle="overFullScreen"
      >
        {/* Same header shape as the WebView modal below: a `SafeAreaView` inside a Modal
            does not receive the top inset on iOS, so the bar slid under the status bar and
            its back button became untappable. Paint the inset by hand from `insets.top`. */}
        <View style={[styles.modalRoot, { backgroundColor }]}>
          {/* Dark: the same halo as the shell — the console is an example-owned screen too. */}
          <DarkHalo visible={isDark} />
          <View
            style={{
              backgroundColor: chrome.header,
              paddingTop: insets.top,
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <AppBar
              title={debugView === 'info' ? 'Debug info' : 'Events log'}
              isDark={isDark}
              onBack={() => setIsDebugVisible(false)}
              backTestID="debug-close-button"
            />
          </View>
          {/* Repeated here: a modal renders in its own window, above the banner the
              screens below carry, so without this the console is the one place that
              does not say which server the build talks to. */}
          <View
            style={{
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <ProductionWarningBanner />
          </View>
          {/* The safe area is painted in the bar's background color, so the screen itself
              carries the page background — and the bottom inset as padding, which keeps the
              last log row clear of the home indicator without tinting that strip. */}
          <View
            style={{
              flex: 1,
              backgroundColor: screenColor,
              paddingBottom: insets.bottom,
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <DebugScreen
              isDark={isDark}
              primaryColor={primaryColor}
              onPrimaryColor={onPrimaryColor}
              isInitialized={isSdkInitialized}
              isUserConnected={isMockUserConnected}
              hasAccessToCommunity={hasAccessToCommunity}
              notSeenNotificationsCount={notSeenNotificationsCount}
              pushToken={pushToken}
              view={debugView}
              infoCards={debugInfoCards}
              onOpenHostCallbacks={() => {
                setIsDebugVisible(false);
                openConfigSection('integration');
              }}
            />
          </View>
        </View>
      </Modal>

      {/* The host's own profile screen, pushed by a Unified Profile tap from any surface
          (Community tab, embedded preview, fullscreen). */}
      <Modal
        visible={hostProfileClientUserId !== null}
        animationType="slide"
        onRequestClose={() => setHostProfileClientUserId(null)}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={[styles.modalRoot, { backgroundColor }]}>
          <View
            style={{
              backgroundColor: chrome.appBar,
              paddingTop: insets.top,
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <AppBar
              title="Client profile (host app)"
              isDark={isDark}
              onBack={() => setHostProfileClientUserId(null)}
              backTestID="clientProfile-back"
            />
          </View>
          {hostProfileClientUserId !== null && (
            <View
              style={{
                flex: 1,
                paddingBottom: insets.bottom,
                paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
                paddingRight: Platform.OS === 'ios' ? insets.right : 0,
              }}
            >
              <ClientProfileScreen
                isDark={isDark}
                clientUserId={hostProfileClientUserId}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* WebView overlay when URL is intercepted (works from any tab: Settings or Community embed/fullscreen) */}
      <Modal
        visible={webViewUrl !== null}
        animationType="slide"
        onRequestClose={onWebViewHardwareBack}
        statusBarTranslucent
        // Keep status-bar ownership with the sample root controller on iOS.
        presentationStyle="overFullScreen"
      >
        <View style={[styles.modalRoot, { backgroundColor }]}>
          <View
            style={{
              backgroundColor: chrome.appBar,
              paddingTop: insets.top,
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <AppBar
              title="Web page"
              isDark={isDark}
              onBack={closeWebView}
              backTestID="webview-close-button"
            />
          </View>
          <View
            style={{
              paddingLeft: Platform.OS === 'ios' ? insets.left : 0,
              paddingRight: Platform.OS === 'ios' ? insets.right : 0,
            }}
          >
            <ProductionWarningBanner />
          </View>
          {webViewUrl !== null && (
            <WebView
              // A new URL is a new tab: remount so no history leaks from the previous one.
              key={webViewUrl}
              ref={webViewRef}
              source={{ uri: webViewUrl }}
              onNavigationStateChange={(navState) => {
                webViewCanGoBackRef.current = navState.canGoBack;
              }}
              style={{
                flex: 1,
                marginBottom: Platform.OS === 'ios' ? insets.bottom : 0,
                marginLeft: Platform.OS === 'ios' ? insets.left : 0,
                marginRight: Platform.OS === 'ios' ? insets.right : 0,
              }}
              onError={closeWebView}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  modalRoot: {
    flex: 1,
  },
});
