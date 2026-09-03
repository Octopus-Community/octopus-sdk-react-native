import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import type { OctopusConnectionState } from '@octopus-community/react-native';

import { chromeColors } from '../theme/branding';

/** The three states the card can be in — the same trio on every sample. */
export type ConnectionKind = 'connected' | 'guest' | 'off';

export interface ConnectionStateCardProps {
  /** The SDK's own connection state, or `null` before it has published one. */
  state: OctopusConnectionState | null;
  isDark: boolean;
  /**
   * The connected user's id, as the profile reports it. Shown on the CONNECTED state so the
   * tester can tell *which* user the session belongs to.
   */
  clientUserId?: string | null;
  /**
   * Set when the last connect attempt failed. It is what separates "no session yet" from a
   * session that was tried and refused — the two read identically on the SDK's side.
   */
  hasFailedConnection?: boolean;
}

/** Resolves the SDK's connection state into one of the three card states. */
export function connectionKind(
  state: OctopusConnectionState | null
): ConnectionKind {
  if (state === null || !state.connected) return 'off';
  return state.isGuest ? 'guest' : 'connected';
}

/**
 * The connection card — the sample's answer to "can I post right now, and as whom?".
 *
 * Three states, colour-coded the same way on every sample: green when a real SSO user holds
 * the session, amber when the SDK is browsing as a guest (readable but read-only), red when
 * there is no session at all. The subtitle names the *consequence* rather than the state, which
 * is what a tester actually needs before deciding whether a failed post is a bug.
 */
export function ConnectionStateCard({
  state,
  isDark,
  clientUserId,
  hasFailedConnection = false,
}: ConnectionStateCardProps) {
  const chrome = chromeColors(isDark);
  const kind = connectionKind(state);

  const { badge, tone, surface, glyph, subtitle } =
    kind === 'connected'
      ? {
          badge: 'CONNECTED',
          tone: chrome.success,
          surface: chrome.surface,
          glyph: 'verified-user' as const,
          subtitle:
            clientUserId !== null && clientUserId !== undefined
              ? `Connected · ${clientUserId}`
              : 'Connected · full access',
        }
      : kind === 'guest'
        ? {
            badge: 'GUEST',
            tone: chrome.guestAccent,
            surface: chrome.warnSurface,
            glyph: 'visibility' as const,
            subtitle: 'Browsing as guest · Read-only',
          }
        : {
            badge: 'OFF',
            tone: chrome.danger,
            surface: chrome.dangerSurface,
            glyph: 'person-off' as const,
            // The spec's wording, but only when a session was actually attempted and lost:
            // saying "SSO session failed" before anything was tried would report a failure
            // that never happened.
            subtitle: hasFailedConnection
              ? 'Not connected · SSO session failed'
              : 'Not connected · No SSO session yet',
          };

  return (
    <View
      testID="home-connection-card"
      style={[styles.card, { backgroundColor: surface }]}
    >
      <MaterialIcons name={glyph} size={22} color={tone} />
      <View style={styles.texts}>
        <Text
          testID="home-connection-badge"
          style={[styles.badge, { color: tone }]}
        >
          {badge}
        </Text>
        <Text style={[styles.subtitle, { color: chrome.text }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
