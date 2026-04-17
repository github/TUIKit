---
kind: test
component: HintBar
version: 1
---

# HintBar Tests

## renders basic hints with separator

```props
hints: { "esc": "to cancel", "enter": "to select" }
```

```expect
Esc to cancel · Enter to select
```

## transforms arrow keys to unicode symbols

```props
hints: { "up-down": "to navigate" }
```

```expect
↑↓ to navigate
```

## uses custom separator

```props
hints: { "q": "quit", "h": "help" }
separator: " | "
```

```expect
q quit | h help
```

## filters out falsy values

```props
hints: { "esc": "to close", "s": false, "enter": "to confirm" }
```

```expect
Esc to close · Enter to confirm
```

## filters out null values

```props
hints: { "a": "action", "b": null, "c": "cancel" }
```

```expect
a action · c cancel
```

## renders single hint without separator

```props
hints: { "enter": "to continue" }
```

```expect
Enter to continue
```

## renders empty for all-falsy hints

```props
hints: { "a": false, "b": null }
```

```expect

```

## key display is case-insensitive

```props
hints: { "ESC": "to quit", "ENTER": "to go" }
```

```expect
Esc to quit · Enter to go
```

## preserves unknown keys as-is

```props
hints: { "q": "to quit", "ctrl+c": "to abort" }
```

```expect
q to quit · ctrl+c to abort
```

## maps all special keys correctly

```props
hints: { "up": "up", "down": "down", "left": "left", "right": "right", "tab": "next", "shift+tab": "prev" }
```

```expect
↑ up · ↓ down · ← left · → right · Tab next · Shift+Tab prev
```

---

# formatKey utility tests

## formatKey transforms known keys

```formatKey
input: "esc"
expect: "Esc"
```

```formatKey
input: "enter"
expect: "Enter"
```

```formatKey
input: "up-down"
expect: "↑↓"
```

```formatKey
input: "left-right"
expect: "←→"
```

## formatKey preserves unknown keys

```formatKey
input: "q"
expect: "q"
```

```formatKey
input: "ctrl+c"
expect: "ctrl+c"
```

## formatKey is case-insensitive

```formatKey
input: "ESC"
expect: "Esc"
```

---

# Style assertions

These verify color and weight usage. The test harness should validate
that rendered output uses the correct semantic tokens.

## keys are bold with textPrimary color

```props
hints: { "esc": "cancel" }
```

```style
- selector: key("esc")
  bold: true
  color: textPrimary
```

## labels use textSecondary color

```props
hints: { "esc": "cancel" }
```

```style
- selector: label("cancel")
  bold: false
  color: textSecondary
```

## separator uses textSecondary color

```props
hints: { "a": "one", "b": "two" }
```

```style
- selector: separator
  color: textSecondary
```
