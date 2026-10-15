import { sampleTypography } from '../theme/tokens';
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

import type { HostUser } from '../auth/hostUser';
import { chromeColors } from '../theme/branding';
import { ProfileHeader } from '../components/SampleRecipes';
import { SampleInfoRow } from '../components/SampleInfoRow';
import { redactApiKeys } from '../config/apiKeyMask';

type LoadState =
  | { status: 'loading' }
  | { status: 'data'; data: OctopusCommunityData }
  | { status: 'unknown' }
  | { status: 'error'; message: string };

export interface ClientProfileScreenProps {
  isDark: boolean;
  /** The member the SDK handed over through the `navigateToProfile` listener. */
  clientUserId: string;
  hostUser?: HostUser | null;
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
  hostUser,
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
          message: redactApiKeys(e instanceof Error ? e.message : String(e)),
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
      <ProfileHeader title="Host-owned profile screen" isDark={isDark} />
      <Text style={[styles.caption, { color: chrome.textSecondary }]}>
        The Octopus SDK handed this profile tap to the app via its
        onNavigateToProfile callback (Unified Profile).
      </Text>
      <View style={[styles.divider, { backgroundColor: chrome.border }]} />
      <SampleInfoRow
        label="clientUserId — the host app's own id"
        value={clientUserId}
        isDark={isDark}
      />
      {hostUser && (
        <View testID="clientProfile-host-data" style={styles.data}>
          <SampleInfoRow
            label="Display name"
            value={hostUser.profile?.username ?? 'Not supplied'}
            isDark={isDark}
          />
          <SampleInfoRow
            label="Avatar"
            value={hostUser.profile?.profilePicture ?? 'Not supplied'}
            isDark={isDark}
          />
          <SampleInfoRow
            label="Bio"
            value={hostUser.profile?.biography || 'Not supplied'}
            isDark={isDark}
          />
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: chrome.border }]} />
      <View style={styles.data}>
        <Text style={[styles.cardTitle, { color: chrome.text }]}>
          Octopus community data — fetchCommunityData(clientUserId)
        </Text>
        {state.status === 'loading' && <ActivityIndicator />}
        {state.status === 'data' && (
          <View testID="clientProfile-data" style={styles.data}>
            <SampleInfoRow
              label="profileId"
              value={state.data.profileId}
              isDark={isDark}
            />
            <SampleInfoRow
              label="messageCount"
              value={String(state.data.messageCount ?? '—')}
              isDark={isDark}
            />
            <SampleInfoRow
              label="gamification"
              value={
                state.data.gamification
                  ? `level ${state.data.gamification.level}`
                  : '—'
              }
              isDark={isDark}
            />
          </View>
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
    padding: 24,
    gap: 20,
  },
  userId: {
    ...sampleTypography.headline,

    textAlign: 'center',
  },
  caption: {
    ...sampleTypography.callout,
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: { height: 1 },
  data: { gap: 12 },
  cardTitle: {
    ...sampleTypography.label,
  },
});
