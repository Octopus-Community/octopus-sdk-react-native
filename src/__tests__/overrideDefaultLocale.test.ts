import { overrideDefaultLocale } from '../overrideDefaultLocale';

const mockOverrideDefaultLocale = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    overrideDefaultLocale: (...args: unknown[]) =>
      mockOverrideDefaultLocale(...args),
  },
}));

beforeEach(() => {
  mockOverrideDefaultLocale.mockReset();
  mockOverrideDefaultLocale.mockResolvedValue(undefined);
});

describe('overrideDefaultLocale', () => {
  it('calls native module with null, null when locale is null (system default)', async () => {
    await overrideDefaultLocale(null);
    expect(mockOverrideDefaultLocale).toHaveBeenCalledTimes(1);
    expect(mockOverrideDefaultLocale).toHaveBeenCalledWith(null, null);
  });

  it('calls native module with languageCode and null when only languageCode provided', async () => {
    await overrideDefaultLocale({ languageCode: 'fr' });
    expect(mockOverrideDefaultLocale).toHaveBeenCalledTimes(1);
    expect(mockOverrideDefaultLocale).toHaveBeenCalledWith('fr', null);
  });

  it('calls native module with languageCode and countryCode when both provided', async () => {
    await overrideDefaultLocale({
      languageCode: 'en',
      countryCode: 'US',
    });
    expect(mockOverrideDefaultLocale).toHaveBeenCalledTimes(1);
    expect(mockOverrideDefaultLocale).toHaveBeenCalledWith('en', 'US');
  });

  it('calls native module with countryCode null when countryCode is omitted', async () => {
    await overrideDefaultLocale({ languageCode: 'en' });
    expect(mockOverrideDefaultLocale).toHaveBeenCalledWith('en', null);
  });

  it('normalizes languageCode to lowercase and countryCode to uppercase', async () => {
    await overrideDefaultLocale({
      languageCode: 'EN',
      countryCode: 'us',
    });
    expect(mockOverrideDefaultLocale).toHaveBeenCalledWith('en', 'US');
  });

  it('returns a promise that resolves when native module resolves', async () => {
    const result = overrideDefaultLocale(null);
    await expect(result).resolves.toBeUndefined();
  });

  it('returns a promise that rejects when native module rejects', async () => {
    const error = new Error('LOCALE_ERROR');
    mockOverrideDefaultLocale.mockRejectedValue(error);
    await expect(overrideDefaultLocale({ languageCode: 'fr' })).rejects.toThrow(
      'LOCALE_ERROR'
    );
  });

  describe('validation', () => {
    it('rejects when languageCode is empty', async () => {
      await expect(overrideDefaultLocale({ languageCode: '' })).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });

    it('rejects when languageCode is not 2 characters', async () => {
      await expect(
        overrideDefaultLocale({ languageCode: 'x' })
      ).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      await expect(
        overrideDefaultLocale({ languageCode: 'eng' })
      ).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });

    it('rejects when languageCode contains non-alpha characters', async () => {
      await expect(
        overrideDefaultLocale({ languageCode: '987' })
      ).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      await expect(
        overrideDefaultLocale({ languageCode: 'f1' })
      ).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });

    it('rejects when languageCode is BCP 47-style composite (e.g. fr-BE)', async () => {
      await expect(
        overrideDefaultLocale({ languageCode: 'fr-BE' })
      ).rejects.toThrow(
        'overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });

    it('rejects when countryCode is provided and not 2 letters', async () => {
      await expect(
        overrideDefaultLocale({ languageCode: 'en', countryCode: '1' })
      ).rejects.toThrow(
        'overrideDefaultLocale: countryCode must be a 2-letter ISO 3166-1 alpha-2 code'
      );
      await expect(
        overrideDefaultLocale({ languageCode: 'en', countryCode: 'USA' })
      ).rejects.toThrow(
        'overrideDefaultLocale: countryCode must be a 2-letter ISO 3166-1 alpha-2 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });

    it('rejects when countryCode contains non-alpha characters', async () => {
      await expect(
        overrideDefaultLocale({ languageCode: 'fr', countryCode: 'B3' })
      ).rejects.toThrow(
        'overrideDefaultLocale: countryCode must be a 2-letter ISO 3166-1 alpha-2 code'
      );
      expect(mockOverrideDefaultLocale).not.toHaveBeenCalled();
    });
  });
});
