import Foundation
import UIKit
import Octopus

/// Wire mapping for the client-object bridge: `fetchOrCreateClientObjectRelatedPost`,
/// `startObservingClientObjectRelatedPost` and the navigate-to-client-object callback.
///
/// Kept in its own file, mirroring `CommunityDataMapper` and the Android
/// `ClientObjectBridge.kt`. Imports only `Octopus`, never `OctopusCore`: the latter declares
/// its own `ClientPost` that would shadow the public one used here.
enum ClientObjectMappers {

  /// Decodes the JS `ClientPost` object into the native model.
  ///
  /// - Throws: `ClientObjectDecodingError` when a required field is missing, so the caller can
  ///   reject with `INVALID_ARGS` rather than letting the native SDK report a content error
  ///   for what is really a wiring mistake.
  static func decodeClientPost(_ map: [String: Any]) throws -> ClientPost {
    // Blank is rejected as well as absent, and the value is forwarded untrimmed — the same
    // two rules as the Android `decodeClientPost`, so `INVALID_ARGS` means the same thing on
    // both platforms.
    guard let objectId = map["objectId"] as? String, !isBlank(objectId) else {
      throw ClientObjectDecodingError.missingField("objectId")
    }
    guard let text = map["text"] as? String, !isBlank(text) else {
      throw ClientObjectDecodingError.missingField("text")
    }
    return ClientPost(
      clientObjectId: objectId,
      groupId: map["groupId"] as? String,
      text: text,
      catchPhrase: map["catchPhrase"] as? String,
      attachment: try (map["attachment"] as? [String: Any]).map { try decodeAttachment($0) },
      viewClientObjectButtonText: map["viewObjectButtonText"] as? String
    )
  }

  /// Maps the JS attachment discriminator onto the native `ClientPost.Attachment`.
  ///
  /// `remoteImage` maps to iOS `distantImage`. `localImage.uri` follows `PrefilledPostBuilder`'s
  /// convention — a bare name is a bundled asset, anything else is a file URL — and its bytes
  /// are read here because the native case carries `Data`, not a path.
  ///
  /// An attachment that is **present but unresolvable** (unknown discriminator, unreadable
  /// file, asset not found) throws, so the caller rejects with `INVALID_ARGS` and no post is
  /// created. This is deliberately *not* `PrefilledPostBuilder`'s silent-drop rule: the
  /// prefilled editor hands the draft to a human who can still see the image is missing and
  /// fix it, whereas this post is created once and never rewritten — a dropped image here is
  /// permanent. Android throws on the same three conditions.
  ///
  /// - Throws: `ClientObjectDecodingError.invalidAttachment`.
  private static func decodeAttachment(_ map: [String: Any]) throws -> ClientPost.Attachment {
    switch map["type"] as? String {
    case "remoteImage":
      guard let urlString = map["url"] as? String,
            !isBlank(urlString),
            let url = URL(string: urlString)
      else {
        throw ClientObjectDecodingError.invalidAttachment(
          "attachment.url is required and must be a non-empty URL")
      }
      return .distantImage(url)
    case "localImage":
      guard let uri = map["uri"] as? String, !isBlank(uri) else {
        throw ClientObjectDecodingError.invalidAttachment(
          "attachment.uri is required and must be non-empty")
      }
      guard let data = localImageData(uri) else {
        throw ClientObjectDecodingError.invalidAttachment(
          "attachment.uri could not be resolved: \(uri)")
      }
      return .localImage(data)
    default:
      // No string interpolation carrying a nested quote here: `clientPostErrorParity.test.ts`
      // reads these files as text with a deliberately small comment stripper.
      let type = map["type"] as? String ?? "none"
      throw ClientObjectDecodingError.invalidAttachment(
        "attachment.type must be remoteImage or localImage, got: \(type)")
    }
  }

  /// Reads the bytes behind a `localImage.uri`, or `nil` when nothing readable is behind it.
  ///
  /// Only **file** URLs are read. A `http(s)` — or any other non-file — scheme is refused
  /// rather than handed to `Data(contentsOf:)`, which would perform a *synchronous, untimed*
  /// network fetch on the bridge's method queue and stall every other `@ReactMethod` behind
  /// it. A remote image belongs in the `remoteImage` attachment, which the native SDK
  /// downloads on its own schedule. Android cannot hit this: it passes a `Uri` to the SDK and
  /// never reads the bytes itself.
  private static func localImageData(_ uri: String) -> Data? {
    if isBlank(uri) { return nil }
    if uri.contains("://") {
      guard let url = URL(string: uri), url.isFileURL else { return nil }
      return try? Data(contentsOf: url)
    }
    // A bare name: a file bundled with the host app, asset catalogs included.
    if let asset = UIImage(named: uri), let data = asset.pngData() {
      return data
    }
    guard let path = Bundle.main.path(forResource: uri, ofType: nil) else { return nil }
    return try? Data(contentsOf: URL(fileURLWithPath: path))
  }

  /// Kotlin's `isBlank()`: empty, or nothing but whitespace.
  private static func isBlank(_ value: String) -> Bool {
    return value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  /// Serializes a native post into the JS `OctopusPost` shape. Key-for-key identical to the
  /// Android bridge's `ClientObjectBridge.serializeOctopusPost`.
  static func serializeOctopusPost(_ post: any OctopusPost) -> [String: Any] {
    return [
      "id": post.id,
      "commentCount": post.commentCount,
      "viewCount": post.viewCount,
      "reactions": post.reactions.map {
        ["reactionKind": reactionKindToWire($0.reaction), "count": $0.count] as [String: Any]
      },
      "userReactionKind": post.userReaction.map { reactionKindToWire($0) } as Any,
    ]
  }

  /// The read-side counterpart of `ReactionKindMapper.fromReactNativeString`.
  ///
  /// Kept here rather than added to `ReactionKindMapper` because it maps a *wider* domain: a
  /// kind this SDK version does not know reaches JS as the **raw server value**, which is not a
  /// member of the JS `OctopusReactionKind` write union. `OctopusReactionCount.reactionKind` is
  /// typed as an open string for exactly this. Forwarding the raw value rather than a flat
  /// `"unknown"` keeps the same information the Flutter plugin carries in its
  /// `{kind, serverValue}` pair, in the shape RN reads more naturally. `"unknown"` is the
  /// fallback for the degenerate case of a blank server value, so the field is never empty.
  static func reactionKindToWire(_ kind: OctopusReactionKind) -> String {
    switch kind {
    case .heart: return "heart"
    case .joy: return "joy"
    case .mouthOpen: return "mouthOpen"
    case .clap: return "clap"
    case .cry: return "cry"
    case .rage: return "rage"
    case .unknown(let value): return value.isEmpty ? "unknown" : value
    @unknown default: return "unknown"
    }
  }
}

/// Raised by `ClientObjectMappers.decodeClientPost` for a payload the bridge cannot map.
enum ClientObjectDecodingError: Error, LocalizedError {
  case missingField(String)
  case invalidAttachment(String)

  var errorDescription: String? {
    switch self {
    case .missingField(let name): return "\(name) is required and must be non-empty"
    case .invalidAttachment(let reason): return reason
    }
  }
}

extension ClientPostError {
  /// Maps to the JS-facing `ClientPostErrorCode` union documented in
  /// `src/types/clientPostError.ts`.
  ///
  /// Only `NO_NETWORK`, `SERVER_ERROR` and `CLIENT_POST_ERROR` are reachable from here; the
  /// bridge itself raises `INVALID_ARGS` before the SDK is called. The native enum publishes four
  /// cases, and `ValidationError`'s `errorKind` / `field` / `message` are **not public** —
  /// only `debugDescription` is — so this bridge has nothing to classify a validation failure
  /// with and reports `CLIENT_POST_ERROR` carrying that description. Android, whose
  /// `ClientPostError` hierarchy is fully public, produces the sixteen fine-grained content
  /// codes. The asymmetry is in the "Emitted on" column of the JS doc, not papered over here:
  /// inventing a code from a debug string would be a guess that silently breaks the moment the
  /// native wording changes.
  func toBridgeError() -> (code: String, message: String) {
    switch self {
    case .noNetwork:
      return ("NO_NETWORK", "No network connection.")
    case .serverError:
      return ("SERVER_ERROR", debugDescription)
    case .validation:
      return ("CLIENT_POST_ERROR", debugDescription)
    case .other:
      return ("CLIENT_POST_ERROR", debugDescription)
    @unknown default:
      return ("CLIENT_POST_ERROR", debugDescription)
    }
  }
}
