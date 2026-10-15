import { sampleRadius, sampleTypography } from '../theme/tokens';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import type { OctopusConnectionState } from '@octopus-community/react-native';

import type { DemoConfig } from '../config/demoConfig';
import { communityLabel } from '../config/demoConfig';
import {
  resolveConfigServer,
  settingsServerLabel,
} from '../config/settingsServer';
import { SampleInfoRow } from './SampleInfoRow';
import { chromeColors } from '../theme/branding';
import { redactApiKeys } from '../config/apiKeyMask';

export interface SettingsOverviewProps {
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
}

/** Settings' compact community and SDK status summary. */
export function SettingsOverview({
  config,
  isDark,
  isInitialized,
  initError,
  connectionState,
}: SettingsOverviewProps) {
  const chrome = chromeColors(isDark);
  const signedIn = connectionState?.connected && !connectionState.isGuest;
  const status = initError
    ? 'Failed to initialize'
    : !isInitialized
      ? 'Starting'
      : signedIn
        ? 'Running, signed in'
        : connectionState?.connected && connectionState.isGuest
          ? 'Running, guest'
          : 'Running, not signed in';
  return (
    <View
      testID="home-sdk-card"
      style={[
        styles.card,
        { backgroundColor: chrome.surface, borderColor: chrome.border },
      ]}
    >
      <Text style={[styles.title, { color: chrome.text }]}>Community</Text>
      <SampleInfoRow
        label="Community"
        value={communityLabel(config)}
        isDark={isDark}
      />
      <SampleInfoRow
        label="Server"
        value={settingsServerLabel(resolveConfigServer(config).host)}
        isDark={isDark}
      />
      <View style={styles.status}>
        <MaterialIcons
          name={
            initError ? 'error' : isInitialized ? 'check-circle' : 'schedule'
          }
          size={20}
          color={initError ? chrome.danger : chrome.success}
        />
        <View style={styles.flexText}>
          <Text
            style={[styles.hint, { color: chrome.text }]}
          >{`SDK · ${status}`}</Text>
          <Text style={[styles.hint, { color: chrome.textSecondary }]}>
            {initError
              ? redactApiKeys(initError)
              : signedIn
                ? 'Every scenario is available.'
                : 'Sign in to try scenarios that need a user.'}
          </Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  flexText: { flex: 1 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: sampleRadius.md,
    marginBottom: 12,
    gap: 12,
  },
  title: { ...sampleTypography.label },
  hint: { ...sampleTypography.caption },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
