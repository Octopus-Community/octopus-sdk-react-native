import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';

export function SettingsRadio<T extends string>({
  options,
  value,
  onChange,
  isDark,
  testID,
  rowMin = 56,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  isDark: boolean;
  testID: string;
  rowMin?: number;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View testID={testID} accessibilityRole="radiogroup">
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          testID={`${testID}-${option.value}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: option.value === value }}
          onPress={() => onChange(option.value)}
          style={[styles.row, { minHeight: rowMin }]}
        >
          <MaterialIcons
            name={
              option.value === value
                ? 'radio-button-checked'
                : 'radio-button-unchecked'
            }
            size={24}
            color={option.value === value ? chrome.accentText : chrome.outline}
          />
          <Text style={[styles.label, { color: chrome.text }]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  label: { ...sampleTypography.body, flex: 1 },
});
