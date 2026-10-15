import { sampleRadius, sampleTypography, sampleSpacing } from '../theme/tokens';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useHardwareBack } from '../navigation/useHardwareBack';

import {
  sampleSupport,
  sampleDesignReferenceUrl,
} from '../config/sampleSupport';
import { AppSection } from '../components/AppSection';
import { AppBar } from '../components/AppBar';
import { SettingsRadio } from '../components/SettingsRadio';
import { SegmentControl } from '../components/SegmentControl';
import {
  SummaryRow as SampleSummaryRow,
  GroupHeader,
  ListDivider,
} from '../components/SampleRecipes';
import {
  SDK_LANGUAGES,
  APPEARANCE_OPTIONS,
  THEME_PRESETS,
} from '../config/settingsPreferences';
import { SampleInfoRow } from '../components/SampleInfoRow';
import { PillButton } from '../components/PillButton';
import { useDebugLog } from '../debug/debugLog';
import { chromeColors } from '../theme/branding';
import { octopusHostLabel, octopusServerLabel } from '../config/demoConfig';
import {
  sampleBuild,
  sampleVersion,
  sampleVersionLabel,
} from '../config/sampleVersion';
import type { ThemeMode, ThemeSet } from '../types/theme';
import type {
  ConfigSection,
  DebugView,
  NavRequest,
  ScenarioSectionId,
  SettingsPage,
} from '../navigation/anchors';

export type UrlOpeningMode = 'defaultBrowser' | 'inAppWebView' | 'sampleRule';

/**
 * Who handles a profile tap inside the community UI: the SDK's own profile
 * screens, or this app's (Unified Profile).
 */
export type ProfileTapMode = 'sdkScreens' | 'appScreens';
export type DisplayMode = 'embed' | 'fullscreen';

/** Community UI language: system default or a language code sent to the SDK. */
export type CommunityLocaleOverride = string;

/** Which page of the Settings tab is showing. `root` is the summary. */
type SettingsRoute = SettingsPage;

const LOCALE_SUMMARIES = Object.fromEntries(
  SDK_LANGUAGES.map((language) => [language.value, language.label])
);

const APPEARANCE_SUMMARIES: Record<ThemeMode, string> = {
  system: 'Follow system',
  light: 'Light',
  dark: 'Dark',
};

export interface SettingsScreenProps {
  onTopBarChange?: (isRoot: boolean) => void;
  overview?: React.ReactNode;
  integration?: React.ReactNode;
  serverLabel?: string;
  onAppearanceChange?: (mode: ThemeMode) => void;
  onThemeSetChange?: (theme: ThemeSet) => void;
  onLanguageChange?: (language: string) => Promise<void>;
  languageError?: string | null;
  /** Whether a token was injected for the plain demo user — no token, no Connect. */
  hasSsoUser: boolean;
  /** Back to the Config screen (`settings-reconfigure-button`), at the top. */
  onReconfigure: () => void;
  /** Back to the Config screen, scrolled to one section — for the links that name one setting. */
  onOpenConfigSection: (section: ConfigSection) => void;
  /** The Scenarios tab, with one section open and scrolled into view. */
  onOpenScenariosSection: (section: ScenarioSectionId) => void;
  /**
   * Opens one of Developer tools' two destinations, which App presents as a modal: the
   * Events log (`debug-open-button`) or the read-only Debug info snapshot.
   */
  onOpenDebug: (view: DebugView) => void;
  /** Opens the optional internal feedback sheet owned by the shell. */
  onOpenFeedback?: () => void;
  /**
   * A page a link asked for (`settings/<page>`) — Community's "Connect" and the SDK's host
   * callbacks land on Account through it. Applied on mount and again on every new request.
   */
  pageRequest?: NavRequest<SettingsPage> | null;
  isConnectingUser: boolean;
  isMockUserConnected: boolean;
  /** What the SDK's own connection stream says — the truth the profile card reports. */
  isUserConnected: boolean;
  isGuest: boolean;
  /** The SSO `sub` in force, as configured. */
  clientUserId: string;
  /** Entitlements the SDK currently reports for the connected profile. */
  entitlements: string[];
  /** Community UI language shared with the Locale scenario. */
  communityLocaleOverride: CommunityLocaleOverride;
  onConnectUser: () => void;
  onDisconnectUser: () => void;
  /** `refreshEntitlements()` — the lighter, session-preserving refresh. */
  onRefreshEntitlements: () => void;
  /** Appearance shared by Settings, Configuration and the Theme scenario. */
  appearance: ThemeMode;
  themeSet: ThemeSet;
  /** Which community the SDK is pointed at, for the Change Configuration subtitle. */
  communitySummary: string;
  /** Clears the sample's saved setup and returns to the Config screen. */
  onResetData: () => void;
  isDark: boolean;
  primaryColor: string;
  /** Shown in Account for 8s when editUser/loginRequired callback is fired in embed mode */
  userCallbackMessage: string | null;
}

/** One tappable line of the summary. Chevron always, because every line navigates. */
function SummaryRow({
  title,
  subtitle,
  onPress,
  chrome,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  chrome: ReturnType<typeof chromeColors>;
  testID?: string;
}) {
  const isDark = chrome === chromeColors(true);
  const icons: Record<
    string,
    React.ComponentProps<typeof MaterialIcons>['name']
  > = {
    'Account': 'person-outline',
    'Appearance': 'palette',
    'Language': 'language',
    'Configuration': 'tune',
    'Developer tools': 'code',
    'Send feedback': 'feedback',
    'About': 'info-outline',
    'Host app integration': 'settings-input-component',
    'Events log': 'event-note',
    'Debug info': 'info-outline',
    'Debug console': 'bug-report',
  };
  return (
    <>
      <SampleSummaryRow
        title={title}
        subtitle={subtitle}
        onPress={onPress}
        testID={testID}
        isDark={isDark}
        icon={icons[title] ?? 'settings'}
      />
      <ListDivider isDark={isDark} settings />
    </>
  );
}
function GroupTitle({
  label,
  chrome,
}: {
  label: string;
  chrome: ReturnType<typeof chromeColors>;
}) {
  return <GroupHeader title={label} isDark={chrome === chromeColors(true)} />;
}

/**
 * One of the five pages behind the summary, with the back affordance that returns to it.
 *
 * A page rather than a modal: the summary is a list of destinations, and a destination the
 * reader can only leave by dismissing would break the back gesture the platform already gives
 * them.
 */
function SubPage({
  title,
  chrome,
  onBack,
  onOpenDebug,
  children,
}: {
  title: string;
  chrome: ReturnType<typeof chromeColors>;
  onBack: () => void;
  onOpenDebug: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.container, { backgroundColor: chrome.screen }]}>
      <AppBar
        title={title}
        isDark={chrome === chromeColors(true)}
        onBack={onBack}
        backTestID="settings-back-button"
        onOpenDebug={onOpenDebug}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator
      >
        {children}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

/**
 * Settings summary and its editable destinations.
 *
 * The rule the shared design gives this screen: **the root holds no control**. One line is one
 * navigation, and its subtitle is the CURRENT VALUE rather than a description, so the whole
 * state of the sample can be read without opening anything. The controls that used to sit here
 * are now either on their own page below or on the Config screen, where the rest of the
 * "how is this host wired" answers live.
 */
export function SettingsScreen({
  onTopBarChange,
  overview,
  integration,
  serverLabel = `${octopusServerLabel} — ${octopusHostLabel}`,
  onAppearanceChange,
  onThemeSetChange,
  onLanguageChange,
  languageError,
  hasSsoUser,
  onReconfigure,
  onOpenConfigSection,
  onOpenScenariosSection,
  onOpenDebug,
  onOpenFeedback,
  pageRequest,
  isConnectingUser,
  isMockUserConnected,
  isUserConnected,
  isGuest,
  clientUserId,
  entitlements,
  communityLocaleOverride,
  onConnectUser,
  onDisconnectUser,
  onRefreshEntitlements,
  appearance,
  themeSet,
  onResetData,
  isDark,
  primaryColor,
  userCallbackMessage,
}: SettingsScreenProps) {
  const FeedbackSheet = sampleSupport.FeedbackSheet;
  const [route, setRoute] = useState<SettingsRoute>(
    pageRequest?.target ?? 'root'
  );
  // A request that arrives while the tab is already showing — a host callback firing while
  // the tester is on another Settings page — has to move it too, not only a fresh mount.
  const requestedPage = pageRequest?.target;
  const requestNonce = pageRequest?.nonce;
  useEffect(() => {
    if (requestedPage !== undefined) setRoute(requestedPage);
  }, [requestedPage, requestNonce]);
  useEffect(() => {
    onTopBarChange?.(route === 'root');
  }, [route, onTopBarChange]);
  // Hardware Back on a page does what the page's own Back does: one level up, to the summary.
  useHardwareBack('screen', () => {
    if (route === 'root') return false;
    setRoute('root');
    return true;
  });
  // Subscribed here, not only inside the console: the Developer tools line reports the
  // live entry count, which is the whole point of putting it in the summary.
  const entries = useDebugLog();
  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const secondaryColor = chrome.textSecondary;
  const cardBg = chrome.surface;
  const borderColor = chrome.border;

  const accountSummary = isUserConnected
    ? `Connected as ${clientUserId} · ${entitlements.length ? entitlements.join(', ') : 'None'}`
    : isGuest
      ? 'Browsing as guest · read-only'
      : 'Not connected';

  const themePresetSummary =
    themeSet === 'octopusNavy'
      ? 'Octopus navy'
      : themeSet === 'none'
        ? 'SDK default'
        : 'Scenario probe set';

  // Sample version carries the build; the SDK line is the wrapper version alone, which is
  // what a host declares in its own package.json.
  const footer = `Sample ${sampleVersionLabel} · SDK ${sampleVersion}`;

  if (route === 'account') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="Account"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: chrome.accentContainer },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: chrome.onAccentContainer }]}
              >
                {initialsOf(clientUserId)}
              </Text>
            </View>
            <View style={styles.rowText}>
              {/* The id is printed once. It used to head this row AND fill the pill
                  below, which read as two different facts about two different users. */}
              {isUserConnected ? (
                <View
                  testID="settings-account-badge"
                  style={[
                    styles.connectedPill,
                    { backgroundColor: chrome.success },
                  ]}
                >
                  <Text style={styles.connectedPillText}>
                    {`Connected · ${clientUserId}`}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.rowTitle, { color: textColor }]}>
                    {clientUserId}
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: secondaryColor }]}>
                    {isGuest ? 'Browsing as guest' : 'Not connected'}
                  </Text>
                </>
              )}
            </View>
          </View>
          {userCallbackMessage !== null && (
            <Text style={[styles.callbackLine, { color: chrome.success }]}>
              {userCallbackMessage}
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Entitlements
          </Text>
          {entitlements.length === 0 ? (
            <>
              <Text style={[styles.hint, { color: secondaryColor }]}>
                None. Entitlements come from the injected token, so the
                Connection scenario's entitlements field is what changes them —
                this sample signs nothing itself.
              </Text>
              <PillButton
                testID="settings-account-open-connection-scenario"
                label="Scenarios › Sign-in & user"
                icon="arrow-forward"
                variant="secondary"
                isDark={isDark}
                onPress={() => onOpenScenariosSection('sso')}
              />
            </>
          ) : (
            <View style={styles.chips}>
              {entitlements.map((entitlement) => (
                <View
                  key={entitlement}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: chrome.accentContainer,
                      borderColor: chrome.tintBorder,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: chrome.accentText }]}>
                    {entitlement}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {!hasSsoUser ? (
            <>
              <Text style={[styles.hint, { color: secondaryColor }]}>
                No SSO token injected, so there is nothing to connect: set
                OCTOPUS_SSO_USER_TOKEN in example/.env (copy from .env.dist).
                The user id is set in Config › Authentication; the Connection
                scenario can override it for a single run.
              </Text>
              <PillButton
                testID="settings-account-open-config-auth"
                label="Config › Authentication"
                icon="arrow-forward"
                variant="secondary"
                isDark={isDark}
                onPress={() => onOpenConfigSection('auth')}
              />
            </>
          ) : isConnectingUser ? (
            <ActivityIndicator color={primaryColor} size="small" />
          ) : (
            <>
              <PillButton
                testID="settings-connect-button"
                label={isMockUserConnected ? 'Reconnect' : 'Connect SSO user'}
                icon="login"
                isDark={isDark}
                onPress={onConnectUser}
              />
              <Text style={[styles.helpLine, { color: secondaryColor }]}>
                Re-creates the Octopus session with the updated entitlements. No
                real identity server is contacted — the token is a pre-baked JWT
                the build injects.
              </Text>
              <PillButton
                testID="settings-refresh-entitlements-button"
                label="Refresh entitlements"
                icon="refresh"
                isDark={isDark}
                variant="secondary"
                disabled={!isMockUserConnected}
                onPress={onRefreshEntitlements}
              />
              <Text style={[styles.helpLine, { color: secondaryColor }]}>
                Lighter SDK-side refresh, keeps the session.
              </Text>
              <PillButton
                testID="settings-disconnect-button"
                label="Disconnect"
                icon="logout"
                isDark={isDark}
                variant="danger"
                disabled={!isMockUserConnected}
                onPress={onDisconnectUser}
              />
            </>
          )}
        </View>
      </SubPage>
    );
  }

  if (route === 'appearance') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="Appearance"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Appearance
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Applies to the sample and to the SDK surface it hosts.
          </Text>
          <SegmentControl
            testID="settings-appearance-select"
            options={APPEARANCE_OPTIONS}
            value={appearance}
            onChange={(mode) => onAppearanceChange?.(mode)}
            isDark={isDark}
          />
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Theme preset
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            {
              '"SDK default" hands the SDK no theme — what a fresh integration looks like.'
            }
          </Text>
          <SegmentControl
            testID="settings-theme-select"
            options={THEME_PRESETS}
            value={themeSet}
            onChange={(theme) => onThemeSetChange?.(theme)}
            isDark={isDark}
          />
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Changing the preset rebuilds the SDK with the selected theme.
          </Text>
        </View>
      </SubPage>
    );
  }
  if (route === 'language') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="Language"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            SDK language
          </Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Applies to the Octopus screens only — the sample itself stays in
            English.
          </Text>
          <SettingsRadio
            testID="settings-language-select"
            options={SDK_LANGUAGES}
            value={communityLocaleOverride}
            onChange={(language) => {
              onLanguageChange?.(language).catch(() => {});
            }}
            isDark={isDark}
          />
          {languageError && (
            <Text
              accessibilityRole="alert"
              style={[styles.hint, { color: chrome.danger }]}
            >
              {languageError}
            </Text>
          )}
          <Text style={[styles.hint, { color: secondaryColor }]}>
            {
              'The override survives a restart. "Follow system" hands the choice back to the device locale.'
            }
          </Text>
        </View>
      </SubPage>
    );
  }
  if (route === 'integration') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="Host app integration"
        chrome={chrome}
        onBack={() => setRoute('developer')}
      >
        {integration}
      </SubPage>
    );
  }

  if (route === 'developer') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="Developer tools"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        {/* Two lines, not a card and a button: this page is part of the same summary,
            and each subtitle is the live value a tester would otherwise open the console
            to read. Two lines, two destinations: Events log is the live console the QA
            catalog drives through `debug-open-button`; Debug info is the read-only
            snapshot of the build, the configuration in force and the streamed state. */}
        <SummaryRow
          chrome={chrome}
          testID="settings-host-integration-row"
          title="Host app integration"
          subtitle="Profile, sign-in, links: what the app handles"
          onPress={() => setRoute('integration')}
        />
        <SummaryRow
          chrome={chrome}
          testID="debug-open-button"
          title="Events log"
          subtitle={`${entries.filter((entry) => entry.kind === 'event').length} event${
            entries.filter((entry) => entry.kind === 'event').length === 1
              ? ''
              : 's'
          } · live`}
          onPress={() => onOpenDebug('events')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-debug-info-row"
          title="Debug info"
          subtitle={`SDK ${sampleVersion}${
            sampleBuild === null ? '' : ` · build ${sampleBuild}`
          }`}
          onPress={() => onOpenDebug('info')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-debug-console-row"
          title="Debug console"
          subtitle="Logs every feature toggle → SDK config rebuilt"
          onPress={() => onOpenDebug('console')}
        />
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Host app integration sets what the app handles; the other three read
          what the SDK did.
        </Text>
      </SubPage>
    );
  }

  if (route === 'about') {
    return (
      <SubPage
        onOpenDebug={() => onOpenDebug('console')}
        title="About"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        <AppSection isDark={isDark} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Versions</Text>
          <SampleInfoRow
            label="App version"
            value={sampleVersionLabel}
            isDark={isDark}
          />
          <SampleInfoRow
            label="SDK version"
            value={sampleVersion}
            isDark={isDark}
          />
        </View>
        {sampleDesignReferenceUrl !== '' && (
          <SummaryRow
            chrome={chrome}
            testID="settings-design-reference-row"
            title="Design reference"
            subtitle="Shared target for the five platforms"
            onPress={() => {
              Linking.openURL(sampleDesignReferenceUrl).catch(() =>
                Alert.alert(
                  'Could not open design reference',
                  'Please check your browser and connection.'
                )
              );
            }}
          />
        )}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Licences</Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Open-source notices for what this sample links against.
          </Text>
          {[
            ['Octopus SDK', 'Proprietary'],
            ['React / React Native', 'MIT'],
            ['Async Storage / Safe Area Context / WebView', 'MIT'],
            ['React Native Firebase', 'Apache-2.0'],
            ['Notifee', 'Apache-2.0'],
            ['Material Icons', 'Apache-2.0'],
            ['React Native Vector Icons', 'MIT'],
            ['React Native Edge to Edge', 'MIT'],
          ].map(([label, value]) => (
            <SampleInfoRow
              key={label}
              label={label!}
              value={value!}
              isDark={isDark}
            />
          ))}
        </View>
        <Text style={[styles.builtWith, { color: textColor }]}>
          Built with the Octopus SDK for React Native
        </Text>
      </SubPage>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: chrome.screen }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.overview}>{overview}</View>
        {/* Account leads, with no group header of its own: it is the one line whose value
            changes minute to minute, and the one a tester checks first. */}
        <SummaryRow
          chrome={chrome}
          testID="settings-account-row"
          title="Account"
          subtitle={accountSummary}
          onPress={() => setRoute('account')}
        />

        <GroupTitle chrome={chrome} label="SDK" />
        <SummaryRow
          chrome={chrome}
          testID="settings-appearance-row"
          title="Appearance"
          subtitle={`${themePresetSummary} · ${APPEARANCE_SUMMARIES[appearance]}`}
          onPress={() => setRoute('appearance')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-language-row"
          title="Language"
          subtitle={
            LOCALE_SUMMARIES[communityLocaleOverride] ?? communityLocaleOverride
          }
          onPress={() => setRoute('language')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-reconfigure-button"
          title="Configuration"
          subtitle="Community, server, SSO user, theme"
          onPress={onReconfigure}
        />

        <GroupTitle chrome={chrome} label="Support" />
        <SummaryRow
          chrome={chrome}
          testID="settings-developer-row"
          title="Developer tools"
          subtitle="Host app integration · Events log · Debug info · Debug console"
          onPress={() => setRoute('developer')}
        />
        {FeedbackSheet && onOpenFeedback && (
          <SummaryRow
            chrome={chrome}
            testID="settings-feedback-row"
            title="Send feedback"
            subtitle="Pre-filled GitHub issue · internal builds only"
            onPress={onOpenFeedback}
          />
        )}
        <SummaryRow
          chrome={chrome}
          testID="settings-about-row"
          title="About"
          subtitle={footer}
          onPress={() => setRoute('about')}
        />
        <GroupTitle chrome={chrome} label="Reset" />
        {/* The one red row of the sample — last in Support, at Settings level, not
            buried in About (spec 05 §"Décisions actées" / card 00 décision ⑥). */}
        <SampleSummaryRow
          testID="settings-reset-button"
          title="Reset Configuration"
          subtitle="Local demo setup only — nothing is deleted on the server"
          icon="restart-alt"
          danger
          isDark={isDark}
          onPress={() =>
            Alert.alert(
              'Reset Configuration?',
              "Clears the sample's saved setup — server, community, SSO user, theme — and restarts on the Config screen. Nothing is deleted in the community itself.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: onResetData,
                },
              ]
            )
          }
        />

        {/* The build's own identity, readable without opening anything — a tester reporting
            a bug has to be able to say which backend and which version they were on. */}
        <Text
          testID="settings-server-label"
          style={[styles.footerLine, { color: secondaryColor }]}
        >
          {serverLabel}
        </Text>
        <Text
          testID="settings-version-label"
          style={[styles.footerLine, { color: secondaryColor }]}
        >
          {footer}
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

/** Initials for the avatar placeholder, from whatever the id gives us. */
function initialsOf(id: string): string {
  const parts = id.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase();
  return `${(parts[0] as string)[0]}${(parts[1] as string)[0]}`.toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  overview: { paddingHorizontal: 16, paddingTop: 16 },
  pageContent: { paddingHorizontal: 16, paddingTop: 8 },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...sampleTypography.body,
  },
  rowSubtitle: {
    ...sampleTypography.caption,
    marginTop: 2,
  },
  card: {
    padding: sampleSpacing.gutter,
    borderRadius: sampleRadius.md,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    ...sampleTypography.label,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...sampleTypography.body,
  },
  connectedPill: {
    alignSelf: 'flex-start',
    borderRadius: sampleRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  connectedPillText: {
    color: '#FFFFFF',
    ...sampleTypography.caption,
  },
  callbackLine: {
    ...sampleTypography.caption,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: sampleRadius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    ...sampleTypography.caption,
  },
  helpLine: {
    ...sampleTypography.caption,

    marginBottom: 4,
  },
  hint: {
    ...sampleTypography.caption,
  },
  builtWith: {
    ...sampleTypography.callout,
  },
  footerLine: {
    ...sampleTypography.caption,

    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
