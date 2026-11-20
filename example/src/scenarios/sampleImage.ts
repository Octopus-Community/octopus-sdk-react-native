import { Platform } from 'react-native';

/**
 * Name of the bundled sample image used by the "bundled image" presets. Resolved
 * as a native bundled resource by {@link navigateToOctopusCreatePost} (see the
 * `OctopusPrefilledPost.imageUris` doc comment): a bare name with no scheme resolves as an
 * Android drawable resource / an iOS asset-catalog image with that name. The two platforms
 * stage this sample asset under different, convention-mandated names — Android drawable names
 * must be lowercase snake_case, the iOS asset-catalog entry here is PascalCase — so this picks
 * the right one per platform instead of passing one literal for both.
 */
export const BUNDLED_SAMPLE_IMAGE_NAME = Platform.select({
  ios: 'OctopusSampleImage',
  default: 'octopus_sample_image',
});

/** A stable demo-CDN image, the remote image the other samples' bridge posts carry too. */
export const REMOTE_SAMPLE_IMAGE_URL =
  'https://media-content-demo.octocdn.net/misc/macarons.jpeg';

/** `count` copies of the bundled sample image, for the several-photos presets. */
export const bundledSamplePhotos = (count: number): string[] =>
  Array.from({ length: count }, () => BUNDLED_SAMPLE_IMAGE_NAME);
