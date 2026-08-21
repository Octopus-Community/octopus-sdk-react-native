/**
 * Per-field editability status of a profile field, driven by the community configuration.
 *
 * `disabled` is only meaningful for `bio` (the field disappears entirely); `nickname` and
 * `avatar` can only be `editable` or `readOnly`.
 */
export type ProfileFieldLockState = 'editable' | 'readOnly' | 'disabled';

/**
 * Per-field profile lock for the current community.
 *
 * Mirrors the native `ProfileFieldsLock` config type — see
 * {@link debugOverrideProfileFieldsLock}. This is a **debug-only** testing hatch: it does not
 * exist on a real production community config, which is set server-side.
 */
export interface ProfileFieldsLock {
  /** Status of the username field. Only `editable` / `readOnly` are meaningful. */
  nickname: ProfileFieldLockState;
  /** Status of the profile picture field. Only `editable` / `readOnly` are meaningful. */
  avatar: ProfileFieldLockState;
  /** Status of the bio field. May additionally be `disabled`. */
  bio: ProfileFieldLockState;
}
