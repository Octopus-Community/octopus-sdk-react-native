import { debugGetCommunityConfig } from '../debugGetCommunityConfig';

const mockDebugGetCommunityConfig = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    debugGetCommunityConfig: (...args: unknown[]) =>
      mockDebugGetCommunityConfig(...args),
  },
}));

beforeEach(() => {
  mockDebugGetCommunityConfig.mockReset();
});

describe('debugGetCommunityConfig', () => {
  it('returns the native snapshot verbatim', async () => {
    const snapshot = {
      exposeClientUserId: true,
      forceLoginOnStrongActions: false,
      displayAccountAge: true,
      forceNicknameChoice: false,
      consentTexts: null,
      termsAcceptanceMode: 'implicit',
    };
    mockDebugGetCommunityConfig.mockResolvedValue(snapshot);
    await expect(debugGetCommunityConfig()).resolves.toEqual(snapshot);
    expect(mockDebugGetCommunityConfig).toHaveBeenCalledTimes(1);
    expect(mockDebugGetCommunityConfig).toHaveBeenCalledWith();
  });

  it('returns null when no config has been fetched yet', async () => {
    mockDebugGetCommunityConfig.mockResolvedValue(null);
    await expect(debugGetCommunityConfig()).resolves.toBeNull();
  });

  it('rejects when the native module rejects', async () => {
    mockDebugGetCommunityConfig.mockRejectedValue(new Error('CONFIG_ERROR'));
    await expect(debugGetCommunityConfig()).rejects.toThrow('CONFIG_ERROR');
  });
});

it.each([true, false])(
  'reads the effective forceNicknameChoice value %s',
  async (forceNicknameChoice) => {
    mockDebugGetCommunityConfig.mockResolvedValue({
      forceNicknameChoice,
      termsAcceptanceMode: 'IMPLICIT',
    });
    expect(await debugGetCommunityConfig()).toMatchObject({
      forceNicknameChoice,
      termsAcceptanceMode: 'implicit',
    });
  }
);

it('defaults forceNicknameChoice to false when an older snapshot omits it', async () => {
  mockDebugGetCommunityConfig.mockResolvedValue({
    termsAcceptanceMode: 'implicit',
  });
  expect(await debugGetCommunityConfig()).toMatchObject({
    forceNicknameChoice: false,
    consentTexts: null,
  });
});

it.each([
  null,
  { mode: 'implicit', notice: '  **Notice**\nsecond line  ' },
  {
    mode: 'multiCheckbox',
    termsLabel: null,
    privacyLabel: '',
    rulesLabel: '   ',
  },
  { mode: 'singleCheckbox', label: 'Agree', belowText: 'One\n\nTwo' },
])(
  'reads consentTexts %j without rewriting the wordings or aligning their mode',
  async (consentTexts) => {
    mockDebugGetCommunityConfig.mockResolvedValue({
      forceNicknameChoice: false,
      consentTexts,
      termsAcceptanceMode: 'EXPLICIT_MULTI_CHECKBOX',
    });
    expect(await debugGetCommunityConfig()).toEqual({
      forceNicknameChoice: false,
      consentTexts,
      termsAcceptanceMode: 'explicit_multi_checkbox',
    });
  }
);
