package com.octopuscommunity.octopusreactnativesdk

import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import java.net.URI

internal class ProfilePictureLoadException(cause: Throwable? = null) :
  Exception("Failed to load profile picture", cause)

internal sealed class ProfilePictureInput {
  data class Remote(val url: String) : ProfilePictureInput()
  class Bytes(val data: ByteArray) : ProfilePictureInput()
}

/** Both platforms reject implicit escaping rather than disagreeing about the resulting URL. */
internal fun profilePictureRemoteUrl(picture: String): String {
  require(picture.all { it.code in 33..126 }) { "Profile picture URLs must be URL-encoded" }
  val url = URI(picture)
  require(!url.host.isNullOrEmpty()) { "Missing profile picture URL host" }
  val domain = Regex("[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\\.?")
  require(url.host.startsWith("[") || url.host.matches(domain)) { "Invalid profile picture URL host" }
  require(url.port == -1 || url.port in 0..65535) { "Invalid profile picture URL port" }
  return picture.replaceRange(0, picture.indexOf(':'), url.scheme.lowercase())
}

/** Classifies the normalized input before either platform loads the picture. */
@OptIn(ExperimentalEncodingApi::class)
internal fun parseProfilePictureInput(input: String): ProfilePictureInput? {
  val picture = input.trim()
  if (picture.isEmpty()) return null
  if (picture.startsWith("http://", ignoreCase = true) ||
      picture.startsWith("https://", ignoreCase = true)) {
    return ProfilePictureInput.Remote(profilePictureRemoteUrl(picture))
  }

  val encoded = picture.replace(Regex("^data:image/[^;,]+;base64,", RegexOption.IGNORE_CASE), "")
    .filterNot { it.isWhitespace() }
  // Strip whitespace explicitly rather than letting a permissive decoder discard invalid data.
  require(encoded.isNotEmpty() && encoded.matches(Regex("[A-Za-z0-9+/]*={0,2}"))) {
    "Invalid base64 profile picture"
  }
  val unpadded = encoded.trimEnd('=')
  val padded = unpadded + "=".repeat((4 - unpadded.length % 4) % 4)
  require(encoded.length <= padded.length) { "Invalid base64 padding" }
  val data = Base64.decode(padded)
  require(Base64.encode(data) == padded) { "Non-canonical base64 padding" }
  return ProfilePictureInput.Bytes(data)
}
