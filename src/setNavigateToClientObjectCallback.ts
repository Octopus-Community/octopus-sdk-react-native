import type { EmitterSubscription } from 'react-native';
import { LogLevel } from './enums/LogLevel.enum';
import { eventEmitter } from './internals/eventEmitter';
import { log } from './internals/logger';
import { OctopusReactNativeSdk } from './internals/nativeModule';

/** Payload of the `navigateToClientObject` event. */
interface NavigateToClientObjectEvent {
  /** The `objectId` of the {@link ClientPost} whose button was tapped. */
  objectId: string;
}

export type NavigateToClientObjectCallback = (objectId: string) => void;

let currentCallback: NavigateToClientObjectCallback | null = null;
let subscription: EmitterSubscription | null = null;

/**
 * Registers what to do when a member taps the "view object" button on a post linked to one of
 * your objects — the button whose label is {@link ClientPost.viewObjectButtonText}.
 *
 * The callback receives the `objectId` you passed as {@link ClientPost.objectId}: route to
 * your own screen for that object. Called on the JS thread, so it is safe to navigate from.
 *
 * **Last write wins**, like {@link addBridgeShareTokenRequestListener}'s provider: a second
 * call replaces the first. Register it once, at app start, before opening the Octopus UI —
 * see the two platform notes below for what happens if you register later.
 *
 * Returns an **unregister handle**, the same shape the Flutter SDK's
 * `setNavigateToClientObjectCallback` returns. The handle is **identity-guarded**: it clears
 * the registration only if yours is still the current one, so a late `useEffect` cleanup or a
 * hot reload cannot wipe a newer registration made in the meantime. Calling it twice, or
 * after someone else has registered, is a no-op.
 *
 * @param callback - What to run when the button is tapped.
 * @returns A function that unregisters *this* callback. Call it from your `useEffect`
 * cleanup; ignore it if you register once for the lifetime of the app.
 *
 * @remarks
 * **Accepted divergences from the native SDKs**, both consequences of the two platforms
 * exposing this hook in different places, and both about *when* the registration is read
 * rather than what it does.
 *
 * - **Android** takes it as the `onNavigateToClientObject` parameter of `OctopusHomeScreen`,
 *   read at composition, and the SDK keys the button's visibility on it being non-null. This
 *   wrapper reads the registration when the Octopus UI is composed: register **before**
 *   opening the UI, otherwise the button stays hidden until the UI is reopened.
 * - **iOS** takes it as `OctopusSDK.set(displayClientObjectCallback:)`, whose parameter is
 *   **not** optional — the native SDK offers no way to un-set it. Clearing the registration
 *   here therefore stops your callback from being invoked, but the button remains visible in
 *   an already-running UI and taps become no-ops until you register again. Registering after
 *   `initialize()` works on iOS at any time; a registration made *before* `initialize()` is
 *   applied as soon as the SDK is created.
 *
 * The practical rule that is correct on both platforms: call this once at app start, and do
 * not clear it while the Octopus UI is on screen.
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return setNavigateToClientObjectCallback((objectId) => {
 *     navigation.navigate('Article', { id: objectId });
 *   });
 * }, [navigation]);
 * ```
 */
export function setNavigateToClientObjectCallback(
  callback: NavigateToClientObjectCallback
): () => void {
  currentCallback = callback;
  ensureSubscribed();

  return () => {
    // Identity guard, iso the Flutter `identical(...)` check: a cleanup that runs after a
    // newer registration must leave that newer one alone.
    if (currentCallback !== callback) return;
    currentCallback = null;
    subscription?.remove();
    subscription = null;
    OctopusReactNativeSdk.unregisterNavigateToClientObjectCallback().catch(
      (error: unknown) => {
        log(
          LogLevel.ERROR,
          'Failed to unregister the navigate-to-client-object callback.',
          error
        );
      }
    );
  };
}

function ensureSubscribed(): void {
  // Replacing the callback keeps the single emitter subscription in place: it reads
  // `currentCallback` at delivery time, so there is nothing to re-subscribe.
  if (subscription !== null) return;

  subscription = eventEmitter.addListener(
    'navigateToClientObject',
    (event: NavigateToClientObjectEvent) => {
      const target = currentCallback;
      if (target === null) return;
      try {
        target(event.objectId);
      } catch (error: unknown) {
        // The emitter has no error channel; an exception escaping here would be an unhandled
        // rejection with no indication of where it came from.
        log(
          LogLevel.ERROR,
          'The navigate-to-client-object callback threw.',
          error
        );
      }
    }
  );

  OctopusReactNativeSdk.registerNavigateToClientObjectCallback().catch(
    (error: unknown) => {
      log(
        LogLevel.ERROR,
        'Failed to register the navigate-to-client-object callback. The button will not be shown.',
        error
      );
    }
  );
}
