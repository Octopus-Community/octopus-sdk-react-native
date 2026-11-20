import { Switch, Text, View } from 'react-native';
import { PillButton } from './PillButton';
import { TextParamField } from './ScenarioParamField';
import type {
  LocalizedLabelForm,
  LocalizedLabelRow,
} from '../scenarios/localizedLabel';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';

/**
 * The per-language label form of the bridge and create-post scenarios (see
 * {@link LocalizedLabelForm}): a switch, then — on — the default label with its editable
 * language and one language + label row per translation, each removable.
 *
 * `testID` prefixes every handle: `<testID>-switch`, `<testID>-default-language`,
 * `<testID>-default-label`, `<testID>-add`, `<testID>-row-<n>-language` /
 * `-label` / `-remove`.
 */
export function LocalizedLabelEditor({
  testID,
  title,
  form,
  onChange,
  isDark,
}: {
  testID: string;
  title: string;
  form: LocalizedLabelForm;
  onChange: (next: LocalizedLabelForm) => void;
  isDark: boolean;
}) {
  const chrome = chromeColors(isDark);
  const updateRow = (id: number, patch: Partial<LocalizedLabelRow>) =>
    onChange({
      ...form,
      rows: form.rows.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  const nextId = form.rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  return (
    <View>
      <Text style={[sampleTypography.body, { color: chrome.text }]}>
        {title} per language
      </Text>
      <Switch
        testID={`${testID}-switch`}
        accessibilityLabel={`${title} per language`}
        value={form.perLanguage}
        onValueChange={(perLanguage) => onChange({ ...form, perLanguage })}
      />
      {form.perLanguage ? (
        <>
          <TextParamField
            testID={`${testID}-default-language`}
            label="Default language"
            value={form.defaultLanguage}
            onChangeText={(defaultLanguage) =>
              onChange({ ...form, defaultLanguage })
            }
            placeholder="en"
            isDark={isDark}
          />
          <TextParamField
            testID={`${testID}-default-label`}
            label="Default label"
            value={form.defaultLabel}
            onChangeText={(defaultLabel) => onChange({ ...form, defaultLabel })}
            isDark={isDark}
          />
          {form.rows.map((row, index) => (
            <View key={row.id}>
              <TextParamField
                testID={`${testID}-row-${index + 1}-language`}
                label={`Translation ${index + 1} · language`}
                value={row.language}
                onChangeText={(language) => updateRow(row.id, { language })}
                placeholder="fr, pt-BR, zh-Hant-TW…"
                isDark={isDark}
              />
              <TextParamField
                testID={`${testID}-row-${index + 1}-label`}
                label={`Translation ${index + 1} · label`}
                value={row.label}
                onChangeText={(label) => updateRow(row.id, { label })}
                isDark={isDark}
              />
              <PillButton
                testID={`${testID}-row-${index + 1}-remove`}
                label={`Remove translation ${index + 1}`}
                variant="danger"
                icon="delete"
                isDark={isDark}
                onPress={() =>
                  onChange({
                    ...form,
                    rows: form.rows.filter(({ id }) => id !== row.id),
                  })
                }
              />
            </View>
          ))}
          <PillButton
            testID={`${testID}-add`}
            label="Add translation"
            variant="secondary"
            icon="add"
            isDark={isDark}
            onPress={() =>
              onChange({
                ...form,
                rows: [...form.rows, { id: nextId, language: '', label: '' }],
              })
            }
          />
        </>
      ) : null}
    </View>
  );
}
