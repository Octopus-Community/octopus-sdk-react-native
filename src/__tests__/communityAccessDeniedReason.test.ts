import { addCommunityAccessDeniedReasonListener } from '../addCommunityAccessDeniedReasonListener';
import { parseCommunityAccessDeniedReason } from '../internals/communityAccessDeniedReason';
import type { CommunityAccessDeniedReason } from '../types/communityAccessDeniedReason';

const mockAddListener = jest.fn();

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

beforeEach(() => {
  mockAddListener.mockReset();
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});

describe('parseCommunityAccessDeniedReason', () => {
  it.each<[string, CommunityAccessDeniedReason]>([
    ['NOT_IN_COHORT', 'notInCohort'],
    ['COMMUNITY_TEMPORARILY_DISABLED', 'communityTemporarilyDisabled'],
    ['COMMUNITY_CLOSED', 'communityClosed'],
    ['MEMBER_EXCLUDED', 'memberExcluded'],
    ['ACCOUNT_BANNED', 'accountBanned'],
    ['ACCOUNT_DELETED', 'accountDeleted'],
    ['UNKNOWN', 'unknown'],
  ])('maps the native name %s to %s', (wire, expected) => {
    expect(parseCommunityAccessDeniedReason(wire)).toBe(expected);
  });

  it('maps null and a missing value to null (access granted or not known yet)', () => {
    expect(parseCommunityAccessDeniedReason(null)).toBeNull();
    expect(parseCommunityAccessDeniedReason(undefined)).toBeNull();
  });

  it.each([['ACCOUNT_SUSPENDED'], ['accountBanned'], ['toString'], [42]])(
    'maps %p, a value this version does not know, to unknown',
    (wire) => {
      expect(parseCommunityAccessDeniedReason(wire)).toBe('unknown');
    }
  );
});

describe('addCommunityAccessDeniedReasonListener', () => {
  it('subscribes to communityAccessDeniedReasonChanged and decodes the reason', () => {
    const callback = jest.fn();
    const subscription = addCommunityAccessDeniedReasonListener(callback);

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0]?.[0]).toBe(
      'communityAccessDeniedReasonChanged'
    );
    const handler = mockAddListener.mock.calls[0]?.[1] as (event: {
      reason?: unknown;
    }) => void;

    handler({ reason: 'ACCOUNT_BANNED' });
    handler({ reason: null });
    handler({ reason: 'SOMETHING_NEW' });

    expect(callback.mock.calls).toEqual([
      ['accountBanned'],
      [null],
      ['unknown'],
    ]);
    expect(subscription).toHaveProperty('remove');
  });
});
