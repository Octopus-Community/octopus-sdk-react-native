import { trackCustomEvent } from '../trackCustomEvent';

const mockTrackCustomEvent = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    trackCustomEvent: (...args: unknown[]) => mockTrackCustomEvent(...args),
  },
}));

beforeEach(() => {
  mockTrackCustomEvent.mockReset();
  mockTrackCustomEvent.mockResolvedValue(undefined);
});

describe('trackCustomEvent', () => {
  it('calls native module with name and empty object when properties omitted', async () => {
    await trackCustomEvent('my_event');
    expect(mockTrackCustomEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackCustomEvent).toHaveBeenCalledWith('my_event', {});
  });

  it('calls native module with name and properties when provided', async () => {
    const properties = { key1: 'value1', key2: 'value2' };
    await trackCustomEvent('my_event', properties);
    expect(mockTrackCustomEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackCustomEvent).toHaveBeenCalledWith('my_event', properties);
  });

  it('calls native module with empty object when properties is undefined', async () => {
    await trackCustomEvent('event_name', undefined);
    expect(mockTrackCustomEvent).toHaveBeenCalledWith('event_name', {});
  });

  it('calls native module with empty object when properties is null', async () => {
    await trackCustomEvent(
      'event_name',
      null as unknown as Record<string, string>
    );
    expect(mockTrackCustomEvent).toHaveBeenCalledWith('event_name', {});
  });

  it('returns a promise that resolves when native module resolves', async () => {
    const result = trackCustomEvent('event');
    await expect(result).resolves.toBeUndefined();
  });

  it('returns a promise that rejects when native module rejects', async () => {
    const error = new Error('TRACK_ERROR');
    mockTrackCustomEvent.mockRejectedValue(error);
    await expect(trackCustomEvent('event')).rejects.toThrow('TRACK_ERROR');
  });
});
