import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import * as Octopus from '@octopus-community/react-native';
import { Modal } from 'react-native';
import { useHostScreens } from '../navigation/useHostScreens';
import { HostScreenModal } from '../components/HostScreenModal';
import { debugLog } from '../debug/debugLog';

jest.mock(
  '@octopus-community/react-native',
  () => ({
    closeUI: jest.fn(() => Promise.resolve()),
    addLoginRequiredListener: jest.fn(() => ({ remove: jest.fn() })),
    addEditUserListener: jest.fn(() => ({ remove: jest.fn() })),
    addNavigateToProfileListener: jest.fn(() => ({ remove: jest.fn() })),
  }),
  { virtual: true }
);

jest.mock('react-native', () => ({
  Modal: 'Modal',
  Platform: { OS: 'ios' },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

const resumeFullscreen = jest.fn(() => Promise.resolve());
let route: ReturnType<typeof useHostScreens>;
let tree: ReactTestRenderer;

function Harness({
  enabled = true,
  fullscreen = true,
  isScenariosPreview = false,
  authEnabled = true,
  editEnabled = true,
  interceptProfiles = true,
  retainedCommunity = false,
}: {
  enabled?: boolean;
  fullscreen?: boolean;
  isScenariosPreview?: boolean;
  authEnabled?: boolean;
  editEnabled?: boolean;
  interceptProfiles?: boolean;
  retainedCommunity?: boolean;
}) {
  route = useHostScreens({
    enabled,
    fullscreen,
    isScenariosPreview,
    authEnabled,
    editEnabled,
    interceptProfiles,
    resumeFullscreen,
    retainedCommunity,
  });
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Octopus.closeUI).mockResolvedValue();
  debugLog.clear();
});
afterEach(() => act(() => tree.unmount()));

it.each(['username', 'biography', 'profilePicture', null] as const)(
  'retains the requested edit field from the SDK (%s)',
  async (fieldToEdit) => {
    act(() => {
      tree = create(<Harness />);
    });
    await act(async () => {
      jest
        .mocked(Octopus.addEditUserListener)
        .mock.calls[0]![0]({ fieldToEdit });
    });
    expect(route.screen).toEqual({ kind: 'editProfile', fieldToEdit });
  }
);

it('ignores requested fields when the host editor callback is disabled', async () => {
  act(() => {
    tree = create(<Harness editEnabled={false} />);
  });
  await act(async () => {
    jest
      .mocked(Octopus.addEditUserListener)
      .mock.calls[0]![0]({ fieldToEdit: 'biography' });
  });
  expect(route.screen).toBeNull();
  expect(Octopus.closeUI).not.toHaveBeenCalled();
});

it.each([false, true])(
  'returns from every host screen to its originating community (fullscreen=%s)',
  async (fullscreen) => {
    act(() => {
      if (!fullscreen)
        jest
          .mocked(Octopus.closeUI)
          .mockRejectedValue(new Error('No UI presented'));
      tree = create(<Harness fullscreen={fullscreen} />);
    });
    const login = jest.mocked(Octopus.addLoginRequiredListener).mock
      .calls[0]![0];
    const edit = jest.mocked(Octopus.addEditUserListener).mock.calls[0]![0];
    const profile = jest.mocked(Octopus.addNavigateToProfileListener).mock
      .calls[0]![0];
    await act(async () => {
      login();
    });
    expect(route.screen).toEqual({ kind: 'signIn' });
    act(() => route.close());
    act(() => route.onDismiss());
    expect(route.screen).toBeNull();
    await act(async () => {
      edit({ fieldToEdit: null });
    });
    expect(route.screen).toEqual({ kind: 'editProfile', fieldToEdit: null });
    act(() => route.close());
    act(() => route.onDismiss());
    await act(async () => {
      profile({ clientUserId: 'demo-member' });
    });
    expect(route.screen).toEqual({
      kind: 'profile',
      clientUserId: 'demo-member',
    });
    act(() => route.close());
    act(() => route.onDismiss());
    expect(resumeFullscreen).toHaveBeenCalledTimes(fullscreen ? 3 : 0);
    expect(Octopus.closeUI).toHaveBeenCalledTimes(3);
  }
);

it('ignores disabled authentication without closing native UI or opening a host screen', async () => {
  act(() => {
    tree = create(<Harness authEnabled={false} interceptProfiles={false} />);
  });
  await act(async () => {
    jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
  });
  expect(route.screen).toBeNull();
  expect(Octopus.closeUI).not.toHaveBeenCalled();
  expect(debugLog.all).toHaveLength(1);
  expect(debugLog.all[0]).toMatchObject({
    label: 'loginRequired',
    detail: 'ignored — host callback disabled',
  });
  expect(Octopus.addNavigateToProfileListener).not.toHaveBeenCalled();
  expect(resumeFullscreen).not.toHaveBeenCalled();
});

it('shares a pending native close across retries and ignores callbacks after the host appears', async () => {
  let resolveClose!: () => void;
  jest.mocked(Octopus.closeUI).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveClose = resolve;
    })
  );
  act(() => {
    tree = create(<Harness />);
  });
  const login = jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0];
  act(() => {
    login();
    login();
  });
  expect(route.screen).toBeNull();
  expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
  await act(async () => resolveClose());
  expect(route.screen).toEqual({ kind: 'signIn' });
  act(() => route.onShow());
  act(() => login());
  expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
  act(() => {
    route.close();
    route.close();
  });
  expect(resumeFullscreen).not.toHaveBeenCalled();
  act(() => {
    route.onDismiss();
    route.onDismiss();
  });
  expect(resumeFullscreen).toHaveBeenCalledTimes(1);
});

it.each(['signIn', 'editProfile'] as const)(
  'presents the %s Modal after one callback and a completed native close, without retrying',
  async (kind) => {
    let completeDismissal!: () => void;
    jest.mocked(Octopus.closeUI).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        completeDismissal = resolve;
      })
    );
    function ModalHarness() {
      route = useHostScreens({
        enabled: true,
        fullscreen: true,
        isScenariosPreview: false,
        authEnabled: true,
        interceptProfiles: true,
        resumeFullscreen,
      });
      return (
        <HostScreenModal
          visible={route.screen !== null}
          onShow={route.onShow}
          onRequestClose={route.close}
          onDismiss={route.onDismiss}
          overlays={null}
        >
          {route.screen?.kind}
        </HostScreenModal>
      );
    }
    act(() => {
      tree = create(<ModalHarness />);
    });
    act(() => {
      if (kind === 'signIn') {
        jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
      } else {
        jest.mocked(Octopus.addEditUserListener).mock.calls[0]![0]({
          fieldToEdit: null,
        });
      }
    });
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    await act(async () => completeDismissal());
    expect(tree.root.findByType(Modal).props.visible).toBe(true);
    expect(route.screen?.kind).toBe(kind);
    expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
  }
);

it('does not resume fullscreen when iOS closeUI rejects despite the selected fullscreen mode', async () => {
  jest
    .mocked(Octopus.closeUI)
    .mockRejectedValueOnce(new Error('No UI is currently presented'));
  act(() => {
    tree = create(<Harness />);
  });
  await act(async () => {
    jest
      .mocked(Octopus.addEditUserListener)
      .mock.calls[0]![0]({ fieldToEdit: null });
  });
  expect(route.screen).toEqual({ kind: 'editProfile', fieldToEdit: null });
  act(() => route.close());
  act(() => route.onDismiss());
  expect(resumeFullscreen).not.toHaveBeenCalled();
});

it('clears the screen when subscriptions change, and can close the next screen', async () => {
  act(() => {
    tree = create(<Harness />);
  });
  await act(async () => {
    jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
  });
  expect(route.screen).not.toBeNull();
  act(() => {
    tree.update(<Harness authEnabled={false} />);
  });
  expect(route.screen).toBeNull();
  act(() => route.onDismiss());
  expect(resumeFullscreen).not.toHaveBeenCalled();
  await act(async () => {
    jest
      .mocked(Octopus.addEditUserListener)
      .mock.calls[1]![0]({ fieldToEdit: null });
  });
  expect(route.screen?.kind).toBe('editProfile');
  act(() => route.close());
  act(() => route.onDismiss());
  expect(route.screen).toBeNull();
  expect(resumeFullscreen).toHaveBeenCalledTimes(1);
});

it('does not reopen a disposed route when a pending native close resolves', async () => {
  let resolveClose!: () => void;
  jest.mocked(Octopus.closeUI).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveClose = resolve;
    })
  );
  act(() => {
    tree = create(<Harness />);
  });
  act(() => {
    jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
  });
  act(() => {
    tree.update(<Harness enabled={false} />);
  });
  await act(async () => resolveClose());
  expect(route.screen).toBeNull();
  act(() => route.onDismiss());
  expect(resumeFullscreen).not.toHaveBeenCalled();
});

it.each([
  { fullscreen: false, isScenariosPreview: false },
  { fullscreen: true, isScenariosPreview: true },
])(
  'never resumes embedded Community or Scenarios when Android closeUI resolves (%j)',
  async (state) => {
    act(() => {
      tree = create(<Harness {...state} />);
    });
    await act(async () => {
      jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
    });
    expect(route.screen?.kind).toBe('signIn');
    act(() => route.onShow());
    act(() => route.close());
    act(() => route.onDismiss());
    expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
    expect(resumeFullscreen).not.toHaveBeenCalled();
  }
);

it('retries a dropped iOS Modal presentation when no host is showing or closing', async () => {
  act(() => {
    tree = create(<Harness />);
  });
  const login = jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0];
  await act(async () => login());
  const firstPresentation = route.presentationId;
  // Native never delivered onShow: retry must remount the Modal despite the pending screen.
  await act(async () => login());
  expect(route.screen?.kind).toBe('signIn');
  expect(route.presentationId).toBeGreaterThan(firstPresentation);
  expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
  act(() => route.onShow());
  const shownPresentation = route.presentationId;
  await act(async () => login());
  expect(route.presentationId).toBe(shownPresentation);
  act(() => route.close());
  await act(async () => login());
  expect(route.screen).toBeNull();
  expect(route.presentationId).toBe(shownPresentation);
  act(() => route.onDismiss());
  expect(resumeFullscreen).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
  'keeps the exact Community stack under login/edit/profile callbacks (fullscreen=%s)',
  async (fullscreen) => {
    act(() => {
      tree = create(<Harness fullscreen={fullscreen} retainedCommunity />);
    });
    const callbacks = [
      () => jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0](),
      () =>
        jest
          .mocked(Octopus.addEditUserListener)
          .mock.calls[0]![0]({ fieldToEdit: null }),
      () =>
        jest
          .mocked(Octopus.addNavigateToProfileListener)
          .mock.calls[0]![0]({ clientUserId: 'demo-member' }),
    ];
    for (const callback of callbacks) {
      await act(async () => {
        callback();
      });
      expect(route.screen).not.toBeNull();
      act(() => route.onShow());
      act(() => route.close());
      act(() => route.onDismiss());
    }
    expect(Octopus.closeUI).not.toHaveBeenCalled();
    expect(resumeFullscreen).not.toHaveBeenCalled();
  }
);
it('push waits for host dismissal and suppresses resume of the replaced SDK preview', async () => {
  act(() => {
    tree = create(<Harness />);
  });
  await act(async () => {
    jest.mocked(Octopus.addLoginRequiredListener).mock.calls[0]![0]();
  });
  act(() => route.onShow());
  let finished = false;
  let dismissal!: Promise<void>;
  act(() => {
    dismissal = route.dismissForPush().then(() => {
      finished = true;
    });
  });
  expect(finished).toBe(false);
  await act(async () => {
    route.onDismiss();
    await dismissal;
  });
  expect(finished).toBe(true);
  expect(resumeFullscreen).not.toHaveBeenCalled();
});
