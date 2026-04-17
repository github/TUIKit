---
kind: component
name: Table
description: Auto-sizing tabular data display with word wrapping, theme-aware borders, and per-cell coloring.
version: 2
category: display

tokens:
    colors: [textPrimary, borderNeutral]

types:
    TableCell:
        description: >
            A single cell value. Either a plain string (uses default text color)
            or a [text, color] tuple for per-cell coloring with semantic color tokens.
        union:
            - string
            - "[text: string, color: SemanticColor]"

    TableAlignment:
        description: Column text alignment.
        enum: [left, center, right]

props:
    rows:
        type: array<array<TableCell>>
        required: true
        description: >
            Data rows. Each inner array is one row; each element is a TableCell.
            Rows may have unequal lengths — missing cells render as empty.

    headers:
        type: array<string>
        required: false
        description: >
            Optional header row rendered bold. Participates in column-width calculation
            alongside data rows.

    width:
        type: number
        required: false
        description: >
            Maximum table width in columns. Capped at the detected container width.
            When omitted, the table fills all available horizontal space.

    borderStyle:
        type: '"single" | "none"'
        required: false
        default: '"single"'
        description: >
            Border rendering style. "single" draws box-drawing characters around cells;
            "none" removes all border and padding characters, using two-space column gaps.

    align:
        type: array<TableAlignment>
        required: false
        description: >
            Per-column text alignment. Indices correspond to column positions.
            Unspecified columns default to "left".

accessibility:
    role: table
    properties:
        aria-label: "Data table"
    announce:
        on_mount: "Table with {row_count} rows and {col_count} columns"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Borders are forced to "none". Box-drawing characters produce noise
              in linear reading; removing them yields clean tab-separated text
              that assistive tools can parse.

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Body text and header text"
          required: true
        - name: borderNeutral
          kind: color
          usage: "Box-drawing border characters"
          required: false
    components: []
    dependents: []
---

# Table

Renders tabular data with automatically sized columns, word wrapping, and
theme-aware borders. Supports optional headers and per-cell semantic coloring.

## Visual rules

- **Body text** MUST use `textPrimary` color
- **Borders** (when `borderStyle` is "single") MUST use `borderNeutral` color
- **Headers** MUST be rendered **bold** within the same `textPrimary` color
- **Per-cell coloring**: when a cell is a `[text, color]` tuple, the text MUST render
  in the specified semantic color instead of `textPrimary`
- **No-border mode** ("none"): borders, padding, and separator lines MUST be removed;
  columns MUST be separated by two spaces

## Layout rules

Column widths are computed automatically to fill the resolved width:

1. **Resolved width** = `min(width prop, available container width)`; when `width`
   is omitted, resolved width equals available container width.
2. **Available container width** is detected via layout measurement. A minimum of
   20 columns is enforced.
3. Column widths are distributed proportionally based on the longest content in each
   column (across both headers and data rows).
4. Words exceeding a column's content width are broken at the column boundary to
   prevent truncation.
5. Word wrapping happens on word boundaries when possible.
6. In "single" border mode, each cell has 1-character left and right padding.
   In "none" border mode, padding is zero.

## Rendering example

Given:

```
headers: ["Command", "Description"]
rows: [
  ["/help", "Show available commands"],
  ["/theme", "Change color theme"]
]
borderStyle: "single"
```

```
┌──────────┬────────────────────────┐
│ Command  │ Description            │
├──────────┼────────────────────────┤
│ /help    │ Show available commands│
│ /theme   │ Change color theme     │
└──────────┴────────────────────────┘
```

With `borderStyle: "none"`:

```
Command   Description
/help     Show available commands
/theme    Change color theme
```

## Rendering example (per-cell coloring)

Given:

```
rows: [
  [["ERR_TIMEOUT", statusError], "Connection timed out"],
  ["OK_200", "Success response"]
]
```

"ERR_TIMEOUT" renders in `statusError` color; all other cells use `textPrimary`.

## Edge cases

- **Empty rows array**: MUST render an empty container (no visible output)
- **Zero columns** (all rows empty): MUST render an empty container
- **Ragged rows** (unequal lengths): missing cells MUST render as empty strings
- **Long words**: MUST be broken at column boundary rather than truncated with ellipsis
- **Narrow terminal** (< 20 columns): minimum width of 20 MUST be enforced
- **Headers without data rows**: headers MUST NOT be rendered (requires at least one data row)
- **Container resizing**: column widths MUST recalculate when terminal width changes

## Dependencies

| Dependency      | Kind  | Usage                         | Required |
| --------------- | ----- | ----------------------------- | -------- |
| `textPrimary`   | color | Body text and header text     | Yes      |
| `borderNeutral` | color | Box-drawing border characters | No       |
