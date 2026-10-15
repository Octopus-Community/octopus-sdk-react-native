import { sampleRadius, sampleTypography } from '../theme/tokens';
import { StyleSheet, Text, View } from 'react-native';

import { chromeColors } from '../theme/branding';
import { SampleInfoRow } from './SampleInfoRow';

/** One labelled row of a {@link KeyValueCard}. */
export interface KeyValueRow {
  label: string;
  value: string;
}

/**
 * A simple labelled-rows card, used by the Settings overview and the Debug
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

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {title !== undefined && (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
      {rows.map((row) => (
        <SampleInfoRow key={row.label} {...row} isDark={isDark} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: sampleRadius.md,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    ...sampleTypography.label,
  },
});
