---
kind: component
name: HintBar
description: Renders a row of keyboard shortcut hints with consistent styling.
version: 2
category: navigation

tokens:
    colors: [textPrimary, textSecondary]
    icons: []

props:
    hints:
        type: record<string, string | false | null>
        required: true
        description: >
            Key-value pairs where key is the keyboard shortcut and value is the
            action description. Falsy values (false, null, undefined) are filtered
            out, enabling conditional hints.

    separator:
        type: string
        required: false
        default: " · "
        description: Visual separator rendered between hint groups.

key_display_map:
    description: >
        Before rendering, shortcut keys are transformed through a display map.
        This normalizes raw key names to their visual representation.
    mappings:
        up: "↑"
        down: "↓"
        left: "←"
        right: "→"
        up-down: "↑↓"
        left-right: "←→"
        esc: "Esc"
        enter: "Enter"
        tab: "Tab"
        shift+tab: "Shift+Tab"
    fallback: Key string is rendered as-is (e.g., "s" stays "s", "q" stays "q")
    matching: case-insensitive

layout:
    direction: horizontal (inline)
    structure: "[key] [label] [separator] [key] [label] [separator] ..."
    wrapping: none (single line)

accessibility:
    role: status
    properties:
        aria-label: "Keyboard shortcuts"
    announce:
        on_mount: "Keyboard shortcuts: {hint_list}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: "Bold key formatting is removed; hints render as plain text pairs"

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Key label text (bold)"
          required: true
        - name: textSecondary
          kind: color
          usage: "Action label and separator text"
          required: true
    components: []
---

# HintBar

A horizontal row of keyboard shortcut hints. Each hint shows a **bold key** followed
by its action description, separated by a configurable delimiter.

## Visual rules

- The entire bar MUST use `textSecondary` as the base color
- Each **key** MUST be rendered bold in `textPrimary`
- Each **label** (action text) MUST be rendered in `textSecondary`
- The **separator** MUST be rendered in `textSecondary`
- A single space MUST separate the key from its label
- Falsy hint values MUST be silently excluded (no empty gaps)

## Rendering example

Given:

```
hints: { "up-down": "to navigate", "enter": "to select", "esc": "to cancel" }
```

Output:

```
↑↓ to navigate · Enter to select · Esc to cancel
^^                ^^^^^              ^^^
bold/textPrimary  bold/textPrimary   bold/textPrimary
   ^^^^^^^^^^^         ^^^^^^^^^        ^^^^^^^^^
   textSecondary       textSecondary    textSecondary
```

## Conditional hints

Falsy values enable conditional rendering without external logic:

```
hints: {
  "up-down": "to select",
  "s": hasComments && "to show (3)",
  "esc": "to close"
}
```

When `hasComments` is false, the "s" hint is excluded entirely.

## Exported utilities

- `formatKey(key: string) → string`: applies the key display map to a raw key name.
  This utility SHOULD be available independently of the component for use in
  other contexts that need consistent key formatting.

## Dependencies

| Dependency      | Kind  | Usage                           | Required |
| --------------- | ----- | ------------------------------- | -------- |
| `textPrimary`   | color | Key label text (bold)           | Yes      |
| `textSecondary` | color | Action label and separator text | Yes      |
