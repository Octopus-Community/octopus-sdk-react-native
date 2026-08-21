/* eslint-disable react-native/no-inline-styles */
import * as Octopus from '@octopus-community/react-native';
import {
  useUserTokenProvider,
  useBridgeShareTokenProvider,
  UrlOpeningStrategy,
  overrideDefaultLocale,
} from '@octopus-community/react-native';
import type { SDKEvent } from '@octopus-community/react-native';
import {
  View,
  Image,
  Appearance,
  useColorScheme,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import { setupOctopusPush } from './push';
import {
  SetupScreen,
  type UrlOpeningMode,
  type ProfileTapMode,
  type DisplayMode,
  type CommunityLocaleOverride,
} from './screens/SetupScreen';
import { ThemeScreen } from './screens/ThemeScreen';
import { SDKDataScreen } from './screens/SDKDataScreen';
import { SyncFollowGroupsScreen } from './screens/SyncFollowGroupsScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { ScenariosScreen } from './screens/ScenariosScreen';
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

const lightNoThemeColors = {
  primary: '#000000',
  primaryLowContrast: '#333333',
  primaryHighContrast: '#000000',
  onPrimary: '#FFFFFF',
};

const darkNoThemeColors = {
  primary: '#FFFFFF',
  primaryLowContrast: '#CCCCCC',
  primaryHighContrast: '#FFFFFF',
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
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  // Scenarios-tab-only result feedback: SetupScreen/SDKDataScreen surface failures through
  // showUserCallbackMessage / console.error respectively and don't read these, so adding them
  // here doesn't change those two tabs' behavior.
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notificationsRefreshFeedback, setNotificationsRefreshFeedback] =
    useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [localeOverrideError, setLocaleOverrideError] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [hasAccessToCommunity, setHasAccessToCommunity] = useState<
    boolean | null
  >(null);
  const [sdkEvents, setSdkEvents] = useState<
    Array<{ event: SDKEvent; receivedAt: number }>
  >([]);
  const [isMockUserConnected, setIsMockUserConnected] = useState(false);
  const [urlOpeningMode, setUrlOpeningMode] =
    useState<UrlOpeningMode>('defaultBrowser');
  const [profileTapMode, setProfileTapMode] =
    useState<ProfileTapMode>('sdkScreens');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('embed');
  const [communityLocaleOverride, setCommunityLocaleOverride] =
    useState<CommunityLocaleOverride>('system');
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [userCallbackMessage, setUserCallbackMessage] = useState<string | null>(
    null
  );
  const userCallbackMessageTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  /** Surfaces a transient message on the setup tab. Stable, so effects can depend on it. */
  const showUserCallbackMessage = useCallback((message: string) => {
    if (userCallbackMessageTimeoutRef.current) {
      clearTimeout(userCallbackMessageTimeoutRef.current);
      userCallbackMessageTimeoutRef.current = null;
    }
    setActiveTab('setup');
    setUserCallbackMessage(message);
    userCallbackMessageTimeoutRef.current = setTimeout(() => {
      setUserCallbackMessage(null);
      userCallbackMessageTimeoutRef.current = null;
    }, 5000);
  }, []);

  const systemColorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = themeMode ?? systemColorScheme;
  // undefined for the 'unset' preset — see BOTTOM_INSET_VALUES and the `ui` spread below.
  const bottomSafeAreaInset = BOTTOM_INSET_VALUES[bottomInsetPreset];

  /** The selected color set, without the optional link/background pair. */
  const getBaseThemeColors = useCallback(() => {
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

  const handleThemeModeChange = useCallback((mode: ThemeMode) => {
    if (mode === 'system') {
      setThemeMode(null);
      Appearance.setColorScheme(undefined);
    } else {
      setThemeMode(mode);
      Appearance.setColorScheme(mode);
    }
  }, []);

  useEffect(() => {
    const subCount = Octopus.addNotSeenNotificationsCountListener((count) => {
      setNotSeenNotificationsCount(count);
    });
    const subAccess = Octopus.addHasAccessToCommunityListener((hasAccess) => {
      setHasAccessToCommunity(hasAccess);
    });
    const subEvents = Octopus.addSDKEventListener((event) => {
      setSdkEvents((prev) => [...prev, { event, receivedAt: Date.now() }]);
    });
    return () => {
      subCount.remove();
      subAccess.remove();
      subEvents.remove();
    };
  }, []);

  // URL interception: listener must live in App so it stays active on any tab (Setup, Community embed/fullscreen).
  useEffect(() => {
    if (urlOpeningMode !== 'inAppWebView') return;
    const subscription = Octopus.addNavigateToUrlListener(async (url) => {
      // Only closeUI in fullscreen (it throws "No UI is currently presented" in embed mode).
      try {
        await Octopus.closeUI();
      } catch {
        // Embed mode: nothing to close, continue to open WebView.
      }
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
        // A real host would push its own profile screen here. The demo only proves the
        // client user id crossed the bridge.
        if (displayMode === 'fullscreen') {
          Octopus.closeUI().catch(() => {
            // Embed mode: nothing is presented, nothing to close.
          });
        }
        showUserCallbackMessage(
          `navigateToProfileListener called (${clientUserId})`
        );
      }
    );
    return () => subscription.remove();
  }, [profileTapMode, displayMode, showUserCallbackMessage]);

  const closeWebView = useCallback(() => setWebViewUrl(null), []);

  useEffect(() => {
    const apiKey = process.env.OCTOPUS_COMMUNITY_API_KEY;
    if (!apiKey) return;

    const currentThemeColors = getCurrentThemeColors();
    const currentThemeFonts = getCurrentThemeFonts();
    const hasLogo = resolvedLogo != null && selectedLogoMode === 'enabled';

    const theme =
      currentThemeColors || currentThemeFonts || hasLogo
        ? {
            ...(currentThemeColors && { colors: currentThemeColors }),
            ...(currentThemeFonts && { fonts: currentThemeFonts }),
            ...(hasLogo && { logo: { image: resolvedLogo } }),
          }
        : undefined;

    Octopus.initialize({
      apiKey,
      connectionMode: { type: 'sso', appManagedFields: ['profilePicture'] },
      // `unset` must drop the key rather than send `0`: on Android, an absent
      // `bottomSafeAreaInset` now resolves the inset from where <OctopusUIView> is mounted
      // (issue #120), while an explicit `0` opts back out of that resolution.
      ...(bottomSafeAreaInset !== undefined && { ui: { bottomSafeAreaInset } }),
      ...(theme && { theme }),
    })
      .then(() => {
        setIsInitializationTriggered(true);
        setupOctopusPush({ onToken: setPushToken }).catch((err) =>
          console.error('Octopus push setup error', err)
        );
      })
      .catch((err) => console.error('Octopus init error', err));

    const subEdit = Octopus.addEditUserListener(() => {
      if (displayMode === 'fullscreen') {
        Octopus.closeUI();
      }
      showUserCallbackMessage('editUserListener called');
    });
    const subLogin = Octopus.addLoginRequiredListener(() => {
      if (displayMode === 'fullscreen') {
        Octopus.closeUI();
      }
      showUserCallbackMessage('loginRequiredListener called');
    });
    return () => {
      subEdit.remove();
      subLogin.remove();
      if (userCallbackMessageTimeoutRef.current) {
        clearTimeout(userCallbackMessageTimeoutRef.current);
      }
    };
  }, [
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
  ]);

  useUserTokenProvider(async () => {
    if (!isMockUserConnected) throw new Error('No user connected');
    await new Promise<void>((r) => setTimeout(r, 2000));
    return process.env.OCTOPUS_SSO_USER_TOKEN as string;
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
  const connectUserCore = useCallback(async (): Promise<string | null> => {
    // Raised before the call on purpose: the token provider above refuses to sign a token
    // while this is false.
    setIsMockUserConnected(true);
    setIsConnectingUser(true);
    try {
      await Octopus.connectUser({
        userId: process.env.OCTOPUS_SSO_USER_ID as string,
        profile: {
          username: 'John Doe',
          profilePicture: 'https://i.pravatar.cc/150',
        },
      });
      return null;
    } catch (error) {
      // A refused connection leaves the user anonymous in the community, so undo the
      // optimistic flag instead of showing them as connected.
      setIsMockUserConnected(false);
      console.error('Octopus connectUser failed', error);
      return Octopus.isConnectUserError(error)
        ? `connectUser failed — ${error.code}: ${error.message}`
        : `connectUser failed — ${String(error)}`;
    } finally {
      setIsConnectingUser(false);
    }
  }, []);

  // Used by the Setup tab. Unchanged behavior: a failure goes through the same transient
  // callback-message channel as the SDK's own listeners (editUser/loginRequired), which also
  // jumps the app to the Setup tab so the message is seen.
  const handleConnectUser = useCallback(async () => {
    const errorMessage = await connectUserCore();
    if (errorMessage) {
      showUserCallbackMessage(errorMessage);
    }
  }, [connectUserCore, showUserCallbackMessage]);

  // Used by the Scenarios tab. Deliberately does NOT go through showUserCallbackMessage:
  // that channel force-switches the active tab to Setup, which would navigate away from the
  // Scenarios screen before its connection-result panel could ever show the failure. The
  // outcome is captured locally instead, for that panel to render directly.
  const handleConnectUserForScenarios = useCallback(async () => {
    const errorMessage = await connectUserCore();
    setConnectionError(errorMessage);
  }, [connectUserCore]);

  const handleDisconnectUser = useCallback(() => {
    setIsMockUserConnected(false);
    setConnectionError(null);
    Octopus.disconnectUser();
  }, []);

  const handleUpdateNotifications = useCallback(async () => {
    if (!isInitializationTriggered) return;
    setIsUpdatingNotifications(true);
    setNotificationsRefreshFeedback(null);
    try {
      await Octopus.updateNotSeenNotificationsCount();
      setNotificationsRefreshFeedback({
        type: 'success',
        message: 'Not-seen count refreshed',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Update notification count failed', e);
      setNotificationsRefreshFeedback({ type: 'error', message });
    } finally {
      setIsUpdatingNotifications(false);
    }
  }, [isInitializationTriggered]);

  const handleClearEvents = useCallback(() => setSdkEvents([]), []);

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
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Override default locale failed', e);
        setLocaleOverrideError(message);
      }
    },
    []
  );

  const getColorsForUI = useCallback(() => {
    if (selectedThemeSet === 'none') {
      return colorScheme === 'dark' ? darkNoThemeColors : lightNoThemeColors;
    }
    const colors = getBaseThemeColors();
    if (!colors) {
      return {
        primary: colorScheme === 'dark' ? '#60A5FA' : '#3B82F6',
        onPrimary: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
      };
    }
    return colorScheme === 'dark' ? colors.dark : colors.light;
  }, [selectedThemeSet, colorScheme, getBaseThemeColors]);

  const { primary: primaryColor, onPrimary: onPrimaryColor } = getColorsForUI();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
  const tabBarBg = isDark ? '#1a1a1a' : '#f8f8f8';

  const apiKeyMissing = !process.env.OCTOPUS_COMMUNITY_API_KEY;
  const hasSsoEnvVars = !!(
    process.env.OCTOPUS_SSO_USER_ID && process.env.OCTOPUS_SSO_USER_TOKEN
  );
  const showTabBar = !apiKeyMissing && isInitializationTriggered;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === 'community' && displayMode === 'fullscreen') {
        Octopus.openUI({
          interceptUrls: urlOpeningMode === 'inAppWebView',
          interceptProfileTaps: profileTapMode === 'appScreens',
        });
        return;
      }
      setActiveTab(tab);
    },
    [displayMode, urlOpeningMode, profileTapMode]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor }}>
        {apiKeyMissing ? (
          <View style={styles.centeredMessage}>
            <Text
              style={[
                styles.messageTitle,
                { color: isDark ? '#ffffff' : '#000000' },
              ]}
            >
              Configuration required
            </Text>
            <Text
              style={[
                styles.messageBody,
                { color: isDark ? '#aaaaaa' : '#666666' },
              ]}
            >
              OCTOPUS_COMMUNITY_API_KEY is not set. Copy .env.dist to .env and
              set your API key. See the example README for details.
            </Text>
          </View>
        ) : !isInitializationTriggered ? (
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text
              style={[
                styles.loadingText,
                { color: isDark ? '#888888' : '#666666' },
              ]}
            >
              Initializing Octopus…
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'setup' && (
              <SetupScreen
                hasSsoEnvVars={hasSsoEnvVars}
                isConnectingUser={isConnectingUser}
                isMockUserConnected={isMockUserConnected}
                urlOpeningMode={urlOpeningMode}
                onUrlOpeningModeChange={setUrlOpeningMode}
                profileTapMode={profileTapMode}
                onProfileTapModeChange={setProfileTapMode}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                communityLocaleOverride={communityLocaleOverride}
                onCommunityLocaleOverrideChange={
                  handleCommunityLocaleOverrideChange
                }
                onConnectUser={handleConnectUser}
                onDisconnectUser={handleDisconnectUser}
                isDark={isDark}
                primaryColor={primaryColor}
                onPrimaryColor={onPrimaryColor}
                userCallbackMessage={userCallbackMessage}
              />
            )}
            {activeTab === 'theme' && (
              <ThemeScreen
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
                isDark={isDark}
                primaryColor={primaryColor}
                onPrimaryColor={onPrimaryColor}
              />
            )}
            {activeTab === 'sdkData' && (
              <SDKDataScreen
                notSeenNotificationsCount={notSeenNotificationsCount}
                onRefreshNotifications={handleUpdateNotifications}
                isUpdatingNotifications={isUpdatingNotifications}
                hasAccessToCommunity={hasAccessToCommunity}
                sdkEvents={sdkEvents}
                onClearEvents={handleClearEvents}
                pushToken={pushToken}
                isDark={isDark}
                primaryColor={primaryColor}
              />
            )}
            {activeTab === 'groups' && <SyncFollowGroupsScreen />}
            {activeTab === 'scenarios' && (
              <ScenariosScreen
                isDark={isDark}
                primaryColor={primaryColor}
                hasSsoEnvVars={hasSsoEnvVars}
                isMockUserConnected={isMockUserConnected}
                isConnectingUser={isConnectingUser}
                onConnectUser={handleConnectUserForScenarios}
                onDisconnectUser={handleDisconnectUser}
                connectionError={connectionError}
                hasAccessToCommunity={hasAccessToCommunity}
                notSeenNotificationsCount={notSeenNotificationsCount}
                onRefreshNotifications={handleUpdateNotifications}
                isUpdatingNotifications={isUpdatingNotifications}
                notificationsRefreshFeedback={notificationsRefreshFeedback}
                communityLocaleOverride={communityLocaleOverride}
                onCommunityLocaleOverrideChange={
                  handleCommunityLocaleOverrideChange
                }
                localeOverrideError={localeOverrideError}
                themeSet={selectedThemeSet}
                onThemeSetChange={setSelectedThemeSet}
                fontType={selectedFontType}
                onFontTypeChange={setSelectedFontType}
                logoMode={selectedLogoMode}
                onLogoModeChange={setSelectedLogoMode}
                fontSizeMode={selectedFontSizeMode}
                onFontSizeModeChange={setSelectedFontSizeMode}
              />
            )}
            {activeTab === 'community' && (
              <CommunityScreen
                displayMode={displayMode}
                notSeenNotificationsCount={notSeenNotificationsCount}
                interceptUrls={urlOpeningMode === 'inAppWebView'}
                interceptProfileTaps={profileTapMode === 'appScreens'}
                onOpenFullscreen={() =>
                  Octopus.openUI({
                    interceptUrls: urlOpeningMode === 'inAppWebView',
                    interceptProfileTaps: profileTapMode === 'appScreens',
                  })
                }
                isDark={isDark}
                primaryColor={primaryColor}
                onPrimaryColor={onPrimaryColor}
              />
            )}
          </>
        )}
      </View>

      {showTabBar && (
        <View
          style={{
            width: '100%',
            backgroundColor: tabBarBg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? '#333' : '#e0e0e0',
          }}
        >
          <TabBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            notSeenNotificationsCount={notSeenNotificationsCount}
          />
        </View>
      )}

      {/* WebView overlay when URL is intercepted (works from any tab: Setup or Community embed/fullscreen) */}
      <Modal
        visible={webViewUrl !== null}
        animationType="slide"
        onRequestClose={closeWebView}
        statusBarTranslucent
      >
        <View
          style={[
            styles.webViewModalRoot,
            isDark && styles.webViewModalRootDark,
          ]}
        >
          <View
            style={[
              styles.webViewModalHeader,
              isDark && styles.webViewModalHeaderDark,
              { paddingTop: Math.max(insets.top, 12), paddingBottom: 12 },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.webViewCloseButton,
                { backgroundColor: primaryColor },
              ]}
              onPress={closeWebView}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.webViewCloseButtonText,
                  { color: onPrimaryColor },
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
          {webViewUrl !== null && (
            <WebView
              source={{ uri: webViewUrl }}
              style={{ width, flex: 1 }}
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
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  webViewModalRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewModalRootDark: {
    backgroundColor: '#1a1a1a',
  },
  webViewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  webViewModalHeaderDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  webViewCloseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  webViewCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
