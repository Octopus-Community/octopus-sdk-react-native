package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.JavaOnlyMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DebugOverrideMappersTest {
  @Test
  fun `null clears the override`() {
    assertNull(DebugOverrideMappers.toContentOptions(null))
  }

  @Test
  fun `absent or null tap flags default to false while creation stays enabled`() {
    for (map in listOf(
      JavaOnlyMap(),
      JavaOnlyMap.of("postImageTapOpensPost", null, "postGroupNameTapOpensGroup", null),
    )) {
      val options = DebugOverrideMappers.toContentOptions(map)!!
      assertFalse(options.post.imageTapOpensPost)
      assertFalse(options.post.groupNameTapOpensGroup)
      assertTrue(options.post.enablePictures)
      assertTrue(options.post.enablePolls)
      assertTrue(options.post.textRequired)
      assertTrue(options.comment.enablePictures)
      assertTrue(options.reply.enablePictures)
    }
  }

  @Test
  fun `tap flags forward independently and preserve explicit creation overrides`() {
    for (image in listOf(false, true)) {
      for (group in listOf(false, true)) {
        val options = DebugOverrideMappers.toContentOptions(JavaOnlyMap.of(
          "postImageTapOpensPost", image,
          "postGroupNameTapOpensGroup", group,
          "postEnablePictures", false,
          "postEnablePolls", false,
          "postTextRequired", false,
          "commentEnablePictures", false,
          "replyEnablePictures", false,
        ))!!
        assertEquals(image, options.post.imageTapOpensPost)
        assertEquals(group, options.post.groupNameTapOpensGroup)
        assertFalse(options.post.enablePictures)
        assertFalse(options.post.enablePolls)
        assertFalse(options.post.textRequired)
        assertFalse(options.comment.enablePictures)
        assertFalse(options.reply.enablePictures)
      }
    }
  }

  @Test
  fun `a single enabled tap flag leaves its absent sibling false`() {
    val image = DebugOverrideMappers.toContentOptions(JavaOnlyMap.of("postImageTapOpensPost", true))!!.post
    assertTrue(image.imageTapOpensPost)
    assertFalse(image.groupNameTapOpensGroup)
    val group = DebugOverrideMappers.toContentOptions(JavaOnlyMap.of("postGroupNameTapOpensGroup", true))!!.post
    assertFalse(group.imageTapOpensPost)
    assertTrue(group.groupNameTapOpensGroup)
  }
}
