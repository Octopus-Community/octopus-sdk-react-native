import { useCallback, useEffect, useRef, useState } from 'react';

import { debugLog } from './debugLog';

/** Where a scenario's last (or in-flight) run stands. */
export type ScenarioRunStatus = 'idle' | 'running' | 'success' | 'error';

/** The Result zone's full state — spec 09's Idle / Running / Result skeleton. */
export interface ScenarioRunState {
  status: ScenarioRunStatus;
  /** Set once the call settles — never during `running`, never reset on the next Idle. */
  durationMs?: number;
  /** The outcome sentence — success or error message. Unset while idle/running. */
  message?: string;
}

const IDLE: ScenarioRunState = { status: 'idle' };

/** Runs for at least this long even if the call itself resolves sooner — spec 09's guard
 *  against a Result screen that looks unchanged after a real tap. */
const MIN_RUNNING_MS = 300;

/**
 * Drives one scenario's Result zone: Idle → Running (≥300ms) → Success/Error, with a
 * duration attached to every settled outcome and every entry logged to the Debug console,
 * plus the timing spec 09 asks for.
 *
 * One call site replaces the `isXBusy` boolean + a per-scenario success/error message pair
 * scenarios used to carry separately; `run` returns the resolved value so callers that need
 * it (e.g. to read a fetched id) still can.
 */
export function useScenarioRun(
  label: string
): [
  ScenarioRunState,
  <T>(
    action: () => Promise<T>,
    successMessage: string | ((value: T) => string)
  ) => Promise<T | undefined>,
] {
  const [state, setState] = useState<ScenarioRunState>(IDLE);

  // Guards the two `setState` calls below the floor await: a scenario can be navigated away
  // from (or closed) mid-run, and setting state on an unmounted component only produces a dev
  // warning — but a cheap one to avoid.
  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const run = useCallback(
    async <T>(
      action: () => Promise<T>,
      successMessage: string | ((value: T) => string)
    ): Promise<T | undefined> => {
      const startedAt = Date.now();
      setState({ status: 'running' });
      // The floor runs alongside the call, not after it: awaited below, once the call has
      // already settled, so it stretches how long the spinner stays up without stretching the
      // duration measured from `startedAt` — a fast call must not misreport as "≥300ms" just
      // because this held the screen open that long.
      const floor = new Promise<void>((resolve) =>
        setTimeout(resolve, MIN_RUNNING_MS)
      );
      try {
        const value = await action();
        const durationMs = Date.now() - startedAt;
        // Same floor on success and error alike — spec 09 draws no distinction between the
        // two for how long the spinner must stay visible, only for what duration is reported.
        await floor;
        const message =
          typeof successMessage === 'function'
            ? successMessage(value)
            : successMessage;
        if (isMountedRef.current) {
          setState({ status: 'success', durationMs, message });
        }
        debugLog.apiCall(label, `✓ ${message} (${durationMs} ms)`);
        return value;
      } catch (e) {
        const durationMs = Date.now() - startedAt;
        await floor;
        const message = e instanceof Error ? e.message : String(e);
        if (isMountedRef.current) {
          setState({ status: 'error', durationMs, message });
        }
        debugLog.apiCall(label, `✕ ${message} (${durationMs} ms)`);
        return undefined;
      }
    },
    [label]
  );

  return [state, run];
}
