import { openUI } from '../openUI';

const mockOpenUI = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

beforeEach(() => {
  mockOpenUI.mockReset();
  mockOpenUI.mockResolvedValue(undefined);
});

/** The last payload openUI sent across the bridge. */
function sentPayload(): Record<string, unknown> {
  expect(mockOpenUI).toHaveBeenCalledTimes(1);
  return mockOpenUI.mock.calls[0][0];
}

describe('openUI navigationMode / navBarLeadingAction marshalling', () => {
  it("defaults navigationMode to 'navigationStack' when the option is omitted", async () => {
    // RN's own default, diverging from the native SDK's `.automatic` — see
    // the TSDoc on `OpenUIOptions.navigationMode` for the rationale.
    await openUI();
    expect(sentPayload().navigationMode).toBe('navigationStack');
  });

  it('forwards navigationMode verbatim', async () => {
    await openUI({ navigationMode: 'automatic' });
    expect(sentPayload().navigationMode).toBe('automatic');
  });

  it('sends navBarLeadingAction undefined when the option is omitted', async () => {
    await openUI();
    expect(sentPayload().navBarLeadingAction).toBeUndefined();
  });

  it('forwards navBarLeadingAction verbatim', async () => {
    await openUI({ navBarLeadingAction: 'close' });
    expect(sentPayload().navBarLeadingAction).toBe('close');
  });

  it('forwards both alongside the other options untouched', async () => {
    await openUI({
      interceptUrls: true,
      navigationMode: 'automatic',
      navBarLeadingAction: 'back',
    });
    const payload = sentPayload();
    expect(payload.interceptUrls).toBe(true);
    expect(payload.navigationMode).toBe('automatic');
    expect(payload.navBarLeadingAction).toBe('back');
  });
});
