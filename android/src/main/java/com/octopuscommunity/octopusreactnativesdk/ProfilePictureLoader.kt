package com.octopuscommunity.octopusreactnativesdk

import android.graphics.BitmapFactory
import java.net.URI

internal interface ProfilePictureLookup {
  fun readLocal(uriOrPath: String): ByteArray?
  fun drawableUri(name: String): String?
  fun readAsset(name: String): ByteArray?
}

internal sealed class LoadedProfilePicture {
  data class Remote(val url: String) : LoadedProfilePicture()
  data class Local(val uriOrPath: String) : LoadedProfilePicture()
  class Bytes(val data: ByteArray) : LoadedProfilePicture()
}

/** Every nonblank input either resolves to a picture or throws before the SDK sees the profile. */
internal suspend fun loadProfilePicture(input: String, lookup: ProfilePictureLookup): LoadedProfilePicture? {
  val picture = input.trim()
  if (picture.isEmpty()) return null
  // Fixed diagnostics only: parser/IO exception messages can include the original input.
  var rejectionReason = "Invalid or undecodable base64 image"
  try {
    if (picture.startsWith("http://", true) || picture.startsWith("https://", true)) {
      rejectionReason = "Invalid remote URL"
      val url = profilePictureRemoteUrl(picture)
      return LoadedProfilePicture.Remote(url)
    }
    if (picture.startsWith("file://", true) || picture.startsWith("android.resource://", true) ||
        picture.startsWith("/")) {
      rejectionReason = "Invalid local URI"
      val local = if (picture.startsWith("file://", true)) {
        val uri = URI(picture)
        require(uri.rawAuthority.isNullOrEmpty() && !uri.path.isNullOrEmpty())
        picture.replaceRange(0, 4, "file")
      } else picture
      rejectionReason = "Missing or unreadable local image"
      val data = lookup.readLocal(local)
      if (data == null && picture.startsWith("/9j/")) {
        rejectionReason = "Invalid or undecodable base64 image"
        // JPEG base64 starts with /9j/; a missing path must not hide an encoded image.
        val parsed = parseProfilePictureInput(picture) as ProfilePictureInput.Bytes
        return decodedProfilePicture(parsed.data)
      }
      requireNotNull(data)
      return LoadedProfilePicture.Local(local)
    }
    if (!picture.startsWith("data:", true)) {
      rejectionReason = "Unreadable drawable or asset"
      lookup.drawableUri(picture)?.let { uri ->
        requireNotNull(lookup.readLocal(uri))
        return LoadedProfilePicture.Local(uri)
      }
      lookup.readAsset(picture)?.let {
        return LoadedProfilePicture.Local("file:///android_asset/$picture")
      }
    }
    rejectionReason = "Invalid or undecodable base64 image"
    return when (val parsed = parseProfilePictureInput(picture)) {
      null -> null
      is ProfilePictureInput.Remote -> error("Remote input already handled")
      is ProfilePictureInput.Bytes -> decodedProfilePicture(parsed.data)
    }
  } catch (error: kotlinx.coroutines.CancellationException) {
    throw error
  } catch (error: Exception) {
    throw ProfilePictureLoadException(error, rejectionReason)
  }
}

/** Use the platform decoder's supported formats without allocating the full bitmap. */
private fun decodedProfilePicture(data: ByteArray): LoadedProfilePicture.Bytes {
  val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeByteArray(data, 0, data.size, options)
  require(options.outWidth > 0 && options.outHeight > 0) { "Undecodable profile picture" }
  return LoadedProfilePicture.Bytes(data)
}
