package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.repository.ClientPostError
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The 1.16 multi-photo wiring: the prefilled post's `imageUris` and the client post's `medias`,
 * decoded from the JS payload into the native models.
 */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class MultiPhotoBridgeTest {
  private val context get() = RuntimeEnvironment.getApplication()

  private fun photos(count: Int) = (0 until count).map { "file:///tmp/photo-$it.jpg" }

  private fun jsArray(values: List<Any?>) = JavaOnlyArray.from(values)

  // region Prefilled post

  @Test
  fun `readImageUris is null when the key is absent, null or empty`() {
    assertNull(PrefilledPostBuilder.readImageUris(null))
    assertNull(PrefilledPostBuilder.readImageUris(JavaOnlyMap()))
    assertNull(PrefilledPostBuilder.readImageUris(JavaOnlyMap.of("imageUris", null)))
    assertNull(PrefilledPostBuilder.readImageUris(JavaOnlyMap.of("imageUris", jsArray(emptyList()))))
  }

  @Test
  fun `readImageUris keeps the strings in order and skips null entries`() {
    val map = JavaOnlyMap.of("imageUris", jsArray(listOf("a", null, "b")))

    assertEquals(listOf("a", "b"), PrefilledPostBuilder.readImageUris(map))
  }

  @Test
  fun `build passes every image to the native prefilled post, in order`() {
    val info = PrefilledPostBuilder.build(context, null, photos(10), null, null, null)

    assertEquals(photos(10).map(Uri::parse), info.prefilledPost?.images)
  }

  @Test
  fun `build drops blank entries and bare names that match no drawable`() {
    val info = PrefilledPostBuilder.build(
      context, null, listOf(" ", "no_such_drawable", "file:///tmp/kept.jpg"), null, null, null
    )

    assertEquals(listOf(Uri.parse("file:///tmp/kept.jpg")), info.prefilledPost?.images)
  }

  @Test
  fun `build refuses more images than a post carries with the native TooManyImagesError`() {
    val error = assertThrows(OctopusPrefilledPost.TooManyImagesError::class.java) {
      PrefilledPostBuilder.build(context, null, photos(11), null, null, null)
    }

    assertEquals(10, error.max)
    assertEquals(11, error.count)
  }

  @Test
  fun `navigateToOctopusCreatePost forwards the images to the Activity as a string list`() {
    var launched: Intent? = null
    val reactContext = object : BridgeReactContext(context) {
      override fun startActivity(intent: Intent) {
        launched = intent
      }
    }
    val outcome = RecordingPromise()

    OctopusReactModule(reactContext).navigateToOctopusCreatePost(
      JavaOnlyMap.of("imageUris", jsArray(photos(3))),
      outcome.promise
    )

    assertNull(outcome.rejectedCode)
    assertNotNull(launched)
    assertEquals(
      photos(3),
      launched!!.getStringArrayListExtra(OctopusActivity.EXTRA_CREATE_POST_IMAGE_URIS)
    )
  }

  @Test
  fun `navigateToOctopusCreatePost rejects too many images without opening the UI`() {
    var launched: Intent? = null
    val reactContext = object : BridgeReactContext(context) {
      override fun startActivity(intent: Intent) {
        launched = intent
      }
    }
    val outcome = RecordingPromise()

    OctopusReactModule(reactContext).navigateToOctopusCreatePost(
      JavaOnlyMap.of("imageUris", jsArray(photos(11))),
      outcome.promise
    )

    assertEquals("NAVIGATE_TO_CREATE_POST_ERROR", outcome.rejectedCode)
    assertNull(launched)
  }

  // endregion

  // region Client post

  private fun clientPostMap(vararg extra: Pair<String, Any?>): JavaOnlyMap {
    val map = JavaOnlyMap.of("objectId", "article-1", "text", "A long enough post text.")
    for ((key, value) in extra) {
      when (value) {
        null -> map.putNull(key)
        is JavaOnlyMap -> map.putMap(key, value)
        is JavaOnlyArray -> map.putArray(key, value)
        else -> error("unsupported value for $key")
      }
    }
    return map
  }

  private fun remote(url: String) = JavaOnlyMap.of("type", "remoteImage", "url", url)

  private fun local(uri: String) = JavaOnlyMap.of("type", "localImage", "uri", uri)

  @Test
  fun `decodeClientPost maps medias in order and leaves the deprecated attachment unset`() {
    val post = ClientObjectBridge.decodeClientPost(
      context,
      clientPostMap(
        "attachment" to null,
        "medias" to jsArray(listOf(remote("https://example.com/a.jpg"), local("file:///tmp/b.jpg")))
      )
    )

    assertEquals(
      listOf(Resource.Remote(url = "https://example.com/a.jpg"), Resource.Local(uri = Uri.parse("file:///tmp/b.jpg"))),
      post.medias
    )
    @Suppress("DEPRECATION")
    assertNull(post.attachment)
  }

  @Test
  fun `decodeClientPost turns the deprecated attachment into the only media when medias is absent`() {
    val post = ClientObjectBridge.decodeClientPost(
      context,
      clientPostMap("attachment" to remote("https://example.com/a.jpg"), "medias" to null)
    )

    // What the native SDK reads either way: `images` is `medias`, else the attachment.
    assertEquals(listOf(Resource.Remote(url = "https://example.com/a.jpg")), post.medias)
    assertEquals(listOf(Resource.Remote(url = "https://example.com/a.jpg")), post.images)
  }

  @Test
  fun `decodeClientPost refuses attachment together with medias`() {
    assertThrows(IllegalArgumentException::class.java) {
      ClientObjectBridge.decodeClientPost(
        context,
        clientPostMap(
          "attachment" to remote("https://example.com/a.jpg"),
          "medias" to jsArray(listOf(remote("https://example.com/b.jpg")))
        )
      )
    }
  }

  @Test
  fun `decodeClientPost names the unresolvable media by its index`() {
    val error = assertThrows(IllegalArgumentException::class.java) {
      ClientObjectBridge.decodeClientPost(
        context,
        clientPostMap(
          "medias" to jsArray(listOf(remote("https://example.com/a.jpg"), local("no_such_drawable")))
        )
      )
    }

    assertTrue(error.message!!.startsWith("medias[1].uri could not be resolved"))
  }

  @Test
  fun `decodeClientPost forwards more medias than a post carries, for the native SDK to refuse`() {
    val post = ClientObjectBridge.decodeClientPost(
      context,
      clientPostMap("medias" to jsArray((0 until 11).map { remote("https://example.com/$it.jpg") }))
    )

    assertEquals(11, post.medias.size)
  }

  @Test
  fun `the native refusal of too many medias reaches JS as CLIENT_POST_ERROR`() {
    assertEquals(
      "CLIENT_POST_ERROR",
      ClientPostError.FileError.Unknown("too many medias").toBridgeErrorCode()
    )
  }

  // endregion

  /** A [Promise] that records the rejection code and fails nothing on its own. */
  private class RecordingPromise {
    var rejectedCode: String? = null

    val promise: Promise = Proxy.newProxyInstance(
      Promise::class.java.classLoader,
      arrayOf(Promise::class.java)
    ) { _, method, args ->
      if (method.name == "reject") rejectedCode = args?.firstOrNull() as? String
      null
    } as Promise
  }
}
