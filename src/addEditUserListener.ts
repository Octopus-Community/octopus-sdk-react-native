import { eventEmitter } from './internals/eventEmitter';
import type { UserProfileField } from './types/userProfileField';

export interface EditUserEventParams {
  /** The user profile field that the user wants to edit */
  fieldToEdit: UserProfileField | null;
}

export type EditUserListenerCallback = (params: EditUserEventParams) => void;

/**
 * Adds a listener for edit user events.
 *
 * This listener is triggered when the Octopus SDK needs the host app to handle
 * user profile editing for fields marked as app-managed in SSO mode.
 */
export function addEditUserListener(callback: EditUserListenerCallback) {
  return eventEmitter.addListener('editUser', callback);
}
