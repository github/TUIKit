---
kind: preview
component: Select
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
```

## With text input

```props
items:
  - label: "Alpha"
    value: "alpha"
  - label: "Beta"
    value: "beta"
escapeItemWithTextInput:
  label: "Something else..."
  value: "other"
```

## Scrolling

```props
items:
  - label: "Alpha"
    value: "alpha"
  - label: "Beta"
    value: "beta"
  - label: "Gamma"
    value: "gamma"
  - label: "Delta"
    value: "delta"
  - label: "Epsilon"
    value: "epsilon"
  - label: "Zeta"
    value: "zeta"
  - label: "Eta"
    value: "eta"
  - label: "Theta"
    value: "theta"
  - label: "Iota"
    value: "iota"
  - label: "Kappa"
    value: "kappa"
escapeItem:
  label: "Cancel"
  value: "cancel"
```
