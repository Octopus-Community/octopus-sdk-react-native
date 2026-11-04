import { eventEmitter } from './internals/eventEmitter';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import { log } from './internals/logger';
import { errorSummary } from './internals/errorSummary';
import { LogLevel } from './enums/LogLevel.enum';

export type UserTokenRequestListenerCallback = () => Promise<string>;

/**
 * Adds a listener for user token requests events.
 *
 * This listener is triggered when the Octopus SDK needs
 * a new user token.
 * You may use this listener directly if you prefer not to use the useUserTokenProvider hook.
 *
 * If the callback throws or rejects, the request is cancelled and the error is logged at
 * `ERROR` level (to the console, or to the logger passed to `setLogger`). Only its `name`
 * and `message` are logged, and the `message` is logged as is: keep tokens, credentials and
 * request details out of it.
 */
export function addUserTokenRequestListener(
  callback: UserTokenRequestListenerCallback
) {
  const handleUserTokenRequest = async (event: { requestId: string }) => {
    try {
      const token = await callback();
      await OctopusReactNativeSdk.completeUserTokenRequest(
        event.requestId,
        token
      );
    } catch (error) {
      log(
        LogLevel.ERROR,
        'Failed to provide user token to Octopus',
        errorSummary(error)
      );
      await OctopusReactNativeSdk.cancelUserTokenRequest(event.requestId);
    }
  };

  return eventEmitter.addListener('userTokenRequest', handleUserTokenRequest);
}
