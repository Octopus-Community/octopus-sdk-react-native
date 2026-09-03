import * as React from 'react';
import { act, create } from 'react-test-renderer';

import { useScenarioRun } from '../debug/useScenarioRun';
import type { ScenarioRunState } from '../debug/useScenarioRun';

// spec 09's Result zone must never look unchanged after a real tap, and must never
// misreport a fast call as having taken as long as the spinner floor held the screen
// open. These three tests pin both behaviors — and that the floor is the same on the
// success and error branches — with fake timers so no test actually waits 300ms.

type RunFn = ReturnType<typeof useScenarioRun>[1];

const RUNNING_FLOOR_MS = 300;

/**
 * Mounts {@link useScenarioRun} inside a headless host component and exposes its latest
 * state/`run` pair. The hook cannot be called outside a render, so this is the smallest
 * harness that lets a test drive it directly — the sample has no `renderHook` utility
 * (no `@testing-library/react-native` dependency), so this mirrors it by hand.
 */
function renderScenarioRun(label = 'test-scenario') {
  let latestState!: ScenarioRunState;
  let latestRun!: RunFn;

  function Harness() {
    const [state, run] = useScenarioRun(label);
    latestState = state;
    latestRun = run;
    return null;
  }

  act(() => {
    create(React.createElement(Harness));
  });

  return {
    get state() {
      return latestState;
    },
    run: <T>(
      action: () => Promise<T>,
      successMessage: string | ((value: T) => string)
    ) => latestRun(action, successMessage),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useScenarioRun', () => {
  it('reports a duration under the running floor when the call resolves fast', async () => {
    const harness = renderScenarioRun();

    let outcome: Promise<string | undefined>;
    await act(async () => {
      outcome = harness.run(() => Promise.resolve('value'), 'done');
      // The call itself resolves on the next microtask; only the 300ms floor keeps
      // `run` pending after that, so advancing exactly the floor is enough to settle it.
      await jest.advanceTimersByTimeAsync(RUNNING_FLOOR_MS);
    });
    await outcome!;

    expect(harness.state.status).toBe('success');
    expect(harness.state.durationMs).toBeLessThan(RUNNING_FLOOR_MS);
  });

  it('holds the spinner for the full floor even though the call already settled', async () => {
    const harness = renderScenarioRun();

    let outcome: Promise<string | undefined>;
    act(() => {
      outcome = harness.run(() => Promise.resolve('value'), 'done');
    });
    // Let the fast call itself resolve, without reaching the floor yet.
    await act(async () => {
      await Promise.resolve();
    });
    expect(harness.state.status).toBe('running');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(RUNNING_FLOOR_MS - 1);
    });
    expect(harness.state.status).toBe('running');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    await outcome!;
    expect(harness.state.status).toBe('success');
  });

  it('applies the same floor on the error branch, with a duration under it too', async () => {
    const harness = renderScenarioRun();

    let outcome: Promise<string | undefined>;
    await act(async () => {
      outcome = harness.run(() => Promise.reject(new Error('boom')), 'unused');
      await jest.advanceTimersByTimeAsync(RUNNING_FLOOR_MS - 1);
    });
    // One millisecond short of the floor, the error branch is just as pinned open as
    // the success branch above.
    expect(harness.state.status).toBe('running');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    await outcome!;

    expect(harness.state.status).toBe('error');
    expect(harness.state.message).toBe('boom');
    expect(harness.state.durationMs).toBeLessThan(RUNNING_FLOOR_MS);
  });
});
