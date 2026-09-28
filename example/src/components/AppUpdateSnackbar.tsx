import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { chromeColors } from '../theme/branding';
import {
  APP_UPDATE_ANNOUNCEMENT_ACTION_LABEL,
  APP_UPDATE_ANNOUNCEMENT_DURATION_MS,
  describeAppUpdateAnnouncement,
  isAppUpdateSupported,
} from '../update/appUpdate';
import {
  startAppUpdateFlow,
  subscribeToAppUpdateAnnouncements,
} from '../update/appUpdateStore';

export interface AppUpdateSnackbarProps {
  isDark: boolean;
  /**
   * Distance from the bottom of the parent, in dp. The parent decides it because only it
   * knows what sits below: the tab bar (which already clears the system bar) or, before
   * the shell is up, the system navigation bar itself.
   */
  bottomOffset: number;
}

/**
 * The shell's "new build available" announcement, as a snackbar carrying an `Update`
 * action that starts Play's in-app update flow directly — the call the Settings card's
 * `Update now` makes. Mirrors the Android native sample's and the Flutter example's
 * snackbar: shown once per versionCode, dismissible, hidden on its own after
 * {@link APP_UPDATE_ANNOUNCEMENT_DURATION_MS}.
 *
 * Renders nothing where the in-app update module is absent (iOS): the App Store has no
 * in-place flow an action could start.
 */
export function AppUpdateSnackbar({
  isDark,
  bottomOffset,
}: AppUpdateSnackbarProps) {
  const [versionCode, setVersionCode] = useState<number | null>(null);

  useEffect(() => {
    if (!isAppUpdateSupported()) return;
    return subscribeToAppUpdateAnnouncements(setVersionCode);
  }, []);

  // Keyed on the version, so a different build announced while one is showing restarts
  // the timer instead of inheriting what was left of the previous one.
  useEffect(() => {
    if (versionCode === null) return;
    const timeout = setTimeout(
      () => setVersionCode(null),
      APP_UPDATE_ANNOUNCEMENT_DURATION_MS
    );
    return () => clearTimeout(timeout);
  }, [versionCode]);

  if (versionCode === null) return null;

  const chrome = chromeColors(isDark);
  const handleUpdate = () => {
    setVersionCode(null);
    startAppUpdateFlow();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: bottomOffset }]}
    >
      <View
        testID="sample-update-snackbar"
        accessibilityLiveRegion="polite"
        style={[styles.snackbar, { backgroundColor: chrome.snackbar }]}
      >
        <Text
          style={[styles.message, { color: chrome.onSnackbar }]}
          numberOfLines={2}
        >
          {describeAppUpdateAnnouncement(versionCode)}
        </Text>
        <Pressable
          testID="sample-update-snackbar-action"
          accessibilityRole="button"
          onPress={handleUpdate}
          hitSlop={4}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={[styles.actionLabel, { color: chrome.snackbarAction }]}>
            {APP_UPDATE_ANNOUNCEMENT_ACTION_LABEL}
          </Text>
        </Pressable>
        <Pressable
          testID="sample-update-snackbar-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => setVersionCode(null)}
          hitSlop={4}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        >
          <MaterialIcons name="close" size={20} color={chrome.onSnackbar} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  snackbar: {
    width: '100%',
    maxWidth: 600,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    // Above an embedded community view: without elevation, Android draws the native
    // host's own layer over this one.
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 10,
  },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismiss: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.6,
  },
});
