import type {
  ConnectUserParams,
  UserProfileField,
} from '@octopus-community/react-native';

export type HostProfile = NonNullable<ConnectUserParams['profile']>;
export const DEFAULT_APP_MANAGED_FIELDS: UserProfileField[] = [
  'profilePicture',
];

/** Last successfully submitted host data, not a fetched community profile. */
export type HostUser = ConnectUserParams;

export interface HostUserOverrides {
  userId?: string;
  nickname?: string;
  profile?: HostProfile;
}

/** Separates the SDK payload from the host snapshot retained only after success. */
export function buildHostUserConnection(
  defaultUserId: string,
  hostUser: HostUser | null,
  overrides?: HostUserOverrides,
  appManagedFields: UserProfileField[] = DEFAULT_APP_MANAGED_FIELDS
): { payload: ConnectUserParams; connectedUser: HostUser } {
  const userId = overrides?.userId ?? defaultUserId;
  const previous = hostUser?.userId === userId ? hostUser.profile : undefined;
  const editedProfile: HostProfile = {};
  for (const field of appManagedFields) {
    const value = overrides?.profile?.[field];
    if (value !== undefined) editedProfile[field] = value;
  }
  const payload: ConnectUserParams = {
    userId,
    profile:
      overrides?.profile !== undefined
        ? { ...previous, ...editedProfile }
        : {
            ...previous,
            username: overrides?.nickname ?? previous?.username ?? 'John Doe',
            profilePicture:
              previous?.profilePicture ?? 'https://i.pravatar.cc/150',
          },
  };
  return {
    payload,
    connectedUser: { userId, profile: { ...previous, ...payload.profile } },
  };
}

export function canSaveHostProfile({
  isConnected,
  user,
  hasToken,
}: {
  isConnected: boolean;
  user: HostUser | null;
  hasToken: boolean;
}): boolean {
  return isConnected && user !== null && hasToken;
}
