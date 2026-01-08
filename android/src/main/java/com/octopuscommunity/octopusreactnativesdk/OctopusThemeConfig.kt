package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.ReadableMap

data class OctopusThemeConfig(
  val primaryColor: String?,
  val primaryLowContrastColor: String?,
  val primaryHighContrastColor: String?,
  val onPrimaryColor: String?,
  val logoSource: ReadableMap?
)
