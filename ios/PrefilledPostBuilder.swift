import Foundation
import UIKit
import Octopus

/// Builds an `OctopusPrefilledPost` from the raw, JS-facing prefill fields handled by
/// `OctopusReactNativeSdk.navigateToOctopusCreatePost`. Mirrors the Android
/// `PrefilledPostBuilder`'s `imageUris` resolution convention documented on the JS
/// `OctopusPrefilledPost` type — a bare name with no scheme resolves to a bundled image, anything
/// else (expected to be a `file://` URI) is read from disk.
struct PrefilledPostBuilder {

  /// - Parameter sign: Signs this prefilled share so a community that forbids member pictures
  ///   accepts its image. `nil` — the default — leaves the share unsigned, which is what the
  ///   native SDK did before this feature existed. Supplied from
  ///   `OctopusBridgeShareTokenBroker` only when JS registered a signer.
  /// - Parameter imageUris: The JS `imageUris`, in display order. An entry that resolves to
  ///   nothing is dropped, as a blank one is.
  /// - Throws: `OctopusPrefilledPost.ValidationError` when the prefill payload is invalid, and
  ///   `OctopusPrefilledPost.TooManyImagesError` when more images than a post carries are left.
  /// - Parameter ctaLabel: The auto-translated CTA label; ignored when `ctaLabelLanguage` or
  ///   `ctaLabelTexts` is set.
  /// - Parameter ctaLabelLanguage: The default language of a per-language CTA label.
  /// - Parameter ctaLabelTexts: The texts of a per-language CTA label by language tag, default
  ///   included (the raw JS object).
  /// - Throws: also `OctopusLocalizedText.ValidationError` when the per-language CTA label is
  ///   invalid.
  static func build(
    text: String?,
    imageUris: [String]?,
    topicId: String?,
    ctaUrl: String?,
    ctaLabel: String?,
    ctaLabelLanguage: String? = nil,
    ctaLabelTexts: Any? = nil,
    sign: (@Sendable (_ bridgeFingerprint: String) async throws -> String?)? = nil
  ) throws -> OctopusPrefilledPost {
    let cta = try resolveCTA(
      url: ctaUrl,
      label: try ClientObjectMappers.decodeLocalizedText(
        text: ctaLabel, language: ctaLabelLanguage, texts: ctaLabelTexts
      )
    )
    return try OctopusPrefilledPost(
      text: text,
      images: (imageUris ?? []).compactMap(resolveImageData),
      topicId: topicId,
      cta: cta,
      sign: sign
    )
  }

  /// Builds the CTA only when at least one of `ctaUrl` / `ctaLabel` was supplied. A missing or
  /// unparseable `ctaUrl` is reported as `.ctaUrlEmpty` — the closest existing validation error,
  /// since `URL(string:)` cannot represent an empty URL to let `OctopusPrefilledPost.CTA.init`
  /// throw it natively the way the Android mapper's `Uri.parse` can.
  private static func resolveCTA(
    url ctaUrl: String?, label ctaLabel: OctopusLocalizedText?
  ) throws -> OctopusPrefilledPost.CTA? {
    guard ctaUrl != nil || ctaLabel != nil else { return nil }
    let trimmedUrl = ctaUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !trimmedUrl.isEmpty,
          let url = URL(string: trimmedUrl)
            ?? trimmedUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed).flatMap(URL.init(string:))
    else {
      throw OctopusPrefilledPost.ValidationError.ctaUrlEmpty
    }
    // An absent label stays an empty auto-translated one, so the native SDK refuses it with
    // `.ctaLabelEmpty` exactly as it refused the empty `String` label before.
    return try OctopusPrefilledPost.CTA(url: url, localizedLabel: ctaLabel ?? .autoTranslated(""))
  }

  /// Reads the `imageUris` array of a prefill payload: `nil` when it is absent or empty, so a
  /// payload without images counts as no prefill at all. Non-string entries are skipped.
  static func readImageUris(_ value: Any?) -> [String]? {
    guard let entries = value as? [Any] else { return nil }
    let uris = entries.compactMap { $0 as? String }
    return uris.isEmpty ? nil : uris
  }

  /// Resolves one `imageUris` entry, following the convention documented on the JS
  /// `OctopusPrefilledPost` type. Returns `nil` when the entry is blank, or when the
  /// resource/file cannot be resolved — mirroring the Android mapper's silent-`nil` behavior
  /// for a not-found resource. Bytes that *are* resolved but do not decode as an image are left
  /// to `OctopusPrefilledPost.init` itself, which throws `.imageInvalid`.
  private static func resolveImageData(_ imageUri: String) -> Data? {
    guard !imageUri.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
    if imageUri.contains("://") {
      guard let url = URL(string: imageUri) else { return nil }
      return try? Data(contentsOf: url)
    }
    return UIImage(named: imageUri)?.pngData()
  }
}

/// The raw, JS-facing prefill fields of a `createPost` payload, as one value so the three places
/// that read them — `navigateToOctopusCreatePost`, the `openUI` initial screen and the embedded
/// view's prop — read the same set. Mirrors the Android `RawPrefilledPost`.
struct RawPrefilledPost {
  let text: String?
  let imageUris: [String]?
  let topicId: String?
  let ctaUrl: String?
  let ctaLabel: String?
  let ctaLabelLanguage: String?
  /// The raw JS `Record<string, string>`; decoded by `ClientObjectMappers.decodeLocalizedText`.
  let ctaLabelTexts: [String: Any]?

  init(_ map: [String: Any]) {
    text = map["text"] as? String
    imageUris = PrefilledPostBuilder.readImageUris(map["imageUris"])
    topicId = map["topicId"] as? String
    ctaUrl = map["ctaUrl"] as? String
    ctaLabel = map["ctaLabel"] as? String
    ctaLabelLanguage = map["ctaLabelLanguage"] as? String
    ctaLabelTexts = map["ctaLabelTexts"] as? [String: Any]
  }

  /// Whether no field is set: a blank editor rather than a prefilled one.
  var isEmpty: Bool {
    text == nil && imageUris == nil && topicId == nil && ctaUrl == nil && ctaLabel == nil
      && ctaLabelLanguage == nil && ctaLabelTexts == nil
  }

  /// See `PrefilledPostBuilder.build`, whose errors it throws.
  func build(
    sign: (@Sendable (_ bridgeFingerprint: String) async throws -> String?)? = nil
  ) throws -> OctopusPrefilledPost {
    try PrefilledPostBuilder.build(
      text: text, imageUris: imageUris, topicId: topicId, ctaUrl: ctaUrl, ctaLabel: ctaLabel,
      ctaLabelLanguage: ctaLabelLanguage, ctaLabelTexts: ctaLabelTexts, sign: sign
    )
  }
}
