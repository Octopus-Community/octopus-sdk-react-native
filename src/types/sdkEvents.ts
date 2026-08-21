/**
 * Types for SDK events emitted by Octopus SDK.
 * These events represent various user interactions and system events within the Octopus community.
 */

/**
 * Content types that can be included in a post
 */
export type PostContentType = 'text' | 'image' | 'poll';

/**
 * Content kind (post, comment, or reply)
 */
export type ContentKind = 'post' | 'comment' | 'reply';

/**
 * Reaction kinds
 */
export type ReactionKind =
  | 'heart'
  | 'joy'
  | 'mouthOpen'
  | 'clap'
  | 'cry'
  | 'rage'
  | 'unknown';

/**
 * Report reasons for content or profile reporting
 */
export type ReportReason =
  | 'hateSpeech'
  | 'explicit'
  | 'violence'
  | 'spam'
  | 'suicide'
  | 'fakeProfile'
  | 'childExploitation'
  | 'intellectualProperty'
  | 'other';

/**
 * Gamification actions that can gain points
 */
export type GamificationPointsGainedAction =
  | 'post'
  | 'comment'
  | 'reply'
  | 'reaction'
  | 'vote'
  | 'postCommented'
  | 'profileCompleted'
  | 'dailySession';

/**
 * Gamification actions that can remove points
 */
export type GamificationPointsRemovedAction =
  | 'postDeleted'
  | 'commentDeleted'
  | 'replyDeleted'
  | 'reactionDeleted';

/**
 * Source of a post click
 */
export type PostClickedSource = 'feed' | 'profile';

/**
 * Screen types displayed in the Octopus UI.
 *
 * `'settingsList'` is emitted on Android only since native SDK 1.13: iOS deleted the
 * settings-list screen, so nothing emits it there anymore.
 */
export type ScreenType =
  | 'postsFeed'
  | 'postDetail'
  | 'commentDetail'
  | 'createPost'
  | 'profile'
  | 'otherUserProfile'
  | 'editProfile'
  | 'reportContent'
  | 'reportProfile'
  | 'validateNickname'
  | 'settingsList'
  | 'settingsAccount'
  | 'reportExplanation'
  | 'deleteAccount'
  /**
   * A screen the native SDK reported that this wrapper version does not model yet.
   * Forward compatible — safe to ignore, and safe to group under a catch-all branch.
   */
  | 'unknown';

/**
 * Base interface for all SDK events
 */
export interface BaseSDKEvent {
  type: string;
}

/**
 * Event emitted when a post is created
 */
export interface PostCreatedEvent extends BaseSDKEvent {
  type: 'postCreated';
  postId: string;
  content: PostContentType[];
  topicId: string | null;
  textLength: number;
}

/**
 * Event emitted when a comment is created
 */
export interface CommentCreatedEvent extends BaseSDKEvent {
  type: 'commentCreated';
  commentId: string;
  postId: string;
  textLength: number;
}

/**
 * Event emitted when a reply is created
 */
export interface ReplyCreatedEvent extends BaseSDKEvent {
  type: 'replyCreated';
  replyId: string;
  commentId: string;
  textLength: number;
}

/**
 * Event emitted when content is deleted
 */
export interface ContentDeletedEvent extends BaseSDKEvent {
  type: 'contentDeleted';
  contentId: string;
  contentKind: ContentKind;
}

/**
 * Event emitted when a reaction is modified (added, changed, or removed)
 */
export interface ReactionModifiedEvent extends BaseSDKEvent {
  type: 'reactionModified';
  contentId: string;
  contentKind: ContentKind;
  previousReaction: ReactionKind | null;
  newReaction: ReactionKind | null;
}

/**
 * Event emitted when a poll is voted on
 */
export interface PollVotedEvent extends BaseSDKEvent {
  type: 'pollVoted';
  contentId: string;
  optionId: string;
}

/**
 * Event emitted when content is reported
 */
export interface ContentReportedEvent extends BaseSDKEvent {
  type: 'contentReported';
  contentId: string;
  reasons: ReportReason[];
}

/**
 * Event emitted when a profile is reported
 */
export interface ProfileReportedEvent extends BaseSDKEvent {
  type: 'profileReported';
  profileId: string;
  reasons: ReportReason[];
}

/**
 * Event emitted when gamification points are gained
 */
export interface GamificationPointsGainedEvent extends BaseSDKEvent {
  type: 'gamificationPointsGained';
  points: number;
  action: GamificationPointsGainedAction;
}

/**
 * Event emitted when gamification points are removed
 */
export interface GamificationPointsRemovedEvent extends BaseSDKEvent {
  type: 'gamificationPointsRemoved';
  points: number;
  action: GamificationPointsRemovedAction;
}

/**
 * Screen information for screen displayed events
 */
export interface ScreenInfo {
  type: ScreenType;
  feedId?: string;
  relatedTopicId?: string | null;
  postId?: string;
  commentId?: string;
  profileId?: string;
}

/**
 * Event emitted when a screen is displayed
 */
export interface ScreenDisplayedEvent extends BaseSDKEvent {
  type: 'screenDisplayed';
  screen: ScreenInfo;
}

/**
 * Event emitted when a notification is clicked
 */
export interface NotificationClickedEvent extends BaseSDKEvent {
  type: 'notificationClicked';
  notificationId: string;
  contentId: string | null;
}

/**
 * Event emitted when a post is clicked
 */
export interface PostClickedEvent extends BaseSDKEvent {
  type: 'postClicked';
  postId: string;
  source: PostClickedSource;
}

/**
 * Event emitted when the translation button is clicked
 */
export interface TranslationButtonClickedEvent extends BaseSDKEvent {
  type: 'translationButtonClicked';
  contentId: string;
  viewTranslated: boolean;
  contentKind: ContentKind;
}

/**
 * Event emitted when the comment button is clicked
 */
export interface CommentButtonClickedEvent extends BaseSDKEvent {
  type: 'commentButtonClicked';
  postId: string;
}

/**
 * Event emitted when the reply button is clicked
 */
export interface ReplyButtonClickedEvent extends BaseSDKEvent {
  type: 'replyButtonClicked';
  commentId: string;
}

/**
 * Event emitted when the "see replies" button is clicked
 */
export interface SeeRepliesButtonClickedEvent extends BaseSDKEvent {
  type: 'seeRepliesButtonClicked';
  commentId: string;
}

/**
 * Event emitted when a profile is modified
 */
export interface ProfileModifiedEvent extends BaseSDKEvent {
  type: 'profileModified';
  nicknameUpdated: boolean;
  bioUpdated: boolean;
  bioLength: number | null;
  pictureUpdated: boolean;
  hasPicture: boolean | null;
}

/**
 * Event emitted when the current user follows or unfollows a group
 */
export interface GroupFollowingChangedEvent extends BaseSDKEvent {
  type: 'groupFollowingChanged';
  groupId: string;
  followed: boolean;
}

/**
 * Event emitted when a session starts
 */
export interface SessionStartedEvent extends BaseSDKEvent {
  type: 'sessionStarted';
  sessionId: string;
}

/**
 * Event emitted when a session stops
 */
export interface SessionStoppedEvent extends BaseSDKEvent {
  type: 'sessionStopped';
  sessionId: string;
}

/**
 * Union type of all possible SDK events
 */
export type SDKEvent =
  | PostCreatedEvent
  | CommentCreatedEvent
  | ReplyCreatedEvent
  | ContentDeletedEvent
  | ReactionModifiedEvent
  | PollVotedEvent
  | ContentReportedEvent
  | ProfileReportedEvent
  | GamificationPointsGainedEvent
  | GamificationPointsRemovedEvent
  | ScreenDisplayedEvent
  | NotificationClickedEvent
  | PostClickedEvent
  | TranslationButtonClickedEvent
  | CommentButtonClickedEvent
  | ReplyButtonClickedEvent
  | SeeRepliesButtonClickedEvent
  | ProfileModifiedEvent
  | GroupFollowingChangedEvent
  | SessionStartedEvent
  | SessionStoppedEvent;
