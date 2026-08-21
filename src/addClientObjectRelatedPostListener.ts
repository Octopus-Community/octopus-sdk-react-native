import { LogLevel } from './enums/LogLevel.enum';
import { eventEmitter } from './internals/eventEmitter';
import { log } from './internals/logger';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusPost } from './types/octopusPost';

/** Payload of the `clientObjectPostChanged` event. */
interface ClientObjectPostChangedEvent {
  /** Which subscription this emission belongs to. */
  observationId: string;
  /** The current post, or `null` when no post exists (yet) for the observed object. */
  post: OctopusPost | null;
}

export type ClientObjectRelatedPostListenerCallback = (
  post: OctopusPost | null
) => void;

/** What {@link addClientObjectRelatedPostListener} returns. */
export interface ClientObjectRelatedPostSubscription {
  /** Stops this observation. Idempotent — calling it twice is a no-op. */
  remove(): void;
}

/**
 * Monotonic counter behind the observation ids. Process-local and never reused, so a stale
 * emission from an observation that is being torn down can never be delivered to a later
 * subscription that happens to observe the same object.
 */
let observationCounter = 0;

/**
 * Observes the Octopus post linked to one of your objects, and delivers every change.
 *
 * The current value is replayed as soon as it is known — `null` when no post exists yet for
 * `clientObjectId` — then the callback fires again on every reaction, comment or view-count
 * change. Use it to keep your own screen's counters live next to the embedded UI;
 * {@link formatOctopusCompactCount} renders them the way the Octopus feed does.
 *
 * This is the React Native form of the native reactive API — Android's
 * `getClientObjectRelatedPostFlow(clientObjectId)` and iOS's
 * `getClientObjectRelatedPostPublisher(clientObjectId:)`. Like them, and **unlike**
 * {@link startObservingCommunityData}, it is genuinely **per subscription**: every call opens
 * its own observation, several may watch different objects (or the same one) at once, and
 * `remove()` tears down only its own.
 *
 * The observation is started on the native side asynchronously. A native start failure is
 * logged through the SDK logger, not thrown — this function is meant to be called from an
 * effect, where a rejected promise nobody awaits would become an unhandled rejection.
 *
 * @param clientObjectId - The id of your object, the same one you passed as
 * {@link ClientPost.objectId}.
 * @param callback - Called with the current post, or `null` while none exists.
 * @returns A subscription object with a `remove()` method that stops this observation.
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   const subscription = addClientObjectRelatedPostListener(article.id, (post) => {
 *     setCommentCount(post ? post.commentCount : 0);
 *   });
 *   return () => subscription.remove();
 * }, [article.id]);
 * ```
 */
export function addClientObjectRelatedPostListener(
  clientObjectId: string,
  callback: ClientObjectRelatedPostListenerCallback
): ClientObjectRelatedPostSubscription {
  observationCounter += 1;
  const observationId = `clientObjectPost-${observationCounter}`;

  const subscription = eventEmitter.addListener(
    'clientObjectPostChanged',
    (event: ClientObjectPostChangedEvent) => {
      // The channel is shared by every active observation, so each one filters on its own id.
      if (event?.observationId !== observationId) return;
      callback(event.post ?? null);
    }
  );

  OctopusReactNativeSdk.startObservingClientObjectRelatedPost(
    observationId,
    clientObjectId
  ).catch((error: unknown) => {
    log(
      LogLevel.ERROR,
      'Failed to start observing the client-object related post. The listener will never fire.',
      error
    );
  });

  let removed = false;
  return {
    remove() {
      if (removed) return;
      removed = true;
      subscription.remove();
      OctopusReactNativeSdk.stopObservingClientObjectRelatedPost(
        observationId
      ).catch((error: unknown) => {
        log(
          LogLevel.ERROR,
          'Failed to stop observing the client-object related post.',
          error
        );
      });
    },
  };
}
