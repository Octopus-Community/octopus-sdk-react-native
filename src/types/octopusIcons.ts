import type { ImageResolvedAssetSource } from 'react-native';

/**
 * An icon override: a resolved image source, typically
 * `Image.resolveAssetSource(require('./assets/icons/my-icon.png'))`.
 *
 * Remote `http(s)` URIs are accepted as well. They are downloaded when the Octopus UI is
 * built, and the native default stays on screen until the download completes (or for good if
 * it fails).
 */
export type OctopusIconSource = ImageResolvedAssetSource;

/**
 * A two-state icon pair (radio button, checkbox, toggle).
 *
 * Both images are required: the native SDKs only accept a complete pair. A pair missing one
 * side is dropped by `initialize()` with a warning, and the native default pair is kept.
 */
export interface OctopusIconOnOff {
  /** Displayed when the control is on. */
  on: OctopusIconSource;
  /** Displayed when the control is off. */
  off: OctopusIconSource;
}

/** Icons of the group (topic) selection and navigation. */
export interface OctopusGroupsIcons {
  /** Opens the list of groups (the topic selector). */
  openList?: OctopusIconSource;
  /** Marks the selected group in a list. */
  selected?: OctopusIconSource;
  /** Opens a group from a content. */
  viewGroup?: OctopusIconSource;
}

/** Icons of the post creation screen. */
export interface OctopusPostCreationIcons {
  /** Opens the post creation screen. On Android this is the "create post" button. */
  open?: OctopusIconSource;
  /** Opens the group (topic) selection of the post being written. */
  topicSelection?: OctopusIconSource;
  /** Adds a picture to the post. */
  addPicture?: OctopusIconSource;
  /** Removes the picture of the post. */
  deletePicture?: OctopusIconSource;
  /** Adds a poll to the post. */
  addPoll?: OctopusIconSource;
  /**
   * Adds an option to the poll.
   *
   * **Android caveat (native 1.13.x):** the Android SDK does not read this slot, so an override
   * only shows on iOS.
   */
  addPollOption?: OctopusIconSource;
  /** Removes the poll. */
  deletePoll?: OctopusIconSource;
  /**
   * Removes a poll option.
   *
   * **Android caveat (native 1.13.x):** the Android SDK does not read this slot, so an override
   * only shows on iOS.
   */
  deletePollOption?: OctopusIconSource;
}

/** Icons of posts. */
export interface OctopusPostIcons {
  /** Icons of the post creation screen. */
  creation?: OctopusPostCreationIcons;
  /**
   * Illustration of an empty group feed.
   *
   * Native 1.14 on iOS and Android renders {@link OctopusScreenStatesIcons.emptyContent}
   * instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.
   */
  emptyFeedInGroups?: OctopusIconSource;
  /**
   * Illustration of the current user's empty post feed on their profile.
   *
   * Native 1.14 on iOS and Android renders {@link OctopusScreenStatesIcons.emptyContent}
   * instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.
   */
  emptyFeedInCurrentUserProfile?: OctopusIconSource;
  /**
   * Illustration of another user's empty post feed on their profile.
   *
   * Native 1.14 on iOS and Android renders {@link OctopusScreenStatesIcons.emptyContent}
   * instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.
   */
  emptyFeedInOtherUserProfile?: OctopusIconSource;
  /** Shown in place of a post that is no longer available. */
  notAvailable?: OctopusIconSource;
  /**
   * Next to the comment count of a post.
   *
   * **Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
   * the current pins, so an override is accepted and has no visible effect yet.
   */
  commentCount?: OctopusIconSource;
  /**
   * Next to the view count of a post.
   *
   * **Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
   * the current pins, so an override is accepted and has no visible effect yet.
   */
  viewCount?: OctopusIconSource;
  /**
   * Opens the full reaction picker.
   *
   * **Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
   * the current pins, so an override is accepted and has no visible effect yet.
   */
  moreReactions?: OctopusIconSource;
  /** The like button when the current user has not reacted. */
  likeNotSelected?: OctopusIconSource;
  /** Shown on a moderated post. */
  moderated?: OctopusIconSource;
}

/** Icons of the comment creation field. */
export interface OctopusCommentCreationIcons {
  /** The "comment" action of a post, which opens the comment field. */
  open?: OctopusIconSource;
  /** Sends the comment. */
  create?: OctopusIconSource;
  /** Adds a picture to the comment. */
  addPicture?: OctopusIconSource;
  /** Removes the picture of the comment. */
  deletePicture?: OctopusIconSource;
}

/** Icons of comments. */
export interface OctopusCommentIcons {
  /** Icons of the comment creation field. */
  creation?: OctopusCommentCreationIcons;
  /**
   * Illustration of a post without comments.
   *
   * Native 1.14 on iOS and Android renders {@link OctopusScreenStatesIcons.emptyContent}
   * instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.
   */
  emptyFeed?: OctopusIconSource;
  /** Shown in place of a comment that is no longer available. */
  notAvailable?: OctopusIconSource;
  /** Opens the replies of a comment. */
  seeReply?: OctopusIconSource;
  /** The like button of a comment when the current user has not reacted. */
  likeNotSelected?: OctopusIconSource;
}

/** Icons of the reply creation field. */
export interface OctopusReplyCreationIcons {
  /** The "reply" action of a comment, which opens the reply field. */
  open?: OctopusIconSource;
  /** Sends the reply. */
  create?: OctopusIconSource;
  /** Adds a picture to the reply. */
  addPicture?: OctopusIconSource;
  /** Removes the picture of the reply. */
  deletePicture?: OctopusIconSource;
}

/** Icons of replies. */
export interface OctopusReplyIcons {
  /** Icons of the reply creation field. */
  creation?: OctopusReplyCreationIcons;
  /** The like button of a reply when the current user has not reacted. */
  likeNotSelected?: OctopusIconSource;
}

/** Icons of the video player. */
export interface OctopusVideoIcons {
  /** Shown while the sound is off. */
  muted?: OctopusIconSource;
  /** Shown while the sound is on. */
  notMuted?: OctopusIconSource;
  /** Pauses the video. */
  pause?: OctopusIconSource;
  /** Plays the video. */
  play?: OctopusIconSource;
  /** Replays the video once it has ended. */
  replay?: OctopusIconSource;
}

/** Icons of polls. */
export interface OctopusPollIcons {
  /** Marks the option the current user voted for. */
  selectedOption?: OctopusIconSource;
}

/**
 * Reaction images.
 *
 * **Not tinted**: like screen-state illustrations, reactions are drawn in their original colors on
 * both platforms, so a full-color image is expected here.
 */
export interface OctopusReactionIcons {
  /** The heart reaction (also the "liked" state of the like button). */
  heart?: OctopusIconSource;
  /** The tears-of-joy reaction. */
  joy?: OctopusIconSource;
  /** The open-mouth (surprised) reaction. */
  mouthOpen?: OctopusIconSource;
  /** The clapping-hands reaction. */
  clap?: OctopusIconSource;
  /** The crying reaction. */
  cry?: OctopusIconSource;
  /** The angry reaction. */
  rage?: OctopusIconSource;
}

/** Icons of contents (posts, comments, replies and their media). */
export interface OctopusContentIcons {
  /** Post icons. */
  post?: OctopusPostIcons;
  /** Comment icons. */
  comment?: OctopusCommentIcons;
  /** Reply icons. */
  reply?: OctopusReplyIcons;
  /** Video player icons. */
  video?: OctopusVideoIcons;
  /** Poll icons. */
  poll?: OctopusPollIcons;
  /** Reaction images, drawn in their original colors (not tinted). */
  reaction?: OctopusReactionIcons;
  /** The "delete" action of a content. */
  delete?: OctopusIconSource;
  /** The "report" action of a content. */
  report?: OctopusIconSource;
}

/** Icons of the gamification (levels and badges) screens. */
export interface OctopusGamificationIcons {
  /** The badge of a user, tinted with the color of their level. */
  badge?: OctopusIconSource;
  /** Opens the gamification rules. */
  info?: OctopusIconSource;
  /**
   * Illustration at the top of the gamification rules.
   *
   * **iOS caveat (native 1.13.x):** the iOS SDK ignores this slot and uses the `badge` image
   * (or its own default) for the rules header, so an override here only shows on Android,
   * and a `badge` override also changes the rules header on iOS.
   */
  rulesHeader?: OctopusIconSource;
}

/** Icons of the settings screens. */
export interface OctopusSettingsIcons {
  /** The account entry. */
  account?: OctopusIconSource;
  /** The help entry. */
  help?: OctopusIconSource;
  /** The information entry. */
  info?: OctopusIconSource;
  /** The logout entry. */
  logout?: OctopusIconSource;
  /** The warning shown before an account deletion. */
  deleteAccountWarning?: OctopusIconSource;
}

/** Icons of the profile and notification screens. */
export interface OctopusProfileIcons {
  /** Adds a profile picture. */
  addPicture?: OctopusIconSource;
  /** Edits the profile picture. */
  editPicture?: OctopusIconSource;
  /** Adds a bio. */
  addBio?: OctopusIconSource;
  /**
   * Illustration of an empty notification list.
   *
   * Native 1.14 on iOS and Android renders {@link OctopusScreenStatesIcons.emptyNotifications}
   * instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.
   */
  emptyNotifications?: OctopusIconSource;
  /** Reports a profile. */
  report?: OctopusIconSource;
  /** The avatar shown when the user is not connected (error state). */
  notConnected?: OctopusIconSource;
  /** Blocks a user. */
  blockUser?: OctopusIconSource;
}

/** Icons shared across screens. */
export interface OctopusCommonIcons {
  /** Radio button pair. Absent: the native default pair (the platform widget on Android). */
  radio?: OctopusIconOnOff;
  /**
   * Checkbox pair. Absent: the native default pair.
   *
   * **Android caveat (native 1.13.x):** the Android SDK draws the platform checkbox and does
   * not read this pair, so an override only shows on iOS.
   */
  checkbox?: OctopusIconOnOff;
  /** Toggle pair. Absent: the native default pair (the platform switch on Android). */
  toggle?: OctopusIconOnOff;
  /** The overflow "more actions" button. */
  moreActions?: OctopusIconSource;
  /**
   * The activity button, shown in place of the connected user's avatar on the home floating
   * button when Unified Profile is active.
   */
  activityButton?: OctopusIconSource;
  /** The navigation indicator (right arrow) of list cells. */
  listCellNavIndicator?: OctopusIconSource;
}

/**
 * Illustrations for empty lists and failed first loads, following the iOS reference API.
 *
 * Drawn in their original colors on both platforms, without tinting. Use illustrations with
 * a transparent background rather than the small glyphs used for action icons.
 */
export interface OctopusScreenStatesIcons {
  /** Displayed on an empty list of posts or comments. */
  emptyContent?: OctopusIconSource;
  /** Displayed on an empty list of notifications. */
  emptyNotifications?: OctopusIconSource;
  /** Displayed when a first load failed because the device is offline. */
  networkError?: OctopusIconSource;
  /** Displayed when a first load failed for any other reason. */
  error?: OctopusIconSource;
}

/**
 * Icon overrides for the Octopus UI, passed as `theme.icons` to `initialize()`.
 *
 * The groups and names follow the iOS SDK (`OctopusTheme.Assets.Icons`); the bridge maps
 * them onto the Android SDK's own names. Only the slots both native SDKs expose are
 * available.
 *
 * - **Every slot is optional.** An absent slot keeps the native default icon, and omitting
 *   `icons` altogether leaves the native icon set untouched.
 * - **Icons are tinted**: the SDK recolors them with the theme colors, so only the shape
 *   (alpha channel) of the image matters. The exceptions are
 *   {@link OctopusContentIcons.reaction} and {@link OctopusIcons.screenStates}, drawn in their
 *   original colors.
 * - **Action icon size**: square images, ideally 24×24 points with the drawn content around 14.5×14.5
 *   (transparent borders of 4.75). A non-square image is scaled to fit.
 * - A slot whose value is not an image source with a string `uri`, or a key the SDK does
 *   not know, is dropped by `initialize()` with a warning.
 *
 * @example
 * ```tsx
 * await initialize({
 *   apiKey: 'your-api-key',
 *   connectionMode: { type: 'octopus' },
 *   theme: {
 *     icons: {
 *       content: {
 *         comment: {
 *           creation: { open: Image.resolveAssetSource(require('./icons/comment.png')) },
 *         },
 *       },
 *       common: {
 *         moreActions: Image.resolveAssetSource(require('./icons/more.png')),
 *       },
 *     },
 *   },
 * });
 * ```
 */
export interface OctopusIcons {
  /** Group (topic) icons. */
  groups?: OctopusGroupsIcons;
  /** Content icons: posts, comments, replies, video, polls and reactions. */
  content?: OctopusContentIcons;
  /** Gamification icons. */
  gamification?: OctopusGamificationIcons;
  /** Settings icons. */
  settings?: OctopusSettingsIcons;
  /** Profile and notification icons. */
  profile?: OctopusProfileIcons;
  /** Icons shared across screens. */
  common?: OctopusCommonIcons;
  /** Empty-list and failed-load illustrations, drawn in their original colors (not tinted). */
  screenStates?: OctopusScreenStatesIcons;
}
