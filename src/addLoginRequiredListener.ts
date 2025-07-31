import { eventEmitter } from './internals/eventEmitter';

export type LoginRequiredListenerCallback = () => void;

/**
 * Adds a listener for login required events.
 *
 * This listener is triggered when the Octopus SDK detects that user
 * authentication is required, typically in SSO mode when the user
 * session has expired or the user is not logged in.
 */
export function addLoginRequiredListener(
  callback: LoginRequiredListenerCallback
) {
  return eventEmitter.addListener('loginRequired', callback);
}
