import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { KeyValueCard } from '../components/KeyValueCard';
import { SegmentControl } from '../components/SegmentControl';
import type { DebugEntry } from '../debug/debugLog';
import { debugLog, useDebugLog } from '../debug/debugLog';
import { chromeColors } from '../theme/branding';

/** Which kinds of entries the console shows. */
type DebugFilter = 'all' | 'event' | 'api';

export interface DebugScreenProps {
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  /** Live SDK state, mirroring the reference sample's "Live state" card. */
  isInitialized: boolean;
  isUserConnected: boolean;
  hasAccessToCommunity: boolean | null;
  notSeenNotificationsCount: number;
  pushToken: string | null;
}

/**
 * Debug console — a live, in-app feed of SDK events and of the API calls the
 * sample fires, plus a snapshot of the state values the SDK streams.
 *
 * Read-only view of the process-wide {@link debugLog}, newest first. Not a tab:
 * the shared QA shell has exactly four, so the console is presented as a modal
 * from Settings' `debug-open-button`. Public despite the name — anyone running
 * the example app can open it.
 *
 * Every SDK call the sample fires lands here, with one documented exception: the
 * best-effort `closeUI()` the URL and profile interceptors attempt is expected to
 * throw in embed mode, so logging it would fill the console with a failure that
 * means nothing. Rows are stamped in **local time**; the clipboard export is JSON
 * stamped in ISO-8601 UTC, which carries its own `Z`.
 */
export function DebugScreen({
  isDark,
  primaryColor,
  onPrimaryColor,
  isInitialized,
  isUserConnected,
  hasAccessToCommunity,
  notSeenNotificationsCount,
  pushToken,
}: DebugScreenProps) {
  const entries = useDebugLog();
  const [filter, setFilter] = useState<DebugFilter>('all');
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(
    () =>
      filter === 'all' ? entries : entries.filter((e) => e.kind === filter),
    [entries, filter]
  );

  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const secondaryColor = chrome.textSecondary;

  // Cleared on unmount: the console is a modal, so closing it within the 2 s window
  // would otherwise set state on an unmounted tree.
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    },
    []
  );

  const handleCopy = useCallback(() => {
    // `Clipboard` is deprecated in react-native core but still shipped in 0.81;
    // the sample deliberately avoids pulling a native clipboard dependency in
    // just to export a debug log.
    Clipboard.setString(debugLog.exportJson());
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <KeyValueCard
        title="Live state"
        isDark={isDark}
        rows={[
          { label: 'isInitialized', value: String(isInitialized) },
          {
            label: 'connection',
            value: isUserConnected ? 'connected' : 'anonymous',
          },
          {
            label: 'hasAccessToCommunity',
            value:
              hasAccessToCommunity === null
                ? '—'
                : String(hasAccessToCommunity),
          },
          {
            label: 'notSeenNotificationsCount',
            value: String(notSeenNotificationsCount),
          },
          {
            label: 'pushToken',
            value:
              pushToken === null ? '—' : `${pushToken.slice(0, 12)}… (set)`,
          },
        ]}
      />

      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {`Log (${filtered.length}${
            filtered.length < entries.length ? ` of ${entries.length}` : ''
          })`}
        </Text>
        <Text style={[styles.hint, { color: secondaryColor }]}>
          newest first
        </Text>
      </View>

      <SegmentControl<DebugFilter>
        testID="debug-filter-select"
        options={[
          { label: 'All', value: 'all' },
          { label: 'Events', value: 'event' },
          { label: 'API calls', value: 'api' },
        ]}
        value={filter}
        onChange={setFilter}
        isDark={isDark}
        primaryColor={primaryColor}
        onPrimaryColor={onPrimaryColor}
      />

      {/* `primaryColor` (the control fill) draws the 1pt outline, where 3:1 is the floor;
          the label draws in `chrome.accent`, because the fill blue only holds 3.50:1 as
          ink on a light background. */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          testID="debug-copy-button"
          style={[styles.action, { borderColor: primaryColor }]}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: chrome.accent }]}>
            {copied ? 'Copied' : 'Copy as JSON'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="debug-clear-button"
          style={[styles.action, { borderColor: primaryColor }]}
          onPress={() => debugLog.clear()}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: chrome.accent }]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <View testID="debug-log-list" style={styles.list}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: secondaryColor }]}>
            {entries.length === 0
              ? 'No log entries yet.'
              : 'No entry matches this filter.'}
          </Text>
        ) : (
          filtered.map((entry) => (
            <LogRow key={entry.id} entry={entry} isDark={isDark} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function LogRow({ entry, isDark }: { entry: DebugEntry; isDark: boolean }) {
  // Local wall clock, not `toISOString()`: a console whose job is to be correlated with
  // what the operator just saw on screen must not be an hour or two off the device clock.
  const at = new Date(entry.at);
  const time = [at.getHours(), at.getMinutes(), at.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
  const chrome = chromeColors(isDark);
  return (
    <View style={[styles.row, { borderBottomColor: chrome.border }]}>
      <View style={styles.rowHeader}>
        <View style={styles.kindRow}>
          {/* A word, not a glyph: the shared identity bans emoji, and an arrow-vs-bolt
              pair was unreadable anyway — nothing on screen said which was which. */}
          {/* The chrome accent (navy in light, accent blue in dark) for what the SDK said,
              amber for what this app did — the shared
              identity's assignment, and the one that reads right: the amber is the
              host's own noise around the SDK's stream, not a warning.

              Drawn in the sample's chrome accent rather than in `primaryColor`: that
              prop carries whichever theme the Theme scenario handed the SDK, so the
              console's own chrome would repaint mid-QA under a colour set. */}
          <View
            style={[
              styles.kindChip,
              {
                borderColor:
                  entry.kind === 'api' ? chrome.warnBorder : chrome.tintBorder,
                backgroundColor:
                  entry.kind === 'api' ? chrome.warnSurface : chrome.tint,
              },
            ]}
          >
            <Text
              style={[
                styles.kindChipText,
                { color: entry.kind === 'api' ? chrome.warn : chrome.accent },
              ]}
            >
              {entry.kind === 'api' ? 'HOST' : 'SDK'}
            </Text>
          </View>
          <Text style={[styles.kind, { color: chrome.text }]}>
            {entry.label}
          </Text>
        </View>
        <Text style={[styles.time, { color: chrome.textSecondary }]}>
          {time}
        </Text>
      </View>
      <Text style={[styles.detail, { color: chrome.text }]} numberOfLines={4}>
        {entry.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 0,
  },
  empty: {
    fontSize: 13,
    paddingVertical: 12,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  kindRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kindChip: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  kindChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kind: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
  },
});
