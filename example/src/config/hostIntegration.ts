import type { UrlOpeningMode } from '../screens/SettingsScreen';

/** The Android sample's default interception rule, with a safe fallback for invalid URLs. */
export function handlesSampleUrl(mode: UrlOpeningMode, url: string): boolean {
  if (mode === 'inAppWebView') return true;
  if (mode === 'defaultBrowser') return false;
  return /^https?:\/\/www\.octopuscommunity\.com\/contact(?:[?#]|$)/i.test(url);
}
