import { StyleSheet } from 'react-native';

import { PillButton } from './PillButton';
import type { ScenarioRunState } from '../debug/useScenarioRun';

export interface ScenarioRunButtonProps {
  /** Verbatim `qa-run-<scenario>` — the scenario's single sealed gesture. */
  testID: string;
  state: ScenarioRunState;
  isDark: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Idle label, before the first call — defaults to "Run". */
  idleLabel?: string;
}

/**
 * Spec 09 zone 5: one full-width primary pill, disabled + "Running…" for at least 300ms
 * on every tap (via {@link useScenarioRun}'s floor), and relabeled "Run again" once a
 * scenario has produced its first Result — so replaying it never looks like the tap did
 * nothing.
 */
export function ScenarioRunButton({
  testID,
  state,
  isDark,
  onPress,
  disabled = false,
  idleLabel = 'Run',
}: ScenarioRunButtonProps) {
  const isRunning = state.status === 'running';
  const hasRun = state.status === 'success' || state.status === 'error';
  const label = isRunning ? 'Running…' : hasRun ? 'Run again' : idleLabel;

  return (
    <PillButton
      testID={testID}
      label={label}
      onPress={onPress}
      isDark={isDark}
      variant="primary"
      fullWidth
      disabled={disabled || isRunning}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 4,
    marginBottom: 8,
  },
});
