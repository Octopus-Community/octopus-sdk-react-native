import Octopus

/// Serializes `OctopusCommunityData` to the JS-facing `OctopusCommunityData` shape.
///
/// Unlike the Android mapper, no rename happens here: the native property is already named
/// `profileId`, matching the JS type (see `types/octopusCommunityData.ts`).
struct CommunityDataMapper {

  static func toDictionary(_ data: OctopusCommunityData) -> [String: Any] {
    var map: [String: Any] = [
      "profileId": data.profileId,
      "messageCount": (data.messageCount as Any?) ?? NSNull(),
    ]
    if let gamification = data.gamification {
      map["gamification"] = [
        "level": gamification.level,
        "score": (gamification.score as Any?) ?? NSNull(),
      ]
    } else {
      map["gamification"] = NSNull()
    }
    return map
  }
}
