/* eslint-disable react-native/no-inline-styles */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

/** Tab identifiers for the example app: Setup, Theme, SDK Data, Groups, Scenarios, Community */
export type TabId =
  | 'setup'
  | 'theme'
  | 'sdkData'
  | 'groups'
  | 'scenarios'
  | 'community';

export interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  notSeenNotificationsCount?: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'theme', label: 'Theme' },
  { id: 'sdkData', label: 'SDK Data' },
  { id: 'groups', label: 'Groups' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'community', label: 'Community' },
];

const MAIN_TABS = TABS.slice(0, 5);
const COMMUNITY_TAB: (typeof TABS)[0] = TABS[5]!;

function TabButton({
  tab,
  isActive,
  showBadge,
  notSeenNotificationsCount,
  onPress,
  isDark,
  primaryColor,
  onPrimaryColor,
  style,
}: {
  tab: (typeof TABS)[0];
  isActive: boolean;
  showBadge: boolean;
  notSeenNotificationsCount: number;
  onPress: () => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  style?: object;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${tab.label} tab`}
    >
      <View
        style={[styles.tabInner, isActive && { backgroundColor: primaryColor }]}
      >
        <View style={styles.tabLabelRow}>
          <Text
            style={[
              styles.tabLabel,
              { color: isDark ? '#cccccc' : '#666666' },
              isActive && { color: onPrimaryColor },
            ]}
          >
            {tab.label}
          </Text>
          {showBadge && (
            <View style={[styles.badge, isDark && styles.badgeDark]}>
              <Text style={styles.badgeText}>
                {notSeenNotificationsCount > 99
                  ? '99+'
                  : notSeenNotificationsCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Bottom tab bar: Setup, Theme, SDK Data on configurable width; Community centered in the rest.
 */
export function TabBar({
  activeTab,
  onTabChange,
  isDark,
  primaryColor,
  onPrimaryColor,
  notSeenNotificationsCount = 0,
}: TabBarProps) {
  const mainTabsWidthFraction = 0.7;
  const rightFraction = 1 - mainTabsWidthFraction;
  return (
    <View
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
      ]}
    >
      <View style={[styles.mainTabsRow, { flex: mainTabsWidthFraction }]}>
        {MAIN_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            showBadge={false}
            notSeenNotificationsCount={0}
            onPress={() => onTabChange(tab.id)}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
        ))}
      </View>
      <View
        style={[
          styles.separator,
          isDark ? styles.separatorDark : styles.separatorLight,
        ]}
      />
      <View style={[styles.communityTabSlot, { flex: rightFraction }]}>
        <TabButton
          tab={COMMUNITY_TAB}
          isActive={activeTab === COMMUNITY_TAB.id}
          showBadge={
            COMMUNITY_TAB.id === 'community' && notSeenNotificationsCount > 0
          }
          notSeenNotificationsCount={notSeenNotificationsCount}
          onPress={() => onTabChange(COMMUNITY_TAB.id)}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
          style={styles.communityTab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    width: '100%',
  },
  containerLight: {
    backgroundColor: '#f8f8f8',
    borderTopColor: '#e0e0e0',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
    borderTopColor: '#333333',
  },
  mainTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 8,
    borderRadius: 1,
  },
  separatorLight: {
    backgroundColor: '#e0e0e0',
  },
  separatorDark: {
    backgroundColor: '#333333',
  },
  communityTabSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityTab: {
    flex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f8f8f8',
  },
  badgeDark: {
    borderColor: '#1a1a1a',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
