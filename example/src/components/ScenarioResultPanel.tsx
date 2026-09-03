import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

import { chromeColors } from '../theme/branding';
import type { ScenarioRunState } from '../debug/useScenarioRun';

export interface ScenarioResultPanelProps {
  /** Verbatim `result_test_id` from the scenarios catalog. */
  testID: string;
  isDark: boolean;
  /** Idle / Running / Success / Error — spec 09's Result zone. */
  state: ScenarioRunState;
  /**
   * True for a "presentation" scenario (fullscreen/sheet/modal): the Result IS the screen
   * that opened, not a returned value, so success renders the sentence alone — no code block.
   */
  isPresentation?: boolean;
  /**
   * Standing configuration state shown above the Run outcome (e.g. the current not-seen
   * count, or the connected/disconnected state) — always visible, uncolored, no duration.
   * Scenarios with nothing to say between runs omit it.
   */
  info?: string;
}

/**
 * Live state/result panel shown under a scenario's presets. One per scenario, carrying the
 * catalog's `result_test_id`.
 *
 * Spec 09's three guardrails: Idle shows no block at all, Running shows a skeleton for at
 * least 300ms so a fast call is still visibly "doing something", and Result always attaches a
 * duration so replaying the same preset still reads as a new call.
 */
export function ScenarioResultPanel({
  testID,
  isDark,
  state,
  isPresentation = false,
  info,
}: ScenarioResultPanelProps) {
  const chrome = chromeColors(isDark);
  const infoLine = info ? (
    <Text style={[styles.infoText, { color: chrome.textSecondary }]}>
      {info}
    </Text>
  ) : null;

  if (state.status === 'idle') {
    // Spec 09: idle is empty — no block, no duration. `info` (standing state) still shows.
    return infoLine ? (
      <View testID={testID} style={styles.infoOnly}>
        {infoLine}
      </View>
    ) : null;
  }

  if (state.status === 'running') {
    return (
      <View
        testID={testID}
        style={[
          styles.panel,
          { backgroundColor: chrome.surfaceRaised, borderColor: chrome.border },
        ]}
      >
        {infoLine}
        <View style={styles.runningRow}>
          <ActivityIndicator size="small" color={chrome.textSecondary} />
          <Text style={[styles.runningText, { color: chrome.textSecondary }]}>
            Running…
          </Text>
        </View>
        <View
          style={[styles.skeletonLine, { backgroundColor: chrome.border }]}
        />
      </View>
    );
  }

  const isSuccess = state.status === 'success';
  const headerColor = isSuccess ? chrome.success : chrome.danger;
  const duration =
    state.durationMs !== undefined ? `${state.durationMs} ms` : null;

  return (
    <View
      testID={testID}
      style={[
        styles.panel,
        { backgroundColor: chrome.surfaceRaised, borderColor: chrome.border },
      ]}
    >
      {infoLine}
      <View style={styles.resultHeaderRow}>
        <Text style={[styles.resultHeader, { color: headerColor }]}>
          {isSuccess ? '✓ Success' : '✕ Error'}
        </Text>
        {duration ? (
          <Text style={[styles.duration, { color: chrome.textSecondary }]}>
            {duration}
          </Text>
        ) : null}
      </View>
      {isSuccess && !isPresentation ? (
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{state.message}</Text>
        </View>
      ) : (
        <Text style={[styles.text, { color: chrome.text }]}>
          {state.message}
        </Text>
      )}
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
    gap: 6,
  },
  infoOnly: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  runningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runningText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultHeader: {
    fontSize: 11,
    fontWeight: '700',
  },
  duration: {
    fontSize: 11,
  },
  // Fixed dark aesthetic regardless of app theme — spec 09's "bloc code sombre", same in
  // light and dark mode by design (a code snippet, not themed chrome).
  codeBlock: {
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#142238',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#EEF1F5',
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
  },
});
