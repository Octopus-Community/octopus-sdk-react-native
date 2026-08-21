[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusTopAppBar

# Interface: OctopusTopAppBar

Customizes the main-feed navigation bar (TopAppBar).

Set globally via [InitializeParams.topAppBar](InitializeParams.md#topappbar). Applies to both the
modal (`openUI()`) and the embedded `<OctopusUIView>`.

## Properties

### alignment?

> `optional` **alignment**: `"leading"` \| `"center"`

Title alignment.

#### Default

```ts
'leading';
```

---

### coloredBackground?

> `optional` **coloredBackground**: `boolean`

Use the theme's primary color as the nav-bar background.
On iOS this requires iOS 16+ (ignored on earlier versions).

#### Default

```ts
false;
```

---

### title?

> `optional` **title**: \{ `type`: `"logo"`; \} \| \{ `text`: `string`; `type`: `"text"`; \}

What to show as the title.

- `{ type: 'logo' }` — uses `theme.logo` (the default when omitted)
- `{ type: 'text', text }` — custom text (keep under ~18 characters)

#### Default

```ts
{
  type: 'logo';
}
```
