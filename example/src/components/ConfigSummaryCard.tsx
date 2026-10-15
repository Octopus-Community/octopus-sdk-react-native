import { sampleRadius, sampleTypography } from '../theme/tokens';
import { StyleSheet, Text, View } from 'react-native';

import { chromeColors, OCTOPUS_BRAND } from '../theme/branding';
import { PillButton } from './PillButton';
import { SampleInfoRow } from './SampleInfoRow';

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
 * Framed in the accent (light) rather than drawn as a plain card on purpose: it is a *summary of
 * elsewhere*, so it should not read as another card of settings that live here. The row count
 * is the caller's business — Settings shows the full overview, a narrower surface can pass three of
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
        {
          backgroundColor: chrome.tint,
          // Dark keeps a hairline, not a blue frame: a blue frame over ink read as a
          // permanent selection next to the primary button (design review, 2026-09-22).
          // The strong step, so the summary still stands out from the cards around it.
          borderColor: isDark ? OCTOPUS_BRAND.darkBorderStrong : chrome.accent,
        },
      ]}
    >
      <Text style={[styles.title, { color: chrome.text }]}>{title}</Text>
      <View style={styles.rows}>
        {rows.map((row) => (
          <SampleInfoRow key={row.label} {...row} isDark={isDark} />
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
    borderRadius: sampleRadius.md,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    ...sampleTypography.body,

    marginBottom: 12,
  },
  rows: {
    gap: 8,
  },
  edit: {
    marginTop: 14,
  },
});
