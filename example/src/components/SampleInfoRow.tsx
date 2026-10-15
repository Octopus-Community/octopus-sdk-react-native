import { StyleSheet, Text, View } from 'react-native';

import { redactApiKeys } from '../config/apiKeyMask';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';

/** Like Android's FlowRow: keep the label intact, then wrap the value below it. */
export function SampleInfoRow({
  label,
  value,
  isDark,
  valueTestID,
  selectable = false,
  compact = false,
}: {
  label: string;
  value: string;
  isDark: boolean;
  valueTestID?: string;
  selectable?: boolean;
  compact?: boolean;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.label,
          compact && sampleTypography.caption,
          { color: chrome.textSecondary },
        ]}
        accessibilityLabel={label}
      >
        {/* Camel-case SDK identifiers may break between words, never inside a word. */}
        {label.replace(/([a-z0-9])([A-Z])/g, '$1\u200B$2')}
      </Text>
      <Text
        testID={valueTestID}
        style={[
          styles.value,
          compact && sampleTypography.caption,
          { color: chrome.textBody },
        ]}
        selectable={selectable}
      >
        {redactApiKeys(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    columnGap: 12,
    rowGap: 4,
  },
  label: {
    ...sampleTypography.callout,
    flexShrink: 0,
    maxWidth: '100%',
  },
  value: {
    ...sampleTypography.callout,
    fontWeight: '500',
    flexShrink: 0,
    maxWidth: '100%',
  },
});
