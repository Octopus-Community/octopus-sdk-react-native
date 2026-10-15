import { sampleTypography } from './theme/tokens';
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
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppBar } from './components/AppBar';
import { TabBar, START_TAB, type TabId } from './components/TabBar';
import { AppUpdateSnackbar } from './components/AppUpdateSnackbar';
import { chromeColors, OCTOPUS_SDK_THEME } from './theme/branding';
import { restoreThemeMode } from './theme/themeMode';
import { statusBarStyleForSurface } from './theme/statusBar';
import {
  getAppUpdateStatus,
  subscribeToAppUpdate,
  runAppUpdateCheck,
} from './update/appUpdateStore';
import { isAppUpdateSupported } from './update/appUpdate';
import { setupOctopusPush } from './push';
import {
  communityNavigationReducer,
  loadCommunityMode,
  persistCommunityMode,
} from './navigation/communityNavigation';
import { useModalDismissal } from './navigation/useModalDismissal';
import { pushInbox } from './navigation/pushInbox';
import { useCommunityPushRouting } from './navigation/useCommunityPushRouting';
import {
  CommunityPresentation,
  type CommunityPresentationMode,
} from './components/CommunityPresentation';
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
import { HostIntegrationPanel } from './screens/HostIntegrationPanel';
import { DebugConsoleSheet } from './components/DebugConsoleSheet';
import {
  SDK_LANGUAGES,
  loadSettingsPreferences,
  saveSettingsPreferences,
} from './config/settingsPreferences';
import {
  canPersistConfigServer,
  resolveConfigServer,
  settingsServerLabel,
} from './config/settingsServer';
import { handlesSampleUrl } from './config/hostIntegration';
import { SettingsOverview } from './components/SettingsOverview';
import { CommunityLaunchActions } from './components/CommunityLaunchActions';
import { ShellTabs } from './navigation/ShellTabs';
import {
  ScenariosScreen,
  type ScenarioTopBarOwner,
} from './screens/ScenariosScreen';
import { ClientProfileScreen } from './screens/ClientProfileScreen';
import { SignInScreen } from './screens/SignInScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { useHostScreens } from './navigation/useHostScreens';
import {
  buildHostUserConnection,
  canSaveHostProfile,
  DEFAULT_APP_MANAGED_FIELDS,
  type HostProfile,
  type HostUser,
  type HostUserOverrides,
} from './auth/hostUser';
import { HostScreenModal } from './components/HostScreenModal';
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
  formatRedactedError,
  maskApiKey,
  redactApiKeys,
  rememberApiKey,
} from './config/apiKeyMask';
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
 * A minimal `theme.icons` override, sent with the custom logo: three tinted glyphs replacing the
 * post's "comment" action, "more actions" and "clear text" buttons, plus the custom logo on empty lists.
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
    clearText: Image.resolveAssetSource(
      require('../assets/images/icon-clear-text.png')
    ),
    moreActions: Image.resolveAssetSource(
      require('../assets/images/icon-more.png')
    ),
  },
};

/** App bar title per tab — the tab's own label, so the bar never contradicts the bar below. */
const TAB_TITLES: Record<TabId, string> = {
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
  const effectiveApiKey = useMemo(
    () =>
      switchedCommunity?.key ??
      (activeConfig === null ? '' : resolveApiKey(activeConfig)),
    [activeConfig, switchedCommunity]
  );
  // Which of the Config screen's two accesses is showing. One screen, two consequences:
  // "Start SDK" before the shell exists, "Apply" when Settings sent the user back to it.
  const [configMode, setConfigMode] = useState<ConfigScreenMode>('onboarding');
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const applyingConfig = useRef(false);
  // True while the launch restore is still in flight. The app holds a splash for that
  // window so a saved session doesn't flash the Config screen on its way in.
  const [isRestoringConfig, setIsRestoringConfig] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  // Bumped by the Community tab's blocking band. `initialize()` is idempotent and the effect
  // below already re-runs on every theme change, so a nonce in its deps is the whole of Retry
  // — there is no separate retry path to keep in step with the normal one.
  const [initNonce, setInitNonce] = useState(0);
  const [isSdkInitializing, setIsSdkInitializing] = useState(false);
  const handleRetryInit = useCallback(() => {
    setIsSdkInitializing(true);
    setInitError(null);
    setInitNonce((n) => n + 1);
    debugLog.apiCall('initialize', 'retry requested from the Community tab');
  }, []);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const FeedbackSheet = sampleSupport.FeedbackSheet;
  // Which of Developer tools' two destinations the modal shows. Kept apart from visibility
  // so the view does not flip to its default while the modal slides out.
  const [debugView, setDebugView] = useState<DebugView>('events');
  const openDebug = useCallback((view: DebugView) => {
    setDebugView(view);
    setIsDebugVisible(true);
  }, []);
  const [isInitializationTriggered, setIsInitializationTriggered] =
    useState(false);
  const [isSdkSessionReady, setIsSdkSessionReady] = useState(false);
  const [isConnectingUser, setIsConnectingUser] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const [selectedThemeSet, setSelectedThemeSet] =
    useState<ThemeSet>('octopusNavy');
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
  const [communityPresentation, setCommunityPresentation] = useState<
    'modal' | 'sheet' | null
  >(null);
  const closeCommunityPresentation = useCallback(
    () => setCommunityPresentation(null),
    []
  );
  const communityPresentationDismissal = useModalDismissal(
    communityPresentation !== null,
    closeCommunityPresentation
  );
  const [scenarioTopBar, setScenarioTopBar] =
    useState<ScenarioTopBarOwner>('shell');
  const [activeTab, setActiveTab] = useState<TabId>(START_TAB);
  const communityReturnTab = useRef<TabId>(START_TAB);
  useEffect(() => {
    if (activeTab !== 'community') communityReturnTab.current = activeTab;
  }, [activeTab]);
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
      sampleSupport.breadcrumb = 'Community';
    }
  }, [activeTab]);

  const [hasAccessToCommunity, setHasAccessToCommunity] = useState<
    boolean | null
  >(null);
  const [isMockUserConnected, setIsMockUserConnected] = useState(false);
  // What the SDK itself reports, as opposed to what the sample last asked for: `null` until
  // the first value crosses the bridge, which is a third state Settings has to be able to show.
  const [connectionState, setConnectionState] =
    useState<Octopus.OctopusConnectionState | null>(null);
  const [profile, setProfile] = useState<Octopus.OctopusProfile | null>(null);
  // When `initialize()` last resolved — the session's start, which Settings reports.
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
    useState<UrlOpeningMode>('sampleRule');
  const [profileTapMode, setProfileTapMode] =
    useState<ProfileTapMode>('appScreens');
  // Debug-only: the `exposeClientUserId` community flag (Unified Profile activation)
  // through `debugOverrideExposeClientUserId` — `null` follows the backend, `true`/`false`
  // force it. Driven from Scenarios › Sign-in & user › Unified Profile, applied live.
  // Session-only, like on Android — never persisted.
  const [exposeClientUserIdOverride, setExposeClientUserIdOverride] =
    useState<ExposeClientUserIdOverride>(null);
  const [hostUser, setHostUser] = useState<HostUser | null>(null);
  const [appManagedFields, setAppManagedFields] = useState<
    Octopus.UserProfileField[]
  >(DEFAULT_APP_MANAGED_FIELDS);
  const [hostError, setHostError] = useState<string | null>(null);
  const [isAuthRequiredCallbackEnabled, setIsAuthRequiredCallbackEnabled] =
    useState(true);
  const [isUnreadCountCallbackEnabled, setIsUnreadCountCallbackEnabled] =
    useState(true);
  // Record SDK events by default, matching Android’s session Events log.
  const [isEventCallbackEnabled, setIsEventCallbackEnabled] = useState(true);
  const [isEditCallbackEnabled, setIsEditCallbackEnabled] = useState(true);
  const [communityNavigation, dispatchCommunityNavigation] = useReducer(
    communityNavigationReducer,
    {
      mode: 'embed',
      session: 0,
      generation: 0,
      target: null,
    }
  );
  const displayMode: DisplayMode = communityNavigation.mode;
  const sessionGeneration = useRef(0);
  const invalidateCommunitySession = useCallback(() => {
    const session = ++sessionGeneration.current;
    setCommunitySessionNonce(session);
    dispatchCommunityNavigation({ type: 'session', session });
  }, []);
  const [isRestoringCommunityMode, setIsRestoringCommunityMode] =
    useState(true);
  const setDisplayMode = useCallback((mode: DisplayMode) => {
    dispatchCommunityNavigation({ type: 'mode', mode });
    persistCommunityMode(mode);
  }, []);
  useEffect(() => {
    let mounted = true;
    loadCommunityMode().then((mode) => {
      if (!mounted) return;
      dispatchCommunityNavigation({ type: 'mode', mode });
      setIsRestoringCommunityMode(false);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    setupOctopusPush({ onToken: setPushToken }).then((cleanup) => {
      if (mounted) unsubscribe = cleanup;
      else cleanup();
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);
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
   * user", and the only page that renders the message. The text must say what the SDK
   * asked and what to do next: a bare listener
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
  const bottomSafeAreaInset =
    bottomInsetPreset === 'unset'
      ? undefined
      : BOTTOM_INSET_VALUES[bottomInsetPreset];

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
   * the host Appearance override and SDK setThemeMode would leave the picker, chrome
   * and embedded community rendering different appearances.
   *
   * Storage readers validate persisted choices before they reach this callback.
   * `restoreThemeMode` keeps its defensive validation and apply guard, never throws,
   * and returns the mode actually in effect — which is what the picker is set from,
   * so the control can never show an appearance that was refused.
   */
  const handleThemeModeChange = useCallback((mode: ThemeMode) => {
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

  // SDK events are recorded by default for the Events log and Debug console,
  // matching Android’s collection from SDK initialization onward.
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
    if (urlOpeningMode === 'defaultBrowser') return;
    const subscription = Octopus.addNavigateToUrlListener(async (url) => {
      if (!handlesSampleUrl(urlOpeningMode, url))
        return UrlOpeningStrategy.handledByOctopus;
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
      debugLog.state(
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
      debugLog.state(
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
    let disposed = false;
    setIsSdkSessionReady(false);
    setIsSdkInitializing(true);
    // A runtime switch outranks the config: this effect re-runs on every theme change, and
    // re-resolving from `config` there would silently drag the session back to the community
    // it started on the next time an appearance control moved.
    const apiKey = switchedCommunityRef.current?.key ?? resolveApiKey(config);
    if (apiKey === '') {
      // Defence in depth behind the Config screen's Start gate. `initialize` would
      // resolve here: the Android bridge only rejects a `null` key and neither native
      // SDK validates the value, so a keyless start would report "Initialized" while
      // every call failed. Refuse instead, and say so where Settings can render it.
      const message =
        'No API key resolved. Set OCTOPUS_COMMUNITY_API_KEY in example/.env, or paste a key on the Config screen.';
      setInitError(message);
      setIsSdkInitializing(false);
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
      apiKey: rememberApiKey(apiKey),
      connectionMode: { type: 'sso', appManagedFields },
      // `unset` must drop the key rather than send `0`: on Android, an absent
      // `bottomSafeAreaInset` now resolves the inset from where <OctopusUIView> is mounted
      // (issue #120), while an explicit `0` opts back out of that resolution.
      ...(bottomSafeAreaInset !== undefined && { ui: { bottomSafeAreaInset } }),
      ...(theme && { theme }),
      // The whole server story of this sample: the published native SDKs are pinned
      // to production, and this is what reroutes them (issue #188). Always sent —
      // a build that declares no OCTOPUS_API_HOST resolves to the demo backend, so
      // there is no case left where the SDK falls back to its production default.
      apiServer: resolveConfigServer(config),
    })
      .then(() => {
        if (disposed) return;
        invalidateCommunitySession();
        setIsSdkSessionReady(true);
        setInitError(null);
        setIsInitializationTriggered(true);
        setSessionStartedAt(Date.now());
        debugLog.apiCall('initialize', 'SDK initialized');
      })
      .catch((err) => {
        if (disposed) return;
        const message = redactApiKeys(
          err instanceof Error ? err.message : String(err)
        );
        console.error('Octopus init error', formatRedactedError(err));
        setInitError(message);
        // The shell opens anyway: Settings is what reports the failure, and Settings' "Back
        // to Config" is the way out — more useful than a dead-end Config screen.
        setIsInitializationTriggered(true);
        debugLog.apiCall('initialize', `failed — ${message}`);
      })
      .finally(() => {
        if (!disposed) setIsSdkInitializing(false);
      });

    return () => {
      disposed = true;
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
    showUserCallbackMessage,
    initNonce,
    appManagedFields,
    invalidateCommunitySession,
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
      overrides?: HostUserOverrides
    ): Promise<string | null> => {
      // Set before the call: the token provider reads it while `connectUser` runs.
      connectVariantRef.current = variant;
      // Raised before the call on purpose: the token provider above refuses to sign a token
      // while this is false.
      setIsMockUserConnected(true);
      setIsConnectingUser(true);
      try {
        const { payload, connectedUser } = buildHostUserConnection(
          config?.userId ?? octopusUserId,
          hostUser,
          overrides,
          appManagedFields
        );
        await Octopus.connectUser(payload);
        setHostUser(connectedUser);
        debugLog.apiCall(
          'connectUser',
          `✓ connected (${ENTITLEMENT_LABELS[variant]})`
        );
        return null;
      } catch (error) {
        // A refused connection leaves the user anonymous in the community, so undo the
        // optimistic flag instead of showing them as connected.
        setIsMockUserConnected(false);
        setHostUser(null);
        console.error('Octopus connectUser failed', formatRedactedError(error));
        const message = redactApiKeys(
          Octopus.isConnectUserError(error)
            ? `connectUser failed — ${error.code}: ${error.message}`
            : `connectUser failed — ${String(error)}`
        );
        debugLog.apiCall('connectUser', `✕ ${message}`);
        return message;
      } finally {
        setIsConnectingUser(false);
      }
    },
    [config?.userId, hostUser, appManagedFields]
  );

  // Settings failures retain the transient banner on the Account page.
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
    setHostUser(null);
    setConnectionError(null);
    try {
      await Octopus.disconnectUser();
      debugLog.apiCall('disconnectUser', 'disconnected');
    } catch (err) {
      const message = redactApiKeys(
        err instanceof Error ? err.message : String(err)
      );
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

  const handleRestartHostIntegration = useCallback(
    async (fields: Octopus.UserProfileField[]) => {
      const fieldsChanged =
        fields.length !== appManagedFields.length ||
        fields.some((field) => !appManagedFields.includes(field));
      if (fieldsChanged) {
        setIsSdkInitializing(true);
        try {
          await handleDisconnectUserForScenarios();
        } catch (error) {
          setIsSdkInitializing(false);
          showUserCallbackMessage(redactApiKeys(String(error)));
          return;
        }
        setAppManagedFields(fields);
      }
      handleRetryInit();
    },
    [
      appManagedFields,
      handleDisconnectUserForScenarios,
      handleRetryInit,
      showUserCallbackMessage,
    ]
  );

  /** Start on the Config screen: hold the config, let the init effect above run. */
  const handleStart = useCallback(
    (next: DemoConfig, preset?: ThemeSet) => {
      setInitError(null);
      setConfigRequest(null);
      handleThemeModeChange(next.theme);
      if (preset) setSelectedThemeSet(preset);
      setRestoredConfig(null);
      // A config coming out of the Config screen names the community itself, so any earlier
      // runtime switch is over — kept, it would outrank the answer just given.
      setSwitchedCommunity(null);
      setConfig(next);
      // Not awaited: the run must not wait on device storage, and the write is
      // best-effort by design — it logs its own failure and swallows it.
      // A runtime server override is session-only; restore must use the same build endpoint.
      // Not written at all on a production build: the launch restore erases it
      // unread, so persisting there only leaves a config blob on a device that
      // reaches client communities.
      if (canPersistConfigServer(next)) persistDemoConfig(next);
      else clearPersistedDemoConfig();
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
      const preferences = await loadSettingsPreferences();
      if (cancelled) return;
      if (preferences) {
        handleThemeModeChange(preferences.appearance);
        setSelectedThemeSet(preferences.themeSet);
        try {
          await overrideDefaultLocale(
            preferences.language === 'system'
              ? null
              : { languageCode: preferences.language }
          );
          if (!cancelled) setCommunityLocaleOverride(preferences.language);
        } catch {
          debugLog.apiCall('restoreSettings', 'language override unavailable');
        }
      }
      const saved = await loadPersistedDemoConfig();
      const restored =
        saved && preferences
          ? { ...saved, theme: preferences.appearance }
          : saved;
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
        `failed — starting blank (${redactApiKeys(e instanceof Error ? e.message : String(e))})`
      );
    });
    return () => {
      cancelled = true;
    };
  }, [handleStart, handleThemeModeChange]);

  /** Opening the draft does not change the running SDK or the saved configuration. */
  const handleReconfigure = useCallback(() => {
    setConfigMode('revisit');
    setRestoredConfig(
      activeConfig ? { ...activeConfig, theme: themeMode ?? 'system' } : null
    );
    setActiveTab('settings');
    setIsReconfiguring(true);
  }, [activeConfig, themeMode]);

  const handleHostUrlModeChange = useCallback(
    (next: UrlOpeningMode) => {
      if (next === urlOpeningMode) return;
      setUrlOpeningMode(next);
      dispatchCommunityNavigation({ type: 'refreshPresentation' });
    },
    [urlOpeningMode]
  );
  const handleHostProfileModeChange = useCallback(
    (next: ProfileTapMode) => {
      if (next === profileTapMode) return;
      setProfileTapMode(next);
      dispatchCommunityNavigation({ type: 'refreshPresentation' });
    },
    [profileTapMode]
  );

  const handleApplyConfiguration = async (
    next: DemoConfig,
    preset: ThemeSet
  ) => {
    if (applyingConfig.current) return;
    applyingConfig.current = true;
    setIsApplyingConfig(true);
    try {
      if (isMockUserConnected) await handleDisconnectUser();
      setIsInitializationTriggered(false);
      setIsSdkSessionReady(false);
      setConnectionError(null);
      setHasAccessToCommunity(null);
      setNotSeenNotificationsCount(0);
      setConnectionState(null);
      setProfile(null);
      handleStart(next, preset);
      setIsReconfiguring(false);
    } finally {
      applyingConfig.current = false;
      setIsApplyingConfig(false);
    }
  };

  const openConfigSection = useCallback(
    (section: ConfigSection) => {
      setConfigRequest((previous) => nextNavRequest(previous, section));
      handleReconfigure();
    },
    [handleReconfigure]
  );

  const handleCancelReconfigure = useCallback(() => {
    setIsReconfiguring(false);
    setRestoredConfig(null);
    setConfigRequest(null);
    debugLog.apiCall('reconfigure', 'cancelled — kept the running session');
  }, []);

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
      const message = redactApiKeys(
        err instanceof Error ? err.message : String(err)
      );
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
    setHostUser(null);
    try {
      await Octopus.reset();
      debugLog.apiCall('reset', 'sample data reset from Settings');
    } catch (err) {
      // Best-effort: the SDK may not be initialized at all, and the sample's own state
      // still has to be cleared either way.
      const message = redactApiKeys(
        err instanceof Error ? err.message : String(err)
      );
      debugLog.apiCall('reset', `failed — ${message}`);
    }
    setIsMockUserConnected(false);
    setIsInitializationTriggered(false);
    setInitError(null);
    setConnectionError(null);
    setHasAccessToCommunity(null);
    setNotSeenNotificationsCount(0);
    setLocaleOverrideError(null);
    setConnectionState(null);
    setProfile(null);
    setSessionStartedAt(null);
    setSelectedThemeSet('octopusNavy');
    setCommunityLocaleOverride('system');
    await overrideDefaultLocale(null).catch(() => {});
    await saveSettingsPreferences(null);
    handleThemeModeChange('system');
    setUrlOpeningMode('sampleRule');
    setProfileTapMode('sdkScreens');
    setDisplayMode('embed');
    setActiveTab('scenarios');
    setIsReconfiguring(false);
    setConfigMode('onboarding');
    setRestoredConfig(null);
    setSwitchedCommunity(null);
    await clearPersistedDemoConfig();
    setConfig(null);
    setAppManagedFields(DEFAULT_APP_MANAGED_FIELDS);
  }, [handleThemeModeChange, setDisplayMode]);

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
      setHostUser(null);
      setIsSdkSessionReady(false);
      await Octopus.switchCommunity({
        apiKey: rememberApiKey(target.key),
        connectionMode: { type: 'sso', appManagedFields },
        apiServer: resolveConfigServer(config),
      });
      setSwitchedCommunity(target);
      // Remounts every embedded view: they are bound to the community that was just left.
      invalidateCommunitySession();
      setIsSdkSessionReady(true);
      setIsMockUserConnected(false);
      setConnectionError(null);
      setInitError(null);
      // A new SDK instance is a new session, and Settings reports when it started.
      setSessionStartedAt(Date.now());
      // Same refusal as `handleStart`: nothing is written on a production build. A pasted key
      // is never persisted either — `configStorage` drops it — so a switch onto the free-text
      // fallback restores as "key needed", exactly like a pasted key from the Config screen.
      if (canPersistConfigServer(config)) {
        persistDemoConfig(applySwitchedCommunity(config, target));
      } else clearPersistedDemoConfig();
      // `switchCommunity` is a reset + initialize natively, so the push token registration
      // `setupOctopusPush` did against the previous community is gone with it — re-send the
      // token the sample already holds, directly, rather than calling `setupOctopusPush`
      // again: that would re-attach its onMessage/onTokenRefresh/onForegroundEvent handlers a
      // second time (pre-existing stacking issue, out of scope here).
      if (pushToken) {
        registerPushNotificationToken(pushToken).catch((err) =>
          console.error(
            'Octopus push token re-registration error',
            formatRedactedError(err)
          )
        );
      } else {
        debugLog.apiCall(
          'registerPushNotificationToken',
          'skipped — no push token yet'
        );
      }
      debugLog.apiCall('switchCommunity', `switched to ${target.label}`);
    },
    [config, pushToken, invalidateCommunitySession, appManagedFields]
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
      const message = redactApiKeys(e instanceof Error ? e.message : String(e));
      console.error('Update notification count failed', formatRedactedError(e));
      debugLog.apiCall('updateNotSeenNotificationsCount', `✕ ${message}`);
      throw e;
    }
  }, [isInitializationTriggered]);

  const languageWrite = useRef(Promise.resolve());
  const languageRequest = useRef(0);
  const handleCommunityLocaleOverrideChange = useCallback(
    (mode: CommunityLocaleOverride) => {
      const request = ++languageRequest.current;
      const apply = languageWrite.current.then(async () => {
        try {
          await overrideDefaultLocale(
            mode === 'system' ? null : { languageCode: mode }
          );
          setCommunityLocaleOverride(mode);
          if (request === languageRequest.current) setLocaleOverrideError(null);
          debugLog.apiCall('overrideDefaultLocale', `✓ ${mode}`);
        } catch (error) {
          const message = redactApiKeys(
            error instanceof Error ? error.message : String(error)
          );
          if (request === languageRequest.current)
            setLocaleOverrideError(message);
          debugLog.apiCall('overrideDefaultLocale', `✕ ${message}`);
          throw error;
        }
      });
      languageWrite.current = apply.catch(() => {});
      return apply;
    },
    []
  );
  useEffect(() => {
    if (isRestoringConfig) return;
    saveSettingsPreferences({
      appearance: themeMode ?? 'system',
      themeSet: selectedThemeSet,
      language: communityLocaleOverride,
    });
  }, [isRestoringConfig, themeMode, selectedThemeSet, communityLocaleOverride]);

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
  // Every sample-owned screen paints the flat page colour at its root.
  const screenColor = chrome.screen;
  const tabBarBg = chrome.navSurface;

  // A connectable demo user needs an injected token; the user id always has a fallback.
  const hasSsoUser = octopusUserTokens.none !== '';
  const debugInfoCards = useMemo(
    () =>
      activeConfig === null
        ? []
        : buildDebugInfoCards({
            sampleVersionLabel,
            sdkVersion: sampleVersion,
            build: sampleBuild,
            serverLabel: settingsServerLabel(
              resolveConfigServer(activeConfig).host
            ),
            host: resolveConfigServer(activeConfig).host,
            community: communityLabel(activeConfig),
            apiKeySource: apiKeySourceLabel(activeConfig, effectiveApiKey),
            userId: activeConfig.userId,
            displayMode,
            urlOpeningMode,
            profileTapMode,
            entitlements: profile?.entitlements ?? [],
            theme: `${THEME_SET_LABELS[selectedThemeSet]} · ${APPEARANCE_LABELS[themeMode ?? 'system']}`,
            language:
              SDK_LANGUAGES.find(
                (language) => language.value === communityLocaleOverride
              )?.label ?? communityLocaleOverride,
            maskedApiKey: maskApiKey(effectiveApiKey),
            editEnabled: isEditCallbackEnabled,
            loginEnabled: isAuthRequiredCallbackEnabled,
          }),
    [
      activeConfig,
      displayMode,
      urlOpeningMode,
      profileTapMode,
      profile,
      selectedThemeSet,
      themeMode,
      communityLocaleOverride,
      effectiveApiKey,
      isEditCallbackEnabled,
      isAuthRequiredCallbackEnabled,
    ]
  );
  // What the SDK actually is, not merely what was attempted: a refused `initialize` — or
  // one the sample refused to make — leaves nothing initialized.
  const isSdkInitialized =
    isInitializationTriggered && isSdkSessionReady && initError === null;
  useEffect(() => {
    if (!isSdkInitialized || !pushToken) return;
    registerPushNotificationToken(pushToken).catch((error) =>
      console.error(
        'Push token registration failed',
        formatRedactedError(error)
      )
    );
  }, [isSdkInitialized, pushToken, communitySessionNonce]);

  // Applies (or clears) the debug override as soon as the SDK is up and whenever the
  // toggle flips. `sessionStartedAt` is a dependency on purpose: a community switch or a
  // reconfigure re-initializes the SDK while `isSdkInitialized` never changes value, and
  // the native override does not survive a new SDK instance on iOS — this is what
  // re-applies it there.
  useEffect(() => {
    if (!isSdkInitialized) return;
    Octopus.debugOverrideExposeClientUserId(exposeClientUserIdOverride).catch(
      (err) =>
        console.error(
          'debugOverrideExposeClientUserId error',
          formatRedactedError(err)
        )
    );
  }, [isSdkInitialized, exposeClientUserIdOverride, sessionStartedAt]);

  // Record the Scenarios choice only after the native override succeeds. The effect
  // above re-applies the last confirmed choice to every new SDK instance.
  const handleExposeClientUserIdOverrideChange = useCallback(
    async (next: ExposeClientUserIdOverride) => {
      try {
        if (!isSdkInitialized)
          throw new Error('Initialize the SDK before changing the override.');
        await Octopus.debugOverrideExposeClientUserId(next);
        setExposeClientUserIdOverride(next);
        debugLog.apiCall(
          'debugOverrideExposeClientUserId',
          `✓ ${next === null ? 'backend value' : String(next)}`
        );
      } catch (e) {
        const message = redactApiKeys(
          e instanceof Error ? e.message : String(e)
        );
        debugLog.apiCall('debugOverrideExposeClientUserId', `✕ ${message}`);
        throw e;
      }
    },
    [isSdkInitialized]
  );
  const showTabBar =
    config !== null && isInitializationTriggered && !isReconfiguring;
  // One app bar for the whole shell, so its title is the only thing that varies: the tab's
  // own name once the SDK is up, and "Configuration" for the one screen mounted at both
  // its pre-shell and Settings-revisit accesses — same title either way, per spec.
  const [settingsAtRoot, setSettingsAtRoot] = useState(true);
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
  const languageSummary =
    SDK_LANGUAGES.find((language) => language.value === communityLocaleOverride)
      ?.label ?? COMMUNITY_LOCALE_LABELS[communityLocaleOverride];

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
        interceptUrls: urlOpeningMode !== 'defaultBrowser',
        interceptProfileTaps: profileTapMode === 'appScreens',
      });
      debugLog.apiCall('openUI', '✓ presented fullscreen');
    } catch (e) {
      const message = redactApiKeys(e instanceof Error ? e.message : String(e));
      debugLog.apiCall('openUI', `✕ ${message}`);
      showUserCallbackMessage(`openUI failed — ${message}`);
    }
  }, [urlOpeningMode, profileTapMode, showUserCallbackMessage]);

  const {
    screen: hostScreen,
    presentationId: hostPresentationId,
    onShow: onHostScreenShow,
    close: closeHostScreen,
    onDismiss: onHostScreenDismiss,
    dismissForPush: dismissHostForPush,
  } = useHostScreens({
    enabled: config !== null && isInitializationTriggered,
    fullscreen: displayMode === 'fullscreen',
    isScenariosPreview: activeTab === 'scenarios',
    authEnabled: isAuthRequiredCallbackEnabled,
    editEnabled: isEditCallbackEnabled,
    interceptProfiles: profileTapMode === 'appScreens',
    resumeFullscreen: openCommunityFullscreen,
    retainedCommunity:
      activeTab === 'community' || communityPresentation !== null,
  });
  const dismissHostScreen = () => {
    if (isConnectingUser) return;
    setHostError(null);
    closeHostScreen();
  };
  const submitHostUser = async (profileUpdate?: HostProfile) => {
    if (isConnectingUser) return;
    setHostError(null);
    const error = await connectUserCore(
      profileUpdate === undefined ? 'none' : connectVariantRef.current,
      profileUpdate === undefined
        ? undefined
        : { userId: hostUser?.userId, profile: profileUpdate }
    );
    setHostError(error);
    if (error === null) closeHostScreen();
  };

  /**
   * Shows the community embedded in the app, from Scenarios.
   *
   * Forces the display mode as well as switching tabs: the Community tab honours whichever
   * mode is selected, so from a fullscreen-mode build this button would otherwise present
   * fullscreen and contradict its own label.
   */
  const openCommunityEmbedded = useCallback(() => {
    setDisplayMode('embed');
    setActiveTab('community');
  }, [setDisplayMode]);

  const openScenarioPresentation = useCallback(
    (mode: CommunityPresentationMode) => {
      if (mode === 'modal' || mode === 'sheet') {
        setCommunityPresentation(mode);
        return;
      }
      communityReturnTab.current = 'scenarios';
      setDisplayMode(mode === 'tab' ? 'embed' : 'fullscreen');
      setActiveTab('community');
    },
    [setDisplayMode]
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === 'community' && activeTab === 'community') {
        dispatchCommunityNavigation({ type: 'retap' });
      }
      // A tab-bar visit is not a link: drop what the last link asked for.
      setSettingsRequest(null);
      setScenariosRequest(null);
      setActiveTab(tab);
    },
    [activeTab]
  );

  const hideDebug = useCallback(() => setIsDebugVisible(false), []);
  const debugDismissal = useModalDismissal(isDebugVisible, hideDebug);
  const webDismissal = useModalDismissal(webViewUrl !== null, closeWebView);
  const hideFeedback = useCallback(() => setIsFeedbackVisible(false), []);
  const feedbackDismissal = useModalDismissal(isFeedbackVisible, hideFeedback);
  useCommunityPushRouting({
    ready: isSdkInitialized && config !== null && !isRestoringCommunityMode,
    dismissPresentations: async () => {
      // Nested overlays leave first, then the host callback, then any SDK-owned demo.
      await Promise.all([
        debugDismissal.dismiss(),
        webDismissal.dismiss(),
        feedbackDismissal.dismiss(),
      ]);
      await dismissHostForPush();
      await communityPresentationDismissal.dismiss();
      await Octopus.closeUI().catch(() => {});
    },
    openTarget: (notification) => {
      dispatchCommunityNavigation({ type: 'push', notification });
      setActiveTab('community');
    },
  });
  const isCommunityFullscreen =
    showTabBar && activeTab === 'community' && displayMode === 'fullscreen';

  const updateStatus = useSyncExternalStore(
    subscribeToAppUpdate,
    getAppUpdateStatus
  );
  const communityOwnsTopBar =
    showTabBar &&
    (activeTab === 'community' ||
      (activeTab === 'scenarios' && scenarioTopBar === 'community'));
  const shellOwnsTopBar =
    !communityOwnsTopBar &&
    !(showTabBar && activeTab === 'settings' && !settingsAtRoot) &&
    !(showTabBar && activeTab === 'scenarios' && scenarioTopBar === 'sample');
  const communityOwnsStatusBar =
    communityOwnsTopBar || communityPresentation === 'modal';
  const communityColors = getCurrentThemeColors()?.[isDark ? 'dark' : 'light'];
  const communityBackground =
    communityColors && 'background' in communityColors
      ? communityColors.background
      : isDark
        ? '#000000'
        : '#FFFFFF';
  const topBackground = communityOwnsTopBar
    ? communityBackground
    : isDark
      ? backgroundColor
      : chrome.appBar;

  // Android hardware / gesture Back. One listener for the whole sample; the screens register
  // their own sub-navigation with it (Settings pages, Scenario routes) and are asked first.
  // What is left is the shell: Config revisit → Cancel, a root tab → Scenarios, and on Scenarios the
  // press goes to the platform, which backgrounds the app (`MainActivity`).
  const canCancelConfig =
    isReconfiguring && configMode === 'revisit' && restoredConfig !== null;
  useHardwareBackListener();
  useHardwareBack('shell', () => {
    if (isCommunityFullscreen) {
      setActiveTab(communityReturnTab.current);
      return true;
    }
    switch (
      resolveShellBack({
        isOnConfig:
          !isRestoringConfig && (activeConfig === null || isReconfiguring),
        canCancelConfig,
        isShellVisible: showTabBar,
        activeTab,
      })
    ) {
      case 'cancelReconfigure':
        handleCancelReconfigure();
        return true;
      case 'goScenarios':
        setActiveTab('scenarios');
        return true;
      case 'none':
        return false;
    }
  });

  const hostOverlays = (
    <>
      {FeedbackSheet && (
        <FeedbackSheet
          visible={isFeedbackVisible}
          isDark={isDark}
          onClose={hideFeedback}
          onDismiss={feedbackDismissal.onDismiss}
        />
      )}
      <DebugConsoleSheet
        visible={isDebugVisible && debugView === 'console'}
        onDismiss={debugDismissal.onDismiss}
        isDark={isDark}
        onClose={() => setIsDebugVisible(false)}
      />
      {/* Debug console: a modal, not a tab — the shared catalog names exactly three tabs and
          opens the console from `debug-open-button`. */}
      <Modal
        visible={isDebugVisible && debugView !== 'console'}
        onDismiss={debugDismissal.onDismiss}
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
            <ProductionWarningBanner
              isDark={isDark}
              host={resolveConfigServer(activeConfig).host}
            />
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
              connectionState={connectionState}
              hasAccessToCommunity={hasAccessToCommunity}
              notSeenNotificationsCount={notSeenNotificationsCount}
              pushToken={pushToken}
              view={debugView}
              infoCards={debugInfoCards}
              onOpenHostCallbacks={() => {
                setIsDebugVisible(false);
                setActiveTab('settings');
                setSettingsRequest((previous) =>
                  nextNavRequest(previous, 'integration')
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* WebView overlay when URL is intercepted (works from any tab: Settings or Community embed/fullscreen) */}
      <Modal
        visible={webViewUrl !== null}
        onDismiss={webDismissal.onDismiss}
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
            <ProductionWarningBanner
              isDark={isDark}
              host={resolveConfigServer(activeConfig).host}
            />
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
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: topBackground }}
      edges={['top']}
    >
      <SampleSystemBars
        statusBar={
          communityOwnsStatusBar &&
          !isDebugVisible &&
          webViewUrl === null &&
          hostScreen === null
            ? statusBarStyleForSurface(communityBackground, isDark)
            : isDark
              ? 'light'
              : 'dark'
        }
        isDark={isDark}
      />
      {shellOwnsTopBar && (
        <SafeAreaView
          edges={['left', 'right']}
          style={{ backgroundColor: chrome.header }}
        >
          <AppBar
            title={appBarTitle}
            onOpenDebug={() => openDebug('console')}
            size={
              showTabBar
                ? activeTab === 'settings'
                  ? 'large'
                  : 'medium'
                : 'small'
            }
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
        <ProductionWarningBanner
          isDark={isDark}
          host={resolveConfigServer(activeConfig).host}
        />
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
        {isRestoringConfig || isRestoringCommunityMode ? (
          // Held rather than falling through to the Config screen: a resumable session
          // would otherwise flash the form for the length of one storage read.
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : activeConfig === null || isReconfiguring ? (
          <ConfigScreen
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            mode={configMode}
            initialConfig={restoredConfig}
            onStart={
              configMode === 'revisit' ? handleApplyConfiguration : handleStart
            }
            applying={isApplyingConfig}
            unifiedProfileEnabled={exposeClientUserIdOverride === true}
            onOpenUnifiedProfile={() => {
              handleCancelReconfigure();
              openScenariosSection('sso');
            }}
            sectionRequest={configRequest}
            themeSet={selectedThemeSet}
            urlOpeningMode={urlOpeningMode}
            onUrlOpeningModeChange={handleHostUrlModeChange}
            profileTapMode={profileTapMode}
            onProfileTapModeChange={handleHostProfileModeChange}
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
          <ShellTabs
            activeTab={activeTab}
            settings={
              <SettingsScreen
                onTopBarChange={setSettingsAtRoot}
                serverLabel={`${settingsServerLabel(resolveConfigServer(activeConfig).host)} — ${resolveConfigServer(activeConfig).host}`}
                onAppearanceChange={handleThemeModeChange}
                onThemeSetChange={setSelectedThemeSet}
                onLanguageChange={handleCommunityLocaleOverrideChange}
                languageError={localeOverrideError}
                integration={
                  <HostIntegrationPanel
                    isDark={isDark}
                    displayMode={displayMode}
                    onDisplayModeChange={setDisplayMode}
                    profileTapMode={profileTapMode}
                    onProfileTapModeChange={handleHostProfileModeChange}
                    editEnabled={isEditCallbackEnabled}
                    onEditEnabledChange={setIsEditCallbackEnabled}
                    loginEnabled={isAuthRequiredCallbackEnabled}
                    onLoginEnabledChange={setIsAuthRequiredCallbackEnabled}
                    urlOpeningMode={urlOpeningMode}
                    onUrlOpeningModeChange={handleHostUrlModeChange}
                    appManagedFields={appManagedFields}
                    busy={isConnectingUser || isSdkInitializing}
                    onRestart={handleRestartHostIntegration}
                  />
                }
                overview={
                  <SettingsOverview
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
                    effectiveApiKey={effectiveApiKey}
                    onEditConfig={handleReconfigure}
                  />
                }
                hasSsoUser={hasSsoUser}
                onReconfigure={handleReconfigure}
                onOpenConfigSection={openConfigSection}
                onOpenScenariosSection={openScenariosSection}
                onOpenDebug={openDebug}
                onOpenFeedback={() => setIsFeedbackVisible(true)}
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
                communitySummary={communityLabel(activeConfig)}
                onResetData={handleResetData}
                isDark={isDark}
                primaryColor={primaryColor}
                userCallbackMessage={userCallbackMessage}
              />
            }
            scenarios={
              <ScenariosScreen
                onTopBarChange={setScenarioTopBar}
                onOpenDebug={() => openDebug('console')}
                launchActions={
                  <CommunityLaunchActions
                    isDark={isDark}
                    onEmbedded={openCommunityEmbedded}
                    onFullscreen={() => openScenarioPresentation('fullscreen')}
                    onModal={() => openScenarioPresentation('modal')}
                    onSheet={() => openScenarioPresentation('sheet')}
                  />
                }
                onOpenPresentation={openScenarioPresentation}
                isInitialized={isSdkInitialized}
                effectiveApiKey={effectiveApiKey}
                onRestartSdk={handleRetryInit}
                isSdkInitializing={isSdkInitializing}
                onStopSdk={async () => {
                  await Octopus.stop();
                  setIsSdkSessionReady(false);
                  setIsMockUserConnected(false);
                  setConnectionState(null);
                  setProfile(null);
                }}
                onResetSdk={async () => {
                  setHostUser(null);
                  await Octopus.reset();
                  setIsMockUserConnected(false);
                  setConnectionState(null);
                  setProfile(null);
                }}
                onUnifiedProfileChange={async (enabled) => {
                  await handleExposeClientUserIdOverrideChange(
                    enabled ? true : null
                  );
                  setProfileTapMode(enabled ? 'appScreens' : 'sdkScreens');
                }}
                isDark={isDark}
                primaryColor={primaryColor}
                onPrimaryColor={onPrimaryColor}
                interceptUrls={urlOpeningMode !== 'defaultBrowser'}
                interceptProfileTaps={profileTapMode === 'appScreens'}
                exposeClientUserIdOverride={exposeClientUserIdOverride}
                onExposeClientUserIdOverrideChange={
                  handleExposeClientUserIdOverrideChange
                }
                clientUserId={activeConfig.userId}
                onVerifyInCommunity={() => handleTabChange('community')}
                sectionRequest={scenariosRequest}
                isMockUserConnected={isMockUserConnected}
                connectionState={connectionState}
                profileClientUserId={profile?.clientUserId ?? null}
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
                onOpenCommunityNotification={async (notification) => {
                  await pushInbox.enqueue({
                    id: `sample-${Date.now()}-${Math.random()}`,
                    notification,
                  });
                }}
                communitySessionNonce={communitySessionNonce}
              />
            }
            community={
              <CommunityScreen
                interceptUrls={urlOpeningMode !== 'defaultBrowser'}
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
                onConnectUser={() => openSettingsPage('account')}
                communitySessionNonce={communityNavigation.generation}
                notification={communityNavigation.target}
                mode={displayMode}
                onBackRequested={() => setActiveTab(communityReturnTab.current)}
              />
            }
          />
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

      {showTabBar && !isCommunityFullscreen && (
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
            updateAvailable={updateStatus.kind === 'available'}
            isDark={isDark}
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

      <CommunityPresentation
        mode={communityPresentation}
        isDark={isDark}
        communityBackground={communityBackground}
        session={communitySessionNonce}
        interceptUrls={urlOpeningMode !== 'defaultBrowser'}
        interceptProfileTaps={profileTapMode === 'appScreens'}
        onClose={closeCommunityPresentation}
        onDismiss={communityPresentationDismissal.onDismiss}
        overlays={
          <HostScreenModal
            key={hostPresentationId}
            onShow={onHostScreenShow}
            visible={hostScreen !== null}
            onRequestClose={dismissHostScreen}
            onDismiss={onHostScreenDismiss}
            overlays={hostOverlays}
          >
            {hostScreen !== null && (
              <View
                style={[
                  styles.modalRoot,
                  {
                    backgroundColor,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                  },
                ]}
                accessibilityViewIsModal
              >
                <View
                  style={{
                    backgroundColor: chrome.appBar,
                    paddingTop: insets.top,
                  }}
                >
                  <AppBar
                    title={
                      hostScreen.kind === 'signIn'
                        ? 'Sign in'
                        : hostScreen.kind === 'editProfile'
                          ? 'Edit profile'
                          : 'Client profile (host app)'
                    }
                    isDark={isDark}
                    onBack={dismissHostScreen}
                    backTestID={
                      hostScreen.kind === 'profile'
                        ? 'clientProfile-back'
                        : hostScreen.kind === 'signIn'
                          ? 'host-sign-in-back'
                          : 'host-edit-profile-back'
                    }
                  />
                </View>
                {hostScreen.kind === 'signIn' && (
                  <SignInScreen
                    isDark={isDark}
                    userId={activeConfig?.userId ?? octopusUserId}
                    hasSsoUser={hasSsoUser}
                    busy={isConnectingUser}
                    error={hostError}
                    onConnect={() => submitHostUser()}
                  />
                )}
                {hostScreen.kind === 'editProfile' && (
                  <EditProfileScreen
                    isDark={isDark}
                    user={hostUser}
                    appManagedFields={appManagedFields}
                    fieldToEdit={hostScreen.fieldToEdit}
                    key={hostUser?.userId ?? 'disconnected'}
                    canSave={canSaveHostProfile({
                      isConnected: isMockUserConnected,
                      user: hostUser,
                      hasToken:
                        octopusUserTokens[connectVariantRef.current] !== '',
                    })}
                    busy={isConnectingUser}
                    error={hostError}
                    onSave={submitHostUser}
                  />
                )}
                {hostScreen.kind === 'profile' && (
                  <ClientProfileScreen
                    isDark={isDark}
                    clientUserId={hostScreen.clientUserId}
                    hostUser={
                      hostUser?.userId === hostScreen.clientUserId
                        ? hostUser
                        : null
                    }
                  />
                )}
              </View>
            )}
          </HostScreenModal>
        }
      />
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
    ...sampleTypography.callout,
  },
  modalRoot: {
    flex: 1,
  },
});
