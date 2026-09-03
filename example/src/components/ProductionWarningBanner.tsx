import { StyleSheet, Text, View } from 'react-native';

import {
  octopusHostLabel,
  octopusShowsServerWarning,
} from '../config/demoConfig';

/**
 * A persistent red banner shown when an *internal* build may be talking to a
 * production / client-facing Octopus server.
 *
 * Two conditions, both required — see `octopusShowsServerWarning`. The server
 * half: a build that declares no `OCTOPUS_API_HOST` resolves to the demo
 * backend, so only `OCTOPUS_API_HOST=api.8pus.io` reaches production, where
 * every action (connect, follow, post) can hit real client communities;
 * whichever host is named is passed to `initialize()` as `apiServer` (see
 * `demoConfig.ts`), so this half tracks the server the SDK is actually routed
 * to. The build half: the banner is an internal safety net, so a host who
 * points their own clone at production with their own key — their nominal
 * integration case — never sees it.
 *
 * Mounted above every tab and not dismissible, mirroring the Flutter sample's
 * `ProductionWarningBanner` and the Android sample's.
 */
export function ProductionWarningBanner() {
  if (!octopusShowsServerWarning) return null;

  return (
    <View testID="env-warning-banner" style={styles.banner}>
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textColumn}>
        <Text style={styles.title}>PRODUCTION SERVER — {octopusHostLabel}</Text>
        <Text style={styles.body}>
          Client communities may be reachable. DO NOT publish test content.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  icon: {
    fontSize: 14,
    lineHeight: 18,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: {
    color: '#FECACA',
    fontSize: 12,
    lineHeight: 16,
  },
});
