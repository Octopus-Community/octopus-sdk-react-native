// The package does not resolve from the example's Jest run (the other example tests mock it
// too); its real OctopusLocalizedText builders stand in for it.
jest.mock(
  '@octopus-community/react-native',
  () => jest.requireActual('../../../src/types/octopusLocalizedText'),
  { virtual: true }
);

import {
  buildLocalizedLabel,
  describeBridgeError,
  initialLocalizedLabelForm,
} from '../scenarios/localizedLabel';

describe('buildLocalizedLabel', () => {
  const form = initialLocalizedLabelForm('View product');

  it('sends the plain label, auto-translated, while the switch is off', () => {
    expect(
      buildLocalizedLabel({
        ...form,
        rows: [{ id: 1, language: 'fr', label: 'Voir' }],
      })
    ).toStrictEqual({ type: 'autoTranslated', text: 'View product' });
  });

  it('starts on English as the default language', () => {
    expect(buildLocalizedLabel({ ...form, perLanguage: true })).toStrictEqual({
      type: 'perLanguage',
      texts: { en: 'View product' },
      defaultLanguage: 'en',
    });
  });

  it('adds each row, ignores an empty one and keeps a half-filled one', () => {
    expect(
      buildLocalizedLabel({
        ...form,
        perLanguage: true,
        defaultLanguage: ' fr ',
        defaultLabel: 'Voir le produit',
        rows: [
          { id: 1, language: 'pt-BR', label: 'Ver o produto' },
          { id: 2, language: '', label: '' },
          { id: 3, language: 'de', label: '' },
        ],
      })
    ).toStrictEqual({
      type: 'perLanguage',
      texts: { 'fr': 'Voir le produit', 'pt-BR': 'Ver o produto', 'de': '' },
      defaultLanguage: 'fr',
    });
  });

  it('refuses a language given twice, which one object cannot hold', () => {
    expect(() =>
      buildLocalizedLabel({
        ...form,
        perLanguage: true,
        rows: [{ id: 1, language: 'en', label: 'See product' }],
      })
    ).toThrow('"en" is given twice');
  });
});

describe('describeBridgeError', () => {
  it('names the code, then the language when the error names one', () => {
    const error = Object.assign(new Error('blank'), {
      code: 'LOCALIZED_TEXT_BLANK_TEXT',
      languageCode: 'fr',
    });
    expect(describeBridgeError(error)).toBe(
      'LOCALIZED_TEXT_BLANK_TEXT (language fr): blank'
    );
  });

  it('keeps the message alone for an error without a code', () => {
    expect(describeBridgeError(new Error('plain'))).toBe('plain');
  });
});
