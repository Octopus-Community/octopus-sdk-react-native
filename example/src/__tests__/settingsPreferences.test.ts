import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockStore } from '../testing/asyncStorageMock';
import {
  loadSettingsPreferences,
  parseSettingsPreferences,
  saveSettingsPreferences,
  PREFERENCES_KEY,
  SDK_LANGUAGES,
} from '../config/settingsPreferences';

const preferences = {
  appearance: 'dark',
  themeSet: 'octopusNavy',
  language: 'de',
} as const;
beforeEach(() => {
  mockStore.reset();
});
it('restores only known choices and drops unrelated key material', () => {
  expect(
    parseSettingsPreferences({ ...preferences, apiKey: 'never-store' })
  ).toEqual(preferences);
  for (const invalid of [
    null,
    {},
    { ...preferences, appearance: 'unknown' },
    { ...preferences, language: 'unknown' },
    { ...preferences, themeSet: 'unknown' },
  ]) {
    expect(parseSettingsPreferences(invalid)).toBeNull();
  }
  expect(SDK_LANGUAGES.map((language) => language.value)).toEqual([
    'system',
    'en',
    'fr',
    'de',
    'it',
    'pl',
    'pt',
    'es',
    'sv',
    'tr',
  ]);
});
it('persists the latest rapid choice and clears it on reset', async () => {
  await Promise.all([
    saveSettingsPreferences(preferences),
    saveSettingsPreferences({ ...preferences, language: 'tr' }),
  ]);
  expect(await loadSettingsPreferences()).toEqual({
    ...preferences,
    language: 'tr',
  });
  await saveSettingsPreferences(null);
  expect(await AsyncStorage.getItem(PREFERENCES_KEY)).toBeNull();
});
it('tolerates corrupt storage', async () => {
  await AsyncStorage.setItem(PREFERENCES_KEY, 'invalid json');
  expect(await loadSettingsPreferences()).toBeNull();
});
