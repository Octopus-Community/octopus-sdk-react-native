import { StyleSheet, View } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import { StatusBand } from '../components/StatusBand';
import { chromeColors } from '../theme/branding';

export interface CommunityScreenProps {
  interceptUrls: boolean;
  interceptProfileTaps: boolean;
  isDark: boolean;
  /** Why the SDK could not be started, if it could not — drives the blocking band. */
  initError: string | null;
  /** Re-runs `initialize()` with the configuration already in force. */
  onRetryInit: () => void;
  /** Whether a host user is connected. False in guest and disconnected alike. */
  isUserConnected: boolean;
  /**
   * Whether the SDK runs in SSO mode. In `octopus` mode the SDK owns the login, so there is
   * no host user for the degraded band to ask for and the band is not shown.
   */
  isSsoAuth: boolean;
  /** Sends the reader where a user can be connected — Settings, then Account. */
  onConnectUser: () => void;
  /**
   * Bumped by every runtime `switchCommunity`. Keys the embedded view: the SDK requires the
   * view to be remounted after a switch, since the one on screen is bound to the community
   * the SDK has just left.
   */
  communitySessionNonce: number;
}

/**
 * Community tab: the embedded `OctopusUIView`, always on the main feed.
 *
 * The only tab that belongs to the SDK, so the sample draws NO chrome inside the SDK's
 * surface — not even a preset picker. What the host has to say about the SDK's state goes in
 * a {@link StatusBand} above it instead — see the bands below. Picking a different
 * `initialScreen` to preview is the Scenarios tab's job (the `initialScreen` scenario), not
 * this one's — see spec 04.
 */
export function CommunityScreen({
  interceptUrls,
  interceptProfileTaps,
  isDark,
  initError,
  onRetryInit,
  isUserConnected,
  isSsoAuth,
  onConnectUser,
  communitySessionNonce,
}: CommunityScreenProps) {
  const chrome = chromeColors(isDark);

  // The two persistent bands, in severity order. Blocking wins outright: with no SDK there is
  // nothing for the read-only band to be read-only about.
  const bands =
    initError !== null ? (
      <StatusBand
        testID="community-band-blocking"
        kind="blocking"
        message="Couldn't reach the community — Check the server and API key in Config."
        actionLabel="Retry"
        onAction={onRetryInit}
        isDark={isDark}
      />
    ) : isSsoAuth && !isUserConnected ? (
      <StatusBand
        testID="community-band-degraded"
        kind="degraded"
        message="Read-only — Connect an SSO user to post and react."
        actionLabel="Connect"
        onAction={onConnectUser}
        isDark={isDark}
      />
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: chrome.background }]}>
      {bands}
      <View style={styles.embedHost}>
        <Octopus.OctopusUIView
          key={communitySessionNonce}
          interceptUrls={interceptUrls}
          interceptProfileTaps={interceptProfileTaps}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  embedHost: {
    flex: 1,
  },
});
