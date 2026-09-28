import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import type { OctopusCommunityData } from '@octopus-community/react-native';

import { chromeColors } from '../theme/branding';

type LoadState =
  | { status: 'loading' }
  | { status: 'data'; data: OctopusCommunityData }
  | { status: 'unknown' }
  | { status: 'error'; message: string };

export interface ClientProfileScreenProps {
  isDark: boolean;
  /** The member the SDK handed over through the `navigateToProfile` listener. */
  clientUserId: string;
}

/**
 * The host app's own profile screen — what Unified Profile routes a profile tap to once
 * the community exposes client user ids and the host wires `onNavigateToProfile`. Same
 * `clientProfile-*` test ids as the Android sample's `ClientProfileScreen`, so one QA
 * script asserts the landing on every platform.
 */
export function ClientProfileScreen({
  isDark,
  clientUserId,
}: ClientProfileScreenProps) {
  const chrome = chromeColors(isDark);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Octopus.fetchCommunityData({ clientUserId })
      .then((data) => {
        if (cancelled) return;
        setState(data ? { status: 'data', data } : { status: 'unknown' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [clientUserId]);

  return (
    <ScrollView
      style={{ backgroundColor: chrome.screen }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.userId, { color: chrome.text }]}>
        {clientUserId}
      </Text>
      <Text style={[styles.caption, { color: chrome.textSecondary }]}>
        clientUserId — the host app's own id
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: chrome.surface, borderColor: chrome.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: chrome.text }]}>
          Octopus community data — fetchCommunityData(clientUserId)
        </Text>
        {state.status === 'loading' && <ActivityIndicator />}
        {state.status === 'data' && (
          <Text testID="clientProfile-data" style={{ color: chrome.text }}>
            {`profileId: ${state.data.profileId}\nmessageCount: ${state.data.messageCount ?? '—'}\ngamification: ${
              state.data.gamification
                ? `level ${state.data.gamification.level}`
                : '—'
            }`}
          </Text>
        )}
        {state.status === 'unknown' && (
          <Text testID="clientProfile-unknown" style={{ color: chrome.text }}>
            Unknown member — no community data available.
          </Text>
        )}
        {state.status === 'error' && (
          <Text testID="clientProfile-error" style={{ color: chrome.danger }}>
            {state.message}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  userId: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
