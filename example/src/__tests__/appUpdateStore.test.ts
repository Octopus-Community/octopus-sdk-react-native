import {
  getAppUpdateStatus,
  resetAppUpdateStoreForTests,
  setAppUpdateStatusForTests,
  subscribeToAppUpdate,
  subscribeToAppUpdateAnnouncements,
  takeAppUpdateAnnouncement,
} from '../update/appUpdateStore';
import {
  APP_UPDATE_ANNOUNCEMENT_ACTION_LABEL,
  APP_UPDATE_ANNOUNCEMENT_DURATION_MS,
  describeAppUpdateAnnouncement,
} from '../update/appUpdate';

// The store exists so the Settings card and the shell's snackbar read one answer
// and only one check runs. The part worth testing is the announcement: it is
// what makes the feature discoverable at all — the card sits in a tab a tester
// running a scenario has no reason to open — and it must fire exactly once per
// build, not on every re-check.

beforeEach(() => {
  resetAppUpdateStoreForTests();
});

describe('takeAppUpdateAnnouncement', () => {
  it('says nothing when there is no update to announce', () => {
    expect(takeAppUpdateAnnouncement()).toBeNull();
    setAppUpdateStatusForTests({ kind: 'upToDate' });
    expect(takeAppUpdateAnnouncement()).toBeNull();
    setAppUpdateStatusForTests({ kind: 'notFromPlayStore' });
    expect(takeAppUpdateAnnouncement()).toBeNull();
  });

  it('announces a new build once, then stays quiet for the same one', () => {
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    expect(takeAppUpdateAnnouncement()).toBe(1130042);
    expect(takeAppUpdateAnnouncement()).toBeNull();
  });

  it('announces again when Play starts offering a different build', () => {
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    expect(takeAppUpdateAnnouncement()).toBe(1130042);
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130043,
    });
    expect(takeAppUpdateAnnouncement()).toBe(1130043);
  });

  it('has nothing to announce when Play offers no version code', () => {
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: null,
    });
    expect(takeAppUpdateAnnouncement()).toBeNull();
  });
});

describe('subscribeToAppUpdate', () => {
  it('notifies every subscriber on a state change and stops after unsubscribe', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeToAppUpdate(() => {
      seen.push(getAppUpdateStatus().kind);
    });

    setAppUpdateStatusForTests({ kind: 'checking' });
    setAppUpdateStatusForTests({ kind: 'upToDate' });
    unsubscribe();
    setAppUpdateStatusForTests({ kind: 'notFromPlayStore' });

    expect(seen).toEqual(['checking', 'upToDate']);
    expect(getAppUpdateStatus().kind).toBe('notFromPlayStore');
  });
});

describe('subscribeToAppUpdateAnnouncements', () => {
  it('announces each new build once, whatever the number of re-checks', () => {
    const announced: number[] = [];
    subscribeToAppUpdateAnnouncements((version) => announced.push(version));

    setAppUpdateStatusForTests({ kind: 'checking' });
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    // A foreground re-check lands on the same build: no second snackbar.
    setAppUpdateStatusForTests({ kind: 'checking' });
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130043,
    });

    expect(announced).toEqual([1130042, 1130043]);
  });

  it('announces a check that finished before the subscriber mounted', () => {
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    const announced: number[] = [];
    subscribeToAppUpdateAnnouncements((version) => announced.push(version));

    expect(announced).toEqual([1130042]);
  });

  it('does not re-announce to a remounted subscriber', () => {
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });
    const first: number[] = [];
    subscribeToAppUpdateAnnouncements((version) => first.push(version))();
    const second: number[] = [];
    subscribeToAppUpdateAnnouncements((version) => second.push(version));

    expect(first).toEqual([1130042]);
    expect(second).toEqual([]);
  });

  it('stays quiet for every state that is not an installable build', () => {
    const announced: number[] = [];
    subscribeToAppUpdateAnnouncements((version) => announced.push(version));

    setAppUpdateStatusForTests({ kind: 'upToDate' });
    setAppUpdateStatusForTests({ kind: 'notInstallable' });
    setAppUpdateStatusForTests({ kind: 'notFromPlayStore' });
    setAppUpdateStatusForTests({ kind: 'checkFailed', errorCode: -2 });
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: null,
    });

    expect(announced).toEqual([]);
  });

  it('stops announcing once unsubscribed', () => {
    const announced: number[] = [];
    const unsubscribe = subscribeToAppUpdateAnnouncements((version) =>
      announced.push(version)
    );
    unsubscribe();
    setAppUpdateStatusForTests({
      kind: 'available',
      availableVersionCode: 1130042,
    });

    expect(announced).toEqual([]);
  });
});

describe('the announcement copy', () => {
  // Aligned on the Flutter example's snackbar, which the Android native sample
  // matches on the action label.
  it('names the build and offers the Update action', () => {
    expect(describeAppUpdateAnnouncement(1130042)).toBe(
      'Sample build 1130042 is available'
    );
    expect(APP_UPDATE_ANNOUNCEMENT_ACTION_LABEL).toBe('Update');
  });

  it("hides itself after the Flutter example's 8 seconds", () => {
    expect(APP_UPDATE_ANNOUNCEMENT_DURATION_MS).toBe(8000);
  });
});
