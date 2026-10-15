package com.octopuscommunity.octopusreactnativesdk

import java.io.FilterInputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/** Longest a remote image may take to connect, and to deliver each chunk. */
internal const val IMAGE_NETWORK_TIMEOUT_MS = 10_000

/** Longest a remote image may take in total, a server dripping bytes included. */
internal const val IMAGE_NETWORK_DEADLINE_MS = 20_000L

/**
 * Opens [url] and hands its stream to [decode], or returns `null` when the image cannot be
 * had in time.
 *
 * `HttpURLConnection` I/O is blocking and ignores coroutine cancellation, and its read timeout
 * only bounds the silence between two chunks: a server that drips one byte at a time never
 * trips it. So the request is bounded twice, by [connectTimeoutMs]/[readTimeoutMs] and by an
 * overall [deadlineMs], and the connection is disconnected the moment the coroutine is
 * cancelled — the deadline expiring or the caller leaving composition — which is what
 * actually interrupts a read in progress. A failed, timed-out or cancelled load returns
 * `null`; a cancellation of the caller still propagates.
 *
 * [decode] runs on the calling thread, so call this from a background dispatcher.
 * [closerDispatcher] runs the disconnect on cancellation; it is a parameter for tests only.
 */
internal suspend fun <T : Any> fetchRemote(
  url: String,
  deadlineMs: Long = IMAGE_NETWORK_DEADLINE_MS,
  connectTimeoutMs: Int = IMAGE_NETWORK_TIMEOUT_MS,
  readTimeoutMs: Int = IMAGE_NETWORK_TIMEOUT_MS,
  closerDispatcher: CoroutineDispatcher = Dispatchers.Default,
  decode: (InputStream) -> T?
): T? = withTimeoutOrNull(deadlineMs) {
  coroutineScope {
    val connection = URL(url).openConnection().apply {
      connectTimeout = connectTimeoutMs
      readTimeout = readTimeoutMs
    }
    // Parked until the scope is cancelled, then closes the connection from its own thread,
    // which makes the blocked read below fail. Default rather than the caller's dispatcher: it
    // must be able to run while the calling thread is stuck in that read. Undispatched so its
    // try is entered before the read starts: a coroutine cancelled before its first dispatch
    // never runs its body, finally included, and the read would then outlive the cancellation.
    val closer = launch(closerDispatcher, start = CoroutineStart.UNDISPATCHED) {
      try {
        awaitCancellation()
      } finally {
        (connection as? HttpURLConnection)?.disconnect()
      }
    }
    val scope = this
    try {
      // A body that arrives in dribs never trips the idle read timeout, and closing a
      // connection mid-read can itself wait on that read, so the stream also checks between
      // chunks that the load is still wanted.
      CancellableInputStream(connection.getInputStream()) { !scope.isActive }.use(decode)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      null
    } finally {
      closer.cancel()
      (connection as? HttpURLConnection)?.disconnect()
    }
  }
}

/** Fails the next read with an [IOException] once [isCancelled] reports the load is over. */
private class CancellableInputStream(
  delegate: InputStream,
  private val isCancelled: () -> Boolean
) : FilterInputStream(delegate) {
  private fun check() {
    if (isCancelled()) throw IOException("Image load cancelled")
  }

  override fun read(): Int {
    check()
    return super.read()
  }

  override fun read(b: ByteArray, off: Int, len: Int): Int {
    check()
    return super.read(b, off, len)
  }
}
