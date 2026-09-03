import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import { chromeColors } from '../theme/branding';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentControlProps<T extends string> {
  /** Optional catalog `test_id`, applied verbatim on the control's container. */
  testID?: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  style?: ViewStyle;
  /**
   * Renders the segments non-interactive. Used by the Config screen's Server
   * control, which displays a build-time value nobody can pick at runtime.
   */
  disabled?: boolean;
}

/**
 * Horizontal segment control for choosing one of several options.
 * Used for URL opening mode, bottom inset, theme set, etc.
 */
export function SegmentControl<T extends string>({
  testID,
  options,
  value,
  onChange,
  isDark,
  primaryColor,
  onPrimaryColor,
  style,
  disabled = false,
}: SegmentControlProps<T>) {
  const chrome = chromeColors(isDark);
  return (
    <View
      testID={testID}
      style={[
        styles.wrapper,
        { backgroundColor: chrome.track },
        disabled && styles.wrapperDisabled,
        style,
      ]}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isActive && { backgroundColor: primaryColor },
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.optionText,
                { color: chrome.textSecondary },
                isActive && { color: onPrimaryColor },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  wrapperDisabled: {
    opacity: 0.5,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
