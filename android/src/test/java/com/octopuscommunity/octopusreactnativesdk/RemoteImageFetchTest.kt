package com.octopuscommunity.octopusreactnativesdk

import java.net.ServerSocket
import java.net.SocketException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import kotlin.concurrent.thread
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `fetchRemote` against a real local socket: an image that arrives is decoded, and a server
 * that hangs or drips bytes is cut off by the overall deadline or by cancellation instead of
 * pinning the caller.
 */
class RemoteImageFetchTest {
  private val servers = mutableListOf<ServerSocket>()

  @After
  fun closeServers() {
    servers.forEach { runCatching { it.close() } }
  }

  /** Serves every connection with [handler], on its own thread; returns the base URL. */
  private fun serve(handler: (java.net.Socket) -> Unit): String {
    val server = ServerSocket(0).also { servers += it }
    thread(isDaemon = true) {
      while (!server.isClosed) {
        val socket = try {
          server.accept()
        } catch (e: SocketException) {
          return@thread
        }
        thread(isDaemon = true) { runCatching { handler(socket) } }
      }
    }
    return "http://127.0.0.1:${server.localPort}/img.png"
  }

  private fun java.net.Socket.readRequestHead() {
    val reader = getInputStream().bufferedReader()
    while (reader.readLine().let { it != null && it.isNotEmpty() }) Unit
  }

  @Test
  fun `decodes the body of a prompt response`() = runBlocking {
    val url = serve { socket ->
      socket.readRequestHead()
      socket.getOutputStream().apply {
        write("HTTP/1.1 200 OK\r\nContent-Length: 5\r\nConnection: close\r\n\r\nhello".toByteArray())
        flush()
      }
      socket.close()
    }
    val body = fetchRemote(url) { it.readBytes().decodeToString() }
    assertEquals("hello", body)
  }

  @Test
  fun `gives up on a server that accepts and never answers`() = runBlocking {
    val url = serve { socket ->
      socket.readRequestHead()
      Thread.sleep(30_000)
    }
    val started = System.nanoTime()
    val body = fetchRemote(url, deadlineMs = 1_000, readTimeoutMs = 30_000) {
      it.readBytes().decodeToString()
    }
    assertNull(body)
    assertTrue("returned after ${elapsedMs(started)} ms", elapsedMs(started) < 5_000)
  }

  @Test
  fun `a drip-fed body does not outlive the overall deadline`() = runBlocking {
    // One byte every 200 ms never lets the 5 s idle read timeout expire.
    val url = serve { socket ->
      socket.readRequestHead()
      val out = socket.getOutputStream()
      out.write("HTTP/1.1 200 OK\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n".toByteArray())
      out.flush()
      repeat(1000) {
        out.write('x'.code)
        out.flush()
        Thread.sleep(200)
      }
    }
    val started = System.nanoTime()
    val body = fetchRemote(url, deadlineMs = 1_000, readTimeoutMs = 5_000) {
      it.readBytes().decodeToString()
    }
    assertNull(body)
    assertTrue("returned after ${elapsedMs(started)} ms", elapsedMs(started) < 5_000)
  }

  @Test
  fun `cancelling the caller interrupts a read in progress`() = runBlocking {
    val url = serve { socket ->
      socket.readRequestHead()
      Thread.sleep(30_000)
    }
    val job = async(Dispatchers.IO, start = CoroutineStart.DEFAULT) {
      fetchRemote(url, deadlineMs = 60_000, readTimeoutMs = 30_000) {
        it.readBytes().decodeToString()
      }
    }
    delay(500)
    val started = System.nanoTime()
    job.cancel()
    job.join()
    assertTrue("cancel took ${elapsedMs(started)} ms", elapsedMs(started) < 5_000)
  }

  @Test
  fun `cancelling before the closer is first dispatched still interrupts the read`() = runBlocking {
    val url = serve { socket ->
      socket.readRequestHead()
      Thread.sleep(30_000)
    }
    // The closer's only thread is busy until released, as when Dispatchers.Default is saturated.
    val release = CountDownLatch(1)
    val executor = Executors.newSingleThreadExecutor()
    executor.execute { release.await() }
    val busy = executor.asCoroutineDispatcher()
    try {
      val job = async(Dispatchers.IO) {
        fetchRemote(url, deadlineMs = 60_000, readTimeoutMs = 30_000, closerDispatcher = busy) {
          it.readBytes().decodeToString()
        }
      }
      delay(500)
      val started = System.nanoTime()
      job.cancel()
      release.countDown()
      job.join()
      assertTrue("cancel took ${elapsedMs(started)} ms", elapsedMs(started) < 5_000)
    } finally {
      release.countDown()
      busy.close()
    }
  }

  private fun elapsedMs(startedNanos: Long) = (System.nanoTime() - startedNanos) / 1_000_000
}
