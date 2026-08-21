/* eslint-disable react-native/no-inline-styles */
import { View, Text, StyleSheet } from 'react-native';

export interface ScenarioResultPanelProps {
  /** Verbatim `result_test_id` from the scenarios catalog. */
  testID: string;
  isDark: boolean;
  text: string;
}

/**
 * Live state/result panel shown under a scenario's presets. One per scenario,
 * carrying the catalog's `result_test_id`.
 */
export function ScenarioResultPanel({
  testID,
  isDark,
  text,
}: ScenarioResultPanelProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.panel,
        {
          backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
          borderColor: isDark ? '#444444' : '#e8e8e8',
        },
      ]}
    >
      <Text style={[styles.text, { color: isDark ? '#cccccc' : '#333333' }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
  },
});
