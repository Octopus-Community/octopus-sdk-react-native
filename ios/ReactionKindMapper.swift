import Octopus

/// Converts between the JS-facing `OctopusReactionKind` string union and the native
/// `OctopusReactionKind`. Mirrors the Android `ReactionKindMapper`'s string-mapping pattern.
struct ReactionKindMapper {

  /// - Returns: the matching `OctopusReactionKind`, or `nil` when `reaction` does not match any
  /// known value. Callers must distinguish this from a `nil` input (which means "no reaction")
  /// themselves — this function only maps non-nil strings.
  static func fromReactNativeString(_ reaction: String) -> OctopusReactionKind? {
    switch reaction {
    case "heart": return .heart
    case "joy": return .joy
    case "mouthOpen": return .mouthOpen
    case "clap": return .clap
    case "cry": return .cry
    case "rage": return .rage
    default: return nil
    }
  }
}
