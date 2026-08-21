/* eslint-disable react-native/no-inline-styles */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SegmentControl } from '../components/SegmentControl';

export type UrlOpeningMode = 'defaultBrowser' | 'inAppWebView';

/**
 * Who handles a profile tap inside the community UI: the SDK's own profile
 * screens, or this app's (Unified Profile).
 */
export type ProfileTapMode = 'sdkScreens' | 'appScreens';
export type DisplayMode = 'embed' | 'fullscreen';

/** Community UI language: system default or override to French/English. */
export type CommunityLocaleOverride = 'system' | 'fr' | 'en';

const URL_MODE_OPTIONS = [
  { label: 'Default browser', value: 'defaultBrowser' as UrlOpeningMode },
  { label: 'In-app WebView', value: 'inAppWebView' as UrlOpeningMode },
];

const PROFILE_TAP_MODE_OPTIONS = [
  { label: 'SDK profiles', value: 'sdkScreens' as ProfileTapMode },
  { label: 'App profiles', value: 'appScreens' as ProfileTapMode },
];

const DISPLAY_MODE_OPTIONS = [
  { label: 'Embed', value: 'embed' as DisplayMode },
  { label: 'Fullscreen', value: 'fullscreen' as DisplayMode },
];

const LOCALE_OPTIONS: Array<{
  label: string;
  value: CommunityLocaleOverride;
}> = [
  { label: 'System default', value: 'system' },
  { label: 'French', value: 'fr' },
  { label: 'English', value: 'en' },
];

export interface SetupScreenProps {
  hasSsoEnvVars: boolean;
  isConnectingUser: boolean;
  isMockUserConnected: boolean;
  urlOpeningMode: UrlOpeningMode;
  onUrlOpeningModeChange: (mode: UrlOpeningMode) => void;
  profileTapMode: ProfileTapMode;
  onProfileTapModeChange: (mode: ProfileTapMode) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  communityLocaleOverride: CommunityLocaleOverride;
  onCommunityLocaleOverrideChange: (mode: CommunityLocaleOverride) => void;
  onConnectUser: () => void;
  onDisconnectUser: () => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  /** Shown in User block for 5s when editUser/loginRequired callback is fired in embed mode */
  userCallbackMessage: string | null;
}

/**
 * Setup tab: open Octopus UI, connect user, and choose URL handling (default browser or in-app WebView overlay).
 */
export function SetupScreen({
  hasSsoEnvVars,
  isConnectingUser,
  isMockUserConnected,
  urlOpeningMode,
  onUrlOpeningModeChange,
  profileTapMode,
  onProfileTapModeChange,
  displayMode,
  onDisplayModeChange,
  communityLocaleOverride,
  onCommunityLocaleOverrideChange,
  onConnectUser,
  onDisconnectUser,
  isDark,
  primaryColor,
  onPrimaryColor,
  userCallbackMessage,
}: SetupScreenProps) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const secondaryColor = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444444' : '#e8e8e8';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {/* User */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.userHeader}>
            <Text
              style={[
                styles.cardTitle,
                styles.cardTitleInRow,
                { color: textColor },
              ]}
            >
              User
            </Text>
            {userCallbackMessage !== null ? (
              <View
                style={[
                  styles.callbackBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(52, 199, 89, 0.25)'
                      : 'rgba(52, 199, 89, 0.2)',
                  },
                ]}
              >
                <Text
                  style={[styles.callbackBadgeText, { color: '#34C759' }]}
                  numberOfLines={1}
                >
                  {userCallbackMessage}
                </Text>
              </View>
            ) : null}
          </View>
          {!hasSsoEnvVars ? (
            <Text style={[styles.hint, { color: secondaryColor }]}>
              To use the Connect user button, set OCTOPUS_SSO_USER_ID and
              OCTOPUS_SSO_USER_TOKEN in your .env file (copy from .env.dist).
              See the example README for details.
            </Text>
          ) : (
            <View style={styles.buttonRow}>
              {isConnectingUser ? (
                <View style={[styles.actionButton, styles.loadingButton]}>
                  <ActivityIndicator color={primaryColor} size="small" />
                </View>
              ) : !isMockUserConnected ? (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: primaryColor }]}
                  onPress={onConnectUser}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.actionButtonText, { color: primaryColor }]}
                  >
                    Connect user
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: primaryColor }]}
                  onPress={onDisconnectUser}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.actionButtonText, { color: primaryColor }]}
                  >
                    Disconnect user
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Display mode */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Display mode
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            • Embed: Community tab shows the SDK view above the tab bar.
            {'\n'}• Fullscreen: Tapping Community opens the SDK in fullscreen.
          </Text>
          <SegmentControl
            options={DISPLAY_MODE_OPTIONS}
            value={displayMode}
            onChange={onDisplayModeChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            style={styles.segment}
          />
        </View>

        {/* URL opening mode */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            URL handling
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            • Default browser: Octopus SDK opens links in the system browser.
            {'\n'}• In-app WebView: your app receives the URL and handles it
            (e.g. overlay WebView here, or custom behavior).
          </Text>
          <SegmentControl
            options={URL_MODE_OPTIONS}
            value={urlOpeningMode}
            onChange={onUrlOpeningModeChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            style={styles.segment}
          />
        </View>

        {/* Profile tap handling (Unified Profile) */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Profile taps
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            • SDK profiles: tapping a member opens the SDK profile screen.
            {'\n'}• App profiles: your app receives the member's client user id
            and shows its own profile (Unified Profile). Requires a community
            configured to expose client user ids.
          </Text>
          <SegmentControl
            options={PROFILE_TAP_MODE_OPTIONS}
            value={profileTapMode}
            onChange={onProfileTapModeChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            style={styles.segment}
          />
        </View>

        {/* Community locale */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Community language
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Override the language used in the Octopus Community UI, or use
            system default.
          </Text>
          <SegmentControl
            options={LOCALE_OPTIONS}
            value={communityLocaleOverride}
            onChange={onCommunityLocaleOverrideChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
            style={styles.segment}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardTitleInRow: {
    marginBottom: 0,
  },
  callbackBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '70%',
  },
  callbackBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 160,
    alignSelf: 'flex-start',
  },
  loadingButton: {
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  segment: {
    marginTop: 4,
  },
  bottomSpacer: {
    height: 24,
  },
});
