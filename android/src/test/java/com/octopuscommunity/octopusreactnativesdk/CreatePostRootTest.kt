package com.octopuscommunity.octopusreactnativesdk

import androidx.lifecycle.ViewModelStore
import androidx.navigation.NavHostController
import androidx.navigation.compose.ComposeNavigator
import androidx.navigation.compose.composable
import androidx.navigation.createGraph
import androidx.navigation.toRoute
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.ui.OctopusDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class CreatePostRootTest {
  private fun controller(info: CreatePostScreenInfo?) =
    NavHostController(RuntimeEnvironment.getApplication()).apply {
      navigatorProvider.addNavigator(ComposeNavigator())
      setViewModelStore(ViewModelStore())
      graph = createGraph(startDestination = BRIDGE_HOME_ROUTE) {
        composable(BRIDGE_HOME_ROUTE) {}
        composable<OctopusDestination.CreatePost> {}
        composable("nestedScreen") {}
      }.apply { setBridgeInitialDestination(info) }
    }

  @Test
  fun `no initial editor keeps the home feed as the root`() {
    val navController = controller(null)
    assertEquals(BRIDGE_HOME_ROUTE, navController.currentDestination?.route)
    assertNull(navController.previousBackStackEntry)
  }

  @Test
  fun `blank initial editor is the root with no feed underneath`() {
    val navController = controller(CreatePostScreenInfo())
    assertEquals(
      OctopusDestination.CreatePost(),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    )
    // This is the SDK editor's root test for its top-bar and system-back host callback.
    assertNull(navController.previousBackStackEntry)
    assertFalse(navController.popBackStack())
  }

  @Test
  fun `prefill arguments survive selecting the editor as the start destination`() {
    val info = PrefilledPostBuilder.build(
      context = RuntimeEnvironment.getApplication(),
      text = "Draft from the host app / with ? and #",
      imageUri = "file:///tmp/draft.png",
      topicId = "group-1",
      ctaUrl = "https://example.com/item?x=1&y=2#details",
      ctaLabel = "Learn more",
    )
    val navController = controller(info)
    assertEquals(
      OctopusDestination.CreatePost(
        groupId = "group-1",
        prefilledText = "Draft from the host app / with ? and #",
        prefilledImageUri = "file:///tmp/draft.png",
        prefilledCustomActionLabel = "Learn more",
        prefilledCustomActionUrl = "https://example.com/item?x=1&y=2#details",
      ),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    )
    assertNull(navController.previousBackStackEntry)
  }

  @Test
  fun `nested screens still return to the editor without revealing a feed`() {
    val navController = controller(CreatePostScreenInfo())
    navController.navigate("nestedScreen")
    assertEquals(
      OctopusDestination.CreatePost(),
      navController.previousBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    )
    navController.popBackStack()
    assertEquals(
      OctopusDestination.CreatePost(),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    )
    assertNull(navController.previousBackStackEntry)
  }
}
