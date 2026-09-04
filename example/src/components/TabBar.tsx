import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { OCTOPUS_BRAND } from '../theme/branding';

/** The Material Icons glyph names this bar draws — same four the reference samples use. */
type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** Tab identifiers for the example app: Home, Scenarios, Community, Settings. */
export type TabId = 'home' | 'scenarios' | 'community' | 'settings';

export interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** The bar's own background — the unread badge draws a ring in it to detach from the icon. */
  badgeRingColor: string;
  /** Tint of the selected item's icon and label. */
  activeColor: string;
  /** Tint of every unselected item. */
  inactiveColor: string;
  /**
   * Fill behind the selected item's icon — `activeColor` at 15% alpha, posed explicitly
   * per the shared sample design contract rather than left unset.
   */
  indicatorColor: string;
  notSeenNotificationsCount?: number;
}

/**
 * `testId` is the shared cross-platform handle from the scenario catalog's `shell.tabs` map
 * (kept in the internal QA tooling's shared config), applied verbatim so the QA pipeline drives
 * the same id here as on the other samples. The catalog names exactly these four tabs and the
 * example ships exactly these four — every other capability is a scenario card, and the event
 * log is the Debug console (reached from Settings, `debug-open-button`).
 *
 * `icon` is the glyph the shared sample design identity assigns to that tab — Material
 * filled `home` / `science` / `forum` / `settings`, the same four on Android, Flutter and
 * here, so a tester recognises the same bar on every sample. `forum` rather than `people`
 * for Community: the tab opens a discussion surface, not a member list.
 */
const TABS: {
  id: TabId;
  label: string;
  testId: string;
  icon: TabIconName;
}[] = [
  { id: 'home', label: 'Home', testId: 'home-tab', icon: 'home' },
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
      accessibilityLabel={`${tab.label} tab`}
    >
      <View style={styles.iconSlot}>
        {isActive && (
          <View
            style={[styles.indicator, { backgroundColor: indicatorColor }]}
          />
        )}
        <MaterialIcons name={tab.icon} size={24} color={tint} />
        {badgeCount > 0 && (
          <View style={[styles.badge, { borderColor: badgeRingColor }]}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.tabLabel, { color: tint }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Bottom tab bar — four items of equal width, icon over label: the standard shape on both
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
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          badgeCount={tab.id === 'community' ? notSeenNotificationsCount : 0}
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
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  // Anchors the badge to the icon rather than to the label, which is where every platform's
  // stock bottom bar puts it. Widened to 40 to match `indicator` below — at 32 the 40pt
  // indicator overflowed its slot by 4pt on each side.
  iconSlot: {
    width: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The selected item's indicator pill, centered behind the icon. Sized wider than tall
  // like the Material 3 reference indicator; the icon itself already meets the ≥24dp floor
  // and this decorative fill doesn't need to be a separate touch target.
  indicator: {
    position: 'absolute',
    width: 40,
    height: 24,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    // Keeps the ring pinned to the icon's top-right corner: `iconSlot` widened to 40
    // (from 32) to fit `indicator`, so the icon's own inset grew by 4 and this follows.
    left: 20,
    backgroundColor: OCTOPUS_BRAND.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    // 11 rather than the 12 floor: the M3 Badge spec's size for a numeric counter.
    fontSize: 11,
    fontWeight: '700',
  },
});
