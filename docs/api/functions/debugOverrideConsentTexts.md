[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideConsentTexts

# Function: debugOverrideConsentTexts()

> **debugOverrideConsentTexts**(`texts`): `Promise`\<`void`\>

**Debug-only.** Overrides the community consent wordings for local testing.
Texts are forwarded verbatim, including blank fields and markdown. The native SDK handles
fallback, links and layout, and shows its own wording when the variant does not match the
effective terms-acceptance mode. This call does not change that mode; use
[debugOverrideTermsAcceptanceMode](debugOverrideTermsAcceptanceMode.md) independently. Not for use in production apps.

## Parameters

### texts

The wordings to apply, or `null` to restore the backend-provided texts.

[`OctopusConsentTexts`](../type-aliases/OctopusConsentTexts.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
