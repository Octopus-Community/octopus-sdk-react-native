/* eslint-disable react-native/no-inline-styles */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { panelColors, panelStyles } from './panelStyles';

/**
 * Free-text `trackCustomEvent` form, folded into the Custom Events scenario.
 *
 * The scenario's presets fire two fixed events for the QA pipeline (which never
 * types); this form is what proves an arbitrary name and arbitrary properties
 * cross the bridge. The call itself is made by the caller's `onSend` (routed through the
 * scenario's shared `useScenarioRun`), so its outcome shows up in the scenario's own
 * `ScenarioResultPanel` — this form owns only its inputs and their own validation error.
 */
export function CustomEventPanel({
  isDark,
  primaryColor,
  onSend,
}: {
  isDark: boolean;
  primaryColor: string;
  /** Resolves to whether the call actually went through, once the scenario's shared Result
   *  state has settled. */
  onSend: (
    eventName: string,
    properties?: Record<string, string>
  ) => Promise<boolean | undefined>;
}) {
  const c = panelColors(isDark);
  const [name, setName] = useState('');
  const [key1, setKey1] = useState('');
  const [value1, setValue1] = useState('');
  const [key2, setKey2] = useState('');
  const [value2, setValue2] = useState('');
  const [sending, setSending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const eventName = name.trim();
    if (eventName === '') {
      setInputError('Event name is required');
      return;
    }
    setInputError(null);
    const properties: Record<string, string> = {};
    if (key1.trim() !== '') properties[key1.trim()] = value1.trim();
    if (key2.trim() !== '') properties[key2.trim()] = value2.trim();
    setSending(true);
    try {
      const ok = await onSend(
        eventName,
        Object.keys(properties).length > 0 ? properties : undefined
      );
      if (ok) {
        setName('');
        setKey1('');
        setValue1('');
        setKey2('');
        setValue2('');
      }
    } finally {
      setSending(false);
    }
  }, [name, key1, value1, key2, value2, onSend]);

  const inputStyle = {
    backgroundColor: c.inputBg,
    borderColor: c.border,
    color: c.text,
  };

  return (
    <View style={panelStyles.block}>
      <Text style={[panelStyles.title, { color: c.text }]}>
        Track a custom event
      </Text>
      <TextInput
        style={[panelStyles.input, inputStyle]}
        placeholder="Event name"
        placeholderTextColor={c.placeholder}
        value={name}
        onChangeText={(next) => {
          setInputError(null);
          setName(next);
        }}
        editable={!sending}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={panelStyles.inputRow}>
        <TextInput
          style={[panelStyles.inputHalf, inputStyle]}
          placeholder="Key 1"
          placeholderTextColor={c.placeholder}
          value={key1}
          onChangeText={setKey1}
          editable={!sending}
          autoCapitalize="none"
        />
        <TextInput
          style={[panelStyles.inputHalf, inputStyle]}
          placeholder="Value 1"
          placeholderTextColor={c.placeholder}
          value={value1}
          onChangeText={setValue1}
          editable={!sending}
          autoCapitalize="none"
        />
      </View>
      <View style={panelStyles.inputRow}>
        <TextInput
          style={[panelStyles.inputHalf, inputStyle]}
          placeholder="Key 2"
          placeholderTextColor={c.placeholder}
          value={key2}
          onChangeText={setKey2}
          editable={!sending}
          autoCapitalize="none"
        />
        <TextInput
          style={[panelStyles.inputHalf, inputStyle]}
          placeholder="Value 2"
          placeholderTextColor={c.placeholder}
          value={value2}
          onChangeText={setValue2}
          editable={!sending}
          autoCapitalize="none"
        />
      </View>
      <View style={panelStyles.buttonRow}>
        <TouchableOpacity
          style={[
            panelStyles.button,
            { borderColor: primaryColor },
            sending && panelStyles.buttonDisabled,
          ]}
          onPress={send}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={primaryColor} size="small" />
          ) : (
            <Text style={[panelStyles.buttonText, { color: primaryColor }]}>
              Send event
            </Text>
          )}
        </TouchableOpacity>
        {inputError !== null && (
          <Text style={[panelStyles.feedback, { color: '#FF3B30' }]}>
            {`✕ ${inputError}`}
          </Text>
        )}
      </View>
    </View>
  );
}
