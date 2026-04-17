---
kind: preview
component: TabBar
version: 1
---

## Display only

```props
items:
  - label: "Overview"
    value: "overview"
  - label: "Details"
    value: "details"
  - label: "Settings"
    value: "settings"
  - label: "About"
    value: "about"
selectedIndex: 1
```

## Arrow navigation

```props
items:
  - label: "index.ts"
    value: "1"
  - label: "utils.ts"
    value: "2"
  - label: "config.ts"
    value: "3"
  - label: "types.ts"
    value: "4"
  - label: "test.ts"
    value: "5"
selectedIndex: 0
navigationKeys: "arrow-only"
```

## Tab navigation

```props
items:
  - label: "Overview"
    value: "1"
  - label: "Details"
    value: "2"
  - label: "Settings"
    value: "3"
selectedIndex: 0
navigationKeys: "tab-only"
```

## No loop

```props
items:
  - label: "First"
    value: "1"
  - label: "Second"
    value: "2"
  - label: "Third"
    value: "3"
selectedIndex: 0
navigationKeys: "all"
loop: false
```
