import UIKit

/// A utility class for creating UIColor instances from hex strings.
/// This avoids conflicts with other modules that might also extend UIColor.
internal class OctopusColorUtility {
  
  /// Creates a UIColor from a hex string.
  /// - Parameter hex: A hex color string (e.g., "#FF0000", "FF0000", "#FFF", etc.)
  /// - Returns: A UIColor instance, or nil if the hex string is invalid
  static func color(fromHex hex: String) -> UIColor? {
    // Remove any whitespace and convert to lowercase
    let hex = hex.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    
    // Remove # prefix if present
    let cleanHex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    
    // Validate hex string contains only valid characters
    guard cleanHex.range(of: "^[0-9a-f]+$", options: .regularExpression) != nil else {
      return nil
    }
    
    var int: UInt64 = 0
    Scanner(string: cleanHex).scanHexInt64(&int)
    
    let a, r, g, b: UInt64
    switch cleanHex.count {
    case 3: // RGB (12-bit)
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6: // RGB (24-bit)
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8: // ARGB (32-bit)
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      return nil
    }

    return UIColor(
      red: CGFloat(r) / 255,
      green: CGFloat(g) / 255,
      blue: CGFloat(b) / 255,
      alpha: CGFloat(a) / 255
    )
  }
}
