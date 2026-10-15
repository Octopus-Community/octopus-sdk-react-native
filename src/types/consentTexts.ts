/**
 * Community consent wordings in markdown, forwarded verbatim to the native SDK.
 * The variant must match the community's terms-acceptance mode to be displayed. Each omitted,
 * `null`, empty or whitespace-only field uses the native SDK wording. Markdown, links, fallback
 * and layout are handled by the native SDK; this model does not select the consent mode.
 */
export type OctopusConsentTexts =
  | {
      /** Inline notice under the post, comment and reply composers. */
      mode: 'implicit';
      /** Markdown notice. Omitted or blank: the native wording. */
      notice?: string | null;
    }
  | {
      /** One checkbox per legal document. */
      mode: 'multiCheckbox';
      /** Markdown label for the terms checkbox. Omitted or blank: the native wording. */
      termsLabel?: string | null;
      /** Markdown label for the privacy checkbox. Omitted or blank: the native wording. */
      privacyLabel?: string | null;
      /** Markdown label for the community rules checkbox. Omitted or blank: the native wording. */
      rulesLabel?: string | null;
    }
  | {
      /** A single checkbox followed by explanatory text. */
      mode: 'singleCheckbox';
      /** Markdown checkbox label. Omitted or blank: the native wording. */
      label?: string | null;
      /** Markdown text below the checkbox. Omitted or blank: the native wording. */
      belowText?: string | null;
    };
