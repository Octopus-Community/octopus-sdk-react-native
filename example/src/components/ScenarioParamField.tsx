import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

import { chromeColors } from '../theme/branding';

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
    <View
      testID={testID}
      style={[styles.field, { backgroundColor: chrome.surfaceRaised }]}
    >
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: chrome.textSecondary }]}>
          {label}
        </Text>
        <View style={[styles.typeChip, { backgroundColor: chrome.tint }]}>
          <Text style={[styles.typeChipText, { color: chrome.tintBorder }]}>
            {type}
          </Text>
        </View>
      </View>
      {children}
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
}: TextParamFieldProps) {
  const chrome = chromeColors(isDark);
  return (
    <FieldShell testID={testID} label={label} type={type} isDark={isDark}>
      <TextInput
        testID={`${testID}-input`}
        style={[styles.fieldValue, { color: chrome.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={chrome.textPlaceholder}
        editable={editable}
        multiline={multiline}
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
                active && { backgroundColor: chrome.tint },
                option.disabled && styles.optionChipDisabled,
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: active ? chrome.tintBorder : chrome.textSecondary },
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
                active && { backgroundColor: chrome.tint },
                option.disabled && styles.optionChipDisabled,
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: active ? chrome.tintBorder : chrome.textSecondary },
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
  field: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  typeChip: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeChipText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  fieldValue: {
    fontSize: 12.5,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  optionChipDisabled: {
    opacity: 0.4,
  },
  optionChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
