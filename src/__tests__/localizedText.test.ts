import { fetchOrCreateClientObjectRelatedPost } from '../fetchOrCreateClientObjectRelatedPost';
import { navigateToOctopusCreatePost } from '../navigateToOctopusCreatePost';
import { openUI } from '../openUI';
import { isClientPostError } from '../types/clientPostError';
import { isNavigateToOctopusCreatePostError } from '../types/navigateToOctopusCreatePostError';
import { OctopusLocalizedText } from '../types/octopusLocalizedText';

const mockFetchOrCreate = jest.fn();
const mockNavigateToCreatePost = jest.fn();
const mockOpenUI = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    fetchOrCreateClientObjectRelatedPost: (...args: unknown[]) =>
      mockFetchOrCreate(...args),
    navigateToOctopusCreatePost: (...args: unknown[]) =>
      mockNavigateToCreatePost(...args),
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

const texts = { 'en': 'Read', 'fr': 'Lire', 'zh-Hant-TW': '閱讀' };

/** A rejection the way React Native builds it from a native `reject(code, message, userInfo)`. */
function nativeRejection(
  code: string,
  userInfo: Record<string, unknown> | null
) {
  return Object.assign(new Error('Native failure message.'), {
    code,
    userInfo,
  });
}

beforeEach(() => {
  for (const mock of [
    mockFetchOrCreate,
    mockNavigateToCreatePost,
    mockOpenUI,
  ]) {
    mock.mockReset();
  }
  mockFetchOrCreate.mockResolvedValue({});
  mockNavigateToCreatePost.mockResolvedValue(undefined);
  mockOpenUI.mockResolvedValue(undefined);
});

describe('OctopusLocalizedText builders', () => {
  it('builds an auto-translated text', () => {
    expect(OctopusLocalizedText.autoTranslated('Read')).toStrictEqual({
      type: 'autoTranslated',
      text: 'Read',
    });
  });

  it('builds a per-language text holding a copy of the texts', () => {
    const source: Record<string, string> = { ...texts };
    const label = OctopusLocalizedText.perLanguage(source, 'en');
    source.de = 'Lesen';

    expect(label).toStrictEqual({
      type: 'perLanguage',
      texts,
      defaultLanguage: 'en',
    });
  });

  it('sends tags exactly as given, underscores and case included', async () => {
    // The bridges read '_' as '-' and the native SDK judges the rest: nothing is converted or
    // checked in JS.
    const given = { 'pt_BR': 'Ler', 'EN-us': 'Read', 'zh_hant_tw': '閱讀' };
    const label = OctopusLocalizedText.perLanguage(given, 'pt_BR');
    expect(label).toStrictEqual({
      type: 'perLanguage',
      texts: given,
      defaultLanguage: 'pt_BR',
    });

    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A long enough post text.',
      viewObjectButton: label,
    });
    await navigateToOctopusCreatePost({
      cta: { url: 'https://example.com', localizedLabel: label },
    });

    expect(mockFetchOrCreate.mock.calls[0][0]).toMatchObject({
      viewObjectButtonLanguage: 'pt_BR',
      viewObjectButtonTexts: given,
    });
    expect(mockNavigateToCreatePost.mock.calls[0][0]).toMatchObject({
      ctaLabelLanguage: 'pt_BR',
      ctaLabelTexts: given,
    });
  });

  it('leaves the validation to the native SDK', () => {
    // An empty map and a missing default language are the native SDK's to refuse, so both
    // platforms refuse the same values with the same codes.
    expect(() => OctopusLocalizedText.perLanguage({}, 'en')).not.toThrow();
    expect(() =>
      OctopusLocalizedText.perLanguage({ en: 'Read' }, 'de')
    ).not.toThrow();
  });
});

describe('ClientPost.viewObjectButton', () => {
  const base = { objectId: 'article-1', text: 'A long enough post text.' };

  it('sends a per-language button as its language and texts', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButton: OctopusLocalizedText.perLanguage(texts, 'fr'),
    });

    expect(mockFetchOrCreate.mock.calls[0][0]).toMatchObject({
      viewObjectButtonText: null,
      viewObjectButtonLanguage: 'fr',
      viewObjectButtonTexts: texts,
    });
  });

  it('sends an auto-translated button as the plain text', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButton: OctopusLocalizedText.autoTranslated('Read'),
    });

    expect(mockFetchOrCreate.mock.calls[0][0]).toMatchObject({
      viewObjectButtonText: 'Read',
      viewObjectButtonLanguage: null,
      viewObjectButtonTexts: null,
    });
  });

  it('sends the deprecated text exactly as before', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButtonText: 'Read',
    });

    expect(mockFetchOrCreate.mock.calls[0][0]).toMatchObject({
      viewObjectButtonText: 'Read',
      viewObjectButtonLanguage: null,
      viewObjectButtonTexts: null,
    });
  });

  it('refuses the button set both ways with INVALID_ARGS, before any native call', async () => {
    const error = await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButtonText: 'Read',
      viewObjectButton: OctopusLocalizedText.autoTranslated('Read'),
    }).catch((e: unknown) => e);

    expect(isClientPostError(error)).toBe(true);
    expect((error as { code: string }).code).toBe('INVALID_ARGS');
    expect(mockFetchOrCreate).not.toHaveBeenCalled();
  });

  it('refuses a button that is not an OctopusLocalizedText with INVALID_ARGS', async () => {
    for (const viewObjectButton of [
      { type: 'other', text: 'Read' },
      { type: 'perLanguage', texts: { en: 42 }, defaultLanguage: 'en' },
      { type: 'perLanguage', texts: null, defaultLanguage: 'en' },
      'Read',
    ]) {
      const error = await fetchOrCreateClientObjectRelatedPost({
        ...base,
        viewObjectButton: viewObjectButton as unknown as OctopusLocalizedText,
      }).catch((e: unknown) => e);

      expect((error as { code: string }).code).toBe('INVALID_ARGS');
    }
    expect(mockFetchOrCreate).not.toHaveBeenCalled();
  });

  it('surfaces the language a native validation error names', async () => {
    mockFetchOrCreate.mockRejectedValue(
      nativeRejection('LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING', {
        languageCode: 'de',
      })
    );

    const error = await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButton: OctopusLocalizedText.perLanguage(texts, 'de'),
    }).catch((e: unknown) => e);

    expect(isClientPostError(error)).toBe(true);
    expect(error).toMatchObject({
      code: 'LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING',
      languageCode: 'de',
    });
  });

  it('adds no language to an error that names none', async () => {
    mockFetchOrCreate.mockRejectedValue(
      nativeRejection('LOCALIZED_TEXT_EMPTY_TEXTS', {})
    );

    const error = await fetchOrCreateClientObjectRelatedPost({
      ...base,
      viewObjectButton: OctopusLocalizedText.perLanguage({}, 'en'),
    }).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: 'LOCALIZED_TEXT_EMPTY_TEXTS' });
    expect('languageCode' in (error as object)).toBe(false);
  });
});

describe('OctopusPostCTA.localizedLabel', () => {
  it('sends a per-language label as its language and texts', async () => {
    await navigateToOctopusCreatePost({
      cta: {
        url: 'https://example.com',
        localizedLabel: OctopusLocalizedText.perLanguage(texts, 'en'),
      },
    });

    expect(mockNavigateToCreatePost.mock.calls[0][0]).toStrictEqual({
      text: null,
      imageUris: null,
      topicId: null,
      ctaUrl: 'https://example.com',
      ctaLabel: null,
      ctaLabelLanguage: 'en',
      ctaLabelTexts: texts,
    });
  });

  it('sends an auto-translated label as the plain label', async () => {
    await navigateToOctopusCreatePost({
      cta: {
        url: 'https://example.com',
        localizedLabel: OctopusLocalizedText.autoTranslated('Read'),
      },
    });

    expect(mockNavigateToCreatePost.mock.calls[0][0]).toMatchObject({
      ctaLabel: 'Read',
      ctaLabelLanguage: null,
      ctaLabelTexts: null,
    });
  });

  it('refuses the label set both ways with a plain Error, before any native call', async () => {
    const error = await navigateToOctopusCreatePost({
      cta: {
        url: 'https://example.com',
        label: 'Read',
        localizedLabel: OctopusLocalizedText.autoTranslated('Read'),
      },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(isNavigateToOctopusCreatePostError(error)).toBe(false);
    expect(mockNavigateToCreatePost).not.toHaveBeenCalled();
  });

  it('surfaces the language a native validation error names', async () => {
    mockNavigateToCreatePost.mockRejectedValue(
      nativeRejection('LOCALIZED_TEXT_BLANK_TEXT', { languageCode: 'fr' })
    );

    const error = await navigateToOctopusCreatePost({
      cta: {
        url: 'https://example.com',
        localizedLabel: OctopusLocalizedText.perLanguage(
          { en: 'Read', fr: ' ' },
          'en'
        ),
      },
    }).catch((e: unknown) => e);

    expect(isNavigateToOctopusCreatePostError(error)).toBe(true);
    expect(error).toMatchObject({
      code: 'LOCALIZED_TEXT_BLANK_TEXT',
      languageCode: 'fr',
    });
  });

  it('carries the label through the openUI createPost initial screen', async () => {
    await openUI({
      initialScreen: {
        type: 'createPost',
        prefilledPost: {
          cta: {
            url: 'https://example.com',
            localizedLabel: OctopusLocalizedText.perLanguage(texts, 'en'),
          },
        },
      },
    });

    expect(mockOpenUI.mock.calls[0][0].initialScreen).toMatchObject({
      type: 'createPost',
      ctaLabel: null,
      ctaLabelLanguage: 'en',
      ctaLabelTexts: texts,
    });
  });

  it('surfaces the language of an openUI rejection too', async () => {
    mockOpenUI.mockRejectedValue(
      nativeRejection('LOCALIZED_TEXT_DUPLICATE_LANGUAGE', {
        languageCode: 'en-US',
      })
    );

    const error = await openUI({
      initialScreen: {
        type: 'createPost',
        prefilledPost: {
          cta: {
            url: 'https://example.com',
            localizedLabel: OctopusLocalizedText.perLanguage(
              { 'en-US': 'Read', 'en-us': 'Read' },
              'en-US'
            ),
          },
        },
      },
    }).catch((e: unknown) => e);

    expect(error).toMatchObject({
      code: 'LOCALIZED_TEXT_DUPLICATE_LANGUAGE',
      languageCode: 'en-US',
    });
  });
});
