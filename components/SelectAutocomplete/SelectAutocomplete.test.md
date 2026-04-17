---
kind: test
component: SelectAutocomplete
version: 1
---

# SelectAutocomplete Tests

## renders items with search input and first highlighted

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
searchPlaceholder: "Search..."
```

```expect
 Search...
❯ Alpha
  Beta
  Gamma
↑↓ to navigate · Enter to select
```

## typing filters items with fuzzy match

```props
items:
  - { label: "JavaScript", value: "js" }
  - { label: "TypeScript", value: "ts" }
  - { label: "Python", value: "py" }
fuzzy: true
```

```input
"sc"
```

```expect
sc
❯ JavaScript
  TypeScript
↑↓ to navigate · Enter to select
```

## typing filters items with substring match

```props
items:
  - { label: "JavaScript", value: "js" }
  - { label: "TypeScript", value: "ts" }
  - { label: "Python", value: "py" }
fuzzy: false
```

```input
"Script"
```

```expect
Script
❯ JavaScript
  TypeScript
↑↓ to navigate · Enter to select
```

## shows no-results message when search matches nothing

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
"xyz"
```

```expect
xyz
No matches for "xyz"
↑↓ to navigate · Enter to select
```

## escape item remains visible when all items filtered out

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```input
"xyz"
```

```expect
xyz
No matches for "xyz"
❯ Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

## moves highlight down with wrapping

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
↓ ↓ ↓
```

```expect
 Type to filter...
  Alpha
❯ Beta
↑↓ to navigate · Enter to select
```

## moves highlight up with wrapping

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
↑
```

```expect
 Type to filter...
  Alpha
❯ Beta
↑↓ to navigate · Enter to select
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

## enter is no-op when list is empty

```props
items:
  - { label: "Alpha", value: "a" }
```

```input
"zzz" enter
```

```expect
zzz
No matches for "zzz"
↑↓ to navigate · Enter to select
```

## escape clears search on first press

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
"test" escape
```

```expect
 Type to filter...
❯ Alpha
  Beta
↑↓ to navigate · Enter to select
```

## escape closes on second press when search already empty

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

## escape selects escapeItem when provided

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

## ctrl+g behaves like escape

```props
items:
  - { label: "Alpha", value: "a" }
onEscape: callback
```

```input
ctrl+g
```

```state
after: dismissed
callback_fired: onEscape
```

## two-stage escape: clear then close

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```input
"test"
```

```expect
test
No matches for "test"
❯ Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

```input
escape
```

```expect
 Type to filter...
❯ Alpha
  Beta
  Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

```input
escape
```

```state
after: dismissed
selected_value: "cancel"
```

## backspace removes last character from search

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
```

```input
"abc" backspace
```

```expect
ab
❯ Alpha
  Beta
↑↓ to navigate · Enter to select
```

## shows current indicator on marked item

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b", current: true }
```

```expect
 Type to filter...
❯ Alpha
  Beta ✓
↑↓ to navigate · Enter to select
```

## appends escape item with Esc suffix

```props
items:
  - { label: "Alpha", value: "a" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```expect
 Type to filter...
❯ Alpha
  Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

## highlight resets to first item after filter change

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
```

```input
↓ ↓
```

```expect
 Type to filter...
  Alpha
  Beta
❯ Gamma
↑↓ to navigate · Enter to select
```

```input
"Al"
```

```expect
Al
❯ Alpha
↑↓ to navigate · Enter to select
```

## left arrow fires onLeftArrow

```props
items:
  - { label: "Alpha", value: "a" }
onLeftArrow: callback
```

```input
←
```

```state
callback_fired: onLeftArrow
```

## right arrow fires onRightArrow

```props
items:
  - { label: "Alpha", value: "a" }
onRightArrow: callback
```

```input
→
```

```state
callback_fired: onRightArrow
```

## hides HintBar when hideHints is true

```props
items:
  - { label: "Alpha", value: "a" }
hideHints: true
```

```expect
 Type to filter...
❯ Alpha
```

## shows additional and extra hints in HintBar

```props
items:
  - { label: "Alpha", value: "a" }
additionalHints: { "←→": "to switch tabs" }
```

```expect
 Type to filter...
❯ Alpha
↑↓ to navigate · ←→ to switch tabs · Enter to select
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
  color: null
```

## current item uses statusSuccess color

```props
items:
  - { label: "Alpha", value: "a", current: true }
```

```style
- selector: item(0)
  contains: "✓"
  color: statusSuccess
- selector: indicator(0)
  color: statusSuccess
```

## search placeholder uses textTertiary

```props
items:
  - { label: "Alpha", value: "a" }
searchPlaceholder: "Filter..."
```

```style
- selector: component("SearchInput")
  placeholder_color: textTertiary
```

## escape item suffix uses textSecondary

```props
items:
  - { label: "Alpha", value: "a" }
escapeItem: { label: "Cancel", value: "cancel" }
```

```style
- selector: item(1)
  contains: "(Esc)"
  color: textSecondary
```

## no-results message uses textSecondary

```props
items:
  - { label: "Alpha", value: "a" }
```

```input
"zzz"
```

```style
- selector: label("No matches")
  color: textSecondary
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
 Type to filter...
❯ Beta (current)
↑↓ to navigate · Enter to select
```
