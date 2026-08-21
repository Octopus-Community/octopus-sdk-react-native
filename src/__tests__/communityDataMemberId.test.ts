import { requireExactlyOneMemberId } from '../internals/communityDataMemberId';

describe('requireExactlyOneMemberId', () => {
  it('accepts a profileId only and normalizes clientUserId to null', () => {
    expect(requireExactlyOneMemberId({ profileId: 'p1' }, 'caller')).toEqual({
      profileId: 'p1',
      clientUserId: null,
    });
  });

  it('accepts a clientUserId only and normalizes profileId to null', () => {
    expect(requireExactlyOneMemberId({ clientUserId: 'c1' }, 'caller')).toEqual(
      { profileId: null, clientUserId: 'c1' }
    );
  });

  it('throws when neither id is provided', () => {
    expect(() => requireExactlyOneMemberId({}, 'caller')).toThrow(/neither/);
  });

  it('throws when both ids are provided', () => {
    expect(() =>
      requireExactlyOneMemberId(
        { profileId: 'p1', clientUserId: 'c1' },
        'caller'
      )
    ).toThrow(/both/);
  });

  it('treats an empty-string profileId as absent, not as a provided id', () => {
    // Regression: a truthiness check alone lets `{ profileId: '', clientUserId: 'x' }` "pass"
    // as exactly-one-provided, but a naive `?? null` forward at the call site would still send
    // the empty string across the bridge as a non-null profileId. The guard must normalize the
    // empty string to null so callers forward the same value this check validated.
    expect(
      requireExactlyOneMemberId({ profileId: '', clientUserId: 'x' }, 'caller')
    ).toEqual({ profileId: null, clientUserId: 'x' });
  });

  it('treats an empty-string clientUserId as absent, not as a provided id', () => {
    expect(
      requireExactlyOneMemberId({ profileId: 'p1', clientUserId: '' }, 'caller')
    ).toEqual({ profileId: 'p1', clientUserId: null });
  });

  it('throws when both ids are empty strings', () => {
    expect(() =>
      requireExactlyOneMemberId({ profileId: '', clientUserId: '' }, 'caller')
    ).toThrow(/neither/);
  });

  it('includes the caller name in the error message', () => {
    expect(() => requireExactlyOneMemberId({}, 'myCaller')).toThrow(/myCaller/);
  });
});
