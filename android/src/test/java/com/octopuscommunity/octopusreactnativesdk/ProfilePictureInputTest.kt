package com.octopuscommunity.octopusreactnativesdk

import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ProfilePictureInputTest {
  private val png = fixture("avatar.png")
  private fun fixture(name: String): ByteArray = requireNotNull(
    javaClass.getResourceAsStream("/profile-picture-local/$name")
  ).use { it.readBytes() }

  private inner class Lookup : ProfilePictureLookup {
    val local = mutableMapOf<String, ByteArray>()
    val drawables = mutableMapOf<String, String>()
    val assets = mutableMapOf<String, ByteArray>()
    val calls = mutableListOf<String>()
    override fun readLocal(uriOrPath: String): ByteArray? {
      calls += "local:$uriOrPath"
      return local[uriOrPath]
    }
    override fun drawableUri(name: String): String? {
      calls += "drawable:$name"
      return drawables[name]
    }
    override fun readAsset(name: String): ByteArray? {
      calls += "asset:$name"
      return assets[name]
    }
  }

  @Test
  fun `all shared Swift and Kotlin fixtures follow the same contract`() = runBlocking {
    val stream = requireNotNull(javaClass.getResourceAsStream("/profile-picture-cases.tsv"))
    val rows = stream.bufferedReader().use { it.readLines() }.filter { !it.startsWith("#") && it.isNotEmpty() }
    for (row in rows) {
      val columns = row.split('\t')
      val (id, escaped, outcome) = columns
      val input = escaped.replace("\\r", "\r").replace("\\n", "\n").replace("\\t", "\t")
      val lookup = Lookup()
      try {
        val result = loadProfilePicture(input, lookup)
        when (outcome) {
          "empty" -> assertNull(id, result)
          "remote" -> assertEquals(id, LoadedProfilePicture.Remote(columns[3]), result)
          "bytes" -> {
            assertTrue(id, result is LoadedProfilePicture.Bytes)
            val expected = columns[3].chunked(2).map { it.toInt(16).toByte() }.toByteArray()
            assertArrayEquals(id, expected, (result as LoadedProfilePicture.Bytes).data)
          }
          else -> fail("$id must reject, never return a picture or null")
        }
      } catch (error: ProfilePictureLoadException) {
        assertEquals("unexpected rejection: $id", "error", outcome)
      }
    }
    assertEquals(56, rows.size)
  }

  @Test
  fun `missing local files reject before an SDK call can delete the stored avatar`() = runBlocking {
    val lookup = Lookup()
    var sdkCalls = 0
    try {
      val picture = loadProfilePicture("file:///missing.png", lookup)
      sdkCalls += 1
      if (picture == null) fail("A failed picture would delete the stored avatar")
      fail("Must reject instead of calling the SDK")
    } catch (error: ProfilePictureLoadException) {
      assertEquals("Failed to load profile picture", error.message)
    }
    assertEquals(0, sdkCalls)
  }

  @Test
  fun `remote URLs are validated without any bridge download or local lookup`() = runBlocking {
    val lookup = Lookup()
    assertEquals(LoadedProfilePicture.Remote("https://example.com/avatar.png"),
      loadProfilePicture(" HTTPS://example.com/avatar.png ", lookup))
    assertTrue(lookup.calls.isEmpty())
  }

  @Test
  fun `file URI resource URI and absolute path use the local lookup`() = runBlocking {
    for (path in listOf("file:///tmp/avatar.png", "android.resource://example/123", "/tmp/avatar.png")) {
      val lookup = Lookup().apply { local[path] = png }
      assertEquals(LoadedProfilePicture.Local(path), loadProfilePicture(" $path\n", lookup))
      assertEquals(listOf("local:$path"), lookup.calls)
    }
  }

  @Test
  fun `vector drawable name resolves before assets and base64`() = runBlocking {
    val lookup = Lookup().apply {
      drawables["avatar"] = "android.resource://example/123"
      local["android.resource://example/123"] = fixture("avatar-vector.xml")
      assets["avatar"] = png
    }
    assertEquals(LoadedProfilePicture.Local("android.resource://example/123"), loadProfilePicture("avatar", lookup))
    assertEquals(listOf("drawable:avatar", "local:android.resource://example/123"), lookup.calls)
  }

  @Test
  fun `asset lookup follows a missing drawable`() = runBlocking {
    val lookup = Lookup().apply { assets["avatar.bmp"] = fixture("avatar.bmp") }
    assertEquals(LoadedProfilePicture.Local("file:///android_asset/avatar.bmp"), loadProfilePicture(" avatar.bmp ", lookup))
    assertEquals(listOf("drawable:avatar.bmp", "asset:avatar.bmp"), lookup.calls)
  }

  @Test
  fun `base64 follows local lookups but a data URI skips them`() = runBlocking {
    val encoded = java.util.Base64.getEncoder().encodeToString(png)
    for (input in listOf(encoded, "data:image/png;base64,$encoded")) {
      val lookup = Lookup()
      val result = loadProfilePicture(input, lookup) as LoadedProfilePicture.Bytes
      assertArrayEquals(png, result.data)
      if (input.startsWith("data:")) assertTrue(lookup.calls.isEmpty())
      else assertEquals(listOf("drawable:$input", "asset:$input"), lookup.calls)
    }
  }

  @Test
  fun `undecodable base64 rejects before an SDK call can replace the avatar with junk`() = runBlocking {
    for (input in listOf("logo", "user", "icon", "avatar01", "YQ==")) {
      var sdkCalls = 0
      try {
        loadProfilePicture(input, Lookup())
        sdkCalls += 1
        fail("must reject $input before the SDK receives any picture")
      } catch (expected: ProfilePictureLoadException) {
        assertEquals("Failed to load profile picture", expected.message)
      }
      assertEquals(input, 0, sdkCalls)
    }
  }

  @Test
  fun `missing files assets and drawable resources reject instead of yielding null`() = runBlocking {
    for (input in listOf("file:///missing.png", "/missing.png", "/tmp", "missing.png", "avatar", "android.resource://example/missing")) {
      val lookup = Lookup()
      try {
        loadProfilePicture(input, lookup)
        fail("must reject $input")
      } catch (expected: ProfilePictureLoadException) {
        assertEquals("Failed to load profile picture", expected.message)
      }
    }
  }

  @Test
  fun `readable BMP and AVIF files resolve with decoding left to the native SDK`() = runBlocking {
    val lookup = Lookup().apply {
      local["/tmp/avatar.bmp"] = fixture("avatar.bmp")
      local["file:///tmp/avatar.bmp"] = fixture("avatar.bmp")
      local["/tmp/avatar.avif"] = fixture("avatar.avif")
      local["file:///tmp/avatar.avif"] = fixture("avatar.avif")
    }
    for (input in lookup.local.keys) {
      assertEquals(LoadedProfilePicture.Local(input), loadProfilePicture(input, lookup))
    }
  }

  @Test
  fun `empty picture remains absent and never performs lookups`() = runBlocking {
    val lookup = Lookup()
    assertNull(loadProfilePicture(" \t\r\n", lookup))
    assertTrue(lookup.calls.isEmpty())
  }

  @Test
  fun `hash cache reuses URIs rotates old files and protects in-flight connections`() {
    val directory = java.nio.file.Files.createTempDirectory("rn-picture-cache-").toFile()
    try {
      val cache = ProfilePictureCache(directory)
      val first = cache.store(png)
      cache.finish(first, true)
      val same = cache.store(png)
      assertEquals(first.toURI(), same.toURI())
      cache.finish(same, true)
      assertEquals(1, directory.listFiles()!!.size)
      val replacement = cache.store(png + byteArrayOf(1))
      assertTrue("old avatar remains until connection succeeds", first.isFile)
      cache.finish(replacement, true)
      assertFalse(first.exists())
      assertTrue(replacement.isFile)
      val failed = cache.store(png + byteArrayOf(2))
      cache.finish(failed, false)
      assertTrue(replacement.isFile)
      assertFalse(failed.exists())
      val inFlight = cache.store(png + byteArrayOf(3))
      val newer = cache.store(png + byteArrayOf(4))
      cache.finish(newer, true)
      assertTrue("another pending connection still owns its file", inFlight.isFile)
      assertFalse(replacement.exists())
      cache.finish(inFlight, false)
      assertFalse(inFlight.exists())
      assertEquals(listOf(newer), directory.listFiles()!!.toList())
      val restarted = ProfilePictureCache(directory)
      val reused = restarted.store(png + byteArrayOf(4))
      restarted.finish(reused, false)
      assertTrue("failed attempt after restart preserves pre-existing avatar cache", newer.isFile)
    } finally {
      directory.deleteRecursively()
    }
  }
}
