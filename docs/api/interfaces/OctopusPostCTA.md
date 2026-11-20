[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPostCTA

# Interface: OctopusPostCTA

A call-to-action button attached to a prefilled post draft.

Give its label with `localizedLabel` — [OctopusLocalizedText.perLanguage](../variables/OctopusLocalizedText.md#perlanguage) to give it in
each language of your app, [OctopusLocalizedText.autoTranslated](../variables/OctopusLocalizedText.md#autotranslated) to let Octopus translate
one label. The deprecated `label` means `localizedLabel: OctopusLocalizedText.autoTranslated(label)`.
Set one of the two: both together are refused with a plain `Error`, before the native call.

Keep each label under 28 characters so that it fits on one line: a longer label is accepted,
and the button can then take several lines.

## Properties

### ~~label?~~

> `optional` **label**: `string`

The CTA's label, translated automatically by Octopus. Must not be blank after trimming.

#### Deprecated

Use localizedLabel, with `OctopusLocalizedText.autoTranslated(label)` to keep
the automatic translation.

---

### localizedLabel?

> `optional` **localizedLabel**: [`OctopusLocalizedText`](../type-aliases/OctopusLocalizedText.md)

The CTA's label, auto-translated or given per language. An auto-translated text must not be
blank after trimming (`CTA_LABEL_EMPTY`), nor any text of a per-language label
(`LOCALIZED_TEXT_BLANK_TEXT`). A per-language label that
breaks one of the rules listed on [OctopusLocalizedText](../variables/OctopusLocalizedText.md) is refused with the matching
`LOCALIZED_TEXT_…` code.

---

### url

> **url**: `string`

The URL opened when the CTA is tapped. Must not be blank.
