import Foundation

/// Parsed representation of the JS `topAppBar` config.
struct OctopusTopAppBarConfig {
  /// "logo", "text", or nil (omitted → logo default).
  let titleType: String?
  /// Custom title text when `titleType` is "text".
  let titleText: String?
  /// true → centered title; false → leading.
  let centered: Bool
  /// true → primary color as nav-bar background (iOS 16+).
  let coloredBackground: Bool
}
