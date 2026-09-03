import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import type { OctopusDebugCommunityConfig } from '@octopus-community/react-native';

import { chromeColors } from '../theme/branding';
import { PillButton } from './PillButton';

export interface ServerStateCardProps {
  isDark: boolean;
  /** The key `initialize()` was actually called with — what the backend sees. */
  apiKey: string;
  /** Gates the fetch: the native read needs a running SDK. */
  isInitialized: boolean;
  /**
   * When `initialize()` last resolved. A community switch or reconfigure re-initializes
   * the SDK while `isInitialized` never changes value — this is the signal that re-reads
   * the config for the new community instead of keeping the previous one on screen.
   */
  sessionStartedAt: number | null;
}

/**
 * The live server state: the API key this session runs on, and the community config the
 * backend currently serves (GetConfig), read straight from the native SDK. This is the
 * screenshot that proves "we are on THIS community and the server said THIS" — the config
 * summary above it only proves what the app *asked for*.
 *
 * The whole key is shown on purpose: a truncated key cannot prove which community a QA
 * session ran against, and community API keys identify, they do not authenticate.
 */
export function ServerStateCard({
  isDark,
  apiKey,
  isInitialized,
  sessionStartedAt,
}: ServerStateCardProps) {
  const chrome = chromeColors(isDark);
  const [config, setConfig] = useState<OctopusDebugCommunityConfig | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await Octopus.debugGetCommunityConfig();
      setConfig(snapshot);
      setError(null);
      setFetchedAt(new Date());
    } catch (e) {
      setConfig(null);
      setFetchedAt(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // First read as soon as the SDK is up — and again on every re-initialize
  // (`sessionStartedAt` moves) so a community switch never leaves the previous
  // community's flags on screen next to the new key. GetConfig may still be in flight
  // then, which renders as "not fetched yet" until the tester hits Refresh.
  useEffect(() => {
    if (isInitialized) {
      refresh();
    } else {
      setConfig(null);
      setError(null);
      setFetchedAt(null);
    }
  }, [isInitialized, sessionStartedAt, refresh]);

  const rows: { label: string; value: string }[] = [
    { label: 'API key', value: apiKey === '' ? 'None' : apiKey },
  ];
  if (config !== null) {
    rows.push(
      {
        label: 'exposeClientUserId',
        value: config.exposeClientUserId ? 'true' : 'false',
      },
      {
        label: 'forceLoginOnStrongActions',
        value: config.forceLoginOnStrongActions ? 'true' : 'false',
      },
      {
        label: 'displayAccountAge',
        value: config.displayAccountAge ? 'true' : 'false',
      },
      { label: 'termsAcceptanceMode', value: config.termsAcceptanceMode }
    );
  }

  const statusLine = !isInitialized
    ? 'SDK not initialized — no server state to read.'
    : error !== null
      ? `Read failed: ${error}`
      : config === null
        ? 'No community config fetched yet — refresh after the first backend call.'
        : `Community config as served by the backend, read at ${formatTime(fetchedAt)}.`;

  return (
    <View
      testID="server-state-card"
      style={[
        styles.card,
        { backgroundColor: chrome.surface, borderColor: chrome.border },
      ]}
    >
      <Text style={[styles.title, { color: chrome.text }]}>
        Server state (debug)
      </Text>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text
              style={[styles.rowLabel, { color: chrome.textSecondary }]}
              numberOfLines={1}
            >
              {row.label}
            </Text>
            <Text
              testID={`server-state-${row.label}`}
              style={[styles.rowValue, { color: chrome.text }]}
              selectable
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.status, { color: chrome.textSecondary }]}>
        {statusLine}
      </Text>
      <PillButton
        testID="server-state-refresh-button"
        label="Refresh"
        icon="refresh"
        variant="secondary"
        isDark={isDark}
        onPress={refresh}
        style={styles.refresh}
      />
    </View>
  );
}

function formatTime(date: Date | null): string {
  if (date === null) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    fontSize: 12.5,
    width: 132,
  },
  rowValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  status: {
    fontSize: 11.5,
    marginTop: 10,
  },
  refresh: {
    marginTop: 12,
  },
});
