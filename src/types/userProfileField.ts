/**
 * Represents the different user profile fields that can be managed by your application.
 *
 * These fields are used in SSO mode to specify which profile data your app
 * will handle directly, rather than letting Octopus manage them.
 */
export type UserProfileField =
  /** The user's display name, nickname or username */
  | 'username'
  /** The user's biography or about section */
  | 'biography'
  /** The user's profile picture URL */
  | 'profilePicture';
