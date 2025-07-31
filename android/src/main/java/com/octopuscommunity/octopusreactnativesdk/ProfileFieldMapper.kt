package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableArray
import com.octopuscommunity.sdk.domain.model.ProfileField

object ProfileFieldMapper {

  fun fromReactNativeArray(appManagedFields: ReadableArray?): Set<ProfileField> {
    if (appManagedFields == null) {
      return emptySet()
    }

    val profileFields = mutableSetOf<ProfileField>()
    for (i in 0 until appManagedFields.size()) {
      fromReactNativeString(appManagedFields.getString(i))?.let { profileField ->
        profileFields.add(profileField)
      }
    }
    return profileFields
  }

  fun fromReactNativeString(fieldName: String?): ProfileField? {
    return when (fieldName) {
      "username" -> ProfileField.NICKNAME
      "biography" -> ProfileField.BIO
      "profilePicture" -> ProfileField.AVATAR
      else -> null
    }
  }

  fun toReactNativeString(profileField: ProfileField?): String? {
    return when (profileField) {
      ProfileField.NICKNAME -> "username"
      ProfileField.BIO -> "biography"
      ProfileField.AVATAR -> "profilePicture"
      else -> null
    }
  }
}
