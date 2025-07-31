import Octopus

struct ProfileFieldMapper {
  static func fromReactNativeArray(_ appManagedFields: [String]?) -> Set<ConnectionMode.SSOConfiguration.ProfileField> {
    guard let fields = appManagedFields else {
      return []
    }

    var profileFields: Set<ConnectionMode.SSOConfiguration.ProfileField> = []
    for field in fields {
      if let profileField = fromReactNativeString(field) {
        profileFields.insert(profileField)
      }
    }
    return profileFields
  }

  static func fromReactNativeString(_ fieldName: String?) -> ConnectionMode.SSOConfiguration.ProfileField? {
    switch fieldName {
    case "username":
      return .nickname
    case "biography":
      return .bio
    case "profilePicture":
      return .picture
    default:
      return nil
    }
  }

  static func toReactNativeString(_ profileField: ConnectionMode.SSOConfiguration.ProfileField?) -> String? {
    switch profileField {
    case .nickname:
      return "username"
    case .bio:
      return "biography"
    case .picture:
      return "profilePicture"
    default:
      return nil
    }
  }
}
