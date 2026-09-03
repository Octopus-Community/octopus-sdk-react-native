# Theming

Match the Octopus UI to your app's branding: colors, fonts, logo and navigation bar,
with light/dark support. Everything on this page is configured through
[`initialize()`](./api/functions/initialize.md) — there is no separate theming call.

> The SDK screens are **native** (Jetpack Compose on Android, SwiftUI on iOS). That is why a
> theme is passed at initialization rather than through the React tree, and why a font has to
> be registered with the host app rather than bundled in JavaScript.

**Contents**

- [Basic Theme Setup](#basic-theme-setup)
- [Dark/Light Mode Management](#darklight-mode-management)
- [Dual-Mode Color Themes](#dual-mode-color-themes)
- [Font Customization](#font-customization)
- [Theme Application](#theme-application)
- [Complete Theme Example](#complete-theme-example)
- [Dynamic Theme Switching](#dynamic-theme-switching)
- [Theme Configuration Reference](#theme-configuration-reference)
- [Customize the TopAppBar](#customize-the-topappbar)
- [Key Theming Functions](#key-theming-functions)

## Basic Theme Setup

```ts
import { Image } from 'react-native';

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    colors: {
      primary: '#FF6B35', // Main brand color
      primaryLowContrast: '#FF8C69', // Lighter variation of primary
      primaryHighContrast: '#CC4A1A', // Darker variation for high contrast
      onPrimary: '#FFFFFF', // Text color on primary background
      link: '#1D9BD1', // URLs rendered in posts and comments
      background: '#FFFFFF', // Community screens background (both modes here — see
                             // the dual-mode form below for per-mode values)
    },
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')),
    },
  }
});
```

## Dark/Light Mode Management

The SDK automatically handles system appearance changes, but you can also force specific modes —
for the Octopus UI alone with `setThemeMode()`, or for your whole app through React Native's
`Appearance` API.

### Forcing the Octopus UI only — `setThemeMode()`
```ts
import { setThemeMode } from '@octopus-community/react-native';

// The Octopus UI renders in dark mode whatever the device setting; your own screens are untouched
setThemeMode('dark');

// Back to following the system appearance
setThemeMode('system');
```

Works before or after `initialize()`, and applies live to an Octopus screen already open or an
`<OctopusUIView>` already mounted, on both platforms. With a [dual-mode theme](#dual-mode-color-themes),
the set matching the forced mode is selected — and re-selected every time the mode changes, forced
or system-driven.

### System Mode (Default)
```ts
// The SDK automatically follows the system appearance
// No additional configuration needed
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

### Forced Light Mode
```ts
import { Appearance } from 'react-native';

// Force light mode for your entire app
Appearance.setColorScheme('light');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

### Forced Dark Mode
```ts
import { Appearance } from 'react-native';

// Force dark mode for your entire app
Appearance.setColorScheme('dark');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

## Dual-Mode Color Themes

For enhanced theming, you can provide separate color sets for light and dark modes:

```ts
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    colors: {
      light: {
        primary: '#3B82F6', // Blue for light mode
        primaryLowContrast: '#60A5FA',
        primaryHighContrast: '#1D4ED8',
        onPrimary: '#FFFFFF',
      },
      dark: {
        primary: '#60A5FA', // Lighter blue for dark mode
        primaryLowContrast: '#93C5FD',
        primaryHighContrast: '#3B82F6',
        onPrimary: '#000000',
      },
    },
  }
});
```

## Font Customization

Customize typography with text styles and font sizes:

```ts
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    fonts: {
      // Theme-wide: applied to every text style below.
      fontFamily: 'MyBrandFont-Regular', // must be registered natively — see below
      fontWeight: 500, // 100-900, the CSS scale; needs no registration
      textStyles: {
        title1: {
          fontType: 'serif', // serif, monospace, or default
          fontSize: { size: 28 }
        },
        title2: {
          fontType: 'serif',
          fontSize: { size: 22 }
        },
        body1: {
          fontType: 'default', // Uses system default
          fontSize: { size: 16 }
        },
        body2: {
          fontSize: { size: 14 } // Only size, uses default font type
        },
        caption1: {
          fontType: 'monospace',
          fontSize: { size: 12 }
        },
        caption2: {
          fontSize: { size: 10 }
        },
        navBarItem: {
          fontSize: { size: 16 } // iOS only — no effect on Android
        },
      }
    }
  }
});
```

## Theme Application

Themes are applied when the Octopus UI is opened. The SDK automatically detects the current system appearance (light/dark mode) and applies the appropriate theme configuration.

On Android, when the theme carries a `background`, the light or dark base palette (the colors you
did not set: grays, text, the unread-notification highlight, …) is chosen from that background's
luminance rather than from the system appearance — a light background always gets the light
palette, even on a device in dark mode. This is the same rule the native Android SDK applies, and
it keeps every default color readable on the surface it is actually drawn on.

## Complete Theme Example

Here's a comprehensive example showing all theming options:

```ts
import { Image, Appearance } from 'react-native';
import { initialize } from '@octopus-community/react-native';

// Force dark mode (optional)
Appearance.setColorScheme('dark');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: {
    type: 'sso',
    appManagedFields: ['username', 'profilePicture']
  },
  theme: {
    // Dual-mode colors
    colors: {
      light: {
        primary: '#8B5CF6',
        primaryLowContrast: '#A78BFA',
        primaryHighContrast: '#7C3AED',
        onPrimary: '#FFFFFF',
      },
      dark: {
        primary: '#A78BFA',
        primaryLowContrast: '#C4B5FD',
        primaryHighContrast: '#8B5CF6',
        onPrimary: '#000000',
      },
    },
    // Custom fonts
    fonts: {
      textStyles: {
        title1: { fontType: 'serif', fontSize: { size: 28 } },
        title2: { fontType: 'serif', fontSize: { size: 22 } },
        body1: { fontSize: { size: 16 } },
        body2: { fontSize: { size: 14 } },
        caption1: { fontType: 'monospace', fontSize: { size: 12 } },
        caption2: { fontSize: { size: 10 } },
      }
    },
    // Custom logo
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')),
    },
  }
});
```

## Dynamic Theme Switching

To change themes in your app, you need to re-initialize the SDK with the new theme configuration:

```ts
// Example: Switch between different theme sets
const switchToGreenTheme = async () => {
  await initialize({
    apiKey: 'YOUR_OCTOPUS_API_KEY',
    connectionMode: { type: 'sso', appManagedFields: ['username'] },
    theme: {
      colors: {
        light: {
          primary: '#10B981',
          primaryLowContrast: '#34D399',
          primaryHighContrast: '#059669',
          onPrimary: '#FFFFFF',
        },
        dark: {
          primary: '#34D399',
          primaryLowContrast: '#6EE7B7',
          primaryHighContrast: '#10B981',
          onPrimary: '#000000',
        },
      }
    }
  });
};
```

## Theme Configuration Reference

**Color Properties:**
- `primary`: Main brand color (hex format: `#FF6B35` or `FF6B35`)
- `primaryLowContrast`: Lighter variation for subtle elements
- `primaryHighContrast`: Darker variation for high contrast needs
- `onPrimary`: Text color displayed over primary background
- `link`: Color of links, i.e. URLs rendered inside posts and comments. Cosmetic only —
  it does not change how a link is opened. Omit it for the native default.
- `background`: Background color of the community screens. Omit it for the native
  default (the Octopus light/dark scheme background on Android, the system background
  on iOS). On Android it also selects the light or dark base palette by its luminance
  (see [Theme Application](#theme-application)).

Every color is optional and independent: a theme carrying only `link`, or only
`background`, is applied as-is. A color that is not a parseable hex string is dropped —
the SDK default applies and a warning is logged at `initialize`.

All the accepted hex forms are normalized to `#RRGGBB` (or `#AARRGGBB` with alpha)
before reaching the native layer, so the same input renders the same color on both
platforms. Write the leading `#` if you like it; you get the same result without it.

**Theme-wide font (`fonts.fontFamily` / `fonts.fontWeight`):**

Both are optional and apply to *every* text style, including navigation-bar items.

- `fontFamily`: an arbitrary font family name. **It is not resolved from the
  JavaScript bundle** — the SDK's screens are native (Compose on Android, SwiftUI on
  iOS), so the font must be registered with the *host app*, which is exactly what
  linking it with `react-native-asset` does:
  - **Android**: the resource name under `android/app/src/main/res/font/` —
    `res/font/my_brand_font.ttf` is passed as `'my_brand_font'` (lowercase and
    underscores only, no extension).
  - **iOS**: the exact **PostScript name** of a font added to the Xcode project and
    declared under `UIAppFonts` in `Info.plist`. This is often not the filename;
    check it in Font Book.

  If the name does not resolve, the SDK logs a native warning and keeps its own
  default font.
- `fontWeight`: a whole number on the 100 (thinnest) - 900 (boldest) CSS scale — 400
  is regular, 700 is bold. It needs no native registration: it applies on top of
  whichever family is in effect, and native rendering picks the closest weight the
  font has a face for (iOS buckets to the nearest of SwiftUI's nine named weights).
  A value outside 100-900, or a non-integer, is dropped with a warning at
  `initialize` and the native default weight applies.

`fontFamily` **takes precedence over the per-style `fontType`.** They are not two
competing mechanisms: `fontType` picks one of three *system* designs for one style,
`fontFamily` names an arbitrary registered family for the whole theme, so the family
is the more specific request and wins on every style. If it does not resolve
natively, each style falls back to its `fontType` — so a `fontType` set alongside
still works, as the fallback it now is. Setting both logs a warning at `initialize`
naming the styles whose `fontType` is superseded.

**Android navigation-bar side effect**: setting `fontFamily` or `fontWeight` also
sets the Android navigation-bar title to the size of `body1`, which is smaller than
the title size used with no font override. The native top-app-bar title has no
typography role of its own and the style passed to it replaces the ambient one
instead of merging with it, so a complete style has to be supplied. Use
`textStyles.body1.fontSize` to control the resulting size. iOS is unaffected.

**Font Types:**
- `default`: System default font
- `serif`: Serif font family
- `monospace`: Monospace font family

Superseded by `fonts.fontFamily` when that resolves — see above.

**Text Styles:**
- `title1`: Large titles (default: 28pt)
- `title2`: Medium titles (default: 22pt)
- `body1`: Primary body text (default: 16pt)
- `body2`: Secondary body text (default: 14pt)
- `caption1`: Small captions (default: 12pt)
- `caption2`: Extra small captions (default: 10pt)
- `navBarItem`: Navigation-bar items — back/close labels and bar actions. **iOS
  only**: the native iOS theme has a dedicated nav-bar-item font slot and the
  native Android typography has no counterpart, so this style has no effect on
  Android. Omit it and nav-bar items follow `body1`; omit `body1` too and the
  slot falls back to a 17pt system font — not to the native iOS `.body` default,
  because any `textStyles` entry makes the bridge build all seven slots
  explicitly. Passing no `fonts` block at all leaves the native theme untouched.

**Supported Formats:**
- **Colors**: 3-digit (`#F63`), 6-digit (`#FF6633`) or 8-digit (`#80FF6633`) hex codes,
  with or without the leading `#`. An 8-digit value is **`AARRGGBB` — alpha first**, as
  both native SDKs read it, *not* the `#RRGGBBAA` of CSS.
- **Images**: Use `Image.resolveAssetSource(require('./path/to/image.png'))` for bundled assets
- **Fonts**: `serif`, `monospace` or `default` per style, or a natively registered
  family name for the whole theme via `fonts.fontFamily`

**Platform Behavior:**
- **iOS**: Uses adaptive colors that automatically respond to system appearance changes; a mode forced with `setThemeMode()` is applied as an interface-style override scoped to the SDK's own screens
- **Android**: The mode (forced, else the device configuration) is resolved at render time and a dual-mode theme is re-selected for it on every change, live — unless a `background` is set, in which case the base palette follows the background's luminance
- **Theme Changes**: Require re-initializing the SDK with new theme configuration
- **System Mode**: Automatically follows device light/dark mode settings (Android: only when no `background` is set)
- **Forced Mode**: `setThemeMode('light'|'dark')` for the Octopus UI only, or `Appearance.setColorScheme('light'|'dark')` for your whole app

**Note**: All theme properties are optional. If not provided, the default Octopus theme will be used.

For more detailed theming information and advanced customization options, see the [Octopus Community iOS SDK theming documentation](https://doc.octopuscommunity.com/SDK/sso/ios#modify-the-theme).

## Customize the TopAppBar

Customize the main-feed navigation bar globally at `initialize()`. It applies to
both the modal (`openUI()`) and the embedded `<OctopusUIView>`.

```ts
import { initialize } from '@octopus-community/react-native';

await initialize({
  apiKey: 'your-api-key',
  connectionMode: { type: 'octopus' },
  topAppBar: {
    title: { type: 'text', text: 'My Community' }, // or { type: 'logo' }
    alignment: 'center',                            // 'leading' (default) | 'center'
    coloredBackground: true,                        // primary color background
  },
});
```

| Option | Values | Notes |
|---|---|---|
| `title` | `{ type: 'logo' }` \| `{ type: 'text', text }` | `logo` uses `theme.logo`. Keep text under ~18 chars. Default: logo. |
| `alignment` | `'leading'` \| `'center'` | Default: `'leading'`. |
| `coloredBackground` | `boolean` | Uses the theme primary color. **iOS requires iOS 16+** (ignored below 16). Default: `false`. |

Omitting `topAppBar` keeps the default appearance (logo, leading, no colored
background).

> **Title vs. logo:** Use either a logo **or** a text title — not both. When a
> `theme.logo` is configured, Android gives the logo precedence over a `text`
> title in the nav bar (a native-SDK behavior), whereas iOS shows the text. For
> a consistent text title across platforms, don't set a `theme.logo`.

## Key Theming Functions

- **`initialize(params)`**: Initialize the SDK with theme configuration
- **`Appearance.setColorScheme(mode)`**: Force light/dark mode (React Native API)
- **`openUI()`**: Open the Octopus UI with the current theme applied

---

← Back to the [main README](../README.md) · [Documentation index](./README.md)
