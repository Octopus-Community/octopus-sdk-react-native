package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.Gamification
import com.octopuscommunity.sdk.domain.model.Moderation
import com.octopuscommunity.sdk.domain.model.OctopusEvent
import com.octopuscommunity.sdk.domain.model.OctopusItem

/**
 * Serializes OctopusEvent objects to WritableMap for React Native bridge.
 */
object OctopusEventSerializer {

  fun serializeEvent(event: OctopusEvent): WritableMap? {
    val map = Arguments.createMap()
    
    return when (event) {
      is OctopusEvent.PostCreated -> {
        val contentList = event.content.map { content ->
          when (content) {
            OctopusEvent.PostCreated.Content.TEXT -> "text"
            OctopusEvent.PostCreated.Content.IMAGE -> "image"
            OctopusEvent.PostCreated.Content.POLL -> "poll"
          }
        }
        map.putString("type", "postCreated")
        map.putString("postId", event.postId)
        val contentArray = Arguments.createArray()
        contentList.forEach { contentArray.pushString(it) }
        map.putArray("content", contentArray)
        map.putString("topicId", event.groupId)
        map.putInt("textLength", event.textLength)
        map
      }

      is OctopusEvent.CommentCreated -> {
        map.putString("type", "commentCreated")
        map.putString("commentId", event.commentId)
        map.putString("postId", event.postId)
        map.putInt("textLength", event.textLength)
        map
      }

      is OctopusEvent.ReplyCreated -> {
        map.putString("type", "replyCreated")
        map.putString("replyId", event.replyId)
        map.putString("commentId", event.commentId)
        map.putInt("textLength", event.textLength)
        map
      }

      is OctopusEvent.PostDeleted -> {
        map.putString("type", "contentDeleted")
        map.putString("contentId", event.contentId)
        map.putString("contentKind", "post")
        map
      }

      is OctopusEvent.CommentDeleted -> {
        map.putString("type", "contentDeleted")
        map.putString("contentId", event.contentId)
        map.putString("contentKind", "comment")
        map
      }

      is OctopusEvent.ReplyDeleted -> {
        map.putString("type", "contentDeleted")
        map.putString("contentId", event.contentId)
        map.putString("contentKind", "reply")
        map
      }

      is OctopusEvent.ReactionModified -> {
        map.putString("type", "reactionModified")
        map.putString("contentId", event.contentId)
        map.putString("contentKind", serializeContentKind(event.contentKind))
        event.previousReaction?.let {
          map.putString("previousReaction", serializeReactionKind(it))
        }
        event.newReaction?.let {
          map.putString("newReaction", serializeReactionKind(it))
        }
        map
      }

      is OctopusEvent.PollVote -> {
        map.putString("type", "pollVoted")
        map.putString("contentId", event.contentId)
        map.putString("optionId", event.optionId)
        map
      }

      is OctopusEvent.ContentReported -> {
        map.putString("type", "contentReported")
        map.putString("contentId", event.contentId)
        val reasonsArray = Arguments.createArray()
        event.reasons.forEach { reason ->
          reasonsArray.pushString(serializeReportReason(reason))
        }
        map.putArray("reasons", reasonsArray)
        map
      }

      is OctopusEvent.ProfileReported -> {
        map.putString("type", "profileReported")
        map.putString("profileId", event.profileId)
        val reasonsArray = Arguments.createArray()
        event.reasons.forEach { reason ->
          reasonsArray.pushString(serializeReportReason(reason))
        }
        map.putArray("reasons", reasonsArray)
        map
      }

      is OctopusEvent.GamificationPointsGained -> {
        map.putString("type", "gamificationPointsGained")
        map.putInt("points", event.points)
        map.putString("action", serializeGamificationAction(event.action))
        map
      }

      is OctopusEvent.GamificationPointsRemoved -> {
        map.putString("type", "gamificationPointsRemoved")
        map.putInt("points", event.points)
        map.putString("action", serializeGamificationPointsRemovedAction(event.action))
        map
      }

      is OctopusEvent.ScreenDisplayed -> {
        map.putString("type", "screenDisplayed")
        val screenMap = serializeScreen(event)
        map.putMap("screen", screenMap)
        map
      }

      is OctopusEvent.NotificationClicked -> {
        map.putString("type", "notificationClicked")
        map.putString("notificationId", event.notificationId)
        event.contentId?.let {
          map.putString("contentId", it)
        }
        map
      }

      is OctopusEvent.PostClicked -> {
        map.putString("type", "postClicked")
        map.putString("postId", event.postId)
        map.putString("source", when (event.source) {
          OctopusEvent.PostClicked.Source.FEED -> "feed"
          OctopusEvent.PostClicked.Source.PROFILE -> "profile"
        })
        map
      }

      is OctopusEvent.TranslationButtonClicked -> {
        map.putString("type", "translationButtonClicked")
        map.putString("contentId", event.contentId)
        map.putBoolean("viewTranslated", event.viewTranslated)
        map.putString("contentKind", serializeContentKind(event.contentKind))
        map
      }

      is OctopusEvent.CommentButtonClicked -> {
        map.putString("type", "commentButtonClicked")
        map.putString("postId", event.postId)
        map
      }

      is OctopusEvent.ReplyButtonClicked -> {
        map.putString("type", "replyButtonClicked")
        map.putString("commentId", event.commentId)
        map
      }

      is OctopusEvent.SeeRepliesButtonClicked -> {
        map.putString("type", "seeRepliesButtonClicked")
        map.putString("commentId", event.commentId)
        map
      }

      is OctopusEvent.ProfileModified -> {
        val prev = event.previousProfile
        val new = event.newProfile
        val nicknameUpdated = prev?.nickname != new.nickname
        val bioUpdated = prev?.bio != new.bio
        val pictureUpdated = prev?.picture != new.picture
        
        map.putString("type", "profileModified")
        map.putBoolean("nicknameUpdated", nicknameUpdated)
        map.putBoolean("bioUpdated", bioUpdated)
        if (bioUpdated) {
          new.bio?.length?.let { map.putInt("bioLength", it) }
        }
        map.putBoolean("pictureUpdated", pictureUpdated)
        if (pictureUpdated) {
          map.putBoolean("hasPicture", new.picture != null)
        }
        map
      }

      is OctopusEvent.GroupFollowingChanged -> {
        map.putString("type", "groupFollowingChanged")
        map.putString("groupId", event.groupId)
        map.putBoolean("followed", event.followed)
        map
      }

      is OctopusEvent.SessionStarted -> {
        map.putString("type", "sessionStarted")
        map.putString("sessionId", event.sessionId)
        map
      }

      is OctopusEvent.SessionStopped -> {
        map.putString("type", "sessionStopped")
        map.putString("sessionId", event.sessionId)
        map
      }

      else -> null
    }
  }

  private fun serializeContentKind(kind: OctopusItem.ContentKind): String {
    return when (kind) {
      OctopusItem.ContentKind.POST -> "post"
      OctopusItem.ContentKind.COMMENT -> "comment"
      OctopusItem.ContentKind.REPLY -> "reply"
    }
  }

  private fun serializeReactionKind(kind: OctopusItem.Reaction.Kind): String {
    return when (kind) {
      is OctopusItem.Reaction.Kind.Heart -> "heart"
      is OctopusItem.Reaction.Kind.Joy -> "joy"
      is OctopusItem.Reaction.Kind.MouthOpen -> "mouthOpen"
      is OctopusItem.Reaction.Kind.Clap -> "clap"
      is OctopusItem.Reaction.Kind.Cry -> "cry"
      is OctopusItem.Reaction.Kind.Rage -> "rage"
      is OctopusItem.Reaction.Kind.Unknown -> "unknown"
    }
  }

  private fun serializeReportReason(reason: Moderation.ReportReason): String {
    return when (reason) {
      is Moderation.ReportReason.HateSpeechOrDiscriminatoryContent -> "hateSpeech"
      is Moderation.ReportReason.ExplicitOrInappropriateContent -> "explicit"
      is Moderation.ReportReason.ViolenceAndTerrorism -> "violence"
      is Moderation.ReportReason.SpamAndScams -> "spam"
      is Moderation.ReportReason.SuicideAndSelfHarm -> "suicide"
      is Moderation.ReportReason.FakeProfilesAndImpersonation -> "fakeProfile"
      is Moderation.ReportReason.ChildExploitationOrAbuse -> "childExploitation"
      is Moderation.ReportReason.IntellectualPropertyViolation -> "intellectualProperty"
      is Moderation.ReportReason.Other -> "other"
    }
  }

  private fun serializeGamificationAction(action: Gamification.Action): String {
    return when (action) {
      Gamification.Action.POST -> "post"
      Gamification.Action.COMMENT -> "comment"
      Gamification.Action.REPLY -> "reply"
      Gamification.Action.REACTION -> "reaction"
      Gamification.Action.VOTE -> "vote"
      Gamification.Action.POST_COMMENTED -> "postCommented"
      Gamification.Action.PROFILE_COMPLETED -> "profileCompleted"
      Gamification.Action.DAILY_SESSION -> "dailySession"
    }
  }

  private fun serializeGamificationPointsRemovedAction(action: Gamification.Action): String {
    // In Android SDK, GamificationPointsRemoved uses the same enum values as GamificationPointsGained,
    // but the context (removed vs gained) determines the meaning.
    // Map the action values to their "removed" equivalents
    return when (action) {
      Gamification.Action.POST -> "postDeleted"
      Gamification.Action.COMMENT -> "commentDeleted"
      Gamification.Action.REPLY -> "replyDeleted"
      Gamification.Action.REACTION -> "reactionDeleted"
      // For other actions, use the regular serialization (shouldn't happen for removed events)
      else -> serializeGamificationAction(action)
    }
  }

  private fun serializeScreen(event: OctopusEvent.ScreenDisplayed): WritableMap {
    val screenMap = Arguments.createMap()
    // Default set before the `when` below, which stays exhaustive on purpose (a compile-time
    // forcing function: adding a ScreenDisplayed subtype without adding a branch here is a
    // build failure, not a silent gap). This default is the defense-in-depth line for the
    // case that check cannot cover — a native dependency bump paired with a wrapper build that
    // does not also pick up the matching Kotlin subtype — so the bridge still emits a map with
    // a "type" key, `'unknown'`, instead of one missing it entirely.
    screenMap.putString("type", "unknown")

    when (event) {
      is OctopusEvent.ScreenDisplayed.PostsFeed -> {
        screenMap.putString("type", "postsFeed")
        screenMap.putString("feedId", event.feedId)
        event.relatedGroupId?.let {
          screenMap.putString("relatedTopicId", it)
        }
      }
      is OctopusEvent.ScreenDisplayed.PostDetail -> {
        screenMap.putString("type", "postDetail")
        screenMap.putString("postId", event.postId)
      }
      is OctopusEvent.ScreenDisplayed.CommentDetail -> {
        screenMap.putString("type", "commentDetail")
        screenMap.putString("commentId", event.commentId)
      }
      is OctopusEvent.ScreenDisplayed.CreatePost -> {
        screenMap.putString("type", "createPost")
      }
      is OctopusEvent.ScreenDisplayed.Profile -> {
        screenMap.putString("type", "profile")
      }
      is OctopusEvent.ScreenDisplayed.OtherUserProfile -> {
        screenMap.putString("type", "otherUserProfile")
        screenMap.putString("profileId", event.profileId)
      }
      is OctopusEvent.ScreenDisplayed.EditProfile -> {
        screenMap.putString("type", "editProfile")
      }
      is OctopusEvent.ScreenDisplayed.ReportContent -> {
        screenMap.putString("type", "reportContent")
      }
      is OctopusEvent.ScreenDisplayed.ReportProfile -> {
        screenMap.putString("type", "reportProfile")
      }
      is OctopusEvent.ScreenDisplayed.ValidateNickname -> {
        screenMap.putString("type", "validateNickname")
      }
      is OctopusEvent.ScreenDisplayed.SettingsList -> {
        screenMap.putString("type", "settingsList")
      }
      is OctopusEvent.ScreenDisplayed.SettingsAccount -> {
        screenMap.putString("type", "settingsAccount")
      }
      is OctopusEvent.ScreenDisplayed.ReportExplanation -> {
        screenMap.putString("type", "reportExplanation")
      }
      is OctopusEvent.ScreenDisplayed.DeleteAccount -> {
        screenMap.putString("type", "deleteAccount")
      }
      is OctopusEvent.ScreenDisplayed.MainFeed -> {
        screenMap.putString("type", "mainFeed")
        screenMap.putString("feedId", event.feedId)
      }
      OctopusEvent.ScreenDisplayed.Groups -> {
        screenMap.putString("type", "groups")
      }
      is OctopusEvent.ScreenDisplayed.GroupDetail -> {
        screenMap.putString("type", "groupDetail")
        screenMap.putString("groupId", event.groupId)
        // `event.source` (BRIDGE / COMMUNITY) is deliberately not bridged: iOS names the
        // same distinction `clientApp` / `community`, so carrying it needs a wire naming
        // decision of its own rather than an Android-side one.
      }
      // Unified Profile screens added in native SDK 1.13, reachable since the wrapper
      // passes `onNavigateToProfile` (behind `interceptProfileTaps`).
      //
      // `activity` has no iOS counterpart: the native iOS SDK models no separate screen
      // for the connected user's own activity and reports `.profile` for it. The two
      // sides are therefore resolved by *naming* the asymmetry rather than by flattening
      // it — Android keeps the finer tag the native SDK gives it, and `ScreenType`'s
      // TSDoc plus `KNOWN_SCREEN_PLATFORM_GAPS` in `src/__tests__/goldenRoundtrip.test.ts`
      // record that a host counting this action must accept "activity" or "profile".
      // Flattening to "profile" here would instead discard information Android has and
      // silently change tag if iOS ever gains the case.
      is OctopusEvent.ScreenDisplayed.Activity -> {
        screenMap.putString("type", "activity")
      }
      is OctopusEvent.ScreenDisplayed.OtherUserPosts -> {
        screenMap.putString("type", "otherUserPosts")
        screenMap.putString("profileId", event.profileId)
      }
    }
    
    return screenMap
  }
}
