import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export interface PresetButtonProps {
  /** Verbatim `test_id` from the scenarios catalog — QA drives the tap off this. */
  testID: string;
  label: string;
  onPress: () => void;
  primaryColor: string;
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
  disabled = false,
  loading = false,
}: PresetButtonProps) {
  const isDisabled = disabled || loading;
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
          style={[styles.buttonText, { color: primaryColor }]}
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
