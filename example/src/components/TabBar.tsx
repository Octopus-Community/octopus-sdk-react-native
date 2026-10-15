import { sampleRadius, sampleTypography } from '../theme/tokens';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { chromeColors } from '../theme/branding';

/** The Material Icons glyph names this bar draws — three used by the reference sample. */
type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** Tab identifiers for the example app: Scenarios, Community, Settings. */
export type TabId = 'scenarios' | 'community' | 'settings';
export const START_TAB: TabId = 'scenarios';

export interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** The bar's own background — the unread badge draws a ring in it to detach from the icon. */
  badgeRingColor: string;
  /** Tint of the selected item's icon; its label uses the text role. */
  activeColor: string;
  /** Tint of every unselected item. */
  inactiveColor: string;
  /**
   * Fill behind the selected item's icon — theme accent tint, posed explicitly
   * per the shared sample design contract rather than left unset.
   */
  indicatorColor: string;
  notSeenNotificationsCount?: number;
  updateAvailable?: boolean;
  isDark: boolean;
}

/** Stable handles shared with the QA catalogue; the shell owns exactly three tabs. */
export const TABS: {
  id: TabId;
  label: string;
  testId: string;
  icon: TabIconName;
}[] = [
  {
    id: 'scenarios',
    label: 'Scenarios',
    testId: 'scenarios-tab',
    icon: 'science',
  },
  {
    id: 'community',
    label: 'Community',
    testId: 'community-tab',
    icon: 'forum',
  },
  {
    id: 'settings',
    label: 'Settings',
    testId: 'settings-tab',
    icon: 'settings',
  },
];

function TabButton({
  tab,
  isActive,
  badgeCount,
  onPress,
  badgeRingColor,
  activeColor,
  inactiveColor,
  indicatorColor,
  chrome,
}: {
  tab: (typeof TABS)[0];
  isActive: boolean;
  /** 0 hides the badge — only the Community tab ever passes a non-zero count. */
  badgeCount: number;
  onPress: () => void;
  badgeRingColor: string;
  activeColor: string;
  inactiveColor: string;
  indicatorColor: string;
  chrome: ReturnType<typeof chromeColors>;
}) {
  const tint = isActive ? activeColor : inactiveColor;
  return (
    <TouchableOpacity
      testID={tab.testId}
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${tab.label} tab${badgeCount > 0 ? (tab.id === 'settings' ? ', update available' : `, ${badgeCount} unread notifications`) : ''}`}
    >
      <View style={styles.iconSlot}>
        {isActive && (
          <View
            style={[styles.indicator, { backgroundColor: indicatorColor }]}
          />
        )}
        <MaterialIcons name={tab.icon} size={24} color={tint} />
        {badgeCount > 0 && (
          <View
            style={[
              styles.badge,
              {
                borderColor: badgeRingColor,
                backgroundColor: chrome.badgeFill,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: chrome.onBadge }]}>
              {tab.id === 'settings'
                ? '!'
                : badgeCount > 99
                  ? '99+'
                  : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? chrome.text : inactiveColor },
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Bottom tab bar — three items of equal width, icon over label: the standard shape on both
 * platforms, and the one the reference samples already have (Material 3 `NavigationBar` on
 * Android, `BottomNavigationBar` on Flutter).
 *
 * The bottom safe area is padded here rather than by a `SafeAreaView` edge, because the
 * bar's own background has to run all the way to the screen edge — so the inset is padding
 * *inside* it, not a gap above it.
 */
export function TabBar({
  activeTab,
  onTabChange,
  badgeRingColor,
  activeColor,
  inactiveColor,
  indicatorColor,
  notSeenNotificationsCount = 0,
  updateAvailable = false,
  isDark,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const chrome = chromeColors(isDark);
  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          badgeCount={
            tab.id === 'community'
              ? notSeenNotificationsCount
              : tab.id === 'settings' && updateAvailable
                ? 1
                : 0
          }
          chrome={chrome}
          onPress={() => onTabChange(tab.id)}
          badgeRingColor={badgeRingColor}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          indicatorColor={indicatorColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
    gap: 4,
    minHeight: 64,
    paddingVertical: 4,
  },
  // Shared Material navigation indicator slot; the badge stays pinned to the icon.
  iconSlot: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The selected item's indicator pill, centered behind the icon. Sized wider than tall
  // like the Material 3 reference indicator; the icon itself already meets the ≥24dp floor
  // and this decorative fill doesn't need to be a separate touch target.
  indicator: {
    position: 'absolute',
    width: 64,
    height: 32,
    borderRadius: sampleRadius.pill,
  },
  // Let scaled labels wrap and determine the bar height.
  tabLabel: {
    ...sampleTypography.caption,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: 36,
    borderRadius: sampleRadius.md,
    minWidth: 16,
    minHeight: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeText: {
    // 11 rather than the 12 floor: the M3 Badge spec's size for a numeric counter.
    ...sampleTypography.caption,
  },
});
