import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

/** The sample uses controller-based status-bar appearance on iOS. */
export function SampleSystemBars({
  statusBar,
  isDark,
}: {
  statusBar: 'light' | 'dark';
  isDark: boolean;
}) {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      NativeModules.SampleSystemBars.setStyle(statusBar);
    }
  }, [statusBar]);

  const navigationBar = isDark ? 'light' : 'dark';
  return Platform.OS === 'android' ? (
    <SystemBars style={{ statusBar, navigationBar }} />
  ) : null;
}
