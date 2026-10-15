import { sampleTypography } from '../theme/tokens';
import { chromeColors } from '../theme/branding';
import { StyleSheet, Text, View } from 'react-native';

import {
  octopusHostLabel,
  octopusIsInternalBuild,
  PRODUCTION_HOST,
  shouldShowServerWarning,
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
export function ProductionWarningBanner({
  isDark = false,
  host = octopusHostLabel,
}: {
  isDark?: boolean;
  host?: string;
}) {
  const chrome = chromeColors(isDark);
  if (
    !shouldShowServerWarning(octopusIsInternalBuild, host === PRODUCTION_HOST)
  )
    return null;

  return (
    <View
      testID="env-warning-banner"
      style={[
        styles.banner,
        { backgroundColor: chrome.dangerSurface, borderColor: chrome.danger },
      ]}
    >
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textColumn}>
        <Text style={[styles.title, { color: chrome.danger }]}>
          PRODUCTION SERVER — {host}
        </Text>
        <Text style={[styles.body, { color: chrome.danger }]}>
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
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  icon: {
    ...sampleTypography.callout,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...sampleTypography.caption,

    letterSpacing: 0.3,
  },
  body: {
    ...sampleTypography.caption,
  },
});
