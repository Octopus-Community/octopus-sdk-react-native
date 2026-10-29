package com.octopuscommunity.octopusreactnativesdk

import androidx.lifecycle.ViewModelStore
import androidx.navigation.NavHostController
import androidx.navigation.compose.ComposeNavigator
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import androidx.navigation.createGraph
import androidx.navigation.toRoute
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.ui.OctopusDestination
import com.octopuscommunity.sdk.ui.components.NavigationIconType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * Every bridge initial screen is the NavHost root, with no main feed underneath (iso iOS): the
 * native SDK then routes its back icon and system back to the host `onBack` instead of revealing
 * a feed.
 */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class InitialScreenRootTest {
  private fun controller(
    screen: BridgeInitialScreen?,
    createPostInfo: CreatePostScreenInfo? = null,
  ) = NavHostController(RuntimeEnvironment.getApplication()).apply {
    navigatorProvider.addNavigator(ComposeNavigator())
    setViewModelStore(ViewModelStore())
    graph = createGraph(startDestination = BRIDGE_HOME_ROUTE) {
      composable(BRIDGE_HOME_ROUTE) {}
      composable<OctopusDestination.CreatePost> {}
      composable<OctopusDestination.PostDetails> {}
      composable<OctopusDestination.GroupDetails> {}
      composable<OctopusDestination.Activity> {}
      composable<OctopusDestination.ProfileSummary> {}
      navigation<OctopusDestination.CurrentUserProfileGraph>(
        startDestination = OctopusDestination.CurrentUserProfileSummary()
      ) {
        composable<OctopusDestination.CurrentUserProfileSummary> {}
      }
      composable("nestedScreen") {}
    }.apply { setBridgeInitialDestination(createPostInfo, screen) }
  }

  private fun NavHostController.assertIsRoot() {
    assertNull(previousBackStackEntry)
    assertFalse(popBackStack())
  }

  @Test
  fun `no initial screen keeps the home feed as the root`() {
    val navController = controller(null)
    assertEquals(BRIDGE_HOME_ROUTE, navController.currentDestination?.route)
    navController.assertIsRoot()
  }

  @Test
  fun `post is the root with the client-app origin`() {
    val navController = controller(BridgeInitialScreen.Post("post-1"))
    assertEquals(
      OctopusDestination.PostDetails(
        postId = "post-1",
        origin = OctopusDestination.Origin.CLIENT_APP,
      ),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.PostDetails>()
    )
    navController.assertIsRoot()
  }

  @Test
  fun `group is the root with the client-app origin`() {
    val navController = controller(BridgeInitialScreen.Group("group-1"))
    assertEquals(
      OctopusDestination.GroupDetails(
        groupId = "group-1",
        origin = OctopusDestination.Origin.CLIENT_APP,
      ),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.GroupDetails>()
    )
    navController.assertIsRoot()
  }

  @Test
  fun `member activity by profile id or client user id is the root`() {
    val byProfile = controller(BridgeInitialScreen.MemberActivity("profile-1", null))
    assertEquals(
      OctopusDestination.Activity(userId = "profile-1"),
      byProfile.currentBackStackEntry!!.toRoute<OctopusDestination.Activity>()
    )
    byProfile.assertIsRoot()

    val byClient = controller(BridgeInitialScreen.MemberActivity(null, "client-1"))
    assertEquals(
      OctopusDestination.Activity(clientUserId = "client-1"),
      byClient.currentBackStackEntry!!.toRoute<OctopusDestination.Activity>()
    )
    byClient.assertIsRoot()
  }

  @Test
  fun `member profile by client user id is the root`() {
    val navController = controller(BridgeInitialScreen.Profile("client-1"))
    assertEquals(
      OctopusDestination.ProfileSummary(clientUserId = "client-1"),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.ProfileSummary>()
    )
    navController.assertIsRoot()
  }

  @Test
  fun `current user profile graph is the root`() {
    val navController = controller(BridgeInitialScreen.Profile(null))
    assertEquals(
      OctopusDestination.CurrentUserProfileSummary(),
      navController.currentBackStackEntry!!
        .toRoute<OctopusDestination.CurrentUserProfileSummary>()
    )
    navController.assertIsRoot()
  }

  @Test
  fun `the editor wins over another initial screen`() {
    val navController = controller(BridgeInitialScreen.Post("post-1"), CreatePostScreenInfo())
    assertEquals(
      OctopusDestination.CreatePost(),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.CreatePost>()
    )
    navController.assertIsRoot()
  }

  @Test
  fun `nested screens return to the initial screen without revealing a feed`() {
    val navController = controller(BridgeInitialScreen.Post("post-1"))
    navController.navigate("nestedScreen")
    assertTrue(navController.popBackStack())
    assertEquals(
      "post-1",
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.PostDetails>().postId
    )
    navController.assertIsRoot()
  }

  @Test
  fun `the root is restored after the native root pop empties the stack`() {
    val screens = listOf(
      null,
      BridgeInitialScreen.Post("post-1"),
      BridgeInitialScreen.Group("group-1"),
      BridgeInitialScreen.MemberActivity(null, "client-1"),
      BridgeInitialScreen.Profile("client-1"),
      BridgeInitialScreen.Profile(null),
    )
    for (screen in screens) {
      val navController = controller(screen)
      val rootRoute = navController.currentDestination?.route
      // What the native NavigateUp does at its root before calling the host onBack.
      assertFalse(navController.popBackStack())
      assertNull(navController.currentBackStackEntry)

      navController.restoreBridgeRoot(bridgeStartRoute(null, screen))
      assertEquals(rootRoute, navController.currentDestination?.route)
      assertNull(navController.previousBackStackEntry)

      // A no-op while the stack is not empty.
      navController.restoreBridgeRoot(bridgeStartRoute(null, screen))
      assertNull(navController.previousBackStackEntry)
    }
  }

  @Test
  fun `the restored post root keeps its arguments`() {
    val navController = controller(BridgeInitialScreen.Post("post-1"))
    navController.popBackStack()
    navController.restoreBridgeRoot(bridgeStartRoute(null, BridgeInitialScreen.Post("post-1")))
    assertEquals(
      OctopusDestination.PostDetails(
        postId = "post-1",
        origin = OctopusDestination.Origin.CLIENT_APP,
      ),
      navController.currentBackStackEntry!!.toRoute<OctopusDestination.PostDetails>()
    )
  }

  @Test
  fun `root feed forwards system back only to a listening host behind a visible icon`() {
    assertTrue(forwardsRootFeedBack(true, true, true, null))
    assertTrue(forwardsRootFeedBack(true, true, false, NavigationIconType.Close))
    // No JS handler: the event would go unheard, so back stays with the host.
    assertFalse(forwardsRootFeedBack(false, true, true, NavigationIconType.Close))
    // No icon on the feed (e.g. a tab root): back stays with the host.
    assertFalse(forwardsRootFeedBack(true, true, false, null))
    // No top app bar at all.
    assertFalse(forwardsRootFeedBack(true, false, true, NavigationIconType.Back))
  }
}
