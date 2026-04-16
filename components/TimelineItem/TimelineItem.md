---
kind: component
name: TimelineItem
description: A configurable timeline entry with status icon, title, description, sub-items, and expandable content.
version: 2
category: display

tokens:
    colors:
        [
            textPrimary,
            textSecondary,
            textTertiary,
            statusSuccess,
            statusError,
            statusWarning,
            statusInfo,
            brand,
            selected,
            borderNeutral,
        ]
    icons: [CIRCLE_FILLED, CIRCLE_EMPTY, CROSS, WARNING, CHILD_LAST, CHILD_MIDDLE, CHILD_SKIP]

props:
    title:
        type: string
        required: true
        description: >
            Bold title text displayed after the status icon (e.g., tool name, action label).

    variant:
        type: TimelineItemVariant
        required: true
        description: >
            Visual variant controlling the icon glyph and color theme.
            Can be a named variant string or a custom variant object.

    nested:
        type: boolean
        required: false
        default: false
        description: >
            When true, hides the status icon, making this item appear as a child
            of a parent timeline entry. Used for nested/indented entries.

    description:
        type: string | ReactNode
        required: false
        description: >
            Short inline text shown next to the title on the same line.
            Strings are rendered in the variant's description color and truncated
            with ellipsis at the terminal edge. Use ReactNode for rich inline
            content (e.g., diff stats with colored counts).

    descriptionMultiline:
        type: boolean
        required: false
        default: false
        description: >
            When true, description wraps across multiple lines instead of truncating.
            Title and description are stacked vertically. Useful for prose-style
            entries (e.g., error messages, info notices).

    subItems:
        type: array<TimelineSubItem>
        required: false
        description: >
            Detail lines rendered below the header with tree connectors (├/└).
            Each sub-item can be a plain string or a ReactNode for rich content.
            String sub-items are word-wrapped to fit the terminal width.

    expanded:
        type: boolean
        required: false
        default: false
        description: >
            Whether the children content area is visible. Only relevant when
            children are provided.

    children:
        type: ReactNode
        required: false
        description: >
            Content rendered inside a bordered box when expanded is true.
            The box uses a left border in borderNeutral color with padding.

types:
    TimelineItemVariantName:
        description: Predefined visual variant names for TimelineItem.
        values: ["loading", "success", "error", "warning", "info", "muted", "brand", "selected"]

    TimelineItemCustomVariant:
        description: >
            Custom variant for edge cases where named variants don't fit.
            Use sparingly — prefer named variants for consistency.
        fields:
            icon:
                type: IconGlyph
                required: false
                default: CIRCLE_FILLED
                description: Icon glyph to display
            iconColor:
                type: SemanticColor
                required: true
                description: Color for the icon
            titleColor:
                type: SemanticColor
                required: false
                default: terminal foreground
                description: Color for the title text
            descriptionColor:
                type: SemanticColor
                required: false
                default: textSecondary
                description: Color for the description text
            subItemColor:
                type: SemanticColor
                required: false
                default: textSecondary
                description: Color for sub-item text
            backgroundColor:
                type: SemanticColor
                required: false
                description: Background color for the entire item (transparent if omitted)

    TimelineItemVariant:
        description: Either a named variant string or a custom variant object.
        union: [TimelineItemVariantName, TimelineItemCustomVariant]

    TimelineSubItem:
        description: >
            A sub-item entry — either a plain string (rendered with variant color)
            or a ReactNode for rich inline content. Tree connectors are prepended
            automatically.
        union: [string, ReactNode]

accessibility:
    role: listitem
    properties:
        aria-label: "Timeline entry"
    announce:
        on_mount: "{variant}: {title}"
        on_change: "{title} — {description}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Icon glyphs are replaced with text prefixes indicating variant
              (e.g., "[success]", "[error]"). Tree connectors are replaced with
              indentation for clean linear reading.

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Expanded sub-item text color"
          required: true
        - name: textSecondary
          kind: color
          usage: "Default description and sub-item text"
          required: true
        - name: textTertiary
          kind: color
          usage: "Muted variant icon and sub-item color"
          required: false
        - name: statusSuccess
          kind: color
          usage: "Success variant icon color"
          required: false
        - name: statusError
          kind: color
          usage: "Error variant icon and sub-item color"
          required: false
        - name: statusWarning
          kind: color
          usage: "Warning variant icon color"
          required: false
        - name: statusInfo
          kind: color
          usage: "Info variant icon color"
          required: false
        - name: brand
          kind: color
          usage: "Brand variant icon color"
          required: false
        - name: selected
          kind: color
          usage: "Selected variant icon color"
          required: false
        - name: borderNeutral
          kind: color
          usage: "Tree connectors and expanded content border"
          required: true
        - name: CIRCLE_FILLED
          kind: icon
          usage: "Icon for success, info, brand, selected variants"
          required: true
        - name: CIRCLE_EMPTY
          kind: icon
          usage: "Icon for loading and muted variants"
          required: true
        - name: CROSS
          kind: icon
          usage: "Icon for error variant"
          required: false
        - name: WARNING
          kind: icon
          usage: "Icon for warning variant"
          required: false
        - name: CHILD_LAST
          kind: icon
          usage: "Last sub-item tree connector (└)"
          required: true
        - name: CHILD_MIDDLE
          kind: icon
          usage: "Middle sub-item tree connector (├)"
          required: false
        - name: CHILD_SKIP
          kind: icon
          usage: "Continuation connector for non-last sub-items (│)"
          required: true
    components: []
    dependents: []

variants:
    loading:
        icon: CIRCLE_EMPTY
        iconColor: textSecondary
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary

    success:
        icon: CIRCLE_FILLED
        iconColor: statusSuccess
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary

    error:
        icon: CROSS
        iconColor: statusError
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: statusError

    warning:
        icon: WARNING
        iconColor: statusWarning
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary

    info:
        icon: CIRCLE_FILLED
        iconColor: statusInfo
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary

    muted:
        icon: CIRCLE_EMPTY
        iconColor: textTertiary
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textTertiary

    brand:
        icon: CIRCLE_FILLED
        iconColor: brand
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary

    selected:
        icon: CIRCLE_FILLED
        iconColor: selected
        titleColor: terminal foreground
        descriptionColor: textSecondary
        subItemColor: textSecondary
---

# TimelineItem

A configurable timeline entry primitive. Renders a status icon, bold title,
optional inline description, optional sub-items with tree connectors (├/└),
and an optional expandable bordered content area.

## Visual rules

- The **icon** MUST be rendered with the variant's `iconColor` and MUST be `aria-hidden`
- A space MUST separate the icon from the title
- The **title** MUST always be **bold**, colored with the variant's `titleColor`
  (terminal foreground when unset)
- The **description** MUST follow the title on the same line, in `descriptionColor`
- String descriptions MUST be truncated with ellipsis at the terminal edge;
  newlines in strings MUST be replaced with spaces
- When `descriptionMultiline` is true, title and description MUST stack vertically
  and description MUST wrap instead of truncating
- When `nested` is true, the icon MUST be hidden entirely (no gutter space)
- **Sub-items** MUST be indented 2 columns and prefixed with tree connectors:
    - Last sub-item MUST use `└` (CHILD_LAST)
    - Non-last sub-items MUST use `│` (CHILD_SKIP) connector
    - Tree connectors MUST be rendered in `borderNeutral` color and MUST be `aria-hidden`
- String sub-items MUST be word-wrapped to `terminalWidth - 4` characters
- When content is expanded, string sub-items MUST use `textPrimary` instead of `subItemColor`
- **Expanded content** MUST be rendered in a box with a left border in `borderNeutral`,
  with left padding and vertical padding, appearing above sub-items
- ReactNode sub-items that are non-last MUST be wrapped with a continuous left border
  (│ connector); last ReactNode sub-items MUST show └ prefix

## Layout structure

```
[icon] [title] [description]          ← header row
  ┊                                   ← 2-col indent
  │ ┌─────────────────────┐
  │ │  expanded content    │          ← bordered box (when expanded=true)
  │ └─────────────────────┘
  ├ sub-item 1                        ← tree connector + text
  └ sub-item 2 (last)                 ← last uses └
```

## Rendering example

Given `variant="success"`, `title="Grep"`, `description='"pattern" in *.ts'`,
`subItems=["5 files found"]`:

```
● Grep "pattern" in *.ts
  └ 5 files found
```

Given `variant="error"`, `title="Build"`, `subItems=["Error on line 42", "Missing import"]`:

```
✗ Build
  ├ Error on line 42
  └ Missing import
```

## Variant reference

| Name     | Icon | Icon Color    | Sub-item Color |
| -------- | ---- | ------------- | -------------- |
| loading  | ○    | textSecondary | textSecondary  |
| success  | ●    | statusSuccess | textSecondary  |
| error    | ✗    | statusError   | statusError    |
| warning  | !    | statusWarning | textSecondary  |
| info     | ●    | statusInfo    | textSecondary  |
| muted    | ○    | textTertiary  | textTertiary   |
| brand    | ●    | brand         | textSecondary  |
| selected | ●    | selected      | textSecondary  |

## Custom variants

Custom variants allow specifying each color field individually. They should
be used sparingly for one-off cases (e.g., mode-specific tinting). Omitted
fields fall back to sensible defaults (CIRCLE_FILLED icon, terminal foreground
title, textSecondary description/sub-items, no background).

## Edge cases

- **Empty title**: when title is an empty string, title text MUST NOT be rendered
  but the icon and description MUST still appear
- **Description with newlines**: in single-line mode (default), newlines MUST be
  replaced with spaces before truncation
- **ReactNode description**: MUST be rendered as-is (no truncation or newline handling)
- **ReactNode sub-items**: non-last items MUST get a continuous left border for
  multi-line content; last items MUST get a └ prefix with flex layout
- **No sub-items or children**: only the header row MUST render
- **Expanded without children**: content box MUST NOT appear (guarded by children != null)
- **Sub-item wrapping**: string sub-items MUST be hard-wrapped at terminal width minus
  the indent and connector space (4 columns total); continuation lines
  MUST use the same connector style (│ or space depending on position)

## Dependencies

| Dependency      | Kind  | Usage                                             | Required |
| --------------- | ----- | ------------------------------------------------- | -------- |
| `textPrimary`   | color | Expanded sub-item text color                      | Yes      |
| `textSecondary` | color | Default description and sub-item text             | Yes      |
| `textTertiary`  | color | Muted variant icon and sub-item color             | No       |
| `statusSuccess` | color | Success variant icon color                        | No       |
| `statusError`   | color | Error variant icon and sub-item color             | No       |
| `statusWarning` | color | Warning variant icon color                        | No       |
| `statusInfo`    | color | Info variant icon color                           | No       |
| `brand`         | color | Brand variant icon color                          | No       |
| `selected`      | color | Selected variant icon color                       | No       |
| `borderNeutral` | color | Tree connectors and expanded content border       | Yes      |
| `CIRCLE_FILLED` | icon  | Icon for success, info, brand, selected variants  | Yes      |
| `CIRCLE_EMPTY`  | icon  | Icon for loading and muted variants               | Yes      |
| `CROSS`         | icon  | Icon for error variant                            | No       |
| `WARNING`       | icon  | Icon for warning variant                          | No       |
| `CHILD_LAST`    | icon  | Last sub-item tree connector (└)                  | Yes      |
| `CHILD_MIDDLE`  | icon  | Middle sub-item tree connector (├)                | No       |
| `CHILD_SKIP`    | icon  | Continuation connector for non-last sub-items (│) | Yes      |
