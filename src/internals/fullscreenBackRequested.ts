import type { EmitterSubscription } from 'react-native';
import { LogLevel } from '../enums/LogLevel.enum';
import { eventEmitter } from './eventEmitter';
import { log } from './logger';

/** What `openUI({ onBackRequested })` accepts — see its TSDoc for the contract. */
export type FullscreenBackRequestedCallback = () => void;

let currentCallback: FullscreenBackRequestedCallback | null = null;
let subscription: EmitterSubscription | null = null;

/**
 * Registers (or clears, with `undefined`) the callback the `backRequested` module event is
 * forwarded to.
 *
 * **Last write wins, and every fullscreen open is a write** — including one that passes no
 * callback, which clears the previous registration. That is what keeps
 * `openUI()` with no `onBackRequested` byte-for-byte identical to its pre-callback behaviour:
 * a host that used the option once cannot be left with a stale callback firing for a UI it
 * did not attach it to.
 *
 * A single emitter subscription is kept while a callback is registered; it reads
 * `currentCallback` at delivery time, so replacing the callback re-subscribes nothing.
 * Clearing removes it, so a host that never uses the option holds no listener at all.
 *
 * **The registration outlives the UI, on purpose.** Nothing clears it when the fullscreen UI
 * closes — not `closeUI()`, and not the user's own tap on the leading icon or on iOS's
 * trailing Close. Only the next fullscreen open (or a rejected one: the registration happens
 * before the bridge call) writes over it, so a callback and its closure stay reachable for the
 * lifetime of the JS context. Clearing in `closeUI()` was considered and rejected: the user
 * closes the UI far more often than the host does, so it would clear on the rare path and not
 * on the common one — a "sometimes armed" contract, worse than the uniform one. Nothing fires
 * spuriously in the meantime: the native side only emits from a fullscreen container `openUI`
 * launched.
 *
 * Not exported from the package: the public surface is the `onBackRequested` option on
 * `openUI` / `openNotification`, not this registry.
 */
export function setFullscreenBackRequestedCallback(
  callback: FullscreenBackRequestedCallback | undefined
): void {
  currentCallback = callback ?? null;

  if (currentCallback === null) {
    subscription?.remove();
    subscription = null;
    return;
  }
  if (subscription !== null) return;

  subscription = eventEmitter.addListener('backRequested', () => {
    const target = currentCallback;
    if (target === null) return;
    try {
      target();
    } catch (error: unknown) {
      // The emitter has no error channel; an exception escaping here would be an unhandled
      // rejection with no indication of where it came from.
      log(LogLevel.ERROR, 'The openUI onBackRequested callback threw.', error);
    }
  });
}
