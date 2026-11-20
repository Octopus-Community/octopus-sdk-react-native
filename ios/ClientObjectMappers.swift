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
  /// The deprecated single `attachment` becomes the only element of `medias`, as the native
  /// deprecated initializer does; the two together are refused, since the native SDK has no
  /// initializer taking both. More than the native maximum is not counted here: the native SDK
  /// refuses it with a `ClientPostError.validation`.
  ///
  /// The button label arrives as the flat fields of `decodeLocalizedText`: the deprecated
  /// `viewObjectButtonText` alone is an auto-translated label, as the native deprecated
  /// initializers make it.
  ///
  /// - Throws: `OctopusLocalizedText.ValidationError` when the per-language button label is
  ///   invalid, which the caller rejects with its own code (`bridgeRejection`).
  ///   `ClientObjectDecodingError` when a required field is missing, so the caller can
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
    let attachment = try (map["attachment"] as? [String: Any]).map {
      try decodeAttachment($0, field: "attachment")
    }
    let medias = try decodeMedias(map["medias"])
    if attachment != nil && !medias.isEmpty {
      throw ClientObjectDecodingError.invalidAttachment(
        "set medias only: attachment is deprecated and cannot be combined with medias")
    }
    let viewObjectButton = try decodeLocalizedText(
      text: map["viewObjectButtonText"] as? String,
      language: map["viewObjectButtonLanguage"] as? String,
      texts: map["viewObjectButtonTexts"]
    )
    return ClientPost(
      clientObjectId: objectId,
      groupId: map["groupId"] as? String,
      text: text,
      catchPhrase: map["catchPhrase"] as? String,
      medias: medias.isEmpty ? (attachment.map { [$0] } ?? []) : medias,
      viewClientObjectButton: viewObjectButton
    )
  }

  /// Decodes the JS `medias` array, each entry with `decodeAttachment`'s fail-fast rule.
  private static func decodeMedias(_ value: Any?) throws -> [ClientPost.Attachment] {
    guard let value, !(value is NSNull) else { return [] }
    guard let entries = value as? [Any] else {
      throw ClientObjectDecodingError.invalidAttachment("medias must be an array of attachments")
    }
    return try entries.enumerated().map { index, entry in
      guard let map = entry as? [String: Any] else {
        throw ClientObjectDecodingError.invalidAttachment(
          "medias[\(index)] must be an attachment object")
      }
      return try decodeAttachment(map, field: "medias[\(index)]")
    }
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
  /// - Parameter field: Names the attachment in error messages: `attachment` or `medias[<index>]`.
  /// - Throws: `ClientObjectDecodingError.invalidAttachment`.
  private static func decodeAttachment(
    _ map: [String: Any], field: String
  ) throws -> ClientPost.Attachment {
    switch map["type"] as? String {
    case "remoteImage":
      guard let urlString = map["url"] as? String,
            !isBlank(urlString),
            let url = URL(string: urlString)
      else {
        throw ClientObjectDecodingError.invalidAttachment(
          "\(field).url is required and must be a non-empty URL")
      }
      return .distantImage(url)
    case "localImage":
      guard let uri = map["uri"] as? String, !isBlank(uri) else {
        throw ClientObjectDecodingError.invalidAttachment(
          "\(field).uri is required and must be non-empty")
      }
      guard let data = localImageData(uri) else {
        throw ClientObjectDecodingError.invalidAttachment(
          "\(field).uri could not be resolved: \(uri)")
      }
      return .localImage(data)
    default:
      // No string interpolation carrying a nested quote here: `clientPostErrorParity.test.ts`
      // reads these files as text with a deliberately small comment stripper.
      let type = map["type"] as? String ?? "none"
      throw ClientObjectDecodingError.invalidAttachment(
        "\(field).type must be remoteImage or localImage, got: \(type)")
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

extension ClientObjectMappers {
  /// Builds the native `OctopusLocalizedText` from the flat wire fields the JS
  /// `localizedTextToWire` sends (`src/internals/localizedText.ts`): per language as soon as
  /// `language` or `texts` is set, else `text` auto-translated, else `nil`.
  ///
  /// Each language tag becomes a locale through `languageTagLocale` — an underscore read as a
  /// hyphen, then `Locale(identifier:)`, as the Android bridge does with `Locale.forLanguageTag`;
  /// a hyphenated tag keeps its script (`zh-Hant-TW`) — and the native
  /// `OctopusLocalizedText.perLanguage` does the validation, so the rules, and the codes the
  /// caller rejects with, are the native SDK's. Two tags giving the same locale are reported here,
  /// as Android does, rather than trapping in a dictionary built from duplicate keys: as
  /// `.emptyLanguage` when that locale has no language (`und` and `UND`), the reason the native SDK
  /// gives for each of those tags, else as the native `.duplicateLanguage`.
  ///
  /// - Throws: `OctopusLocalizedText.ValidationError` when the per-language text is invalid.
  static func decodeLocalizedText(text: String?, language: String?, texts: Any?) throws
    -> OctopusLocalizedText? {
    let textsByTag = texts as? [String: Any]
    guard language != nil || textsByTag != nil else { return text.map { .autoTranslated($0) } }
    var byLocale: [Locale: String] = [:]
    // Sorted so that the duplicate reported does not depend on the order of the dictionary.
    for (tag, value) in (textsByTag ?? [:]).sorted(by: { $0.key < $1.key }) {
      guard let label = value as? String else { continue }
      let locale = languageTagLocale(tag)
      guard byLocale.updateValue(label, forKey: locale) == nil else {
        // Tags without a language are each refused by the native SDK as `.emptyLanguage`, so
        // their collision is not a duplicate.
        guard hasLanguage(locale) else {
          throw OctopusLocalizedText.ValidationError(kind: .emptyLanguage)
        }
        // The code the native SDK sends for this locale, asked of the native SDK itself.
        let code = try OctopusLocalizedText.perLanguage([locale: label], defaultLanguage: locale)
          .defaultLanguageCode
        throw OctopusLocalizedText.ValidationError(kind: .duplicateLanguage, languageCode: code)
      }
    }
    return try OctopusLocalizedText.perLanguage(
      byLocale, defaultLanguage: languageTagLocale(language ?? ""))
  }

  /// The locale of a language tag as JS gives it. The only conversion both bridges make, the same
  /// way: `_` becomes `-`, so `pt_BR` and `pt-BR` are one language on both platforms. Everything
  /// else is the native SDK's to judge.
  static func languageTagLocale(_ tag: String) -> Locale {
    Locale(identifier: tag.replacingOccurrences(of: "_", with: "-"))
  }

  /// Whether the native SDK finds a language in `locale`: a language code read from its
  /// identifier, other than the undetermined `und` — the same reading as the native
  /// `OctopusLocalizedText`, whose own helper is not public.
  static func hasLanguage(_ locale: Locale) -> Bool {
    let components = Locale.components(fromIdentifier: locale.identifier)
    guard let language = components[NSLocale.Key.languageCode.rawValue] else { return false }
    return !language.isEmpty && language.lowercased() != "und"
  }
}

extension OctopusLocalizedText.ValidationError {
  /// Maps to its `LOCALIZED_TEXT_…` code, the same in `ClientPostErrorCode` and
  /// `NavigateToOctopusCreatePostErrorCode` (`src/types/`). A reason a later native SDK adds
  /// falls back to `fallbackCode`, the catch-all of the call that rejects.
  func toBridgeErrorCode(fallbackCode: String) -> String {
    switch kind {
    case .emptyTexts: return "LOCALIZED_TEXT_EMPTY_TEXTS"
    case .blankText: return "LOCALIZED_TEXT_BLANK_TEXT"
    case .emptyLanguage: return "LOCALIZED_TEXT_EMPTY_LANGUAGE"
    case .duplicateLanguage: return "LOCALIZED_TEXT_DUPLICATE_LANGUAGE"
    case .defaultLanguageMissing: return "LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING"
    @unknown default: return fallbackCode
    }
  }

  /// The code and the error to reject with. The error's `userInfo.languageCode` reaches JS as
  /// `error.userInfo.languageCode`, which the JS side copies onto the error as `languageCode`,
  /// as Android does; its description is `debugDescription`, the only one that names the reason.
  func bridgeRejection(fallbackCode: String) -> (code: String, error: NSError) {
    var userInfo: [String: Any] = [NSLocalizedDescriptionKey: debugDescription]
    if let languageCode { userInfo["languageCode"] = languageCode }
    return (
      toBridgeErrorCode(fallbackCode: fallbackCode),
      NSError(domain: "OctopusLocalizedText.ValidationError", code: 0, userInfo: userInfo)
    )
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
