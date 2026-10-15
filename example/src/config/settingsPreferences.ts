import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode, ThemeSet } from '../types/theme';
import { debugLog } from '../debug/debugLog';

export const SDK_LANGUAGES = [
  { value: 'system', label: 'Follow system' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'es', label: 'Spanish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
] as const;
export const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;
export const THEME_PRESETS = [
  { value: 'octopusNavy', label: 'Octopus navy' },
  { value: 'none', label: 'SDK default' },
] as const;
export const PREFERENCES_KEY = 'octopus_sample_settings_v1';
export interface SettingsPreferences {
  appearance: ThemeMode;
  themeSet: ThemeSet;
  language: string;
}
export function parseSettingsPreferences(
  raw: unknown
): SettingsPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as SettingsPreferences;
  if (
    !APPEARANCE_OPTIONS.some((o) => o.value === p.appearance) ||
    !['octopusNavy', 'none', 'theme1', 'theme2', 'theme3'].includes(
      p.themeSet
    ) ||
    !SDK_LANGUAGES.some((o) => o.value === p.language)
  )
    return null;
  return {
    appearance: p.appearance,
    themeSet: p.themeSet,
    language: p.language,
  };
}
export async function loadSettingsPreferences(): Promise<SettingsPreferences | null> {
  try {
    return parseSettingsPreferences(
      JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? 'null')
    );
  } catch {
    return null;
  }
}
// Serialize writes so a slower earlier selection cannot replace the latest selection.
let pendingWrite = Promise.resolve();
export function saveSettingsPreferences(
  p: SettingsPreferences | null
): Promise<void> {
  pendingWrite = pendingWrite
    .then(async () => {
      if (p === null) await AsyncStorage.removeItem(PREFERENCES_KEY);
      else
        await AsyncStorage.setItem(
          PREFERENCES_KEY,
          JSON.stringify(parseSettingsPreferences(p))
        );
    })
    .catch(() => {
      debugLog.apiCall('saveSettings', 'storage unavailable');
    });
  return pendingWrite;
}
