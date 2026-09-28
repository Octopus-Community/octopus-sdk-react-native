import { log } from './logger';
import { LogLevel } from '../enums/LogLevel.enum';
import type { OctopusIcons } from '../types/octopusIcons';

/**
 * Every single-image slot of {@link OctopusIcons}, as its dotted path. This list is the wire
 * contract: both bridges look these exact keys up (Android maps each one onto its own
 * `OctopusIcons` field, iOS onto `OctopusTheme.Assets.Icons`). A slot added to the public type
 * without being added here is dropped by {@link flattenIconOverrides} with an "unknown" warning.
 */
export const ICON_SLOT_PATHS: readonly string[] = [
  'groups.openList',
  'groups.selected',
  'groups.viewGroup',
  'content.post.creation.open',
  'content.post.creation.topicSelection',
  'content.post.creation.addPicture',
  'content.post.creation.deletePicture',
  'content.post.creation.addPoll',
  'content.post.creation.addPollOption',
  'content.post.creation.deletePoll',
  'content.post.creation.deletePollOption',
  'content.post.emptyFeedInGroups',
  'content.post.emptyFeedInCurrentUserProfile',
  'content.post.emptyFeedInOtherUserProfile',
  'content.post.notAvailable',
  'content.post.commentCount',
  'content.post.viewCount',
  'content.post.moreReactions',
  'content.post.likeNotSelected',
  'content.post.moderated',
  'content.comment.creation.open',
  'content.comment.creation.create',
  'content.comment.creation.addPicture',
  'content.comment.creation.deletePicture',
  'content.comment.emptyFeed',
  'content.comment.notAvailable',
  'content.comment.seeReply',
  'content.comment.likeNotSelected',
  'content.reply.creation.open',
  'content.reply.creation.create',
  'content.reply.creation.addPicture',
  'content.reply.creation.deletePicture',
  'content.reply.likeNotSelected',
  'content.video.muted',
  'content.video.notMuted',
  'content.video.pause',
  'content.video.play',
  'content.video.replay',
  'content.poll.selectedOption',
  'content.reaction.heart',
  'content.reaction.joy',
  'content.reaction.mouthOpen',
  'content.reaction.clap',
  'content.reaction.cry',
  'content.reaction.rage',
  'content.delete',
  'content.report',
  'gamification.badge',
  'gamification.info',
  'gamification.rulesHeader',
  'settings.account',
  'settings.help',
  'settings.info',
  'settings.logout',
  'settings.deleteAccountWarning',
  'profile.addPicture',
  'profile.editPicture',
  'profile.addBio',
  'profile.emptyNotifications',
  'profile.report',
  'profile.notConnected',
  'profile.blockUser',
  'common.moreActions',
  'common.activityButton',
  'common.listCellNavIndicator',
  'screenStates.emptyContent',
  'screenStates.emptyNotifications',
  'screenStates.networkError',
  'screenStates.error',
];

/**
 * The two-state slots. Each one travels as two wire keys, `<path>.on` and `<path>.off`, and
 * only as a complete pair: both natives require both images.
 */
export const ICON_ON_OFF_PATHS: readonly string[] = [
  'common.radio',
  'common.checkbox',
  'common.toggle',
];

const SLOT_SET = new Set(ICON_SLOT_PATHS);
const ON_OFF_SET = new Set(ICON_ON_OFF_PATHS);

/** Every intermediate group path (`content`, `content.post`, `content.post.creation`, …). */
const GROUP_SET = new Set(
  [...ICON_SLOT_PATHS, ...ICON_ON_OFF_PATHS].flatMap((path) => {
    const parts = path.split('.');
    return parts.slice(1).map((_, i) => parts.slice(0, i + 1).join('.'));
  })
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The URI of an image source, or `null` when the value is not one the bridges can load. */
const uriOf = (value: unknown): string | null => {
  if (!isPlainObject(value)) return null;
  const uri = value.uri;
  return typeof uri === 'string' && uri.length > 0 ? uri : null;
};

const warn = (message: string): void => log(LogLevel.WARN, message);

/**
 * Flattens `theme.icons` into the wire map both bridges read: dotted slot path → image URI
 * (`common.radio.on` / `.off` for the pairs).
 *
 * Invalid input is dropped slot by slot, each with a warning, so one bad entry never costs the
 * others: an unknown key, a value that is not an image source with a string `uri`, a group
 * that is not an object, or a pair missing one side. A `null`/`undefined` slot is simply
 * absent. Returns `undefined` when nothing valid remains, so an empty or fully invalid
 * `icons` leaves the native icon set untouched.
 */
export function flattenIconOverrides(
  icons: OctopusIcons | undefined | null
): Record<string, string> | undefined {
  if (icons == null) return undefined;
  if (!isPlainObject(icons)) {
    warn(
      'theme.icons is not an object; ignoring it and keeping the SDK icons.'
    );
    return undefined;
  }

  const out: Record<string, string> = {};

  const visit = (node: Record<string, unknown>, prefix: string): void => {
    for (const [key, value] of Object.entries(node)) {
      if (value == null) continue;
      const path = prefix ? `${prefix}.${key}` : key;

      if (SLOT_SET.has(path)) {
        const uri = uriOf(value);
        if (uri === null) {
          warn(
            `theme.icons.${path} is not an image source with a string uri; keeping the SDK icon.`
          );
        } else {
          out[path] = uri;
        }
      } else if (ON_OFF_SET.has(path)) {
        const pair = isPlainObject(value) ? value : {};
        const on = uriOf(pair.on);
        const off = uriOf(pair.off);
        if (on === null || off === null) {
          warn(
            `theme.icons.${path} needs both an 'on' and an 'off' image source; keeping the SDK pair.`
          );
        } else {
          out[`${path}.on`] = on;
          out[`${path}.off`] = off;
        }
      } else if (GROUP_SET.has(path)) {
        if (isPlainObject(value)) {
          visit(value, path);
        } else {
          warn(`theme.icons.${path} is not an object; ignoring it.`);
        }
      } else {
        warn(
          `theme.icons.${path} is not an icon slot both native SDKs support; ignoring it.`
        );
      }
    }
  };

  visit(icons as Record<string, unknown>, '');
  return Object.keys(out).length > 0 ? out : undefined;
}
