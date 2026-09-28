import {
  createBackDispatcher,
  resolveShellBack,
  resolveWebViewBack,
  type ShellBackState,
} from '../navigation/backDispatcher';

describe('createBackDispatcher', () => {
  it('reports an unhandled press when nothing is registered', () => {
    expect(createBackDispatcher().dispatch()).toBe(false);
  });

  it('asks the deeper level first, whatever the registration order', () => {
    // React runs a child's effects before its parent's, so the screen registers BEFORE the
    // shell that contains it — the level, not the order, has to put it first.
    const dispatcher = createBackDispatcher();
    const calls: string[] = [];
    dispatcher.register('screen', () => {
      calls.push('screen');
      return true;
    });
    dispatcher.register('shell', () => {
      calls.push('shell');
      return true;
    });
    expect(dispatcher.dispatch()).toBe(true);
    expect(calls).toEqual(['screen']);
  });

  it('puts an overlay above a screen and a screen above the shell', () => {
    const dispatcher = createBackDispatcher();
    const calls: string[] = [];
    dispatcher.register('shell', () => {
      calls.push('shell');
      return false;
    });
    dispatcher.register('overlay', () => {
      calls.push('overlay');
      return false;
    });
    dispatcher.register('screen', () => {
      calls.push('screen');
      return false;
    });
    expect(dispatcher.dispatch()).toBe(false);
    expect(calls).toEqual(['overlay', 'screen', 'shell']);
  });

  it('falls through to the next level when a handler has nothing to pop', () => {
    const dispatcher = createBackDispatcher();
    const shell = jest.fn(() => true);
    dispatcher.register('shell', shell);
    dispatcher.register('screen', () => false);
    expect(dispatcher.dispatch()).toBe(true);
    expect(shell).toHaveBeenCalledTimes(1);
  });

  it('stops at the first handler that consumes the press', () => {
    const dispatcher = createBackDispatcher();
    const shell = jest.fn(() => true);
    dispatcher.register('shell', shell);
    dispatcher.register('screen', () => true);
    dispatcher.dispatch();
    expect(shell).not.toHaveBeenCalled();
  });

  it('asks the most recent registration first within one level', () => {
    const dispatcher = createBackDispatcher();
    const calls: string[] = [];
    dispatcher.register('screen', () => {
      calls.push('first');
      return false;
    });
    dispatcher.register('screen', () => {
      calls.push('second');
      return false;
    });
    dispatcher.dispatch();
    expect(calls).toEqual(['second', 'first']);
  });

  it('unregisters exactly the handler it returned', () => {
    const dispatcher = createBackDispatcher();
    const kept = jest.fn(() => true);
    dispatcher.register('shell', kept);
    const dropped = jest.fn(() => true);
    const unregister = dispatcher.register('screen', dropped);
    unregister();
    unregister(); // idempotent: a double cleanup must not drop someone else
    expect(dispatcher.size()).toBe(1);
    dispatcher.dispatch();
    expect(dropped).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('survives a handler that unregisters itself mid-dispatch', () => {
    // Popping a level unmounts that level's screen, whose cleanup unregisters while the
    // dispatch loop is still running.
    const dispatcher = createBackDispatcher();
    let unregister = () => {};
    unregister = dispatcher.register('screen', () => {
      unregister();
      return false;
    });
    const shell = jest.fn(() => true);
    dispatcher.register('shell', shell);
    expect(dispatcher.dispatch()).toBe(true);
    expect(shell).toHaveBeenCalledTimes(1);
    expect(dispatcher.size()).toBe(1);
  });

  it('walks a Settings page back to the summary, then the tab to Home, then gives up', () => {
    // The whole contract in one walk: page → summary → Home → platform (backgrounded).
    const dispatcher = createBackDispatcher();
    let settingsRoute = 'appearance';
    let activeTab = 'settings';
    dispatcher.register('screen', () => {
      if (activeTab !== 'settings' || settingsRoute === 'root') return false;
      settingsRoute = 'root';
      return true;
    });
    dispatcher.register('shell', () => {
      const action = resolveShellBack({
        isOnConfig: false,
        canCancelConfig: false,
        isShellVisible: true,
        activeTab,
      });
      if (action !== 'goHome') return false;
      activeTab = 'home';
      return true;
    });

    expect(dispatcher.dispatch()).toBe(true);
    expect([settingsRoute, activeTab]).toEqual(['root', 'settings']);
    expect(dispatcher.dispatch()).toBe(true);
    expect(activeTab).toBe('home');
    expect(dispatcher.dispatch()).toBe(false);
  });
});

describe('resolveShellBack', () => {
  const base: ShellBackState = {
    isOnConfig: false,
    canCancelConfig: false,
    isShellVisible: true,
    activeTab: 'home',
  };

  it('backgrounds the app on Home', () => {
    expect(resolveShellBack(base)).toBe('none');
  });

  it.each(['settings', 'scenarios', 'community'])(
    'returns %s to Home',
    (activeTab) => {
      expect(resolveShellBack({ ...base, activeTab })).toBe('goHome');
    }
  );

  it('cancels the Config revisit back to the running session', () => {
    expect(
      resolveShellBack({
        ...base,
        isOnConfig: true,
        canCancelConfig: true,
        isShellVisible: false,
        activeTab: 'settings',
      })
    ).toBe('cancelReconfigure');
  });

  it('backgrounds the app from the first-launch Config screen', () => {
    expect(
      resolveShellBack({
        ...base,
        isOnConfig: true,
        isShellVisible: false,
        activeTab: 'settings',
      })
    ).toBe('none');
  });

  it('does not go Home before the shell is up', () => {
    expect(
      resolveShellBack({
        ...base,
        isShellVisible: false,
        activeTab: 'settings',
      })
    ).toBe('none');
  });
});

describe('resolveWebViewBack', () => {
  it('goes back one page while the WebView has history', () => {
    expect(resolveWebViewBack(true)).toBe('goBackInHistory');
  });

  it('closes the modal once the history is empty', () => {
    expect(resolveWebViewBack(false)).toBe('close');
  });
});
