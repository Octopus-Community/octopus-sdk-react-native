/* eslint-disable react-native/no-inline-styles */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  style?: ViewStyle;
}

/**
 * Horizontal segment control for choosing one of several options.
 * Used for URL opening mode, bottom inset, theme set, etc.
 */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
  primaryColor,
  onPrimaryColor,
  style,
}: SegmentControlProps<T>) {
  return (
    <View
      style={[
        styles.wrapper,
        isDark ? styles.wrapperDark : styles.wrapperLight,
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
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.optionText,
                { color: isDark ? '#cccccc' : '#666666' },
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
  wrapperLight: {
    backgroundColor: '#f0f0f0',
  },
  wrapperDark: {
    backgroundColor: '#2a2a2a',
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
