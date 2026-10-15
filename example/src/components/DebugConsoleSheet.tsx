import { useState } from 'react';
import {
  Clipboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chromeColors } from '../theme/branding';
import { sampleRadius, sampleTypography } from '../theme/tokens';
import { debugLog, useDebugLog } from '../debug/debugLog';
import type { DebugEntryKind } from '../debug/debugLog';
import { filterConsoleEntries } from '../debug/consoleFilter';

const KINDS: { value: DebugEntryKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'state', label: 'State' },
  { value: 'api', label: 'API Call' },
];
export function DebugConsoleSheet({
  visible,
  onClose,
  onDismiss,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const chrome = chromeColors(isDark);
  const insets = useSafeAreaInsets();
  const entries = useDebugLog();
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<DebugEntryKind[]>([
    'event',
    'state',
    'api',
  ]);
  const filtered = filterConsoleEntries(entries, query, kinds);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.scrim}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
        />
        <View
          testID="debug-console-sheet"
          style={[
            styles.sheet,
            {
              backgroundColor: chrome.surfaceRaised,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: chrome.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: chrome.text }]}>
              Debug Console
            </Text>
            {(
              [
                {
                  icon: 'content-copy',
                  label: 'Copy All',
                  action: () => Clipboard.setString(debugLog.exportJson()),
                },
                {
                  icon: 'delete-outline',
                  label: 'Clear Log',
                  action: () => debugLog.clear(),
                },
                { icon: 'close', label: 'Close', action: onClose },
              ] as const
            ).map((button) => (
              <TouchableOpacity
                key={button.label}
                accessibilityRole="button"
                accessibilityLabel={button.label}
                onPress={button.action}
                style={styles.action}
              >
                <MaterialIcons
                  name={button.icon}
                  size={24}
                  color={chrome.accentText}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            testID="debug-console-search"
            accessibilityLabel="Search logs"
            value={query}
            onChangeText={setQuery}
            placeholder="Search logs..."
            placeholderTextColor={chrome.textPlaceholder}
            style={[
              styles.input,
              { color: chrome.text, borderColor: chrome.outline },
            ]}
          />
          <View style={styles.filters}>
            {KINDS.map((kind) => (
              <TouchableOpacity
                key={kind.value}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: kinds.includes(kind.value) }}
                onPress={() =>
                  setKinds((current) =>
                    current.includes(kind.value)
                      ? current.filter((value) => value !== kind.value)
                      : [...current, kind.value]
                  )
                }
                style={styles.chipTarget}
              >
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: kinds.includes(kind.value)
                        ? chrome.accentContainer
                        : undefined,
                      borderColor: kinds.includes(kind.value)
                        ? chrome.accentContainer
                        : chrome.outline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.caption,
                      {
                        color: kinds.includes(kind.value)
                          ? chrome.onAccentContainer
                          : chrome.text,
                      },
                    ]}
                  >{`${kind.label} (${entries.filter((entry) => entry.kind === kind.value).length})`}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={[styles.caption, { color: chrome.textSecondary }]}
          >{`${filtered.length} of ${entries.length} entries`}</Text>
          <ScrollView
            testID="debug-console-log"
            style={styles.log}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map((entry) => (
              <View
                key={entry.id}
                style={[styles.entry, { backgroundColor: chrome.surface }]}
              >
                <Text
                  style={[styles.caption, { color: chrome.textSecondary }]}
                >{`${new Date(entry.at).toLocaleTimeString()} · ${KINDS.find((kind) => kind.value === entry.kind)?.label}`}</Text>
                <Text style={[styles.caption, { color: chrome.text }]}>
                  {entry.label}
                </Text>
                <Text
                  style={[
                    sampleTypography.monoSmall,
                    { color: chrome.textSecondary },
                  ]}
                >
                  {entry.detail}
                </Text>
              </View>
            ))}
            {!filtered.length && (
              <Text style={[styles.caption, { color: chrome.textSecondary }]}>
                No log entries match.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  log: { flexShrink: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scrim: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: sampleRadius.lg,
    borderTopRightRadius: sampleRadius.lg,
    paddingHorizontal: 16,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  title: { ...sampleTypography.title2, flex: 1 },
  action: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...sampleTypography.body,
    borderWidth: 1,
    borderRadius: sampleRadius.md,
    padding: 12,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipTarget: { minHeight: 48, justifyContent: 'center' },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
  },
  caption: { ...sampleTypography.caption },
  entry: { borderRadius: 8, padding: 8, gap: 4, marginBottom: 8 },
});
