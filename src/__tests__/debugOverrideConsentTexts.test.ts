import { debugOverrideConsentTexts, type OctopusConsentTexts } from '../index';

const mockOverride = jest.fn();
jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    debugOverrideConsentTexts: (...args: unknown[]) => mockOverride(...args),
  },
}));
beforeEach(() => mockOverride.mockReset());

const variants: OctopusConsentTexts[] = [
  {
    mode: 'implicit',
    notice: '**Notice** [link](https://example.com)\n\nEncore éè 漢字',
  },
  {
    mode: 'multiCheckbox',
    termsLabel: 'Terms',
    privacyLabel: 'Privacy',
    rulesLabel: 'Rules',
  },
  {
    mode: 'singleCheckbox',
    label: 'I agree',
    belowText: 'First paragraph\n\nSecond paragraph',
  },
];

it.each(variants)(
  'forwards the %s variant with its named fields verbatim',
  async (texts) => {
    await debugOverrideConsentTexts(texts);
    expect(mockOverride).toHaveBeenCalledTimes(1);
    expect(mockOverride).toHaveBeenCalledWith(texts);
  }
);

it.each([null, '', '   ', '\n\t', undefined])(
  'preserves %j fields for native fallback',
  async (notice) => {
    await debugOverrideConsentTexts({ mode: 'implicit', notice });
    expect(mockOverride).toHaveBeenCalledWith({ mode: 'implicit', notice });
  }
);

it('allows omitted fields without implementing fallback in JS', async () => {
  await debugOverrideConsentTexts({ mode: 'multiCheckbox' });
  expect(mockOverride).toHaveBeenCalledWith({ mode: 'multiCheckbox' });
});

it('sends null to restore the backend wordings', async () => {
  await debugOverrideConsentTexts(null);
  expect(mockOverride).toHaveBeenCalledWith(null);
});

it('propagates a native rejection', async () => {
  mockOverride.mockRejectedValueOnce(new Error('OVERRIDE_ERROR'));
  await expect(debugOverrideConsentTexts(variants[0]!)).rejects.toThrow(
    'OVERRIDE_ERROR'
  );
});
