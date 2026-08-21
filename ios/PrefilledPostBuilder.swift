import Foundation
import UIKit
import Octopus

/// Builds an `OctopusPrefilledPost` from the raw, JS-facing prefill fields handled by
/// `OctopusReactNativeSdk.navigateToOctopusCreatePost`. Mirrors the Android
/// `PrefilledPostBuilder`'s `imageUri` resolution convention documented on the JS
/// `OctopusPrefilledPost` type — a bare name with no scheme resolves to a bundled image, anything
/// else (expected to be a `file://` URI) is read from disk.
struct PrefilledPostBuilder {

  /// - Parameter sign: Signs this prefilled share so a community that forbids member pictures
  ///   accepts its image. `nil` — the default — leaves the share unsigned, which is what the
  ///   native SDK did before this feature existed. Supplied from
  ///   `OctopusBridgeShareTokenBroker` only when JS registered a signer.
  /// - Throws: `OctopusPrefilledPost.ValidationError` when the prefill payload is invalid.
  static func build(
    text: String?,
    imageUri: String?,
    topicId: String?,
    ctaUrl: String?,
    ctaLabel: String?,
    sign: (@Sendable (_ bridgeFingerprint: String) async throws -> String)? = nil
  ) throws -> OctopusPrefilledPost {
    let cta = try resolveCTA(url: ctaUrl, label: ctaLabel)
    return try OctopusPrefilledPost(
      text: text,
      image: resolveImageData(imageUri),
      topicId: topicId,
      cta: cta,
      sign: sign
    )
  }

  /// Builds the CTA only when at least one of `ctaUrl` / `ctaLabel` was supplied. A missing or
  /// unparseable `ctaUrl` is reported as `.ctaUrlEmpty` — the closest existing validation error,
  /// since `URL(string:)` cannot represent an empty URL to let `OctopusPrefilledPost.CTA.init`
  /// throw it natively the way the Android mapper's `Uri.parse` can.
  private static func resolveCTA(url ctaUrl: String?, label ctaLabel: String?) throws -> OctopusPrefilledPost.CTA? {
    guard ctaUrl != nil || ctaLabel != nil else { return nil }
    let trimmedUrl = ctaUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !trimmedUrl.isEmpty,
          let url = URL(string: trimmedUrl)
            ?? trimmedUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed).flatMap(URL.init(string:))
    else {
      throw OctopusPrefilledPost.ValidationError.ctaUrlEmpty
    }
    return try OctopusPrefilledPost.CTA(url: url, label: ctaLabel ?? "")
  }

  /// Resolves the `imageUri` convention documented on the JS `OctopusPrefilledPost` type. Returns
  /// `nil` when `imageUri` is `nil`/blank, or when the resource/file cannot be resolved —
  /// mirroring the Android mapper's silent-`nil` behavior for a not-found resource. Bytes that
  /// *are* resolved but do not decode as an image are left to `OctopusPrefilledPost.init` itself,
  /// which throws `.imageInvalid`.
  private static func resolveImageData(_ imageUri: String?) -> Data? {
    guard let imageUri, !imageUri.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
    if imageUri.contains("://") {
      guard let url = URL(string: imageUri) else { return nil }
      return try? Data(contentsOf: url)
    }
    return UIImage(named: imageUri)?.pngData()
  }
}
