import Foundation
import Octopus
import OctopusUI

/// Which native view the bridge mounts for a decoded `initialScreen` payload.
///
/// Every case but one is a native `OctopusInitialScreen` handed to `OctopusHomeScreen`. The JS
/// `profile` screen has **no counterpart in the native iOS enum** — iOS ships a separate
/// top-level `OctopusProfileScreen` view for it (Android pushes a `ProfileSummary` /
/// `CurrentUserProfileGraph` destination inside the same NavHost as the other bridge-mode
/// entries). So the decode result has to be able to say "mount a different view", not just
/// "which start screen". Same shape as the Flutter bridge's `BridgeInitialScreen`.
enum BridgeInitialScreen {
  /// Mount `OctopusHomeScreen` with this start screen.
  case home(OctopusInitialScreen)
  /// Mount `OctopusProfileScreen` for this member, or — `nil` — for the connected user's own
  /// (editable) profile.
  case profile(clientUserId: String?)
}

/// Decodes the flat `initialScreen` wire payload produced by the JS `normalizeInitialScreen`
/// (`src/internals/initialScreen.ts`) into the native view the bridge should mount.
///
/// A pure decoder: ids are forwarded exactly as they arrived — the JS producer already trimmed
/// and validated them, and a decoder that also normalized would hide a producer divergence
/// between the two platforms instead of ruling it out. Unknown / structurally impossible
/// payloads (blank required id, activity without exactly one member id) fold to `.mainFeed`
/// with a log rather than crashing the host app.
///
/// The `createPost` type is deliberately **not** handled here: `openUI` decodes it itself so an
/// invalid prefill can reject the promise with the same error codes as
/// `navigateToOctopusCreatePost`, which a fold-to-mainFeed decoder cannot do.
func decodeBridgeInitialScreen(_ map: [String: Any]) -> BridgeInitialScreen {
  func string(_ key: String) -> String? {
    (map[key] as? String)?.nilIfBlank
  }
  switch map["type"] as? String {
  case "mainFeed", nil:
    return .home(.mainFeed)
  case "post":
    guard let postId = string("postId") else {
      NSLog("[OctopusReactNativeSdk] initialScreen.post: missing/blank postId — falling back to mainFeed")
      return .home(.mainFeed)
    }
    return .home(.post(.init(postId: postId)))
  case "group":
    guard let groupId = string("groupId") else {
      NSLog("[OctopusReactNativeSdk] initialScreen.group: missing/blank groupId — falling back to mainFeed")
      return .home(.mainFeed)
    }
    return .home(.group(.init(groupId: groupId)))
  case "activity":
    let profileId = string("profileId")
    let clientUserId = string("clientUserId")
    if let clientUserId, profileId == nil {
      return .home(.activity(.init(clientUserId: clientUserId)))
    }
    if let profileId, clientUserId == nil {
      return .home(.activity(.init(profileId: profileId)))
    }
    NSLog("[OctopusReactNativeSdk] initialScreen.activity: needs exactly one member id — falling back to mainFeed")
    return .home(.mainFeed)
  case "profile":
    // An absent/blank id means the connected user's own profile —
    // `OctopusProfileScreen(clientUserId: nil)`.
    return .profile(clientUserId: string("clientUserId"))
  default:
    NSLog("[OctopusReactNativeSdk] initialScreen: unknown type=\(map["type"] ?? "nil") — falling back to mainFeed")
    return .home(.mainFeed)
  }
}

private extension String {
  /// `nil` when there is nothing but whitespace here, otherwise the string **unchanged** — the
  /// same "missing/blank" test the Android decoder applies. It deliberately does not return the
  /// trimmed value: the JS producer trims, and a decoder that also normalized would hide a
  /// producer divergence between the platforms instead of ruling it out.
  var nilIfBlank: String? {
    trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self
  }
}
