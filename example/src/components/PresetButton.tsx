import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { chromeColors } from '../theme/branding';

export interface PresetButtonProps {
  /** Verbatim `test_id` from the scenarios catalog — QA drives the tap off this. */
  testID: string;
  label: string;
  onPress: () => void;
  /** The outline and the spinner — a UI colour, where 3:1 is the floor. */
  primaryColor: string;
  /**
   * Needed for the label's own ink: it draws in `chrome.accent`, not in
   * {@link primaryColor}, whose fill blue only holds 3.50:1 as text on a light surface.
   */
  isDark: boolean;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Single-tap scenario preset button. Presets pre-fill every field and never take
 * free text, so a preset is always one button carrying one catalog `test_id`.
 */
export function PresetButton({
  testID,
  label,
  onPress,
  primaryColor,
  isDark,
  disabled = false,
  loading = false,
}: PresetButtonProps) {
  const isDisabled = disabled || loading;
  const chrome = chromeColors(isDark);
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.button,
        { borderColor: primaryColor },
        isDisabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={primaryColor} size="small" />
      ) : (
        <Text
          style={[styles.buttonText, { color: chrome.accent }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
