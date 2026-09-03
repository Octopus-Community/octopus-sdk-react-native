import { StyleSheet, Text, View } from 'react-native';

import { chromeColors } from '../theme/branding';
import { PillButton } from './PillButton';

/** One line of the summary: what it is, and what it currently is set to. */
export interface ConfigSummaryRow {
  label: string;
  value: string;
}

export interface ConfigSummaryCardProps {
  rows: ConfigSummaryRow[];
  isDark: boolean;
  title?: string;
  /** Renders the trailing "Edit" button, which takes the tester to the Config screen. */
  onEdit?: () => void;
  testID?: string;
}

/**
 * The framed "Current configuration" block — the one place that answers "what is this build
 * pointed at right now?" without the tester having to walk into Config and risk changing it.
 *
 * Framed in the accent rather than drawn as a plain card on purpose: it is a *summary of
 * elsewhere*, so it should not read as another card of settings that live here. The row count
 * is the caller's business — Home shows the full eight, a narrower surface can pass three of
 * the same rows and get the same block.
 */
export function ConfigSummaryCard({
  rows,
  isDark,
  title = 'Current configuration',
  onEdit,
  testID = 'config-summary',
}: ConfigSummaryCardProps) {
  const chrome = chromeColors(isDark);
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: chrome.tint, borderColor: chrome.accent },
      ]}
    >
      <Text style={[styles.title, { color: chrome.text }]}>{title}</Text>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text
              style={[styles.rowLabel, { color: chrome.textSecondary }]}
              numberOfLines={1}
            >
              {row.label}
            </Text>
            <Text
              style={[styles.rowValue, { color: chrome.text }]}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      {onEdit !== undefined && (
        <PillButton
          testID="config-summary-edit-button"
          label="Edit"
          icon="edit"
          variant="secondary"
          isDark={isDark}
          onPress={onEdit}
          style={styles.edit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    fontSize: 12.5,
    // Fixed rather than flexible: the values line up in a column, which is what makes eight
    // rows scannable instead of eight sentences.
    width: 132,
  },
  rowValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  edit: {
    marginTop: 14,
  },
});
