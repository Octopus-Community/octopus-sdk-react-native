import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

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

export type UrlOpeningMode = 'defaultBrowser' | 'inAppWebView';

/**
 * Who handles a profile tap inside the community UI: the SDK's own profile
 * screens, or this app's (Unified Profile).
 */
export type ProfileTapMode = 'sdkScreens' | 'appScreens';
export type DisplayMode = 'embed' | 'fullscreen';

/** Community UI language: system default or override to French/English. */
export type CommunityLocaleOverride = 'system' | 'fr' | 'en';

/** Which page of the Settings tab is showing. `root` is the summary. */
type SettingsRoute =
  | 'root'
  | 'account'
  | 'appearance'
  | 'language'
  | 'developer'
  | 'about';

const LOCALE_SUMMARIES: Record<CommunityLocaleOverride, string> = {
  system: 'Follow system',
  fr: 'French (fr)',
  en: 'English (en)',
};

const APPEARANCE_SUMMARIES: Record<ThemeMode, string> = {
  system: 'Follow system',
  light: 'Light',
  dark: 'Dark',
};

export interface SettingsScreenProps {
  /** Whether a token was injected for the plain demo user — no token, no Connect. */
  hasSsoUser: boolean;
  /**
   * Whether the SDK was initialized in `sso` mode. In `octopus` mode the SDK owns
   * login, so the host has no user to connect.
   */
  isSsoAuth: boolean;
  /** Back to the Config screen (`settings-reconfigure-button`). */
  onReconfigure: () => void;
  /** Opens the Debug console (`debug-open-button`), which App presents as a modal. */
  onOpenDebug: () => void;
  isConnectingUser: boolean;
  isMockUserConnected: boolean;
  /** What the SDK's own connection stream says — the truth the profile card reports. */
  isUserConnected: boolean;
  isGuest: boolean;
  /** The SSO `sub` in force, as configured. */
  clientUserId: string;
  /** Entitlements the SDK currently reports for the connected profile. */
  entitlements: string[];
  /** Community UI language override — read-only here; set on the Config screen. */
  communityLocaleOverride: CommunityLocaleOverride;
  onConnectUser: () => void;
  onDisconnectUser: () => void;
  /** `refreshEntitlements()` — the lighter, session-preserving refresh. */
  onRefreshEntitlements: () => void;
  /**
   * Appearance of the SAMPLE's own chrome, and of the SDK through `setThemeMode` — read-only
   * here; set on the Config screen (spec 05: Settings reads/displays, never sets).
   */
  appearance: ThemeMode;
  themeSet: ThemeSet;
  /** Which community the SDK is pointed at, for the Server & community subtitle. */
  communitySummary: string;
  /** Clears the sample's saved setup and returns to the Config screen. */
  onResetData: () => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  /** Shown in Account for 5s when editUser/loginRequired callback is fired in embed mode */
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
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.row,
        { backgroundColor: chrome.surface, borderColor: chrome.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: chrome.text }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: chrome.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={22}
        color={chrome.textSecondary}
      />
    </TouchableOpacity>
  );
}

function GroupTitle({
  label,
  chrome,
}: {
  label: string;
  chrome: ReturnType<typeof chromeColors>;
}) {
  return (
    <Text style={[styles.groupTitle, { color: chrome.textSecondary }]}>
      {label}
    </Text>
  );
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
  children,
}: {
  title: string;
  chrome: ReturnType<typeof chromeColors>;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.container, { backgroundColor: chrome.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <TouchableOpacity
          testID="settings-back-button"
          style={styles.backRow}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={20} color={chrome.accent} />
          <Text style={[styles.backLabel, { color: chrome.accent }]}>
            Settings
          </Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: chrome.text }]}>{title}</Text>
        {children}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

/**
 * Settings tab — a pure summary, and five pages behind it.
 *
 * The rule the shared design gives this screen: **the root holds no control**. One line is one
 * navigation, and its subtitle is the CURRENT VALUE rather than a description, so the whole
 * state of the sample can be read without opening anything. The controls that used to sit here
 * are now either on their own page below or on the Config screen, where the rest of the
 * "how is this host wired" answers live.
 */
export function SettingsScreen({
  hasSsoUser,
  isSsoAuth,
  onReconfigure,
  onOpenDebug,
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
  communitySummary,
  onResetData,
  isDark,
  primaryColor,
  userCallbackMessage,
}: SettingsScreenProps) {
  const [route, setRoute] = useState<SettingsRoute>('root');
  // Subscribed here, not only inside the console: the Developer tools line reports the
  // live entry count, which is the whole point of putting it in the summary.
  const entries = useDebugLog();
  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const secondaryColor = chrome.textSecondary;
  const cardBg = chrome.surface;
  const borderColor = chrome.border;

  const accountSummary = !isSsoAuth
    ? 'Octopus auth · the SDK owns login'
    : isUserConnected
      ? `Connected as ${clientUserId} · ${entitlements.length} entitlement${
          entitlements.length === 1 ? '' : 's'
        }`
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
      <SubPage title="Account" chrome={chrome} onBack={() => setRoute('root')}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: chrome.tint }]}>
              <Text style={[styles.avatarText, { color: chrome.accent }]}>
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
            <Text style={[styles.hint, { color: secondaryColor }]}>
              None. Entitlements come from the injected token, so the Connection
              scenario's presets are what change them — this sample signs
              nothing itself.
            </Text>
          ) : (
            <View style={styles.chips}>
              {entitlements.map((entitlement) => (
                <View
                  key={entitlement}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: chrome.tint,
                      borderColor: chrome.tintBorder,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: chrome.accent }]}>
                    {entitlement}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {!isSsoAuth ? (
            <Text style={[styles.hint, { color: secondaryColor }]}>
              Octopus auth mode: the SDK owns login, so there is no host user to
              connect. Pick SSO on the Config screen to exercise connectUser.
            </Text>
          ) : !hasSsoUser ? (
            <Text style={[styles.hint, { color: secondaryColor }]}>
              No SSO token injected, so there is nothing to connect: set
              OCTOPUS_SSO_USER_TOKEN in example/.env (copy from .env.dist). The
              user id is set on the Config screen.
            </Text>
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
        title="Appearance"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            App and SDK appearance
          </Text>
          <AboutLine
            label="Appearance"
            value={APPEARANCE_SUMMARIES[appearance]}
            chrome={chrome}
          />
          <AboutLine
            label="SDK colour preset"
            value={themePresetSummary}
            chrome={chrome}
          />
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Read-only here. Set from the Config screen — Settings only displays
            the current value.
          </Text>
        </View>
      </SubPage>
    );
  }

  if (route === 'language') {
    return (
      <SubPage title="Language" chrome={chrome} onBack={() => setRoute('root')}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Community language
          </Text>
          <AboutLine
            label="Language"
            value={LOCALE_SUMMARIES[communityLocaleOverride]}
            chrome={chrome}
          />
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Read-only here. Set from the Config screen — Settings only displays
            the current value.
          </Text>
        </View>
      </SubPage>
    );
  }

  if (route === 'developer') {
    return (
      <SubPage
        title="Developer tools"
        chrome={chrome}
        onBack={() => setRoute('root')}
      >
        {/* Two lines, not a card and a button: this page is part of the same summary,
            and each subtitle is the live value a tester would otherwise open the console
            to read. Both land on the same console — it holds the log and the state
            snapshot — so `debug-open-button` stays on the Events log line, which is the
            one the QA catalog drives. */}
        <SummaryRow
          chrome={chrome}
          testID="debug-open-button"
          title="Events log"
          subtitle={`${entries.length} event${
            entries.length === 1 ? '' : 's'
          } · live`}
          onPress={onOpenDebug}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-debug-info-row"
          title="Debug info"
          subtitle={`SDK ${sampleVersion}${
            sampleBuild === null ? '' : ` · build ${sampleBuild}`
          }`}
          onPress={onOpenDebug}
        />
      </SubPage>
    );
  }

  if (route === 'about') {
    return (
      <SubPage title="About" chrome={chrome} onBack={() => setRoute('root')}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <AboutLine
            label="Sample version"
            value={sampleVersionLabel}
            chrome={chrome}
          />
          <AboutLine
            label="SDK version"
            value={sampleVersion}
            chrome={chrome}
          />
          <AboutLine
            label="Server"
            value={`${octopusServerLabel} — ${octopusHostLabel}`}
            chrome={chrome}
          />
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Both versions read the same wrapper manifest: this sample ships with
            the package it demonstrates, and its store version is stamped from
            it.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Licences</Text>
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Open-source notices for this sample's dependencies ship with the
            store build.{' '}
            {/* Plain, non-stylized wording only: Meta's trademark
            policy allows the name in descriptive text but no logo or stylized
            mark. */}
            Built with React Native.
          </Text>
          <Text style={[styles.builtWith, { color: textColor }]}>
            Built with the Octopus SDK for React Native
          </Text>
        </View>
      </SubPage>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: chrome.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
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
          subtitle={LOCALE_SUMMARIES[communityLocaleOverride]}
          onPress={() => setRoute('language')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-reconfigure-button"
          title="Server & community"
          subtitle={communitySummary}
          onPress={onReconfigure}
        />

        <GroupTitle chrome={chrome} label="Support" />
        <SummaryRow
          chrome={chrome}
          testID="settings-developer-row"
          title="Developer tools"
          subtitle="Events log · Debug info"
          onPress={() => setRoute('developer')}
        />
        <SummaryRow
          chrome={chrome}
          testID="settings-about-row"
          title="About"
          subtitle={footer}
          onPress={() => setRoute('about')}
        />
        {/* The one red row of the sample — last in Support, at Settings level, not
            buried in About (spec 05 §"Décisions actées" / card 00 décision ⑥). */}
        <TouchableOpacity
          testID="settings-reset-button"
          style={[
            styles.row,
            {
              backgroundColor: chrome.dangerSurface,
              borderColor: chrome.dangerBorder,
            },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
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
        >
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: chrome.danger }]}>
              Reset Configuration
            </Text>
            <Text style={[styles.rowSubtitle, { color: chrome.danger }]}>
              Local demo setup only — nothing is deleted on the server
            </Text>
          </View>
        </TouchableOpacity>

        {/* The build's own identity, readable without opening anything — a tester reporting
            a bug has to be able to say which backend and which version they were on. */}
        <Text
          testID="settings-server-label"
          style={[styles.footerLine, { color: secondaryColor }]}
        >
          {`${octopusServerLabel} — ${octopusHostLabel}`}
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

function AboutLine({
  label,
  value,
  chrome,
}: {
  label: string;
  value: string;
  chrome: ReturnType<typeof chromeColors>;
}) {
  return (
    <View style={styles.aboutLine}>
      <Text style={[styles.aboutLabel, { color: chrome.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.aboutValue, { color: chrome.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  groupTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  connectedPill: {
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  connectedPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  callbackLine: {
    fontSize: 12,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helpLine: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  aboutLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  aboutLabel: {
    fontSize: 13,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  builtWith: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerLine: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
