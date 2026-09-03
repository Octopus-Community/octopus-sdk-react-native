import {
  getAppUpdateStatus,
  resetAppUpdateStoreForTests,
  setAppUpdateStatusForTests,
  subscribeToAppUpdate,
  takeAppUpdateAnnouncement,
} from '../update/appUpdateStore';

// The store exists so the Settings card and the shell's toast read one answer
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
