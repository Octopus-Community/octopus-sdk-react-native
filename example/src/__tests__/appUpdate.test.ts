import {
  describeAppUpdateStatus,
  isAppUpdateProblem,
  toAppUpdateStatus,
  type AppUpdateStatus,
} from '../update/appUpdate';

// The native module hands JavaScript Play's numeric InstallErrorCode rather than
// a formatted string, so the decision below is the whole feature: three of those
// codes mean "Play does not own this install", which is the normal outcome of a
// Gradle install and not a failure a tester can retry. What is worth testing is
// which answer each native result produces, not the bridge plumbing.

describe('toAppUpdateStatus', () => {
  it('passes the version code through when Play will install the update', () => {
    expect(
      toAppUpdateStatus({ status: 'available', availableVersionCode: 1130042 })
    ).toEqual({ kind: 'available', availableVersionCode: 1130042 });
  });

  it('reports an available update with no version code rather than dropping it', () => {
    expect(toAppUpdateStatus({ status: 'available' })).toEqual({
      kind: 'available',
      availableVersionCode: null,
    });
  });

  it('never reports an update Play refuses as up to date', () => {
    expect(toAppUpdateStatus({ status: 'notInstallable' })).toEqual({
      kind: 'notInstallable',
    });
  });

  it('keeps "not from Play Store" out of the failure bucket', () => {
    expect(toAppUpdateStatus({ status: 'notFromPlayStore' })).toEqual({
      kind: 'notFromPlayStore',
    });
  });

  it('keeps the numeric code on a genuine failure', () => {
    expect(toAppUpdateStatus({ status: 'error', errorCode: -100 })).toEqual({
      kind: 'checkFailed',
      errorCode: -100,
    });
  });

  it('tolerates a failure with no code at all', () => {
    expect(toAppUpdateStatus({ status: 'error' })).toEqual({
      kind: 'checkFailed',
      errorCode: null,
    });
  });

  it('maps the plain up-to-date answer', () => {
    expect(toAppUpdateStatus({ status: 'upToDate' })).toEqual({
      kind: 'upToDate',
    });
  });
});

describe('describeAppUpdateStatus', () => {
  it('spells out that Play does not own this install, and never says "up to date"', () => {
    const label = describeAppUpdateStatus({ kind: 'notFromPlayStore' });
    expect(label).toBe('Not installed from Play Store');
    expect(label).not.toMatch(/up to date/i);
    expect(label).not.toMatch(/retry/i);
  });

  it('does not claim a build Play refuses is current', () => {
    expect(describeAppUpdateStatus({ kind: 'notInstallable' })).not.toMatch(
      /up to date/i
    );
  });

  it('shows the error code when there is one, and asks for a retry either way', () => {
    expect(
      describeAppUpdateStatus({ kind: 'checkFailed', errorCode: -100 })
    ).toBe('Update check failed (code -100) — tap to retry');
    expect(
      describeAppUpdateStatus({ kind: 'checkFailed', errorCode: null })
    ).toBe('Update check failed — tap to retry');
  });

  it('gives every state a line except the one that renders nothing', () => {
    const states: AppUpdateStatus[] = [
      { kind: 'unknown' },
      { kind: 'checking' },
      { kind: 'upToDate' },
      { kind: 'available', availableVersionCode: 7 },
      { kind: 'notInstallable' },
      { kind: 'notFromPlayStore' },
      { kind: 'checkFailed', errorCode: null },
    ];
    states.forEach((state) => {
      expect(describeAppUpdateStatus(state).length).toBeGreaterThan(0);
    });
    expect(describeAppUpdateStatus({ kind: 'unsupported' })).toBe('');
  });
});

describe('isAppUpdateProblem', () => {
  it('treats a Gradle install as normal, not as a problem to flag', () => {
    expect(isAppUpdateProblem({ kind: 'notFromPlayStore' })).toBe(false);
    expect(isAppUpdateProblem({ kind: 'upToDate' })).toBe(false);
    expect(
      isAppUpdateProblem({ kind: 'available', availableVersionCode: 1 })
    ).toBe(false);
  });

  it('flags the two states a tester should not shrug off', () => {
    expect(isAppUpdateProblem({ kind: 'notInstallable' })).toBe(true);
    expect(isAppUpdateProblem({ kind: 'checkFailed', errorCode: -2 })).toBe(
      true
    );
  });
});
