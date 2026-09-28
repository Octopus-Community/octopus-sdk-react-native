import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useScenarioRun } from '../debug/useScenarioRun';
import { chromeColors } from '../theme/branding';
import { PresetButton } from './PresetButton';
import { ScenarioResultPanel } from './ScenarioResultPanel';

export interface ScenarioPreset {
  label: string;
  testID: string;
  values: string[];
}

/** Shared opt-in editor. Presets always submit their own values, never stale React state. */
export function ScenarioCustomize({
  id,
  resultTestID,
  runTestID,
  fields,
  presets,
  initialValues,
  onRun,
  isDark,
  info,
}: {
  id: string;
  resultTestID: string;
  runTestID?: string;
  fields: { label: string; help: string; testID?: string }[];
  presets: ScenarioPreset[];
  initialValues?: string[];
  onRun: (values: string[]) => Promise<string>;
  isDark: boolean;
  info?: string;
}) {
  const chrome = chromeColors(isDark);
  const [values, setValues] = useState(
    () => initialValues ?? presets[0]!.values
  );
  const [customizing, setCustomizing] = useState(false);
  const [anchor, setAnchor] = useState(0);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [state, run] = useScenarioRun(id);
  const busyRef = useRef(false);
  const valuesKey = JSON.stringify(values);
  const matching = presets.findIndex(
    (p) => JSON.stringify(p.values) === valuesKey
  );
  const busy = state.status === 'running';
  const stale = lastRun !== null && lastRun !== valuesKey;

  const submit = async (snapshot: string[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLastRun(JSON.stringify(snapshot));
    try {
      await run(
        () => onRun(snapshot),
        (message) => message
      );
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <View style={styles.content}>
      <Text style={[styles.heading, { color: chrome.text }]}>Parameters</Text>
      <View style={styles.header}>
        <Text
          style={[
            styles.state,
            { color: chrome.textSecondary, borderColor: chrome.border },
            matching < 0 && styles.custom,
          ]}
        >
          {matching < 0 ? 'Custom' : presets[matching]!.label}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          style={styles.action}
          onPress={() => {
            if (customizing) {
              setValues(presets[anchor]!.values);
              setCustomizing(false);
            } else {
              if (matching >= 0) setAnchor(matching);
              setCustomizing(true);
            }
          }}
        >
          <Text style={[styles.actionText, { color: chrome.accent }]}>
            {customizing ? 'Reset to preset' : 'Customize ›'}
          </Text>
        </TouchableOpacity>
      </View>
      {fields.map((field, index) => (
        <View key={field.label} testID={field.testID} style={styles.field}>
          <Text style={[styles.label, { color: chrome.textSecondary }]}>
            {field.label}
          </Text>
          {customizing ? (
            <TextInput
              accessibilityLabel={field.label}
              value={values[index]}
              editable={!busy}
              onChangeText={(text) =>
                setValues((previous) =>
                  previous.map((value, i) => (i === index ? text : value))
                )
              }
              placeholder={field.help}
              placeholderTextColor={chrome.textPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: chrome.text,
                  borderColor: chrome.border,
                  backgroundColor: chrome.surfaceRaised,
                },
              ]}
            />
          ) : (
            <Text selectable style={[styles.value, { color: chrome.text }]}>
              {values[index] || '(none)'}
            </Text>
          )}
        </View>
      ))}
      {presets.map((preset, index) => (
        <PresetButton
          key={preset.testID}
          testID={preset.testID}
          label={preset.label}
          isDark={isDark}
          primaryColor={chrome.accent}
          disabled={busy}
          onPress={() => {
            if (busyRef.current) return;
            setValues(preset.values);
            setAnchor(index);
            setCustomizing(false);
            submit(preset.values);
          }}
        />
      ))}
      {stale && !busy && (
        <Text style={[styles.label, { color: chrome.textSecondary }]}>
          Values changed — run again to update the result.
        </Text>
      )}
      <ScenarioResultPanel
        testID={resultTestID}
        isDark={isDark}
        state={state}
        info={info}
      />
      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy}
        testID={runTestID}
        style={[styles.run, { backgroundColor: chrome.accent }]}
        onPress={() => submit(values)}
      >
        <Text style={[styles.actionText, { color: chrome.onAccent }]}>
          {busy ? 'Running…' : state.status === 'idle' ? 'Run' : 'Run again'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, marginTop: 12 },
  heading: { fontSize: 15, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  state: { fontSize: 13, flexShrink: 1 },
  custom: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  action: { minHeight: 48, justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '600' },
  field: { gap: 4 },
  label: { fontSize: 13, lineHeight: 18 },
  value: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 48,
    fontSize: 14,
  },
  run: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
