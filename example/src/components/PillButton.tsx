import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { chromeColors } from '../theme/branding';

/** The three button shapes the shared sample identity allows. */
export type PillButtonVariant = 'primary' | 'secondary' | 'danger';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  isDark: boolean;
  variant?: PillButtonVariant;
  /** Optional Material glyph, drawn before the label and tinted by the text color. */
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  disabled?: boolean;
  /** Replaces the label with a spinner while an action is in flight. */
  loading?: boolean;
  /** Stretches the button to the full width of its parent. */
  fullWidth?: boolean;
  testID?: string;
  style?: ViewStyle;
}

/**
 * A pill button in one of the three shapes the shared identity defines: a filled
 * chrome-accent primary (navy in light, accent blue in dark), a white secondary
 * bordered in the tint border, and a white danger bordered
 * and lettered in the danger red.
 *
 * Every variant is at least 44dp tall, which is the floor the design spec puts on any
 * button a tester is expected to hit on a phone.
 */
export function PillButton({
  label,
  onPress,
  isDark,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
  style,
}: PillButtonProps) {
  const chrome = chromeColors(isDark);
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const textColor = isPrimary
    ? chrome.onAccent
    : isDanger
      ? chrome.danger
      : chrome.accent;
  const borderColor = isPrimary
    ? 'transparent'
    : isDanger
      ? chrome.dangerBorder
      : chrome.tintBorder;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary
            ? pressed
              ? chrome.accentPressed
              : chrome.accent
            : chrome.surface,
          borderColor,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon !== undefined && (
            <MaterialIcons name={icon} size={18} color={textColor} />
          )}
          <Text
            style={[styles.label, { color: textColor }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
