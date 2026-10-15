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
import { sampleRadius, sampleTypography } from '../theme/tokens';

export type PillButtonVariant = 'primary' | 'secondary' | 'danger';
export interface PillButtonProps {
  label: string;
  onPress: () => void;
  isDark: boolean;
  variant?: PillButtonVariant;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  minHeight?: number;
  testID?: string;
  style?: ViewStyle;
}
/** Shared capsule recipe; loading keeps the action label visible. */
export function PillButton({
  label,
  onPress,
  isDark,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  minHeight = 48,
  testID,
  style,
}: PillButtonProps) {
  const c = chromeColors(isDark);
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const ink = primary ? c.onAccent : danger ? c.danger : c.text;
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
          minHeight,
          paddingLeft: icon || loading ? 16 : 24,
          backgroundColor: primary
            ? pressed
              ? c.accentPressed
              : c.accent
            : danger
              ? c.dangerSurface
              : pressed
                ? c.surfacePressed
                : 'transparent',
          borderColor: primary ? 'transparent' : danger ? c.danger : c.outline,
        },
        fullWidth && styles.fullWidth,
        style,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={ink} />
        ) : icon !== undefined ? (
          <MaterialIcons name={icon} size={18} color={ink} />
        ) : null}
        <Text style={[styles.label, { color: ink }]}>{label}</Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingRight: 24,
    borderRadius: sampleRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  content: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...sampleTypography.buttonLabel,
    flexShrink: 1,
    textAlign: 'center',
  },
});
