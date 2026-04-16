---
kind: component
name: Metric
description: >
    Displays a grid of character options with effort-level meters for visual
    comparison of glyph rendering at different fill states.
version: 2
category: display

tokens:
    colors: [textPrimary, textSecondary, textTertiary]
    icons: []

types:
    MetricChar:
        fields:
            code:
                type: string
                required: true
                description: >
                    The Unicode code point label for the character (e.g. "U+25A0").
            char:
                type: string | array<string>
                required: true
                description: >
                    The rendered character(s). A single string repeats the same glyph
                    across all effort levels. An array provides progressive variants
                    where each element maps to its corresponding effort level index.

    EffortLevel:
        description: >
            Union type representing an effort level label.
        values: ["low", "mid", "high", "max"]

props:
    chars:
        type: array<MetricChar>
        required: true
        description: Character options to display, one per row.

    levels:
        type: array<EffortLevel>
        required: false
        default: ["low", "mid", "high", "max"]
        description: >
            Effort levels to render as columns. Defaults to all four levels.

    activeColor:
        type: string
        required: false
        default: textPrimary
        description: >
            Semantic color token for active (filled) indicators.

    inactiveColor:
        type: string
        required: false
        default: textTertiary
        description: >
            Semantic color token for inactive (dimmed) indicators.

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Active indicator color (default)"
          required: true
        - name: textSecondary
          kind: color
          usage: "Header labels and code point labels"
          required: true
        - name: textTertiary
          kind: color
          usage: "Inactive indicator color (default)"
          required: true
    components: []

accessibility:
    role: img
    properties:
        aria-label: "Character metric grid"
    announce:
        on_mount: "Character metric grid with {n} characters across {m} effort levels"
    screen_reader_adaptations:
        - when: screen reader detected
          change: "Render metric data as a text table with character names and effort levels"
---

# Metric

A diagnostic grid that displays Unicode character options alongside effort-level
meters. Each row shows a character's code point, its rendered glyph, and a
series of columns — one per effort level — where the glyph is repeated with
progressive fill coloring. This helps visually compare how different glyphs
align with text at varying density levels.

## Visual rules

- The **header row** labels ("Code", "Char", and each level name) MUST use `textSecondary`
- **Code point** labels in each row MUST use `textSecondary`
- **Character glyphs** in the Char column MUST use the default foreground
- In effort-level columns, characters at or below the column's level index MUST use `activeColor`
- Characters above the column's level index MUST use `inactiveColor`
- Level labels beside each column MUST use `textSecondary`
- Columns MUST be separated by a 2-character gap
- Rows MUST be separated by a 1-line gap

## Rendering example

Given:

```
chars: [
  { code: "U+2580", char: "▀" },
  { code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] }
]
levels: ["low", "mid", "high", "max"]
```

Output (active = `textPrimary`, inactive = `textTertiary`):

```
Code      Char  low         mid         high        max
                ↓           ↓           ↓           ↓
U+2580    ▀     ▀▀▀▀ low   ▀▀▀▀ mid   ▀▀▀▀ high  ▀▀▀▀ max
                ^---        ^^--        ^^^-        ^^^^
                active/     active/     active/     all active
                rest inact  rest inact  rest inact

U+28xx    ⣀⣤⣶⣿  ⣀⣤⣶⣿ low  ⣀⣤⣶⣿ mid  ⣀⣤⣶⣿ high ⣀⣤⣶⣿ max
                ^---        ^^--        ^^^-        ^^^^
```

## Progressive vs uniform characters

- **Uniform** (`char: "▀"`): The same glyph is repeated once per effort level.
  Fill coloring progresses left to right — earlier positions light up first.
- **Progressive** (`char: ["⣀", "⣤", "⣶", "⣿"]`): Each effort level uses its
  own glyph variant from the array. The Char column shows all variants joined.

## Edge cases

- If `chars` is empty, only the header row MUST render
- If `char` is a progressive array shorter than `levels`, missing positions MUST render as a space
- Custom `levels` arrays MUST change both the column count and the header labels

## Dependencies

| Dependency      | Kind  | Usage                               | Required |
| --------------- | ----- | ----------------------------------- | -------- |
| `textPrimary`   | color | Active indicator color (default)    | Yes      |
| `textSecondary` | color | Header labels and code point labels | Yes      |
| `textTertiary`  | color | Inactive indicator color (default)  | Yes      |
