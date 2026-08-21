import Foundation
import Octopus

/**
 * Serializes OctopusEvent objects to dictionaries for React Native bridge.
 */
class OctopusEventSerializer {
  
  static func serializeEvent(_ event: OctopusEvent) -> [String: Any]? {
    switch event {
    case .postCreated(let context):
      var contentList: [String] = []
      if context.content.contains(.text) { contentList.append("text") }
      if context.content.contains(.image) { contentList.append("image") }
      if context.content.contains(.poll) { contentList.append("poll") }
      return [
        "type": "postCreated",
        "postId": context.postId,
        "content": contentList,
        "topicId": context.topicId,
        "textLength": context.textLength
      ]
      
    case .commentCreated(let context):
      return [
        "type": "commentCreated",
        "commentId": context.commentId,
        "postId": context.postId,
        "textLength": context.textLength
      ]
      
    case .replyCreated(let context):
      return [
        "type": "replyCreated",
        "replyId": context.replyId,
        "commentId": context.commentId,
        "textLength": context.textLength
      ]
      
    case .contentDeleted(let context):
      return [
        "type": "contentDeleted",
        "contentId": context.contentId,
        "contentKind": serializeContentKind(context.kind)
      ]
      
    case .reactionModified(let context):
      var data: [String: Any] = [
        "type": "reactionModified",
        "contentId": context.contentId,
        "contentKind": serializeContentKind(context.contentKind)
      ]
      if let prev = context.previousReaction {
        data["previousReaction"] = serializeReactionKind(prev)
      }
      if let next = context.newReaction {
        data["newReaction"] = serializeReactionKind(next)
      }
      return data
      
    case .pollVoted(let context):
      return [
        "type": "pollVoted",
        "contentId": context.contentId,
        "optionId": context.optionId
      ]
      
    case .contentReported(let context):
      return [
        "type": "contentReported",
        "contentId": context.contentId,
        "reasons": context.reasons.map { serializeReportReason($0) }
      ]
      
    case .gamificationPointsGained(let context):
      return [
        "type": "gamificationPointsGained",
        "points": context.pointsGained,
        "action": serializeGamificationPointsGainedAction(context.action)
      ]
      
    case .gamificationPointsRemoved(let context):
      return [
        "type": "gamificationPointsRemoved",
        "points": context.pointsRemoved,
        "action": serializeGamificationPointsRemovedAction(context.action)
      ]
      
    case .screenDisplayed(let context):
      return [
        "type": "screenDisplayed",
        "screen": serializeScreen(context.screen)
      ]
      
    case .notificationClicked(let context):
      var data: [String: Any] = [
        "type": "notificationClicked",
        "notificationId": context.notificationId
      ]
      if let contentId = context.contentId {
        data["contentId"] = contentId
      }
      return data
      
    case .postClicked(let context):
      return [
        "type": "postClicked",
        "postId": context.postId,
        "source": serializePostClickedSource(context.source)
      ]
      
    case .translationButtonClicked(let context):
      return [
        "type": "translationButtonClicked",
        "contentId": context.contentId,
        "viewTranslated": context.viewTranslated,
        "contentKind": serializeContentKind(context.contentKind)
      ]
      
    case .commentButtonClicked(let context):
      return [
        "type": "commentButtonClicked",
        "postId": context.postId
      ]
      
    case .replyButtonClicked(let context):
      return [
        "type": "replyButtonClicked",
        "commentId": context.commentId
      ]
      
    case .seeRepliesButtonClicked(let context):
      return [
        "type": "seeRepliesButtonClicked",
        "commentId": context.commentId
      ]
      
    case .profileModified(let context):
      var data: [String: Any] = [
        "type": "profileModified",
        "nicknameUpdated": context.nickname.isUpdated,
        "bioUpdated": context.bio.isUpdated,
        "pictureUpdated": context.picture.isUpdated
      ]
      if case .updated(let bioContext) = context.bio {
        data["bioLength"] = bioContext.bioLength
      }
      if case .updated(let pictureContext) = context.picture {
        data["hasPicture"] = pictureContext.hasPicture
      }
      return data
      
    case .groupFollowingChanged(let context):
      return [
        "type": "groupFollowingChanged",
        "groupId": context.groupId,
        "followed": context.followed
      ]

    case .sessionStarted(let context):
      return [
        "type": "sessionStarted",
        "sessionId": context.sessionId
      ]
      
    case .sessionStopped(let context):
      return [
        "type": "sessionStopped",
        "sessionId": context.sessionId
      ]
      
    @unknown default:
      return nil
    }
  }
  
  private static func serializeContentKind(_ kind: OctopusEvent.ContentKind) -> String {
    switch kind {
    case .post: return "post"
    case .comment: return "comment"
    case .reply: return "reply"
    }
  }
  
  private static func serializeReactionKind(_ kind: OctopusEvent.ReactionKind) -> String {
    switch kind {
    case .heart: return "heart"
    case .joy: return "joy"
    case .mouthOpen: return "mouthOpen"
    case .clap: return "clap"
    case .cry: return "cry"
    case .rage: return "rage"
    case .unknown: return "unknown"
    }
  }
  
  private static func serializeReportReason(_ reason: OctopusEvent.ReportReason) -> String {
    switch reason {
    case .hateSpeechOrDiscriminationOrHarassment: return "hateSpeech"
    case .explicitOrInappropriateContent: return "explicit"
    case .violenceAndTerrorism: return "violence"
    case .spamAndScams: return "spam"
    case .suicideAndSelfHarm: return "suicide"
    case .fakeProfilesAndImpersonation: return "fakeProfile"
    case .childExploitationOrAbuse: return "childExploitation"
    case .intellectualPropertyViolation: return "intellectualProperty"
    case .other: return "other"
    }
  }
  
  private static func serializeGamificationPointsGainedAction(_ action: OctopusEvent.GamificationPointsGainedAction) -> String {
    switch action {
    case .post: return "post"
    case .comment: return "comment"
    case .reply: return "reply"
    case .reaction: return "reaction"
    case .vote: return "vote"
    case .postCommented: return "postCommented"
    case .profileCompleted: return "profileCompleted"
    case .dailySession: return "dailySession"
    }
  }
  
  private static func serializeGamificationPointsRemovedAction(_ action: OctopusEvent.GamificationPointsRemovedAction) -> String {
    switch action {
    case .postDeleted: return "postDeleted"
    case .commentDeleted: return "commentDeleted"
    case .replyDeleted: return "replyDeleted"
    case .reactionDeleted: return "reactionDeleted"
    }
  }
  
  private static func serializePostClickedSource(_ source: OctopusEvent.PostClickedSource) -> String {
    switch source {
    case .feed: return "feed"
    case .profile: return "profile"
    }
  }
  
  private static func serializeScreen(_ screen: OctopusEvent.Screen) -> [String: Any] {
    switch screen {
    case .postsFeed(let context):
      var data: [String: Any] = ["type": "postsFeed", "feedId": context.feedId]
      if let relatedTopicId = context.relatedTopicId {
        data["relatedTopicId"] = relatedTopicId
      }
      return data
    case .postDetail(let context):
      return ["type": "postDetail", "postId": context.postId]
    case .commentDetail(let context):
      return ["type": "commentDetail", "commentId": context.commentId]
    case .createPost:
      return ["type": "createPost"]
    case .profile:
      return ["type": "profile"]
    case .otherUserProfile(let context):
      return ["type": "otherUserProfile", "profileId": context.profileId]
    case .editProfile:
      return ["type": "editProfile"]
    case .reportContent:
      return ["type": "reportContent"]
    case .reportProfile:
      return ["type": "reportProfile"]
    case .validateNickname:
      return ["type": "validateNickname"]
    // Unreachable since native iOS 1.13: the settings-list screen was deleted and no
    // emission site for this case survives, though the case itself remains in the
    // native enum. Android still emits it. Kept so the mapping stays total, and so a
    // future iOS screen reusing the case is bridged rather than silently dropped.
    case .settingsList:
      return ["type": "settingsList"]
    case .settingsAccount:
      return ["type": "settingsAccount"]
    case .reportExplanation:
      return ["type": "reportExplanation"]
    case .deleteAccount:
      return ["type": "deleteAccount"]
    // New screens added in native SDK 1.11 — typed support deferred to a follow-up.
    // Surface them as "unknown" so the bridge doesn't crash and JS can detect them.
    case .mainFeed:
      return ["type": "unknown"]
    case .groups:
      return ["type": "unknown"]
    case .groupDetail:
      return ["type": "unknown"]
    // Unified Profile screen added in native SDK 1.13 — the wrapper exposes no
    // Unified Profile surface yet, so it follows the same deferral as above.
    case .otherUserPosts:
      return ["type": "unknown"]
    @unknown default:
      return ["type": "unknown"]
    }
  }
}
