import { StyleSheet } from 'react-native';

import { chromeColors, OCTOPUS_BRAND } from '../../theme/branding';

/**
 * Palette shared by the scenario panels below, so a panel folded into a
 * scenario card looks like the card around it.
 */
export function panelColors(isDark: boolean) {
  const chrome = chromeColors(isDark);
  return {
    text: chrome.text,
    secondary: chrome.textSecondary,
    border: chrome.border,
    inputBg: chrome.surfaceRaised,
    placeholder: chrome.textPlaceholder,
  };
}

/** Rows, buttons and inputs shared by the scenario panels. */
export const panelStyles = StyleSheet.create({
  block: {
    gap: 8,
    marginTop: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  feedback: {
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    backgroundColor: OCTOPUS_BRAND.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  valueBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  mono: {
    fontSize: 12,
  },
});
