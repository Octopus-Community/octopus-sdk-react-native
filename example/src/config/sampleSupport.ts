import type { ComponentType } from 'react';

/** Optional internal bootstrap installs the sheet; a public checkout leaves it absent. */
export const sampleSupport: {
  FeedbackSheet?: ComponentType<{
    visible: boolean;
    isDark: boolean;
    onClose: () => void;
    onDismiss: () => void;
  }>;
  breadcrumb: string;
} = { breadcrumb: 'Home' };

export function designReferenceUrl(raw: string | undefined): string {
  const value = raw?.trim() ?? '';
  return /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/.test(value) ? value : '';
}

export const sampleDesignReferenceUrl = designReferenceUrl(
  process.env.OCTOPUS_DESIGN_REFERENCE_URL
);
