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

  /// Reads the flat `postEnablePictures` / `postEnablePolls` / `commentEnablePictures` /
  /// `replyEnablePictures` keys the JS wrapper always sends (see `debugOverrideContentOptions.ts`)
  /// — not nested `post` / `comment` / `reply` sub-dictionaries. Each key independently defaults
  /// to `true` (the native default) when absent, matching the JS wrapper's own per-field `?? true`.
  static func toContentOptions(_ dict: NSDictionary?) -> ContentOptions? {
    guard let dict = dict as? [String: Any] else { return nil }
    return ContentOptions(
      post: ContentOptions.PostOptions(
        enablePictures: dict["postEnablePictures"] as? Bool ?? true,
        enablePolls: dict["postEnablePolls"] as? Bool ?? true
      ),
      comment: ContentOptions.CommentOptions(
        enablePictures: dict["commentEnablePictures"] as? Bool ?? true
      ),
      reply: ContentOptions.ReplyOptions(
        enablePictures: dict["replyEnablePictures"] as? Bool ?? true
      )
    )
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
