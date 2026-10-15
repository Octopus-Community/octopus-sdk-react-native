import Foundation
import OctopusCore

/// Converts the JS-facing debug-override payloads (used only by the `debugOverride*` testing
/// hatches) to their native domain-model equivalents. These are development-only affordances,
/// not part of the stable public API surface — the `debugOverride*` functions on `OctopusSDK`
/// are gated behind `@_spi(OctopusInternalTesting)`.
struct DebugOverrideMappers {

  static func toProfileFieldsLock(_ dict: NSDictionary?) -> ProfileFieldsLock? {
    guard let dict = dict as? [String: Any] else { return nil }
    return ProfileFieldsLock(
      nickname: toProfileFieldLockState(dict, "nickname"),
      avatar: toProfileFieldLockState(dict, "avatar"),
      bio: toProfileFieldLockState(dict, "bio")
    )
  }

  private static func toProfileFieldLockState(_ dict: [String: Any], _ key: String) -> ProfileFieldLockState {
    switch dict[key] as? String {
    case "readOnly": return .readOnly
    case "disabled": return .disabled
    default: return .editable
    }
  }

  /// Reads the flat `postEnablePictures` / `postEnablePolls` / `postTextRequired` / `commentEnablePictures` /
  /// `replyEnablePictures` keys the JS wrapper always sends (see `debugOverrideContentOptions.ts`)
  /// — not nested `post` / `comment` / `reply` sub-dictionaries. Each key independently defaults
  /// to `true` (the native default) when absent, matching the JS wrapper's own per-field `?? true`.
  static func toContentOptions(_ dict: NSDictionary?) -> ContentOptions? {
    guard let dict = dict as? [String: Any] else { return nil }
    return ContentOptions(
      post: ContentOptions.PostOptions(
        enablePictures: dict["postEnablePictures"] as? Bool ?? true,
        enablePolls: dict["postEnablePolls"] as? Bool ?? true,
        textRequired: dict["postTextRequired"] as? Bool ?? true
      ),
      comment: ContentOptions.CommentOptions(
        enablePictures: dict["commentEnablePictures"] as? Bool ?? true
      ),
      reply: ContentOptions.ReplyOptions(
        enablePictures: dict["replyEnablePictures"] as? Bool ?? true
      )
    )
  }

  static func toConsentTexts(_ dict: NSDictionary?) throws -> ConsentTexts? {
    guard let dict = dict else { return nil }
    switch dict["mode"] as? String {
    case "implicit": return .implicit(notice: dict["notice"] as? String)
    case "multiCheckbox": return .multiCheckbox(
      termsLabel: dict["termsLabel"] as? String,
      privacyLabel: dict["privacyLabel"] as? String,
      rulesLabel: dict["rulesLabel"] as? String
    )
    case "singleCheckbox": return .singleCheckbox(
      label: dict["label"] as? String,
      belowText: dict["belowText"] as? String
    )
    default:
      throw NSError(domain: "OctopusReactNativeSdk", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid consent texts mode"])
    }
  }

  static func fromConsentTexts(_ texts: ConsentTexts?) -> [String: Any]? {
    guard let texts = texts else { return nil }
    switch texts {
    case .implicit(let notice):
      return ["mode": "implicit", "notice": notice.map { $0 as Any } ?? NSNull()]
    case .multiCheckbox(let termsLabel, let privacyLabel, let rulesLabel):
      return ["mode": "multiCheckbox",
              "termsLabel": termsLabel.map { $0 as Any } ?? NSNull(),
              "privacyLabel": privacyLabel.map { $0 as Any } ?? NSNull(),
              "rulesLabel": rulesLabel.map { $0 as Any } ?? NSNull()]
    case .singleCheckbox(let label, let belowText):
      return ["mode": "singleCheckbox",
              "label": label.map { $0 as Any } ?? NSNull(),
              "belowText": belowText.map { $0 as Any } ?? NSNull()]
    }
  }

  static func toTermsAcceptanceMode(_ mode: String?) -> TermsAcceptanceMode? {
    switch mode {
    case "implicit": return .implicit
    case "explicitMultiCheckbox": return .explicitMultiCheckbox
    case "explicitSingleCheckbox": return .explicitSingleCheckbox
    default: return nil
    }
  }
}
