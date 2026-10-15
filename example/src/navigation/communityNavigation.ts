import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  OctopusInitialScreen,
  OctopusNotification,
} from '@octopus-community/react-native';

export type CommunityMode = 'embed' | 'fullscreen';
export const COMMUNITY_MODE_KEY = 'community_navigation_v1';

export async function loadCommunityMode(): Promise<CommunityMode> {
  try {
    return (await AsyncStorage.getItem(COMMUNITY_MODE_KEY)) === 'fullscreen'
      ? 'fullscreen'
      : 'embed';
  } catch {
    return 'embed';
  }
}
let modeWrite = Promise.resolve();
export function persistCommunityMode(mode: CommunityMode): Promise<void> {
  modeWrite = modeWrite
    .then(() => AsyncStorage.setItem(COMMUNITY_MODE_KEY, mode))
    .catch(() => {});
  return modeWrite;
}

export interface CommunityNavigationState {
  mode: CommunityMode;
  session: number;
  generation: number;
  target: OctopusNotification | null;
}
export type CommunityNavigationAction =
  | { type: 'mode'; mode: CommunityMode }
  | { type: 'session'; session: number }
  | { type: 'retap' }
  | { type: 'refreshPresentation' }
  | { type: 'push'; notification: OctopusNotification };

export function communityNavigationReducer(
  state: CommunityNavigationState,
  action: CommunityNavigationAction
): CommunityNavigationState {
  if (action.type === 'mode' && action.mode === state.mode) return state;
  if (action.type === 'session' && action.session === state.session)
    return state;
  return {
    ...state,
    mode: action.type === 'mode' ? action.mode : state.mode,
    session: action.type === 'session' ? action.session : state.session,
    generation: state.generation + 1,
    target:
      action.type === 'push'
        ? action.notification
        : action.type === 'refreshPresentation'
          ? state.target
          : null,
  };
}

// The pinned native notification table handles posts/comments and profiles.
// Group and member paths need the public initial-screen entry points instead.
export function communityPushTarget(notification: OctopusNotification | null): {
  notification?: OctopusNotification;
  initialScreen?: OctopusInitialScreen;
} {
  if (!notification) return {};
  const segments = notification.linkPath.split('/').filter(Boolean);
  if (segments.length === 2 && segments[1]?.trim()) {
    if (segments[0] === 'group')
      return { initialScreen: { type: 'group', groupId: segments[1] } };
    if (segments[0] === 'member')
      return {
        initialScreen: { type: 'activity', member: { profileId: segments[1] } },
      };
  }
  return { notification };
}
