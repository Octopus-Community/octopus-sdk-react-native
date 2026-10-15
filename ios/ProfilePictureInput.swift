import Foundation
import ImageIO

enum ProfilePictureInput {
  case remote(URL)
  case bytes(Data)
  case local(URL)

  enum ParseError: Error {
    case invalidPicture
  }

  /// Classifies the normalized input before either platform loads the picture.
  static func parse(_ input: String) throws -> ProfilePictureInput? {
    let picture = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !picture.isEmpty else { return nil }
    let lowercased = picture.lowercased()
    if lowercased.hasPrefix("http://") || lowercased.hasPrefix("https://") {
      guard picture.unicodeScalars.allSatisfy({ (33...126).contains($0.value) }),
            let url = URL(string: picture), let host = url.host, !host.isEmpty,
            url.absoluteString == picture else {
        throw ParseError.invalidPicture
      }
      let domain = "^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\\.?$"
      let port = url.port ?? 0
      guard (host.contains(":") || host.range(of: domain, options: .regularExpression) != nil),
            (0...65535).contains(port) else { throw ParseError.invalidPicture }
      let normalized = lowercased.hasPrefix("https://") ? "https://" + picture.dropFirst(8) : "http://" + picture.dropFirst(7)
      guard let normalizedURL = URL(string: normalized) else { throw ParseError.invalidPicture }
      return .remote(normalizedURL)
    }
    // Keep the published local-file input contract while accepting base64 as well.
    if lowercased.hasPrefix("file://") {
      guard let url = URL(string: picture), url.absoluteString == picture,
            (url.host ?? "").isEmpty, !url.path.isEmpty else { throw ParseError.invalidPicture }
      return .local(url)
    }
    if picture.hasPrefix("/9j/") && !FileManager.default.fileExists(atPath: picture),
       let data = try? decodeBase64(picture) {
      // JPEG base64 starts with /9j/; a missing path must not hide a valid encoded image.
      return .bytes(data)
    }
    if picture.hasPrefix("/") || FileManager.default.fileExists(atPath: picture) {
      return .local(URL(fileURLWithPath: picture))
    }
    return .bytes(try decodeBase64(picture))
  }

  private static func decodeBase64(_ picture: String) throws -> Data {
    let encoded = picture.replacingOccurrences(
      of: "^data:image/[^;,]+;base64,", with: "", options: [.regularExpression, .caseInsensitive]
    ).components(separatedBy: .whitespacesAndNewlines).joined()
    guard !encoded.isEmpty,
          encoded.range(of: "^[A-Za-z0-9+/]*={0,2}$", options: .regularExpression) != nil else {
      throw ParseError.invalidPicture
    }
    let unpadded = String(encoded.prefix { $0 != "=" })
    let padded = unpadded + String(repeating: "=", count: (4 - unpadded.utf8.count % 4) % 4)
    guard encoded.count <= padded.count, let data = Data(base64Encoded: padded),
          data.base64EncodedString() == padded else {
      throw ParseError.invalidPicture
    }
    return try decodedImageData(data)
  }

  /// Use the platform's real decoder so supported formats are not limited by a signature list.
  private static func decodedImageData(_ data: Data) throws -> Data {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil),
          CGImageSourceGetCount(source) > 0,
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
          image.width > 0, image.height > 0 else {
      throw ParseError.invalidPicture
    }
    return data
  }

  static func load(
    _ input: String,
    loadRemote: (URL) async throws -> (Data, URLResponse),
    logFailure: () -> Void
  ) async throws -> Data? {
    do {
      switch try parse(input) {
      case nil: return nil
      case .remote(let url):
        let (data, response) = try await loadRemote(url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
          throw ParseError.invalidPicture
        }
        return try decodedImageData(data)
      case .bytes(let data): return data
      case .local(let url):
        return try await Task.detached(priority: .userInitiated) {
          try decodedImageData(Data(contentsOf: url))
        }.value
      }
    } catch {
      logFailure()
      throw error
    }
  }
}
