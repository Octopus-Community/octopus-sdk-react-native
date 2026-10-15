import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';
export interface AppBarProps {
  title: string;
  onOpenDebug?: () => void;
  size?: 'small' | 'medium' | 'large';
  isDark: boolean;
  onBack?: () => void;
  backTestID?: string;
  showPlatformBadge?: boolean;
}
/** Explicit Android title roles, with a compact accessible platform badge. */
export function AppBar({
  title,
  onOpenDebug,
  size = 'small',
  isDark,
  onBack,
  backTestID = 'app-bar-back',
  showPlatformBadge = true,
}: AppBarProps) {
  const c = chromeColors(isDark);
  return (
    <View testID="sample-app-bar" style={{ backgroundColor: c.header }}>
      <View style={styles.toolbar}>
        {onBack && (
          <TouchableOpacity
            testID={backTestID}
            onPress={onBack}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={24} color={c.onAppBar} />
          </TouchableOpacity>
        )}
        {size === 'small' ? (
          <Text
            numberOfLines={3}
            style={[styles.smallTitle, { color: c.onAppBar }]}
          >
            {title}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}
        {onOpenDebug && (
          <TouchableOpacity
            testID="app-bar-debug-console"
            accessibilityRole="button"
            accessibilityLabel="Debug console"
            onPress={onOpenDebug}
            style={styles.action}
          >
            <MaterialIcons name="bug-report" size={24} color={c.onAppBar} />
          </TouchableOpacity>
        )}
        {showPlatformBadge && (
          <View
            accessible
            accessibilityLabel="React Native"
            style={[
              styles.badge,
              { backgroundColor: c.surface, borderColor: c.outline },
            ]}
          >
            <MaterialIcons name="code" size={16} color={c.text} />
          </View>
        )}
      </View>
      {size !== 'small' && (
        <View
          style={[styles.expanded, size === 'large' && styles.largeExpanded]}
        >
          <Text
            numberOfLines={3}
            style={[
              size === 'large'
                ? sampleTypography.appBarLarge
                : sampleTypography.appBarMedium,
              { color: c.onAppBar },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  toolbar: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallTitle: { ...sampleTypography.title2, flex: 1 },
  spacer: { flex: 1 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expanded: { paddingHorizontal: 24, paddingBottom: 12 },
  largeExpanded: {
    minHeight: 88,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
});
