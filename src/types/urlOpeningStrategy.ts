/**
 * Strategy for handling URLs tapped inside the Octopus Community UI.
 *
 * When URL interception is enabled via `openUI({ interceptUrls: true })`,
 * the app receives each tapped URL via `addNavigateToUrlListener`. The callback
 * returns one of these strategies to decide who handles the URL.
 */
export enum UrlOpeningStrategy {
  /**
   * The URL has been handled by the app. The SDK will not open it.
   * Use this when you open the URL in an in-app web view or handle it yourself.
   */
  handledByApp = 'handledByApp',

  /**
   * The URL should be opened by the Octopus SDK (system browser).
   * The native layer will open the URL in the default browser when this is returned.
   */
  handledByOctopus = 'handledByOctopus',
}
