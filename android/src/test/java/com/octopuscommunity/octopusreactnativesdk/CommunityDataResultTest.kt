package com.octopuscommunity.octopusreactnativesdk

import com.facebook.react.bridge.Promise
import com.octopuscommunity.sdk.domain.network.OctopusResult
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class CommunityDataResultTest {
  private val calls = mutableListOf<Pair<String, List<Any?>>>()
  private val promise = Proxy.newProxyInstance(
    Promise::class.java.classLoader,
    arrayOf(Promise::class.java)
  ) { _, method, args ->
    calls += method.name to (args?.toList() ?: emptyList())
    null
  } as Promise

  @Test
  fun `a successful unknown-member lookup resolves null`() {
    CommunityDataMapper.resolveFetchResult(OctopusResult.Success(null), promise)
    assertEquals(listOf("resolve" to listOf(null)), calls)
  }

  @Test
  fun `lookup failures reject with the iOS error code and a useful message`() {
    val failures = listOf(
      OctopusResult.Failure.NoNetwork to "No network",
      OctopusResult.Failure.UserNotAuthenticated() to "User not authenticated",
      OctopusResult.Failure.UserNotAuthenticated("expired") to "expired",
      OctopusResult.Failure.PermissionDenied() to "Permission denied",
      OctopusResult.Failure.PermissionDenied("private") to "private",
      OctopusResult.Failure.ContentUnavailable to "Content unavailable",
      OctopusResult.Failure.StatusError(503, "Unavailable", Exception()) to "Unavailable",
      OctopusResult.Failure.StatusError(503, null, Exception()) to "Server error 503"
    )
    for ((failure, message) in failures) {
      calls.clear()
      CommunityDataMapper.resolveFetchResult(failure, promise)
      assertEquals(1, calls.size)
      assertEquals("reject", calls.single().first)
      assertEquals("SERVER_ERROR", calls.single().second[0])
      assertEquals(message, calls.single().second[1])
      val cause = (failure as? OctopusResult.Failure.StatusError)?.exception
      assertSame(cause, calls.single().second[2])
    }
  }
}
