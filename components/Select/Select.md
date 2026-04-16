---
kind: component
name: Select
description: Keyboard-navigable selection list with automatic numbering and accessibility.
version: 2
category: input

tokens:
  colors: [selected, textSecondary, textOnBackgroundSecondary, statusSuccess]
  icons: [iconPrompt, iconSuccess]

types:
  SelectItem:
    generic: T
    fields:
      label: { type: string, required: true, description: "Display text for this option" }
      value: { type: T, required: true, description: "Backing value returned on selection" }
      current: { type: boolean, required: false, description: "Marks this item as the currently active/persisted choice" }

props:
  items:
    type: array<SelectItem<T>>
    required: true
    description: List of selectable options.

  onSelect:
    type: callback(item: SelectItem<T>) → void
    required: true
    description: Fires when the user confirms a selection (Enter or number key).

  onEscape:
    type: callback() → void
    required: false
    description: >
      Fires when Escape is pressed and no escapeItem is provided.
      Mutually exclusive intent with escapeItem — use one or the other.

  escapeItem:
    type: SelectItem<T>
    required: false
    description: >
      A special item appended to the end of the list. Pressing Escape selects
      this item. Rendered with "(Esc)" suffix.

  onHighlight:
    type: callback(item: SelectItem<T>) → void
    required: false
    description: Fires when the highlighted item changes during navigation.

  initialItem:
    type: T
    required: false
    description: >
      Value to match for initial highlight position. If not found or not
      provided, highlight starts at the first item.

  extraHints:
    type: record<string, string | false | null>
    required: false
    description: >
      Additional hints merged into the default HintBar. Inserted between
      navigation hints and action hints.

  hideHints:
    type: boolean
    required: false
    default: false
    description: When true, the built-in HintBar is not rendered.

states:
  initial: focused
  definitions:
    focused:
      description: >
        List is visible and accepting keyboard input. One item is always
        highlighted (there is no "unfocused" idle state — the component
        is interactive from mount).
      transitions:
        select: selected
        escape: dismissed
    selected:
      description: User confirmed a choice via Enter or number key.
      terminal: true
      emits: onSelect
    dismissed:
      description: User pressed Escape.
      terminal: true
      emits: onSelect(escapeItem) or onEscape

keyboard:
  "↑":
    action: Move highlight up
    wrap: false
    note: Stops at first item (no wrapping)
  "↓":
    action: Move highlight down
    wrap: false
    note: Stops at last item (no wrapping)
  k:
    action: Move highlight up
    same_as: "↑"
    note: Vim binding
  j:
    action: Move highlight down
    same_as: "↓"
    note: Vim binding
  enter:
    action: Confirm highlighted item → fires onSelect
  escape:
    action: >
      If escapeItem provided: select it via onSelect.
      If onEscape provided: call onEscape.
      Otherwise: no action.
  ctrl+g:
    action: Cancel (alternative)
    same_as: escape
  "1-9":
    action: >
      Directly select item by number (1-indexed). Immediately fires onSelect
      without requiring Enter confirmation.

accessibility:
  role: listbox
  properties:
    aria-label: "Selection list"
  states:
    aria-selected: "true for the highlighted item"
  announce:
    on_mount: "Select: {count} items"
    on_change: "Item {index} of {total}: {label}"
  screen_reader_adaptations:
    - when: screen reader detected
      change: "Current item indicator changes from ✓ glyph to (current) text suffix"

composition:
  children:
    - component: HintBar
      slot: footer
      optional: true
      hide_prop: hideHints
      default_props:
        hints:
          up-down: "to navigate"
          enter: "to select"
          esc: "to cancel"
      merge_prop: extraHints
      note: >
        extraHints entries are merged between "up-down" and "enter".
        "esc" hint only appears when escapeItem or onEscape is provided.

dependencies:
  tokens:
    - name: selected
      kind: color
      usage: "Highlighted item indicator and text"
      required: true
    - name: textSecondary
      kind: color
      usage: "HintBar text"
      required: true
    - name: textOnBackgroundSecondary
      kind: color
      usage: "Unhighlighted item text"
      required: true
    - name: statusSuccess
      kind: color
      usage: "Current item glyph color"
      required: false
    - name: iconPrompt
      kind: icon
      usage: "Selection indicator glyph"
      required: true
    - name: iconSuccess
      kind: icon
      usage: "Current item indicator glyph"
      required: false
  components:
    - name: HintBar
      usage: "Footer keyboard navigation hints"
      required: false
---

# Select

A vertical selection list with keyboard navigation. Items are automatically numbered
(1., 2., 3., ...) and the highlighted item is indicated with `iconPrompt`.

## Visual rules

- **Highlighted item**: MUST show `iconPrompt` glyph + `selected` color token for both indicator and text
- **Unhighlighted items**: MUST use 2-space indent (same width as indicator) + `textOnBackgroundSecondary` color token
- **Current item**: MUST append `iconSuccess` glyph in `statusSuccess` color token after the label
- **Escape item**: MUST be appended as last item with "(Esc)" suffix after label
- **Current + escape**: MUST show both "✓ (Esc)" suffixes
- Items MUST be numbered starting at 1, prefixed as `{n}. {label}`

## Rendering example

Given:

```
items: [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b", current: true },
  { label: "Gamma", value: "c" }
]
escapeItem: { label: "Cancel", value: "cancel" }
```

Initial render (first item highlighted):

```
❯ 1. Alpha
  2. Beta ✓
  3. Gamma
  4. Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

After pressing ↓:

```
  1. Alpha
❯ 2. Beta ✓
  3. Gamma
  4. Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

## Behavior

### Number key selection

Pressing a number key (1-9) MUST immediately select the corresponding item
without requiring Enter.

### Escape handling priority

1. If `escapeItem` is provided → `onSelect(escapeItem)` MUST be called
2. Else if `onEscape` is provided → `onEscape()` MUST be called
3. Else → the keystroke MUST be discarded

### Initial highlight

If `initialItem` matches a value in `items`, that item MUST start highlighted.
Otherwise, the first item MUST be highlighted.

## Dependencies

| Dependency                  | Kind      | Usage                               | Required |
| --------------------------- | --------- | ----------------------------------- | -------- |
| `selected`                  | color     | Highlighted item indicator and text | Yes      |
| `textSecondary`             | color     | HintBar text                        | Yes      |
| `textOnBackgroundSecondary` | color     | Unhighlighted item text             | Yes      |
| `statusSuccess`             | color     | Current item glyph color            | No       |
| `iconPrompt`                | icon      | Selection indicator glyph           | Yes      |
| `iconSuccess`               | icon      | Current item indicator glyph        | No       |
| `HintBar`                   | component | Footer keyboard navigation hints    | No       |

## Edge cases

- **Empty items array**: MUST render only the HintBar (or nothing if `hideHints` is true)
- **Single item**: MUST render normally; ↑↓ MUST have no effect
- **Number key out of range**: MUST be ignored (e.g., pressing 5 with only 3 items)
- **initialItem not found**: MUST fall back to first item

---

# SelectWithTextInput (variant)

A variant where the escape/reject item has an inline text input. When highlighted,
the escape item's label becomes a placeholder and the user can type feedback.

## Additional props (variant-specific)

```yaml
escapeItemWithTextInput:
    type: SelectItem<T>
    required: true
    description: >
        The item that becomes a text input when highlighted. Its label is used
        as placeholder text.
```

## Additional keyboard (variant-specific)

```yaml
"↑" (in text input): Navigate back up to the list items
enter (in text input): Submit text value → fires onSelect(escapeItem, textValue)
escape: Always fires onSelect(escapeItem, textValue) regardless of focus
```

## Rendering example (variant)

Given:

```
items: [{ label: "Looks good", value: "approve" }]
escapeItemWithTextInput: { label: "Request changes...", value: "reject" }
```

Initial (first item highlighted):

```
❯ 1. Looks good
  2. Request changes... (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

After pressing ↓ (text input activates):

```
  1. Looks good
❯ 2. |Request changes... (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```

The cursor appears at position 0, placeholder text shown. As user types:

```
  1. Looks good
❯ 2. Please fix the auth bug| (Esc to stop)
↑↓ to navigate · Enter to select · Esc to cancel
```
