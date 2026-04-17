---
kind: component
name: SelectAutocomplete
description: Single-select list with inline search input, fuzzy filtering, and keyboard navigation.
version: 2
category: input

tokens:
  colors: [selected, statusSuccess, textSecondary, textTertiary]
  icons: [iconSuccess, iconPrompt]

types:
  SelectAutocompleteItem:
    generic: T
    fields:
      value: { type: T, required: true, description: "Backing value returned on selection" }
      label: { type: string, required: true, description: "Display text (also used as filter match target)" }
      current: { type: boolean, required: false, description: "Marks this item as the currently active/persisted choice" }

  SelectAutocompleteRenderContext:
    generic: T
    fields:
      item: { type: SelectAutocompleteItem<T>, required: true, description: "The item being rendered" }
      isHighlighted: { type: boolean, required: true, description: "Whether this item is the highlighted row" }
      index: { type: number, required: true, description: "Index in the filtered list" }
      searchTerm: { type: string, required: true, description: "Current text in the search input" }

props:
  items:
    type: array<SelectAutocompleteItem<T>>
    required: true
    description: Items to display in the list. Filtered by the search input.

  onSelect:
    type: callback(item: SelectAutocompleteItem<T>) → void
    required: true
    description: Fires when the user confirms a selection with Enter.

  onEscape:
    type: callback() → void
    required: false
    description: >
      Fires on Escape when search is empty and no escapeItem is provided.
      Mutually exclusive intent with escapeItem.

  escapeItem:
    type: SelectAutocompleteItem<T>
    required: false
    description: >
      A special item appended after all filtered results. Never filtered out by
      search. Rendered with "(Esc)" suffix. Pressing Escape (when search is
      empty) selects this item via onSelect.

  renderItem:
    type: callback(context: SelectAutocompleteRenderContext<T>) → ReactNode
    required: false
    description: >
      Custom render function for each item row. When omitted, the default
      renderer is used (indicator + label + current marker).

  searchPlaceholder:
    type: string
    required: false
    default: '"Type to filter..."'
    description: Placeholder text shown in the search input when empty.

  fuzzy:
    type: boolean
    required: false
    default: true
    description: >
      When true, uses fuzzy matching (scored and ranked by relevance).
      When false, uses simple case-insensitive substring matching.

  onHighlight:
    type: callback(item: SelectAutocompleteItem<T>) → void
    required: false
    description: >
      Fires when the highlighted item changes due to navigation or filtering.
      Renamed from onHighlightedChange for consistency with Select.

  onLeftArrow:
    type: callback() → void
    required: false
    description: Fires when the left arrow key is pressed (passthrough for parent navigation).

  onRightArrow:
    type: callback() → void
    required: false
    description: Fires when the right arrow key is pressed (passthrough for parent navigation).

  afterHints:
    type: ReactNode
    required: false
    description: Optional content rendered between the item list and the hint bar.

  extraHints:
    type: record<string, string | false | null>
    required: false
    description: >
      Additional hints merged into the HintBar before the default action hints.
      Consolidated from former additionalHints prop for consistency with Select.

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
        Search input is active and the list is visible. One item is always
        highlighted. The user can type to filter, navigate with arrows, or
        press Enter/Escape.
      transitions:
        select: selected
        escape_clear: focused
        escape_close: dismissed
    selected:
      description: User confirmed a choice via Enter.
      terminal: true
      emits: onSelect
    dismissed:
      description: User pressed Escape with empty search.
      terminal: true
      emits: onSelect(escapeItem) or onEscape

keyboard:
  "↑":
    action: Move highlight up
    wrap: true
    note: Wraps from first item to last
  "↓":
    action: Move highlight down
    wrap: true
    note: Wraps from last item to first
  enter:
    action: Confirm highlighted item → fires onSelect
    note: No-op when the list is empty
  escape:
    action: >
      Two-stage: if search has text, clears the search input and resets
      the filter (stays in focused state). If search is already empty,
      selects escapeItem or fires onEscape.
  ctrl+g:
    action: Same as escape
    same_as: escape
  backspace:
    action: Delete last character from search input
  "←":
    action: Fires onLeftArrow callback (passthrough)
    note: Does not affect internal state
  "→":
    action: Fires onRightArrow callback (passthrough)
    note: Does not affect internal state
  text:
    action: >
      Appends typed characters to the search input. Filtering runs after
      each keystroke.

accessibility:
  role: combobox
  properties:
    aria-label: "Search and select"
    aria-expanded: "true when dropdown visible"
    aria-activedescendant: "ID of highlighted item"
  states:
    aria-selected: "true for highlighted item in results list"
  announce:
    on_mount: "Search: type to filter {count} items"
    on_change: "Result {index} of {filtered_count}: {label}"
  screen_reader_adaptations:
    - when: screen reader detected
      change: >
        Current item indicator changes from "✓" glyph to " (current)" text
        suffix.

dependencies:
  tokens:
    - name: selected
      kind: color
      usage: "Highlighted item text and indicator"
      required: true
    - name: statusSuccess
      kind: color
      usage: "Current item marker glyph"
      required: false
    - name: textSecondary
      kind: color
      usage: "Escape item suffix and no-results message"
      required: false
    - name: textTertiary
      kind: color
      usage: "Search placeholder text"
      required: false
    - name: iconSuccess
      kind: icon
      usage: "Current item marker glyph (✓)"
      required: false
  components:
    - name: HintBar
      usage: "Footer keyboard navigation hints"
      required: false
  dependents: []

composition:
  children:
    - component: SearchInput
      slot: header
      description: >
        Inline text input at the top of the component. Shows a block cursor
        (inverse space character). When empty, displays the placeholder.
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
        "esc" hint only appears when escapeItem or onEscape is provided.
        extraHints are merged between "up-down" and "enter".
---

# SelectAutocomplete

A searchable single-select list. A text input at the top filters the items below
using fuzzy matching (default) or substring matching. Items are navigated with
arrow keys and confirmed with Enter.

## Visual rules

- **Search input**: MUST render block cursor as inverse space character. When empty,
  placeholder text MUST appear in `textTertiary` after the cursor.
- **Highlighted item**: MUST use `iconPrompt` glyph (`❯`) + `selected` color for both
  indicator and text
- **Unhighlighted items**: MUST use 2-space indent + default text color
- **Current item**: MUST append `iconSuccess` glyph in `statusSuccess` color after label
- **Escape item**: MUST be appended as last item with "(Esc)" suffix in `textSecondary`
- **No results message**: MUST show "No matches for \"{searchTerm}\"" in `textSecondary`
  when the search produces zero matching items
- One blank line MUST separate the search input from the item list
- One blank line MUST separate the item list from the HintBar/afterHints area

## Filtering behavior

### Fuzzy mode (default, `fuzzy: true`)

- Characters typed into the search input are matched fuzzily against item labels
- Results are ranked by match score — best matches appear first
- The escapeItem is excluded from filtering and always appears last

### Substring mode (`fuzzy: false`)

- Simple case-insensitive substring match against item labels
- Results retain their original order (no scoring/reranking)
- The escapeItem is excluded from filtering and always appears last

### Filter reset

- The highlight resets to the first item when the filtered list changes
- If the current highlight index exceeds the new filtered list length, it clamps
  to the last item

## Rendering example

Given:

```
items: [
  { label: "JavaScript", value: "js" },
  { label: "TypeScript", value: "ts", current: true },
  { label: "Python", value: "py" },
  { label: "Rust", value: "rs" }
]
escapeItem: { label: "Cancel", value: "cancel" }
searchPlaceholder: "Search languages..."
```

Initial render (empty search):

```
 Search languages...
❯ JavaScript
  TypeScript ✓
  Python
  Rust
  Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

After typing "sc":

```
sc
❯ JavaScript
  TypeScript ✓
  Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

After typing "xyz" (no matches):

```
xyz
No matches for "xyz"
  Cancel (Esc)
↑↓ to navigate · Enter to select · Esc to cancel
```

## Behavior

### Two-stage Escape

1. **First press** (search has text): MUST clear the search input and restore full list
2. **Second press** (search is empty):
    - If `escapeItem` provided → MUST call `onSelect(escapeItem)`
    - Else if `onEscape` provided → MUST call `onEscape()`
    - Otherwise → MUST NOT take any action

### Arrow passthrough

Left and right arrow keys MUST NOT be consumed by the component. They MUST fire
`onLeftArrow` / `onRightArrow` callbacks, enabling parent-level navigation
(e.g., switching between TabBar tabs).

### Highlight tracking

When `onHighlight` is provided, it MUST fire whenever the highlighted item
changes — whether from arrow key navigation or from the filtered list changing
due to search input.

## Edge cases

- **Empty items array**: MUST render only the search input, "No matches" message (if
  search has text), escapeItem (if provided), and HintBar
- **Single item**: MUST render normally; ↑↓ MUST wrap to itself
- **All items filtered out**: MUST show "No matches" message; escapeItem (if present)
  MUST remain visible and become highlighted
- **Custom renderItem**: MUST override the entire row rendering; receives full context
  including highlight state, index, and search term
- **Very long search term**: MUST NOT truncate — text extends as typed

## Dependencies

| Dependency      | Kind      | Usage                                     | Required |
| --------------- | --------- | ----------------------------------------- | -------- |
| `selected`      | color     | Highlighted item text and indicator       | Yes      |
| `statusSuccess` | color     | Current item marker glyph                 | No       |
| `textSecondary` | color     | Escape item suffix and no-results message | No       |
| `textTertiary`  | color     | Search placeholder text                   | No       |
| `iconSuccess`   | icon      | Current item marker glyph (✓)             | No       |
| `iconPrompt`    | icon      | Highlighted item indicator (❯)            | Yes      |
| `HintBar`       | component | Footer keyboard navigation hints          | No       |
