package com.octopuscommunity.octopusreactnativesdk

/**
 * Parsed representation of the JS `topAppBar` config.
 *
 * @property titleType "logo", "text", or null (omitted → logo default)
 * @property titleText custom title text when [titleType] is "text"
 * @property centered true → centered title; false → leading
 * @property coloredBackground true → primary color as nav-bar background
 */
data class OctopusTopAppBarConfig(
  val titleType: String?,
  val titleText: String?,
  val centered: Boolean,
  val coloredBackground: Boolean
)
