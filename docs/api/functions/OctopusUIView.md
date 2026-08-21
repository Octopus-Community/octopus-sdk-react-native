[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusUIView

# Function: OctopusUIView()

> **OctopusUIView**(`__namedParameters`): `Element`

Embeds the Octopus Community UI as a native view inside your screen.
Use this when you want to keep your app navigation (e.g. bottom tab bar) visible
instead of opening the SDK in fullscreen with `openUI()`.

You must call `initialize()` before rendering this component.

## Parameters

### \_\_namedParameters

[`OctopusUIViewProps`](../interfaces/OctopusUIViewProps.md)

## Returns

`Element`

## Example

```tsx
function CommunityTab() {
  return (
    <View style={{ flex: 1 }}>
      <OctopusUIView interceptUrls={true} style={StyleSheet.absoluteFill} />
    </View>
  );
}
```
