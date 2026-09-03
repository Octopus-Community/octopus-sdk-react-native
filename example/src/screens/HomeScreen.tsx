import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import type { OctopusConnectionState } from '@octopus-community/react-native';

import { AppSection } from '../components/AppSection';
import { ConfigSummaryCard } from '../components/ConfigSummaryCard';
import { ConnectionStateCard } from '../components/ConnectionStateCard';
import { ServerStateCard } from '../components/ServerStateCard';
import { PillButton } from '../components/PillButton';
import type { DemoConfig } from '../config/demoConfig';
import {
  apiKeySourceLabel,
  communityLabel,
  octopusHostLabel,
  octopusServerLabel,
} from '../config/demoConfig';
import { sampleVersion } from '../config/sampleVersion';
import { chromeColors } from '../theme/branding';

export interface HomeScreenProps {
  config: DemoConfig;
  isDark: boolean;
  isInitialized: boolean;
  initError: string | null;
  /** The SDK's connection state, or `null` before it has published one. */
  connectionState: OctopusConnectionState | null;
  /** The connected user's host-side id, as the profile reports it. */
  clientUserId: string | null;
  /** Entitlements the connected profile holds — empty when there is no session. */
  entitlements: string[];
  /** Whether the last connect attempt failed, which is what OFF's wording turns on. */
  hasFailedConnection: boolean;
  /** Human-readable appearance + colour preset, e.g. "Follow system · SDK default". */
  themeSummary: string;
  /** Human-readable community language, e.g. "Follow system". */
  languageSummary: string;
  /** When `initialize()` last resolved — the session's own start time. */
  sessionStartedAt: number | null;
  /** The key the SDK actually runs on right now (config or runtime switch). */
  effectiveApiKey: string;
  onEditConfig: () => void;
  onOpenCommunity: () => void;
  onOpenEmbeddedCommunity: () => void;
}

/**
 * Home tab — what this build is pointed at, whether the SDK is up, and who holds the session.
 *
 * Read-only above the dock: every state-changing control lives in a scenario, in Config or in
 * Settings, so opening Home can never change what the next QA step observes. The dock is the
 * one exception, and it only *presents* the community — it changes no SDK state.
 */
export function HomeScreen({
  config,
  isDark,
  isInitialized,
  initError,
  connectionState,
  clientUserId,
  entitlements,
  hasFailedConnection,
  themeSummary,
  languageSummary,
  sessionStartedAt,
  effectiveApiKey,
  onEditConfig,
  onOpenCommunity,
  onOpenEmbeddedCommunity,
}: HomeScreenProps) {
  const chrome = chromeColors(isDark);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {initError !== null ? (
          <View
            testID="home-init-error"
            style={[
              styles.stateCard,
              { backgroundColor: chrome.dangerSurface },
            ]}
          >
            <MaterialIcons name="error" size={22} color={chrome.danger} />
            <View style={styles.stateTexts}>
              <Text style={[styles.stateTitle, { color: chrome.danger }]}>
                SDK not initialized
              </Text>
              <Text style={[styles.stateBody, { color: chrome.text }]}>
                {initError}
              </Text>
            </View>
          </View>
        ) : (
          <View
            testID="home-sdk-card"
            style={[styles.stateCard, { backgroundColor: chrome.surface }]}
          >
            <MaterialIcons
              name={isInitialized ? 'check-circle' : 'schedule'}
              size={22}
              color={isInitialized ? chrome.success : chrome.textSecondary}
            />
            <View style={styles.stateTexts}>
              <View style={styles.stateTitleRow}>
                <Text style={[styles.stateTitle, { color: chrome.text }]}>
                  {isInitialized ? 'SDK initialized' : 'SDK initializing'}
                </Text>
                {isInitialized && (
                  <View style={styles.readyRow}>
                    <View
                      style={[styles.dot, { backgroundColor: chrome.success }]}
                    />
                    <Text style={[styles.ready, { color: chrome.success }]}>
                      READY
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.stateBody, { color: chrome.textSecondary }]}>
                SDK version {sampleVersion}
              </Text>
              <Text style={[styles.stateBody, { color: chrome.textSecondary }]}>
                Session {describeSession(sessionStartedAt)}
              </Text>
            </View>
          </View>
        )}

        {initError === null && isInitialized && (
          <Text style={[styles.note, { color: chrome.textSecondary }]}>
            initialize() resolves without checking the key: neither native SDK
            validates it at start-up, so a wrong key still reads as initialized
            here and only fails on the first call to the backend.
          </Text>
        )}

        <ConfigSummaryCard
          isDark={isDark}
          testID="home-config-summary"
          onEdit={onEditConfig}
          rows={[
            { label: 'Server environment', value: octopusServerLabel },
            { label: 'Host', value: octopusHostLabel },
            { label: 'Community', value: communityLabel(config) },
            { label: 'API key source', value: apiKeySourceLabel(config) },
            {
              label: 'SSO user',
              value:
                config.authMode === 'sso'
                  ? config.userId
                  : 'Octopus login (SDK-managed)',
            },
            {
              label: 'Entitlements',
              value:
                entitlements.length === 0 ? 'None' : entitlements.join(', '),
            },
            { label: 'Theme', value: themeSummary },
            { label: 'Language', value: languageSummary },
          ]}
        />

        <ConnectionStateCard
          state={connectionState}
          isDark={isDark}
          clientUserId={clientUserId}
          hasFailedConnection={hasFailedConnection}
        />

        <ServerStateCard
          isDark={isDark}
          apiKey={effectiveApiKey}
          isInitialized={isInitialized}
          sessionStartedAt={sessionStartedAt}
        />

        <AppSection isDark={isDark} />
      </ScrollView>

      {/* Anchored rather than scrolled away: presenting the community is the one thing a
          tester does from Home on every single pass. */}
      <View
        style={[
          styles.dock,
          { backgroundColor: chrome.surface, borderTopColor: chrome.border },
        ]}
      >
        <PillButton
          testID="home-open-community-button"
          label="Open community"
          icon="forum"
          isDark={isDark}
          fullWidth
          onPress={onOpenCommunity}
        />
        {/* The binding presents the community fullscreen or embedded and nothing else — it
            exposes no sheet and no modal presentation, so no button offers one. */}
        <PillButton
          testID="home-open-embedded-button"
          label="Open embedded in the app"
          variant="secondary"
          isDark={isDark}
          fullWidth
          onPress={onOpenEmbeddedCommunity}
        />
      </View>
    </View>
  );
}

/** "started at 14:32" / "not started yet" — the session line of the SDK card. */
function describeSession(startedAt: number | null): string {
  if (startedAt === null) return 'not started yet';
  const at = new Date(startedAt);
  const time = [at.getHours(), at.getMinutes()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
  return `started at ${time}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  stateTexts: {
    flex: 1,
    gap: 3,
  },
  stateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ready: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stateBody: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
  },
  dock: {
    padding: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
