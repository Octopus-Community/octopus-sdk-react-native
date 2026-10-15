import {
  sampleRadius,
  sampleTypography,
  sampleMonoFont,
} from '../theme/tokens';
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { chromeColors } from '../theme/branding';
import { ParametersPanel, TypePill } from './SampleRecipes';

/**
 * Spec 09 zone 2: "Parameters, préremplis et typés". Every scenario field carries an
 * uppercase label plus a monospace type chip (`String`, `String?`, `Set<String>`, or an
 * enum's own type name), a functional prefilled default, and stays editable — the same
 * component family the API Explorer (card 07) uses for its own free-form call bench.
 *
 * Three shapes cover every scenario in the catalog: a free-text value ({@link
 * TextParamField}), a multi-select set ({@link SetParamField}), and a single-select enum
 * ({@link EnumParamField}) — the shape a scenario's former pile of `PresetButton`s
 * collapses into once its presets differ only by a handful of enumerated values.
 */
function FieldShell({
  testID,
  label,
  type,
  isDark,
  children,
}: {
  testID: string;
  label: string;
  type: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View testID={testID} style={styles.field}>
      <ParametersPanel isDark={isDark}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, { color: chrome.text }]}>
            {label}
          </Text>
          <TypePill value={type} isDark={isDark} />
        </View>
        {children}
      </ParametersPanel>
    </View>
  );
}

export interface TextParamFieldProps {
  /** Verbatim `qa-param-<scenario>-<name>` — the field's own catalog handle. */
  testID: string;
  label: string;
  type?: 'String' | 'String?';
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isDark: boolean;
  editable?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
}

/** A single editable text value — `String` or, with a placeholder such as "null — …", a
 *  nullable `String?`. */
export function TextParamField({
  testID,
  label,
  type = 'String',
  value,
  onChangeText,
  placeholder,
  isDark,
  editable = true,
  multiline = false,
  secureTextEntry = false,
}: TextParamFieldProps) {
  const chrome = chromeColors(isDark);
  return (
    <FieldShell testID={testID} label={label} type={type} isDark={isDark}>
      <TextInput
        testID={`${testID}-input`}
        style={[styles.fieldValue, { color: chrome.textBody }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={chrome.textPlaceholder}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        importantForAutofill={secureTextEntry ? 'no' : undefined}
        autoComplete={secureTextEntry ? 'off' : undefined}
        textContentType={secureTextEntry ? 'none' : undefined}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </FieldShell>
  );
}

export interface ChipOption {
  key: string;
  label: string;
  disabled?: boolean;
  /**
   * Overrides the chip's default `${fieldTestID}-${key}` testID. Used when this option is
   * also one of the shared QA catalog's `qa-preset-<scenario>-<n>` ids — the catalog needs
   * that literal verbatim, so the chip that selects the variant carries it directly instead
   * of the generic per-option id.
   */
  testID?: string;
}

export interface SetParamFieldProps {
  testID: string;
  label: string;
  options: ChipOption[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  isDark: boolean;
}

/** A `Set<String>` of independently toggled chips — e.g. entitlements, disabled content
 *  flags. */
export function SetParamField({
  testID,
  label,
  options,
  selected,
  onToggle,
  isDark,
}: SetParamFieldProps) {
  const chrome = chromeColors(isDark);
  return (
    <FieldShell
      testID={testID}
      label={label}
      type="Set<String>"
      isDark={isDark}
    >
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = selected.has(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              testID={option.testID ?? `${testID}-${option.key}`}
              disabled={option.disabled}
              onPress={() => onToggle(option.key)}
              activeOpacity={0.7}
              style={[
                styles.optionChip,
                { borderColor: chrome.tintBorder },
                active && { backgroundColor: chrome.accentContainer },
                option.disabled && styles.optionChipDisabled,
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: active ? chrome.onAccentContainer : chrome.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

export interface EnumParamFieldProps {
  testID: string;
  label: string;
  /** The type chip text — the union's own name, e.g. `EntitlementVariant`, `ThemeSet`. */
  typeName: string;
  options: ChipOption[];
  value: string;
  onChange: (key: string) => void;
  isDark: boolean;
}

/** A single-select enum — one `PresetButton` per value collapsed into one field, so the
 *  scenario's Run button carries a single, always-valid choice instead of N disconnected
 *  buttons. */
export function EnumParamField({
  testID,
  label,
  typeName,
  options,
  value,
  onChange,
  isDark,
}: EnumParamFieldProps) {
  const chrome = chromeColors(isDark);
  return (
    <FieldShell testID={testID} label={label} type={typeName} isDark={isDark}>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = option.key === value;
          return (
            <TouchableOpacity
              key={option.key}
              testID={option.testID ?? `${testID}-${option.key}`}
              disabled={option.disabled}
              onPress={() => onChange(option.key)}
              activeOpacity={0.7}
              style={[
                styles.optionChip,
                { borderColor: chrome.tintBorder },
                active && { backgroundColor: chrome.accentContainer },
                option.disabled && styles.optionChipDisabled,
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: active ? chrome.onAccentContainer : chrome.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 8 },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    ...sampleTypography.mono,
    fontWeight: '600',
  },
  typeChip: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeChipText: {
    ...sampleTypography.caption,

    fontFamily: sampleMonoFont,
  },
  fieldValue: {
    ...sampleTypography.caption,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: sampleRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionChipDisabled: {
    opacity: 0.4,
  },
  optionChipText: {
    ...sampleTypography.caption,
  },
});
