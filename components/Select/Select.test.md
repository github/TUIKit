---
kind: test
component: Select
version: 1
---

# Select Tests

## renders numbered items with first highlighted

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```expect
❯ 1. Alpha
  2. Beta
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

## moves highlight down on arrow key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```input
↓
```

```expect
  1. Alpha
❯ 2. Beta
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

## moves highlight up on arrow key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```input
↓ ↓ ↑
```

```expect
  1. Alpha
❯ 2. Beta
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

## does not wrap past first item

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
↑
```

```expect
❯ 1. Alpha
  2. Beta
↑↓ to navigate · Enter to select · Esc to cancel
```

## does not wrap past last item

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
↓ ↓ ↓
```

```expect
  1. Alpha
❯ 2. Beta
↑↓ to navigate · Enter to select · Esc to cancel
```

## selects item on Enter

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
↓ enter
```

```state
after: selected
selected_value: "b"
```

## selects item by number key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```input
2
```

```state
after: selected
selected_value: "b"
```

## ignores out-of-range number key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
5
```

```expect
❯ 1. Alpha
  2. Beta
↑↓ to navigate · Enter to select · Esc to cancel
```

## shows current indicator on marked item

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b", current: true }
  - { label: "Gamma", value: "c" }
```

```expect
❯ 1. Alpha
  2. Beta ✓
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

## appends escape item with Esc suffix

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```expect
❯ 1. Alpha
  2. Beta
  3. Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

## escape key selects escape item

```props
items:
  - { label: "Alpha", value: "a" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```input
escape
```

```state
after: dismissed
selected_value: "cancel"
```

## ctrl+g also triggers escape

```props
items:
  - { label: "Alpha", value: "a" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```input
ctrl+g
```

```state
after: dismissed
selected_value: "cancel"
```

## escape calls onEscape when no escapeItem

```props
items:
  - { label: "Alpha", value: "a" }
onEscape: callback
```

```input
escape
```

```state
after: dismissed
callback_fired: onEscape
```

## respects initialItem for starting highlight

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
initialItem: "b"
```

```expect
  1. Alpha
❯ 2. Beta
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

## falls back to first item when initialItem not found

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
initialItem: "nonexistent"
```

```expect
❯ 1. Alpha
  2. Beta
↑↓ to navigate · Enter to select · Esc to cancel
```

## hides HintBar when hideHints is true

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
hideHints: true
```

```expect
❯ 1. Alpha
  2. Beta
```

## shows extra hints merged into HintBar

```props
items:
  - { label: "Alpha", value: "a" }
extraHints: { "s": "to search" }
```

```expect
❯ 1. Alpha
↑↓ to navigate · s to search · Enter to select
```

## vim j/k bindings work for navigation

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```input
j j
```

```expect
  1. Alpha
  2. Beta
❯ 3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

```input
k
```

```expect
  1. Alpha
❯ 2. Beta
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```

---

# Style assertions

## highlighted item uses selected color

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```style
- selector: indicator(0)
  icon: iconPrompt
  color: selected
- selector: item(0)
  color: selected
- selector: item(1)
  color: textOnBackgroundSecondary
```

## current item uses statusSuccess color

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b", current: true }
```

```style
- selector: item(1)
  contains: "✓"
  color: statusSuccess
```

## highlighted current item uses statusSuccess for indicator

```props
items:
  - { label: "Alpha", value: "a", current: true }
```

```style
- selector: indicator(0)
  icon: iconPrompt
  color: statusSuccess
- selector: item(0)
  color: statusSuccess
```

---

# Accessibility assertions

## screen reader replaces check glyph with text

```props
items:
  - { label: "Beta", value: "b", current: true }
screen_reader: true
```

```expect
❯ 1. Beta (current)
↑↓ to navigate · Enter to select · Esc to cancel
```

---

# SelectWithTextInput variant tests

## renders with text input escape item

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```expect
❯ 1. Looks good
  2. Request changes... (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

## activates text input when escape item highlighted

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```input
↓
```

```expect
  1. Looks good
❯ 2. |Request changes... (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

## typing replaces placeholder in text input

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```input
↓ "Fix the bug"
```

```expect
  1. Looks good
❯ 2. Fix the bug| (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

## up arrow from text input returns to list

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```input
↓ ↑
```

```expect
❯ 1. Looks good
  2. Request changes... (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

## enter in text input submits with text value

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```input
↓ "Fix it" enter
```

```state
after: selected
selected_value: "reject"
text_value: "Fix it"
```

## escape always submits escape item with current text

```props
variant: SelectWithTextInput
items:
  - { label: "Looks good", value: "approve" }
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

```input
↓ "some text" escape
```

```state
after: dismissed
selected_value: "reject"
text_value: "some text"
```
