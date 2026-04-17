---
kind: preview
component: SelectAutocomplete
version: 1
---

## Basic

```props
items:
  - label: "Alpha"
    value: "alpha"
  - label: "Beta"
    value: "beta"
  - label: "Gamma"
    value: "gamma"
escapeItem:
  label: "Cancel"
  value: "cancel"
searchPlaceholder: "Search options..."
```

## With current item

```props
items:
  - label: "Alpha"
    value: "alpha"
  - label: "Beta"
    value: "beta"
    current: true
  - label: "Gamma"
    value: "gamma"
escapeItem:
  label: "Cancel"
  value: "cancel"
searchPlaceholder: "Search..."
```
