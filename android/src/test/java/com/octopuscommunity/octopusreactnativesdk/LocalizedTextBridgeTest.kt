package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import androidx.lifecycle.ViewModelStore
import androidx.navigation.NavHostController
import androidx.navigation.compose.ComposeNavigator
import androidx.navigation.compose.composable
import androidx.navigation.createGraph
import androidx.navigation.toRoute
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.domain.model.OctopusLocalizedText
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost
import com.octopuscommunity.sdk.ui.OctopusDestination
import java.lang.reflect.Proxy
import java.util.Locale
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * Per-language button labels: the flat wire fields of the JS `OctopusLocalizedText`, decoded
 * into the native one for the prefilled post's CTA and the client post's button, and the
 * native validation errors mapped to their `LOCALIZED_TEXT_…` codes.
 */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class LocalizedTextBridgeTest {
  private val context get() = RuntimeEnvironment.getApplication()

  private val texts = mapOf("en" to "Read", "fr" to "Lire", "zh-Hant-TW" to "閱讀")

  // region decodeLocalizedText

  @Test
  fun `no field at all is no text`() {
    assertNull(decodeLocalizedText(text = null, language = null, texts = null))
  }

  @Test
  fun `a text alone is auto-translated`() {
    assertEquals(
      OctopusLocalizedText.AutoTranslated("Read"),
      decodeLocalizedText(text = "Read", language = null, texts = null)
    )
  }

  @Test
  fun `a language or texts make it per language, with each tag parsed as a language tag`() {
    val decoded = decodeLocalizedText(text = null, language = "en", texts = texts)
      as OctopusLocalizedText.PerLanguage

    assertEquals("en", decoded.defaultLanguageCode)
    assertEquals(texts, decoded.textsByLanguageCode)
    assertEquals(Locale.forLanguageTag("zh-Hant-TW"), decoded.texts.keys.last())
  }

  @Test
  fun `the native validation decides, with its own reasons`() {
    assertEquals(
      OctopusLocalizedText.ValidationError.EmptyTexts,
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(text = null, language = "en", texts = emptyMap())
      }
    )
    assertEquals(
      OctopusLocalizedText.ValidationError.BlankText("fr"),
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(text = null, language = "en", texts = mapOf("en" to "Read", "fr" to " "))
      }
    )
    assertEquals(
      OctopusLocalizedText.ValidationError.EmptyLanguage,
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(text = null, language = "en", texts = mapOf("en" to "Read", "" to "?"))
      }
    )
    assertEquals(
      OctopusLocalizedText.ValidationError.DefaultLanguageMissing("en-US"),
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(text = null, language = "en-US", texts = mapOf("en" to "Read"))
      }
    )
  }

  @Test
  fun `an underscore is read as a hyphen, and nothing else is converted`() {
    assertEquals(Locale.forLanguageTag("pt-BR"), languageTagLocale("pt_BR"))
    assertEquals(Locale.forLanguageTag("zh-Hant-TW"), languageTagLocale("zh_Hant_TW"))
    assertEquals(Locale.forLanguageTag("en-US"), languageTagLocale("en-US"))
    assertEquals(Locale.forLanguageTag("es-419"), languageTagLocale("es-419"))

    val decoded = decodeLocalizedText(
      text = null,
      language = "pt_BR",
      texts = mapOf("pt_BR" to "Ler", "en" to "Read"),
    ) as OctopusLocalizedText.PerLanguage
    assertEquals(setOf(Locale.forLanguageTag("en"), Locale.forLanguageTag("pt-BR")), decoded.texts.keys)
    assertEquals("pt-BR", decoded.defaultLanguageCode)
  }

  @Test
  fun `a tag with an underscore and its hyphenated form are a duplicate`() {
    assertEquals(
      OctopusLocalizedText.ValidationError.DuplicateLanguage("pt-BR"),
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(
          text = null,
          language = "pt-BR",
          texts = mapOf("pt-BR" to "Ler", "pt_BR" to "Ler também")
        )
      }
    )
  }

  @Test
  fun `tags without a language are an empty language, not a duplicate`() {
    for (texts in listOf(
      mapOf("" to "a", "und" to "b", "en" to "c"),
      mapOf("en" to "c", "und" to "b", "" to "a"),
      mapOf("x" to "a", "123" to "b", "en" to "c"),
    )) {
      assertEquals(
        OctopusLocalizedText.ValidationError.EmptyLanguage,
        assertThrows(OctopusLocalizedText.ValidationError::class.java) {
          decodeLocalizedText(text = null, language = "en", texts = texts)
        }
      )
    }
  }

  @Test
  fun `the duplicate reported does not depend on the order of the texts`() {
    val forward = linkedMapOf("pt-BR" to "Ler", "pt_BR" to "Ler", "en-US" to "Read", "en-us" to "Read")
    val backward = LinkedHashMap(forward.entries.reversed().associate { it.toPair() })
    for (texts in listOf(forward, backward)) {
      assertEquals(
        OctopusLocalizedText.ValidationError.DuplicateLanguage("en-US"),
        assertThrows(OctopusLocalizedText.ValidationError::class.java) {
          decodeLocalizedText(text = null, language = "en-US", texts = texts)
        }
      )
    }
  }

  @Test
  fun `two tags giving one locale are a duplicate, not a silent overwrite`() {
    assertEquals(
      OctopusLocalizedText.ValidationError.DuplicateLanguage("en-US"),
      assertThrows(OctopusLocalizedText.ValidationError::class.java) {
        decodeLocalizedText(
          text = null,
          language = "en-US",
          texts = mapOf("en-US" to "Read", "en-us" to "Read too")
        )
      }
    )
  }

  @Test
  fun `every native reason has its code and, when it names one, its language`() {
    val cases = listOf(
      OctopusLocalizedText.ValidationError.EmptyTexts to ("LOCALIZED_TEXT_EMPTY_TEXTS" to null),
      OctopusLocalizedText.ValidationError.BlankText("fr") to ("LOCALIZED_TEXT_BLANK_TEXT" to "fr"),
      OctopusLocalizedText.ValidationError.EmptyLanguage to ("LOCALIZED_TEXT_EMPTY_LANGUAGE" to null),
      OctopusLocalizedText.ValidationError.DuplicateLanguage("en") to
        ("LOCALIZED_TEXT_DUPLICATE_LANGUAGE" to "en"),
      OctopusLocalizedText.ValidationError.DefaultLanguageMissing("pt-BR") to
        ("LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING" to "pt-BR"),
    )
    for ((error, expected) in cases) {
      assertEquals(expected.first, error.toBridgeErrorCode())
      assertEquals(expected.second, error.faultyLanguageCode)
    }
  }

  // endregion

  // region Client post

  private fun clientPost(vararg extra: Pair<String, Any?>): JavaOnlyMap {
    val map = JavaOnlyMap.of("objectId", "article-1", "text", "A long enough post text.")
    for ((key, value) in extra) {
      when (value) {
        null -> map.putNull(key)
        is String -> map.putString(key, value)
        is Map<*, *> -> map.putMap(key, JavaOnlyMap().apply {
          value.forEach { (k, v) -> putString(k as String, v as String) }
        })
        else -> error("unsupported value for $key")
      }
    }
    return map
  }

  @Test
  fun `the deprecated button text is still an auto-translated button`() {
    val post = ClientObjectBridge.decodeClientPost(context, clientPost("viewObjectButtonText" to "Read"))

    assertEquals(OctopusLocalizedText.AutoTranslated("Read"), post.viewObjectButton)
    assertEquals("Read", post.viewObjectButtonText)
  }

  @Test
  fun `a per-language button reaches the native client post`() {
    val post = ClientObjectBridge.decodeClientPost(
      context,
      clientPost(
        "viewObjectButtonText" to null,
        "viewObjectButtonLanguage" to "fr",
        "viewObjectButtonTexts" to texts
      )
    )

    val button = post.viewObjectButton as OctopusLocalizedText.PerLanguage
    assertEquals("fr", button.defaultLanguageCode)
    assertEquals(texts, button.textsByLanguageCode)
    assertEquals("Lire", post.viewObjectButtonText)
  }

  @Test
  fun `an invalid per-language button throws the native reason, not INVALID_ARGS`() {
    val error = assertThrows(OctopusLocalizedText.ValidationError::class.java) {
      ClientObjectBridge.decodeClientPost(
        context,
        clientPost("viewObjectButtonLanguage" to "de", "viewObjectButtonTexts" to texts)
      )
    }

    assertEquals(OctopusLocalizedText.ValidationError.DefaultLanguageMissing("de"), error)
  }

  @Test
  fun `no button field is no button`() {
    assertNull(ClientObjectBridge.decodeClientPost(context, clientPost()).viewObjectButton)
  }

  // endregion

  // region Prefilled post

  @Test
  fun `a per-language CTA label reaches the native prefilled post`() {
    val info = PrefilledPostBuilder.build(
      context = context,
      text = null,
      imageUris = null,
      topicId = null,
      ctaUrl = "https://example.com",
      ctaLabel = null,
      ctaLabelLanguage = "en",
      ctaLabelTexts = texts,
    )

    val label = info.prefilledPost?.cta?.localizedLabel as OctopusLocalizedText.PerLanguage
    assertEquals("en", label.defaultLanguageCode)
    assertEquals(texts, label.textsByLanguageCode)
    assertEquals("Read", info.prefilledPost?.cta?.label)
  }

  @Test
  fun `the plain CTA label stays auto-translated`() {
    val info = PrefilledPostBuilder.build(context, null, null, null, "https://example.com", "Read")

    assertEquals(OctopusLocalizedText.AutoTranslated("Read"), info.prefilledPost?.cta?.localizedLabel)
  }

  @Test
  fun `a CTA with no label is still refused as an empty label`() {
    assertThrows(OctopusPrefilledPost.ValidationError.CtaLabelEmpty::class.java) {
      PrefilledPostBuilder.build(context, null, null, null, "https://example.com", null)
    }
  }

  @Test
  fun `the raw prefill survives the Intent extras of the fullscreen activity`() {
    val raw = RawPrefilledPost.read(
      JavaOnlyMap.of(
        "text", "Draft",
        "ctaUrl", "https://example.com",
        "ctaLabel", null,
        "ctaLabelLanguage", "en",
        "ctaLabelTexts", JavaOnlyMap().apply { texts.forEach { (k, v) -> putString(k, v) } },
      )
    )
    val intent = Intent()

    raw.putExtras(intent)

    assertEquals(raw, RawPrefilledPost.fromIntent(intent))
  }

  @Test
  fun `an invalid label is rejected with its code and its language in userInfo`() {
    val error = assertThrows(OctopusLocalizedText.ValidationError::class.java) {
      RawPrefilledPost(
        ctaUrl = "https://example.com",
        ctaLabelLanguage = "en",
        ctaLabelTexts = mapOf("en" to " "),
      ).build(context)
    }
    var rejection: List<Any?>? = null
    val promise = Proxy.newProxyInstance(
      Promise::class.java.classLoader,
      arrayOf(Promise::class.java)
    ) { _, method, args ->
      if (method.name == "reject") rejection = args?.toList()
      null
    } as Promise

    // A JavaOnlyMap: the default `Arguments.createMap()` needs React Native's native libraries,
    // which a JVM test does not load.
    promise.rejectLocalizedText(error, JavaOnlyMap())

    assertEquals("LOCALIZED_TEXT_BLANK_TEXT", rejection?.get(0))
    assertEquals("en", (rejection?.get(3) as JavaOnlyMap).getString("languageCode"))
  }

  @Test
  fun `the editor route carries the default language and the other labels`() {
    val info = PrefilledPostBuilder.build(
      context = context,
      text = null,
      imageUris = null,
      topicId = null,
      ctaUrl = "https://example.com",
      ctaLabel = null,
      ctaLabelLanguage = "fr",
      ctaLabelTexts = texts,
    )
    val navController = NavHostController(context).apply {
      navigatorProvider.addNavigator(ComposeNavigator())
      setViewModelStore(ViewModelStore())
      graph = createGraph(startDestination = BRIDGE_HOME_ROUTE) {
        composable(BRIDGE_HOME_ROUTE) {}
        composable<OctopusDestination.CreatePost> {}
      }.apply { setBridgeInitialDestination(info) }
    }

    val route = navController.currentBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    assertEquals("Lire", route.prefilledCustomActionLabel)
    assertEquals("fr", route.prefilledCustomActionLabelLanguage)
    val translations = JSONObject(route.prefilledCustomActionLabelTranslations!!)
    assertEquals(setOf("en", "zh-Hant-TW"), translations.keys().asSequence().toSet())
    assertEquals("閱讀", translations.getString("zh-Hant-TW"))
  }

  @Test
  fun `an auto-translated label adds nothing to the editor route`() {
    val info = PrefilledPostBuilder.build(context, null, null, null, "https://example.com", "Read")

    val route = bridgeStartRoute(info, null) as OctopusDestination.CreatePost
    assertNull(route.prefilledCustomActionLabelLanguage)
    assertNull(route.prefilledCustomActionLabelTranslations)
  }

  // endregion
}
