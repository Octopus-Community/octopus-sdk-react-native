import type { SDKEvent } from '@octopus-community/react-native';

/**
 * Human-readable summary for a single SDK event, used in the Events tab list.
 * Returns a short title and optional detail string (key fields only).
 */
export function formatSDKEvent(event: SDKEvent): {
  title: string;
  details: string;
} {
  const type = event.type;
  const detailParts: string[] = [];

  switch (type) {
    case 'postCreated':
      detailParts.push(
        `postId: ${event.postId}`,
        `content: ${(event.content ?? []).join(', ')}`,
        `textLength: ${event.textLength}`
      );
      if (event.topicId != null) detailParts.push(`topicId: ${event.topicId}`);
      return { title: 'Post created', details: detailParts.join(' · ') };

    case 'commentCreated':
      detailParts.push(
        `commentId: ${event.commentId}`,
        `postId: ${event.postId}`,
        `textLength: ${event.textLength}`
      );
      return { title: 'Comment created', details: detailParts.join(' · ') };

    case 'replyCreated':
      detailParts.push(
        `replyId: ${event.replyId}`,
        `commentId: ${event.commentId}`,
        `textLength: ${event.textLength}`
      );
      return { title: 'Reply created', details: detailParts.join(' · ') };

    case 'contentDeleted':
      detailParts.push(
        `contentId: ${event.contentId}`,
        `kind: ${event.contentKind}`
      );
      return { title: 'Content deleted', details: detailParts.join(' · ') };

    case 'reactionModified':
      detailParts.push(
        `contentId: ${event.contentId}`,
        `kind: ${event.contentKind}`
      );
      if (event.previousReaction != null)
        detailParts.push(`previous: ${event.previousReaction}`);
      if (event.newReaction != null)
        detailParts.push(`new: ${event.newReaction}`);
      return { title: 'Reaction modified', details: detailParts.join(' · ') };

    case 'pollVoted':
      detailParts.push(
        `contentId: ${event.contentId}`,
        `optionId: ${event.optionId}`
      );
      return { title: 'Poll voted', details: detailParts.join(' · ') };

    case 'contentReported':
      detailParts.push(
        `contentId: ${event.contentId}`,
        `reasons: ${(event.reasons ?? []).join(', ')}`
      );
      return { title: 'Content reported', details: detailParts.join(' · ') };

    case 'profileReported':
      detailParts.push(
        `profileId: ${event.profileId}`,
        `reasons: ${(event.reasons ?? []).join(', ')}`
      );
      return { title: 'Profile reported', details: detailParts.join(' · ') };

    case 'gamificationPointsGained':
      detailParts.push(`points: ${event.points}`, `action: ${event.action}`);
      return { title: 'Points gained', details: detailParts.join(' · ') };

    case 'gamificationPointsRemoved':
      detailParts.push(`points: ${event.points}`, `action: ${event.action}`);
      return { title: 'Points removed', details: detailParts.join(' · ') };

    case 'screenDisplayed':
      detailParts.push(`screen: ${event.screen?.type ?? 'unknown'}`);
      if (event.screen?.postId)
        detailParts.push(`postId: ${event.screen.postId}`);
      if (event.screen?.feedId)
        detailParts.push(`feedId: ${event.screen.feedId}`);
      return { title: 'Screen displayed', details: detailParts.join(' · ') };

    case 'notificationClicked':
      detailParts.push(
        `notificationId: ${event.notificationId}`,
        `contentId: ${event.contentId ?? '—'}`
      );
      return {
        title: 'Notification clicked',
        details: detailParts.join(' · '),
      };

    case 'postClicked':
      detailParts.push(`postId: ${event.postId}`, `source: ${event.source}`);
      return { title: 'Post clicked', details: detailParts.join(' · ') };

    case 'translationButtonClicked':
      detailParts.push(
        `contentId: ${event.contentId}`,
        `viewTranslated: ${event.viewTranslated}`,
        `kind: ${event.contentKind}`
      );
      return { title: 'Translation clicked', details: detailParts.join(' · ') };

    case 'commentButtonClicked':
      detailParts.push(`postId: ${event.postId}`);
      return {
        title: 'Comment button clicked',
        details: detailParts.join(' · '),
      };

    case 'replyButtonClicked':
      detailParts.push(`commentId: ${event.commentId}`);
      return {
        title: 'Reply button clicked',
        details: detailParts.join(' · '),
      };

    case 'seeRepliesButtonClicked':
      detailParts.push(`commentId: ${event.commentId}`);
      return { title: 'See replies clicked', details: detailParts.join(' · ') };

    case 'profileModified':
      detailParts.push(
        `nickname: ${event.nicknameUpdated}`,
        `bio: ${event.bioUpdated}`,
        `picture: ${event.pictureUpdated}`
      );
      return { title: 'Profile modified', details: detailParts.join(' · ') };

    case 'groupFollowingChanged':
      detailParts.push(
        `groupId: ${event.groupId}`,
        `followed: ${event.followed}`
      );
      return {
        title: 'Group following changed',
        details: detailParts.join(' · '),
      };

    case 'sessionStarted':
      detailParts.push(`sessionId: ${event.sessionId}`);
      return { title: 'Session started', details: detailParts.join(' · ') };

    case 'sessionStopped':
      detailParts.push(`sessionId: ${event.sessionId}`);
      return { title: 'Session stopped', details: detailParts.join(' · ') };

    default:
      return { title: String(type), details: JSON.stringify(event) };
  }
}
