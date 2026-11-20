package com.octopuscommunity.octopusreactnativesdk

import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.octopuscommunity.sdk.domain.model.ClientUser
import com.octopuscommunity.sdk.domain.model.Resource
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.domain.repository.ClientUserError
import com.octopuscommunity.sdk.domain.repository.ConnectionRepository.ConnectionState
import java.io.File
import java.io.IOException
import java.lang.reflect.Proxy
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import org.robolectric.annotation.LooperMode
import org.robolectric.util.ReflectionHelpers

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34], shadows = [SSOTestArguments::class])
@LooperMode(LooperMode.Mode.PAUSED)
class OctopusSSOAuthenticatorTest {
  private val context = BridgeReactContext(RuntimeEnvironment.getApplication())
  private val authenticators = mutableListOf<OctopusSSOAuthenticator>()
  private val releases = mutableListOf<CountDownLatch>()
  private val requests = CopyOnWriteArrayList<String>()
  private val connectedUsers = CopyOnWriteArrayList<String>()

  private class Result {
    val calls = CopyOnWriteArrayList<Pair<String, List<Any?>>>()
    val threads = CopyOnWriteArrayList<Thread>()
    val promise = Proxy.newProxyInstance(
      Promise::class.java.classLoader, arrayOf(Promise::class.java)
    ) { _, method, args ->
      if (method.name == "resolve" || method.name == "reject") {
        threads += Thread.currentThread()
        calls += method.name to (args?.toList() ?: emptyList())
      }
      null
    } as Promise

    fun assertRejected(code: String = "CONNECT_USER_ERROR") {
      assertEquals(1, calls.size)
      assertEquals("reject", calls.single().first)
      assertEquals(code, calls.single().second[0])
    }

    fun assertResolved() {
      assertEquals(listOf("resolve"), calls.map { it.first })
    }
  }

  private fun authenticator(
    pictureLoader: (suspend (String, (File) -> Unit) -> Resource?)? = null,
    disconnect: suspend () -> Unit = {},
    connect: suspend (ClientUser, suspend () -> String) -> OctopusResult<ConnectionState, ClientUserError> =
      { user, _ ->
        connectedUsers += user.userId
        OctopusResult.Success(ConnectionState.NotConnected)
      }
  ) = OctopusSSOAuthenticator(context, requests::add, connect, disconnect, pictureLoader)
    .also { authenticators += it }

  private fun params(user: String, picture: Boolean = false) = JavaOnlyMap.of("userId", user).apply {
    if (picture) putMap("profile", JavaOnlyMap.of("profilePicture", "avatar"))
  }

  private fun initializeOptions() = JavaOnlyMap.of(
    "apiKey", "test-key", "connectionMode", JavaOnlyMap.of("type", "sso"),
    "sdkVersion", "test-version"
  )

  private fun module(initializer: OctopusSDKInitializer, auth: OctopusSSOAuthenticator) =
    OctopusReactModule(context).also {
      ReflectionHelpers.setField(it, "sdkInitializer", initializer)
      ReflectionHelpers.setField(it, "ssoAuthenticator", auth)
    }

  private fun await(condition: () -> Boolean) {
    val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10)
    while (!condition() && System.nanoTime() < deadline) {
      shadowOf(Looper.getMainLooper()).idle()
      Thread.sleep(5)
    }
    assertTrue("Timed out waiting for SSO work", condition())
  }

  @After
  fun tearDown() {
    releases.forEach { it.countDown() }
    authenticators.forEach { it.dispose() }
    shadowOf(Looper.getMainLooper()).idle()
  }

  private fun suspendedAvatar(
    endSession: (OctopusSSOAuthenticator) -> Unit, reload: Boolean = false,
    cancellationCode: String = "CONNECT_USER_ERROR"
  ) {
    val entered = CountDownLatch(1)
    val release = CountDownLatch(1).also { releases += it }
    val exited = CountDownLatch(1)
    val stale = authenticator(pictureLoader = { _, _ ->
      // Deliberately non-cooperative IO: teardown must not let it connect on return.
      entered.countDown()
      check(release.await(10, TimeUnit.SECONDS))
      exited.countDown()
      Resource.Remote("https://example.com/avatar.png")
    })
    val oldResult = Result()
    stale.connectUser(params("old-user", picture = true), oldResult.promise)
    shadowOf(Looper.getMainLooper()).idle()
    assertTrue(entered.await(10, TimeUnit.SECONDS))
    endSession(stale)

    val current = if (reload) authenticator() else stale
    val newResult = Result()
    current.connectUser(params("new-user"), newResult.promise)
    await { newResult.calls.isNotEmpty() }
    newResult.assertResolved()
    release.countDown()
    assertTrue(exited.await(10, TimeUnit.SECONDS))
    await { oldResult.calls.isNotEmpty() }
    oldResult.assertRejected(cancellationCode)
    assertEquals(listOf("new-user"), connectedUsers)
    assertTrue(requests.isEmpty())
  }

  @Test
  fun `logout during avatar IO prevents the old connect and allows a new user`() {
    suspendedAvatar({ auth ->
      val logout = Result()
      auth.disconnectUser(logout.promise)
      await { logout.calls.isNotEmpty() }
      logout.assertResolved()
      // A later generic teardown must not overwrite the old session's logout reason.
      auth.endSession()
    }, cancellationCode = "TOKEN_REQUEST_CANCELLED")
  }

  @Test
  fun `switch reset and stop invalidate avatar preparation before native work`() {
    for (operation in listOf("switch", "reset", "stop")) {
      connectedUsers.clear()
      val module = OctopusReactModule(context)
      try {
        suspendedAvatar({ auth ->
          ReflectionHelpers.setField(module, "ssoAuthenticator", auth)
          val result = Result()
          // Invalid config stops before SDK setup. No community or API key is used.
          when (operation) {
            "switch" -> module.switchCommunity(JavaOnlyMap.of(
              "apiKey", "test-key", "connectionMode", JavaOnlyMap.of("type", "unknown")
            ), result.promise)
            "reset" -> module.reset(result.promise)
            else -> module.stop(result.promise)
          }
          await { result.calls.isNotEmpty() }
        })
      } finally {
        module.invalidate()
      }
    }
  }

  @Test
  fun `React invalidate cancels avatar IO and the replacement module can connect`() {
    val module = OctopusReactModule(context)
    suspendedAvatar({ auth ->
      ReflectionHelpers.setField(module, "ssoAuthenticator", auth)
      module.invalidate()
    }, reload = true)
  }

  @Test
  fun `disconnect cancels pending tokens with the documented code and late answers cannot settle a new request`() {
    val tokens = mutableListOf<String>()
    val auth = authenticator(connect = { user, provider ->
      val token = provider()
      tokens += "${user.userId}:$token"
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    val oldResult = Result()
    auth.connectUser(params("old-user"), oldResult.promise)
    await { requests.size == 1 }
    val oldId = requests.single()
    val logout = Result()
    auth.disconnectUser(logout.promise)
    await { oldResult.calls.isNotEmpty() }
    oldResult.assertRejected("TOKEN_REQUEST_CANCELLED")
    val newResult = Result()
    auth.connectUser(params("new-user"), newResult.promise)
    await { requests.size == 2 }
    auth.completeTokenRequest(oldId, "old-token")
    shadowOf(Looper.getMainLooper()).idle()
    assertTrue(newResult.calls.isEmpty())
    auth.completeTokenRequest(requests.last(), "new-token")
    await { newResult.calls.isNotEmpty() }
    newResult.assertResolved()
    oldResult.assertRejected("TOKEN_REQUEST_CANCELLED")
    logout.assertResolved()
    assertEquals(listOf("new-user:new-token"), tokens)
  }

  @Test
  fun `retained token provider rejects after session change without emitting a request`() {
    lateinit var retained: suspend () -> String
    val auth = authenticator(connect = { _, provider ->
      retained = provider
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    val result = Result()
    auth.connectUser(params("old-user"), result.promise)
    await { result.calls.isNotEmpty() }
    auth.endSession()
    val scope = CoroutineScope(Dispatchers.Main)
    try {
      var cancelled = false
      val request = scope.async {
        try {
          retained()
        } catch (error: CancellationException) {
          cancelled = true
        }
      }
      await { request.isCompleted }
      assertTrue(cancelled)
      assertTrue(requests.isEmpty())
    } finally {
      scope.cancel()
    }
  }

  @Test
  fun `dispose cancels a pending retained SDK provider and ignores its late answer`() {
    lateinit var retained: suspend () -> String
    val auth = authenticator(connect = { _, provider ->
      retained = provider
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    val connection = Result()
    auth.connectUser(params("old-user"), connection.promise)
    await { connection.calls.isNotEmpty() }
    val scope = CoroutineScope(Dispatchers.Main)
    var tokenReturned = false
    try {
      val request = scope.async {
        try {
          retained()
          tokenReturned = true
        } catch (error: CancellationException) {
          // The SDK invokes its retained provider from an independent scope.
        }
      }
      await { requests.size == 1 }
      auth.dispose()
      auth.completeTokenRequest(requests.single(), "late-token")
      await { request.isCompleted }
      assertFalse(tokenReturned)
      val pending: Map<*, *> = ReflectionHelpers.getField(auth, "pendingTokenRequests")
      assertTrue(pending.isEmpty())
      connection.assertResolved()
    } finally {
      scope.cancel()
    }
  }

  @Test
  fun `invalidate before a queued connect starts settles it and rejects later connects`() {
    val auth = authenticator()
    val queued = Result()
    auth.connectUser(params("queued"), queued.promise)
    auth.dispose()
    val after = Result()
    auth.connectUser(params("after-reload"), after.promise)
    await { queued.calls.isNotEmpty() && after.calls.isNotEmpty() }
    queued.assertRejected()
    after.assertRejected()
    assertTrue(connectedUsers.isEmpty())
    assertTrue(requests.isEmpty())
  }

  @Test
  fun `logout before a queued connect starts preserves TOKEN_REQUEST_CANCELLED`() {
    val auth = authenticator()
    val connection = Result()
    val logout = Result()
    auth.connectUser(params("queued"), connection.promise)
    auth.disconnectUser(logout.promise)
    await { connection.calls.isNotEmpty() && logout.calls.isNotEmpty() }
    connection.assertRejected("TOKEN_REQUEST_CANCELLED")
    logout.assertResolved()
    assertTrue(connectedUsers.isEmpty())
  }

  @Test
  fun `same configuration initialize preserves a pending connect including UI option changes`() {
    var initialized = false
    val initializer = OctopusSDKInitializer({ _, _, _, _ -> initialized = true }, { initialized })
    val auth = authenticator(connect = { _, provider ->
      assertEquals("current-token", provider())
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    val module = module(initializer, auth)
    try {
      val initial = Result()
      module.initialize(initializeOptions(), initial.promise)
      initial.assertResolved()
      val connection = Result()
      auth.connectUser(params("current-user"), connection.promise)
      await { requests.size == 1 }
      val invalid = Result()
      module.initialize(JavaOnlyMap(), invalid.promise)
      invalid.assertRejected("INITIALIZE_ERROR")
      val repeated = Result()
      module.initialize(initializeOptions().apply { putString("colorScheme", "dark") }, repeated.promise)
      repeated.assertResolved()
      shadowOf(Looper.getMainLooper()).idle()
      assertTrue(connection.calls.isEmpty())
      auth.completeTokenRequest(requests.single(), "current-token")
      await { connection.calls.isNotEmpty() }
      connection.assertResolved()
    } finally {
      module.invalidate()
    }
  }

  @Test
  fun `changed configuration and stopped native SDK cancel pending connects before initialization`() {
    for (change in listOf("apiKey", "managedFields", "apiServer", "stopped")) {
      requests.clear()
      var initialized = false
      var replacing = false
      val auth = authenticator(connect = { _, provider ->
        provider()
        OctopusResult.Success(ConnectionState.NotConnected)
      })
      val initializer = OctopusSDKInitializer({ _, _, _, _ ->
        if (replacing) {
          val pending: Map<*, *> = ReflectionHelpers.getField(auth, "pendingTokenRequests")
          assertTrue("Old requests must be cancelled before replacing the container", pending.isEmpty())
        }
        initialized = true
      }, { initialized })
      val module = module(initializer, auth)
      try {
        val initial = Result()
        module.initialize(initializeOptions(), initial.promise)
        initial.assertResolved()
        val connection = Result()
        auth.connectUser(params("old-user"), connection.promise)
        await { requests.size == 1 }
        val nextOptions = initializeOptions().apply {
          when (change) {
            "apiKey" -> putString("apiKey", "other-test-key")
            "managedFields" -> putMap("connectionMode", JavaOnlyMap.of(
              "type", "sso", "appManagedFields", JavaOnlyArray.of("username")
            ))
            "apiServer" -> putMap("apiServer", JavaOnlyMap.of("host", "127.0.0.1"))
            else -> initialized = false
          }
        }
        replacing = true
        val replacement = Result()
        module.initialize(nextOptions, replacement.promise)
        replacement.assertResolved()
        await { connection.calls.isNotEmpty() }
        connection.assertRejected()
      } finally {
        module.invalidate()
      }
    }
  }

  @Test
  fun `double logout before dispatch shares the native disconnect and both promises resolve`() {
    var disconnects = 0
    val auth = authenticator(disconnect = { disconnects += 1 })
    val first = Result()
    val second = Result()
    auth.disconnectUser(first.promise)
    auth.disconnectUser(second.promise)
    await { first.calls.isNotEmpty() && second.calls.isNotEmpty() }
    first.assertResolved()
    second.assertResolved()
    assertEquals(1, disconnects)
  }

  @Test
  fun `connect B waits for suspended logout and remains the final connected user`() {
    val entered = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val events = mutableListOf<String>()
    var nativeUser: String? = "user-A"
    val auth = authenticator(disconnect = {
      events += "logout:start"
      entered.complete(Unit)
      release.await()
      nativeUser = null
      events += "logout:end"
    }, connect = { user, _ ->
      nativeUser = user.userId
      events += "connect:${user.userId}"
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    try {
      val logout = Result()
      auth.disconnectUser(logout.promise)
      await { entered.isCompleted }
      val connection = Result()
      auth.connectUser(params("user-B"), connection.promise)
      shadowOf(Looper.getMainLooper()).idle()
      assertTrue(connection.calls.isEmpty())
      assertEquals(listOf("logout:start"), events)
      assertEquals("user-A", nativeUser)
      release.complete(Unit)
      await { logout.calls.isNotEmpty() && connection.calls.isNotEmpty() }
      logout.assertResolved()
      connection.assertResolved()
      assertEquals("user-B", nativeUser)
      assertEquals(listOf("logout:start", "logout:end", "connect:user-B"), events)
    } finally {
      release.complete(Unit)
    }
  }

  @Test
  fun `logout after connect B succeeds runs a new native disconnect and leaves no user connected`() {
    val entered = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val events = mutableListOf<String>()
    var disconnects = 0
    var nativeUser: String? = "user-A"
    val auth = authenticator(disconnect = {
      disconnects += 1
      events += "logout:$disconnects"
      if (disconnects == 1) {
        entered.complete(Unit)
        release.await()
      }
      nativeUser = null
    }, connect = { user, _ ->
      nativeUser = user.userId
      events += "connect:${user.userId}"
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    try {
      val firstLogout = Result()
      auth.disconnectUser(firstLogout.promise)
      await { entered.isCompleted }
      val connection = Result()
      auth.connectUser(params("user-B"), connection.promise)
      release.complete(Unit)
      await { firstLogout.calls.isNotEmpty() && connection.calls.isNotEmpty() }
      firstLogout.assertResolved()
      connection.assertResolved()
      assertEquals("user-B", nativeUser)
      val secondLogout = Result()
      auth.disconnectUser(secondLogout.promise)
      await { secondLogout.calls.isNotEmpty() }
      secondLogout.assertResolved()
      assertEquals(null, nativeUser)
      assertEquals(2, disconnects)
      assertEquals(listOf("logout:1", "connect:user-B", "logout:2"), events)
    } finally {
      release.complete(Unit)
    }
  }

  @Test
  fun `failed logout reports its own error and two subsequent connects succeed`() {
    val auth = authenticator(disconnect = { throw IOException("Logout IO failed") })
    val logout = Result()
    auth.disconnectUser(logout.promise)
    await { logout.calls.isNotEmpty() }
    logout.assertRejected("DISCONNECT_USER_ERROR")

    for (userId in listOf("user-B", "user-C")) {
      val connection = Result()
      auth.connectUser(params(userId), connection.promise)
      await { connection.calls.isNotEmpty() }
      connection.assertResolved()
      assertNull(ReflectionHelpers.getField<Any?>(auth, "disconnectTask"))
    }
    assertEquals(listOf("user-B", "user-C"), connectedUsers)
    logout.assertRejected("DISCONNECT_USER_ERROR")
  }

  @Test
  fun `connect waiting for a failed logout succeeds after teardown finishes`() {
    val entered = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val auth = authenticator(disconnect = {
      entered.complete(Unit)
      release.await()
      throw IllegalStateException("Native container closed")
    })
    try {
      val logout = Result()
      auth.disconnectUser(logout.promise)
      await { entered.isCompleted }
      val connection = Result()
      auth.connectUser(params("user-B"), connection.promise)
      shadowOf(Looper.getMainLooper()).idle()
      assertTrue(connection.calls.isEmpty())
      assertTrue(connectedUsers.isEmpty())
      release.complete(Unit)
      await { logout.calls.isNotEmpty() && connection.calls.isNotEmpty() }
      logout.assertRejected("DISCONNECT_USER_ERROR")
      connection.assertResolved()
      assertEquals(listOf("user-B"), connectedUsers)
      assertNull(ReflectionHelpers.getField<Any?>(auth, "disconnectTask"))
    } finally {
      release.complete(Unit)
    }
  }

  @Test
  fun `double logout in the same generation shares a suspended native disconnect`() {
    val entered = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    var disconnects = 0
    val auth = authenticator(disconnect = {
      disconnects += 1
      entered.complete(Unit)
      release.await()
    })
    try {
      val first = Result()
      val second = Result()
      auth.disconnectUser(first.promise)
      await { entered.isCompleted }
      auth.disconnectUser(second.promise)
      shadowOf(Looper.getMainLooper()).idle()
      assertEquals(1, disconnects)
      assertTrue(first.calls.isEmpty())
      assertTrue(second.calls.isEmpty())
      release.complete(Unit)
      await { first.calls.isNotEmpty() && second.calls.isNotEmpty() }
      first.assertResolved()
      second.assertResolved()
      assertEquals(1, disconnects)
    } finally {
      release.complete(Unit)
    }
  }

  @Test
  fun `logout after a waiting connect gets its own disconnect after the old logout finishes`() {
    val entered = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val events = mutableListOf<String>()
    var disconnects = 0
    var connects = 0
    val auth = authenticator(disconnect = {
      disconnects += 1
      events += "logout:$disconnects:start"
      if (disconnects == 1) {
        entered.complete(Unit)
        release.await()
      }
      events += "logout:$disconnects:end"
    }, connect = { _, _ ->
      connects += 1
      OctopusResult.Success(ConnectionState.NotConnected)
    })
    try {
      val first = Result()
      auth.disconnectUser(first.promise)
      await { entered.isCompleted }
      val connection = Result()
      auth.connectUser(params("user-B"), connection.promise)
      shadowOf(Looper.getMainLooper()).idle()
      val second = Result()
      auth.disconnectUser(second.promise)
      await { connection.calls.isNotEmpty() }
      connection.assertRejected("TOKEN_REQUEST_CANCELLED")
      assertEquals(1, disconnects)
      assertTrue(second.calls.isEmpty())
      release.complete(Unit)
      await { first.calls.isNotEmpty() && second.calls.isNotEmpty() }
      first.assertResolved()
      second.assertResolved()
      assertEquals(0, connects)
      assertEquals(listOf("logout:1:start", "logout:1:end", "logout:2:start", "logout:2:end"), events)
    } finally {
      release.complete(Unit)
    }
  }

  @Test
  fun `suspended logout completes across stop initialize switch and React invalidation`() {
    for (operation in listOf("stop", "initialize", "switch", "invalidate")) {
      val entered = CompletableDeferred<Unit>()
      val release = CompletableDeferred<Unit>()
      var disconnects = 0
      val auth = authenticator(disconnect = {
        disconnects += 1
        entered.complete(Unit)
        release.await()
      })
      val initializer = OctopusSDKInitializer({ _, _, _, _ -> }, { false })
      val module = module(initializer, auth)
      try {
        val first = Result()
        auth.disconnectUser(first.promise)
        await { entered.isCompleted }
        val lifecycle = Result()
        when (operation) {
          "stop" -> module.stop(lifecycle.promise)
          "initialize" -> module.initialize(initializeOptions(), lifecycle.promise)
          "switch" -> module.switchCommunity(JavaOnlyMap.of(
            "apiKey", "test-key", "connectionMode", JavaOnlyMap.of("type", "unknown")
          ), lifecycle.promise)
          else -> module.invalidate()
        }
        if (operation != "invalidate") await { lifecycle.calls.isNotEmpty() }
        val second = Result()
        auth.disconnectUser(second.promise)
        shadowOf(Looper.getMainLooper()).idle()
        assertTrue(first.calls.isEmpty())
        assertTrue(second.calls.isEmpty())
        release.complete(Unit)
        await { first.calls.isNotEmpty() && second.calls.isNotEmpty() }
        first.assertResolved()
        second.assertResolved()
        assertEquals(2, disconnects)
      } finally {
        release.complete(Unit)
        module.invalidate()
      }
    }
  }

  @Test
  fun `logout is idempotent after the native SDK has stopped`() {
    val auth = OctopusSSOAuthenticator(context, OctopusEventEmitter(context))
      .also { authenticators += it }
    repeat(2) {
      val result = Result()
      auth.disconnectUser(result.promise)
      await { result.calls.isNotEmpty() }
      result.assertResolved()
    }
  }

  @Test
  fun `initialize and stop settle on the native module caller thread without a Main dispatch`() {
    val initializationThreads = CopyOnWriteArrayList<Thread>()
    val initializer = OctopusSDKInitializer({ _, _, _, _ ->
      initializationThreads += Thread.currentThread()
    }, { false })
    val module = module(initializer, authenticator())
    val executor = Executors.newSingleThreadExecutor()
    try {
      executor.submit {
        val caller = Thread.currentThread()
        assertFalse(caller === Looper.getMainLooper().thread)
        val initial = Result()
        module.initialize(initializeOptions(), initial.promise)
        initial.assertResolved()
        assertEquals(listOf(caller), initializationThreads)
        assertEquals(listOf(caller), initial.threads)
        val stopped = Result()
        module.stop(stopped.promise)
        stopped.assertResolved()
        assertEquals(listOf(caller), stopped.threads)
      }.get(10, TimeUnit.SECONDS)
    } finally {
      executor.shutdownNow()
      module.invalidate()
    }
  }
}

// The module starts its state collector in init. JVM tests have no React JNI runtime;
// preserve event construction while substituting its native map allocation only.
@Implements(Arguments::class)
class SSOTestArguments {
  companion object {
    @JvmStatic
    @Implementation
    fun createMap(): WritableMap = JavaOnlyMap()
  }
}
