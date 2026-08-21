import { eventEmitter } from './internals/eventEmitter';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import {
  type UrlOpeningStrategy,
  UrlOpeningStrategy as UrlOpeningStrategyEnum,
} from './types/urlOpeningStrategy';

export type NavigateToUrlListenerCallback = (
  url: string
) => UrlOpeningStrategy | Promise<UrlOpeningStrategy>;

/**
 * Adds a listener for URL navigation events from the Octopus Community UI.
 *
 * Only has an effect when the UI was opened with `openUI({ interceptUrls: true })`.
 * When the user taps a link, this callback is invoked with the URL. Return
 * `handledByApp` if your app handles the URL (e.g. in-app web view), or
 * `handledByOctopus` to let the SDK open it in the system browser.
 *
 * @param callback - Function called with the tapped URL. Can be async.
 *   Return `UrlOpeningStrategy.handledByApp` or `UrlOpeningStrategy.handledByOctopus`.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @example
 * ```typescript
 * const subscription = addNavigateToUrlListener(async (url) => {
 *   if (url.startsWith('https://myapp.com/')) {
 *     // Handle deep link in-app
 *     Linking.openURL(url);
 *     return UrlOpeningStrategy.handledByApp;
 *   }
 *   return UrlOpeningStrategy.handledByOctopus; // Open in system browser
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addNavigateToUrlListener(
  callback: NavigateToUrlListenerCallback
) {
  return eventEmitter.addListener(
    'navigateToUrl',
    async (data: { url: string }) => {
      const strategy = await Promise.resolve(callback(data.url));
      if (strategy === UrlOpeningStrategyEnum.handledByOctopus) {
        OctopusReactNativeSdk.handleUrlStrategy(
          data.url,
          UrlOpeningStrategyEnum.handledByOctopus
        );
      }
    }
  );
}
