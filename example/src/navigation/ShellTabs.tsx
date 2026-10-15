import { View, StyleSheet } from 'react-native';
import type { TabId } from '../components/TabBar';
import { TabSurface } from './TabSurface';

/** Each tab has a stable position, even when a different tab owns the screen. */
export function ShellTabs({
  activeTab,
  settings,
  scenarios,
  community,
}: {
  activeTab: TabId;
  settings: React.ReactNode;
  scenarios: React.ReactNode;
  community: React.ReactNode;
}) {
  return (
    <View style={styles.tabs}>
      <TabSurface testID="settings-surface" visible={activeTab === 'settings'}>
        {settings}
      </TabSurface>
      <TabSurface
        testID="scenarios-surface"
        visible={activeTab === 'scenarios'}
      >
        {scenarios}
      </TabSurface>
      <TabSurface
        testID="community-surface"
        visible={activeTab === 'community'}
      >
        {community}
      </TabSurface>
    </View>
  );
}

const styles = StyleSheet.create({ tabs: { flex: 1 } });
