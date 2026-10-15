[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusConsentTexts

# Type Alias: OctopusConsentTexts

> **OctopusConsentTexts** = \{ `mode`: `"implicit"`; `notice?`: `string` \| `null`; \} \| \{ `mode`: `"multiCheckbox"`; `privacyLabel?`: `string` \| `null`; `rulesLabel?`: `string` \| `null`; `termsLabel?`: `string` \| `null`; \} \| \{ `belowText?`: `string` \| `null`; `label?`: `string` \| `null`; `mode`: `"singleCheckbox"`; \}

Community consent wordings in markdown, forwarded verbatim to the native SDK.
The variant must match the community's terms-acceptance mode to be displayed. Each omitted,
`null`, empty or whitespace-only field uses the native SDK wording. Markdown, links, fallback
and layout are handled by the native SDK; this model does not select the consent mode.

## Type Declaration

\{ `mode`: `"implicit"`; `notice?`: `string` \| `null`; \}

### mode

> **mode**: `"implicit"`

Inline notice under the post, comment and reply composers.

### notice?

> `optional` **notice**: `string` \| `null`

Markdown notice. Omitted or blank: the native wording.

\{ `mode`: `"multiCheckbox"`; `privacyLabel?`: `string` \| `null`; `rulesLabel?`: `string` \| `null`; `termsLabel?`: `string` \| `null`; \}

### mode

> **mode**: `"multiCheckbox"`

One checkbox per legal document.

### privacyLabel?

> `optional` **privacyLabel**: `string` \| `null`

Markdown label for the privacy checkbox. Omitted or blank: the native wording.

### rulesLabel?

> `optional` **rulesLabel**: `string` \| `null`

Markdown label for the community rules checkbox. Omitted or blank: the native wording.

### termsLabel?

> `optional` **termsLabel**: `string` \| `null`

Markdown label for the terms checkbox. Omitted or blank: the native wording.

\{ `belowText?`: `string` \| `null`; `label?`: `string` \| `null`; `mode`: `"singleCheckbox"`; \}

### belowText?

> `optional` **belowText**: `string` \| `null`

Markdown text below the checkbox. Omitted or blank: the native wording.

### label?

> `optional` **label**: `string` \| `null`

Markdown checkbox label. Omitted or blank: the native wording.

### mode

> **mode**: `"singleCheckbox"`

A single checkbox followed by explanatory text.
