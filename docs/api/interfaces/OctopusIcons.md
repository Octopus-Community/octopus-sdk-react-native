[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusIcons

# Interface: OctopusIcons

Icon overrides for the Octopus UI, passed as `theme.icons` to `initialize()`.

The groups and names follow the iOS SDK (`OctopusTheme.Assets.Icons`); the bridge maps
them onto the Android SDK's own names. Only the slots both native SDKs expose are
available.

- **Every slot is optional.** An absent slot keeps the native default icon, and omitting
  `icons` altogether leaves the native icon set untouched.
- **Icons are tinted**: the SDK recolors them with the theme colors, so only the shape
  (alpha channel) of the image matters. The exceptions are
  [OctopusContentIcons.reaction](OctopusContentIcons.md#reaction) and [OctopusIcons.screenStates](#screenstates), drawn in their
  original colors.
- **Action icon size**: square images, ideally 24×24 points with the drawn content around 14.5×14.5
  (transparent borders of 4.75). A non-square image is scaled to fit.
- A slot whose value is not an image source with a string `uri`, or a key the SDK does
  not know, is dropped by `initialize()` with a warning.

## Example

```tsx
await initialize({
  apiKey: 'your-api-key',
  connectionMode: { type: 'octopus' },
  theme: {
    icons: {
      content: {
        comment: {
          creation: {
            open: Image.resolveAssetSource(require('./icons/comment.png')),
          },
        },
      },
      common: {
        moreActions: Image.resolveAssetSource(require('./icons/more.png')),
      },
    },
  },
});
```

## Properties

### common?

> `optional` **common**: [`OctopusCommonIcons`](OctopusCommonIcons.md)

Icons shared across screens.

---

### content?

> `optional` **content**: [`OctopusContentIcons`](OctopusContentIcons.md)

Content icons: posts, comments, replies, video, polls and reactions.

---

### gamification?

> `optional` **gamification**: [`OctopusGamificationIcons`](OctopusGamificationIcons.md)

Gamification icons.

---

### groups?

> `optional` **groups**: [`OctopusGroupsIcons`](OctopusGroupsIcons.md)

Group (topic) icons.

---

### profile?

> `optional` **profile**: [`OctopusProfileIcons`](OctopusProfileIcons.md)

Profile and notification icons.

---

### screenStates?

> `optional` **screenStates**: [`OctopusScreenStatesIcons`](OctopusScreenStatesIcons.md)

Empty-list and failed-load illustrations, drawn in their original colors (not tinted).

---

### settings?

> `optional` **settings**: [`OctopusSettingsIcons`](OctopusSettingsIcons.md)

Settings icons.
