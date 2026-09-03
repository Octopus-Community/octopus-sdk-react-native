import { StyleSheet, Text, View } from 'react-native';

import { chromeColors } from '../theme/branding';

/** One labelled row of a {@link KeyValueCard}. */
export interface KeyValueRow {
  label: string;
  value: string;
}

/**
 * A simple labelled-rows card, used by the Home dashboard and the Debug
 * console's live-state panel — the reference sample's `KeyValueCard`.
 */
export function KeyValueCard({
  title,
  rows,
  isDark,
}: {
  title?: string;
  rows: KeyValueRow[];
  isDark: boolean;
}) {
  const chrome = chromeColors(isDark);
  const cardBg = chrome.surface;
  const borderColor = chrome.border;
  const textColor = chrome.text;
  const labelColor = chrome.textSecondary;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {title !== undefined && (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.label, { color: labelColor }]}>{row.label}</Text>
          <Text style={[styles.value, { color: textColor }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: 12,
  },
  label: {
    width: 150,
    fontSize: 12,
  },
  value: {
    flex: 1,
    fontSize: 14,
  },
});
