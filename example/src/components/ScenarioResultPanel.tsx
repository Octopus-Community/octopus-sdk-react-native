import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';
import type { ScenarioRunState } from '../debug/useScenarioRun';
import { CodeResultBlock, StatusBadge } from './SampleRecipes';
export interface ScenarioResultPanelProps {
  testID: string;
  isDark: boolean;
  state: ScenarioRunState;
  isPresentation?: boolean;
  info?: string;
}
export function ScenarioResultPanel({
  testID,
  isDark,
  state,
  isPresentation = false,
  info,
}: ScenarioResultPanelProps) {
  const c = chromeColors(isDark);
  const status =
    state.status === 'idle'
      ? 'ready'
      : state.status === 'success'
        ? 'passed'
        : state.status === 'error'
          ? 'failed'
          : 'running';
  return (
    <View testID={testID} style={styles.panel}>
      <Text style={[sampleTypography.label, { color: c.text }]}>Result</Text>
      {info && (
        <Text style={[sampleTypography.caption, { color: c.textSecondary }]}>
          {info}
        </Text>
      )}
      <View style={styles.row}>
        <StatusBadge status={status} isDark={isDark} />
        {(state.status === 'success' || state.status === 'error') &&
          state.durationMs !== undefined && (
            <Text
              style={[sampleTypography.caption, { color: c.textSecondary }]}
            >
              {state.durationMs} ms
            </Text>
          )}
      </View>
      {state.status === 'idle' ? (
        <Text style={[sampleTypography.caption, { color: c.textSecondary }]}>
          Not run yet
        </Text>
      ) : state.status === 'running' ? (
        <ActivityIndicator size="small" color={c.textSecondary} />
      ) : state.status === 'success' && isPresentation ? (
        <Text style={[sampleTypography.caption, { color: c.text }]}>
          {state.message}
        </Text>
      ) : (
        <CodeResultBlock isDark={isDark} message={state.message ?? ''} />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { marginTop: 8, gap: 8 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
});
