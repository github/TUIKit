---
kind: preview
component: HintBar
version: 1
---

## Default

```props
hints:
  up-down: "to navigate"
  enter: "to select"
  esc: "to cancel"
```

## Custom keys

```props
hints:
  tab: "next file"
  shift-tab: "previous file"
  s: "to save"
  esc: "to close"
```

## Conditional

```props
hints:
  up-down: "to navigate"
  enter: "to select"
  s: false
  esc: "to cancel"
```

## Custom separator

```props
hints:
  a: "one"
  b: "two"
  c: "three"
separator: " | "
```
