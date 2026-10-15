package com.octopuscommunity.octopusreactnativesdk

import java.io.File
import java.security.MessageDigest

/** Stable URIs avoid re-uploading identical inline pictures. In-flight files stay pinned. */
internal class ProfilePictureCache(private val directory: File) {
  private val active = mutableMapOf<File, Int>()
  private val created = mutableSetOf<File>()
  private var current: File? = null

  @Synchronized
  fun store(data: ByteArray): File {
    check(directory.isDirectory || directory.mkdirs()) { "Cannot create profile picture cache" }
    val hash = MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it) }
    val target = File(directory, "$hash.img")
    if (!target.isFile) {
      val staging = File.createTempFile("picture-", ".tmp", directory)
      try {
        staging.writeBytes(data)
        check(staging.renameTo(target)) { "Cannot store profile picture" }
        created += target
      } finally {
        staging.delete()
      }
    }
    active[target] = (active[target] ?: 0) + 1
    return target
  }

  /** Rotate only after a successful connection, keeping the old avatar on failed attempts. */
  @Synchronized
  fun finish(file: File?, connected: Boolean) {
    file?.let {
      val count = (active[it] ?: 1) - 1
      if (count == 0) active.remove(it) else active[it] = count
    }
    if (connected) {
      current = file
      directory.listFiles()?.filter { it.extension == "img" && it != current && it !in active }
        ?.forEach { if (it.delete()) created.remove(it) }
    } else if (file != null && file in created && file != current && file !in active) {
      if (file.delete()) created.remove(file)
    }
  }
}
