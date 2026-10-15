import { sampleRadius, sampleTypography } from '../theme/tokens';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sampleVersionLabel } from '../config/sampleVersion';
import { chromeColors } from '../theme/branding';
import {
  describeAppUpdateStatus,
  isAppUpdateProblem,
  type AppUpdateStatus,
} from '../update/appUpdate';
import {
  getAppUpdateStatus,
  runAppUpdateCheck,
  startAppUpdateFlow,
  subscribeToAppUpdate,
} from '../update/appUpdateStore';
import { PillButton } from './PillButton';

/** Where this build came from — the line under the version. */
function describeProvenance(status: AppUpdateStatus): string {
  switch (status.kind) {
    case 'unsupported':
      return 'Local build · no in-app update flow';
    case 'notFromPlayStore':
      return 'Not installed from Play Store';
    default:
      return 'Play Store · internal testing';
  }
}

export interface AppSectionProps {
  isDark: boolean;
}

/**
 * Settings' "App" section — which build of the sample this is, where it came from, and
 * the one control that can replace it.
 *
 * Always rendered, unlike the card it replaces: a build with no in-app update flow (iOS, or a
 * sideloaded APK) still has to say which version it is, which was the whole point of the gap
 * this closes. Only the update button is conditional, because nothing else can act on it.
 *
 * Nothing starts Play's flow but a tap on the button — the rule the shared contract binds.
 */
export function AppSection({ isDark }: AppSectionProps) {
  const status = useSyncExternalStore(subscribeToAppUpdate, getAppUpdateStatus);
  const chrome = chromeColors(isDark);
  const canUpdate = status.kind === 'available';
  const busy = status.kind === 'checking';
  const supported = status.kind !== 'unsupported';
  const provenance = describeProvenance(status);
  const updateStatus = describeAppUpdateStatus(status);

  return (
    <View
      testID="sample-update-card"
      style={[styles.card, { backgroundColor: chrome.surface }]}
    >
      <Text style={[styles.title, { color: chrome.text }]}>App</Text>
      <Text style={[styles.version, { color: chrome.text }]}>
        Sample {sampleVersionLabel}
      </Text>
      <Text style={[styles.provenance, { color: chrome.textSecondary }]}>
        {provenance}
      </Text>
      {supported && (
        <>
          {updateStatus !== provenance && (
            <Text
              testID="sample-update-status"
              style={[
                styles.status,
                {
                  color: isAppUpdateProblem(status)
                    ? chrome.danger
                    : canUpdate
                      ? chrome.accent
                      : chrome.textSecondary,
                },
              ]}
            >
              {updateStatus}
            </Text>
          )}
          <PillButton
            testID="sample-update-action"
            label={canUpdate ? 'Update now' : 'Check for update'}
            isDark={isDark}
            variant={canUpdate ? 'primary' : 'secondary'}
            loading={busy}
            onPress={canUpdate ? startAppUpdateFlow : runAppUpdateCheck}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: sampleRadius.md,
    padding: 16,
    gap: 4,
  },
  title: {
    ...sampleTypography.body,

    marginBottom: 6,
  },
  version: {
    ...sampleTypography.callout,
  },
  provenance: {
    ...sampleTypography.caption,
  },
  status: {
    ...sampleTypography.caption,

    marginTop: 6,
    marginBottom: 10,
  },
});
