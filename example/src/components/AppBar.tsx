import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { chromeColors } from '../theme/branding';

export interface AppBarProps {
  /** The screen's own title — "Home", "Scenarios", "Account"… */
  title: string;
  isDark: boolean;
  /**
   * Renders a leading back arrow and calls this on tap. Omitted on a top-level
   * tab, where there is nothing to go back to.
   */
  onBack?: () => void;
  /**
   * Handle of the back control. Defaults to `app-bar-back`; a screen whose dismissal the
   * shared QA catalog names under another id passes that id here instead of growing a
   * second close control just to carry it.
   */
  backTestID?: string;
  /**
   * Whether the platform pill is shown next to the title. On by default: it is the
   * one platform marker inside the app, and it belongs to the shell rather than to
   * any one screen.
   */
  showPlatformBadge?: boolean;
}

/**
 * The sample's app bar — navy in light theme, carrying the screen title and, glued to
 * it, the platform pill.
 *
 * The pill is deliberately a monochrome glyph plus the platform name on a translucent
 * white fill: never a multicolor logo (a stylized React or React Native mark is a
 * trademark this sample must not draw), and never a text-only chip either. `code` is
 * the Material glyph the shared identity assigns to the JavaScript/React Native leg.
 */
export function AppBar({
  title,
  isDark,
  onBack,
  backTestID = 'app-bar-back',
  showPlatformBadge = true,
}: AppBarProps) {
  const chrome = chromeColors(isDark);
  return (
    <View
      testID="sample-app-bar"
      style={[styles.bar, { backgroundColor: chrome.appBar }]}
    >
      {onBack !== undefined && (
        <TouchableOpacity
          testID={backTestID}
          onPress={onBack}
          style={styles.back}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={22} color={chrome.onAppBar} />
        </TouchableOpacity>
      )}
      <Text
        style={[styles.title, { color: chrome.onAppBar }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      {showPlatformBadge && (
        <View style={styles.pill}>
          <MaterialIcons name="code" size={12} color={chrome.onAppBar} />
          <Text
            style={[styles.pillText, { color: chrome.onAppBar }]}
            maxFontSizeMultiplier={1.2}
          >
            React Native
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  back: {
    marginLeft: -6,
    padding: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.85,
  },
});
