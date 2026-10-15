import type {
  OctopusConsentTexts,
  TermsAcceptanceMode,
} from '@octopus-community/react-native';

const shortNotice =
  'By posting, you agree to the [community charter](https://example.com/charter).';
const longNotice = `${shortNotice} Read our [event rules](https://example.com/events).

**Be kind.** Members who post photos or routes keep their rights and let the community show them in the app.

*Your data:* we keep your posts for as long as your account exists. Read the [privacy notice](https://example.com/privacy) to learn how to export or delete them.

Questions? Use the [contact page](https://example.com/contact).`;

export const CONSENT_TEXTS_PRESETS: {
  id: string;
  testID: string;
  label: string;
  termsMode: TermsAcceptanceMode;
  texts: OctopusConsentTexts;
}[] = [
  {
    id: '1',
    testID: 'qa-preset-consentTexts-1',
    label: 'Implicit — short notice with a link',
    termsMode: 'implicit',
    texts: { mode: 'implicit', notice: shortNotice },
  },
  {
    id: '2',
    testID: 'qa-preset-consentTexts-2',
    label: 'Multi checkbox — short labels with links',
    termsMode: 'explicitMultiCheckbox',
    texts: {
      mode: 'multiCheckbox',
      termsLabel:
        'I accept the **community terms** ([read them](https://example.com/terms))',
      privacyLabel:
        'I accept the [privacy notice](https://example.com/privacy)',
      rulesLabel:
        'I will follow the [*community rules*](https://example.com/rules)',
    },
  },
  {
    id: '3',
    testID: 'qa-preset-consentTexts-3',
    label: 'Single checkbox — short label and text below',
    termsMode: 'explicitSingleCheckbox',
    texts: {
      mode: 'singleCheckbox',
      label:
        'I accept the [community terms](https://example.com/terms) and [rules](https://example.com/rules)',
      belowText:
        'Your data is handled as described in our [privacy notice](https://example.com/privacy).',
    },
  },
  {
    id: '4',
    testID: 'qa-preset-consentTexts-4',
    label: 'Implicit — long notice (scrolls past 5 lines)',
    termsMode: 'implicit',
    texts: { mode: 'implicit', notice: longNotice },
  },
  {
    id: '5',
    testID: 'qa-preset-consentTexts-5',
    label: 'Multi checkbox — long labels, several links',
    termsMode: 'explicitMultiCheckbox',
    texts: {
      mode: 'multiCheckbox',
      termsLabel:
        'I have read and accept the **community membership terms**, including the [event rules](https://example.com/events) and [refund policy](https://example.com/refunds).\nMembership renews every season.',
      privacyLabel:
        'I accept the [privacy notice](https://example.com/privacy). *Results are public* and stay on the leaderboard after I leave.',
      rulesLabel:
        'I will follow the [community rules](https://example.com/rules): be kind, respect other members and keep contributions relevant.\n\nRepeated breaches end a membership.',
    },
  },
  {
    id: '6',
    testID: 'qa-preset-consentTexts-6',
    label: 'Single checkbox — long, multi-paragraph',
    termsMode: 'explicitSingleCheckbox',
    texts: {
      mode: 'singleCheckbox',
      label:
        'I accept the **community membership terms** ([read them](https://example.com/terms)) and the [community rules](https://example.com/rules).',
      belowText:
        'We use your posts, photos and results to run the community.\n\nThey stay visible to members until you delete them. Read the [privacy notice](https://example.com/privacy) to export or erase your data, or use the [contact page](https://example.com/contact).\n\n# This heading stays plain text\n- and so does this list item',
    },
  },
  {
    id: '7',
    testID: 'qa-preset-consentTexts-7',
    label: 'Single checkbox — empty fields (SDK wordings)',
    termsMode: 'explicitSingleCheckbox',
    texts: { mode: 'singleCheckbox', label: '', belowText: '   ' },
  },
  {
    id: '8',
    testID: 'qa-preset-consentTexts-8',
    label: 'Multi checkbox with implicit texts (SDK wordings)',
    termsMode: 'explicitMultiCheckbox',
    texts: { mode: 'implicit', notice: shortNotice },
  },
];
