---
kind: component
name: Dialog
description: A bordered container with title, optional subtitle, content area, and footer.
version: 2
category: layout

tokens:
    colors: [textPrimary, textSecondary, borderNeutral]
    icons: []

props:
    title:
        type: string
        required: true
        description: Title displayed at the top of the dialog.

    subtitle:
        type: string
        required: false
        description: Optional subtitle or description rendered below the title.

    children:
        type: slot
        required: true
        description: Main content area of the dialog.

    footer:
        type: slot
        required: false
        description: Optional footer content (e.g., HintBar, action buttons).

    width:
        type: number | string
        required: false
        description: >
            Width constraint. Accepts a fixed number or a string like "100%".
            In border title placement mode, only numeric widths are honored;
            string widths fall back to terminal width.

    padding:
        type: number
        required: false
        default: 1
        description: Horizontal padding inside the dialog.

    showTitleDivider:
        type: boolean
        required: false
        default: true
        description: >
            Whether to render a horizontal divider between the title section
            and the content. Only applies when titlePlacement is "inside".

    titlePlacement:
        type: string
        required: false
        default: "inside"
        description: >
            Where to render the title.
            "inside" — title renders inside the box, below the top border.
            "border" — title is embedded in the top border line (╭ Title ───╮).

constants:
    MIN_DIALOG_WIDTH:
        value: 10
        description: >
            Minimum width for the dialog to prevent broken borders on narrow
            terminals. Applied in border title placement mode.

accessibility:
    role: dialog
    properties:
        aria-label: "Dialog: {title}"
        aria-modal: "true"
    announce:
        on_mount: "Dialog: {title}. {subtitle}"
        on_change: "Dialog content updated"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Bordered box-drawing chrome is removed. The dialog renders as a
              flat vertical stack: bold title, subtitle (if present), children,
              and footer — with no decorative borders or divider lines.

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Title text (bold)"
          required: true
        - name: textSecondary
          kind: color
          usage: "Subtitle text"
          required: false
        - name: borderNeutral
          kind: color
          usage: "Border and divider lines"
          required: true
    components: []
---

# Dialog

A bordered dialog container with a title and optional footer. Use it for
centered modals, confirmation dialogs, and focused action panels that need
visual separation from surrounding content.

## Visual rules

- Outer border MUST use round box-drawing characters in `borderNeutral` color
- **Title** MUST be bold `textPrimary`
- **Subtitle** MUST use `textSecondary`
- Content MUST inherit default text styling
- A horizontal **divider** in `borderNeutral` MUST separate the title section
  from the content (inside placement only, controlled by `showTitleDivider`)
- **Footer** MUST be separated from content by vertical padding equal to `padding`
- All internal sections MUST have horizontal padding equal to `padding`

### Border title placement

When `titlePlacement` is `"border"`:

- The top border line MUST embed the title: `╭ Title ────────╮`
- Title text MUST be bold `textPrimary`; border characters MUST be `borderNeutral`
- If the title exceeds the available inner width, it MUST be truncated with an
  ellipsis (`…`)
- The remaining box MUST have side and bottom borders only (no top border)
- Width MUST resolve to the numeric `width` prop or fall back to terminal width
- Width MUST be clamped to a minimum of `MIN_DIALOG_WIDTH` (10)

## Rendering example

### Inside placement (default)

```
╭──────────────────────────────╮
│ Confirm Action               │
│ This cannot be undone        │
│──────────────────────────────│
│ The file will be deleted.    │
│                              │
│ Enter to confirm · Esc cancel│
╰──────────────────────────────╯
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  title: bold/textPrimary
  subtitle: textSecondary
  divider: borderNeutral
  border: round/borderNeutral
```

### Border placement

```
╭ Session Info ────────────────╮
│ Model: GPT-4                 │
╰──────────────────────────────╯
  ^^^^^^^^^^^^^
  title embedded in top border: bold/textPrimary
```

## Screen reader mode

When a screen reader is detected, all box-drawing chrome is removed:

```
Confirm Action
This cannot be undone
The file will be deleted.
Enter to confirm · Esc cancel
```

Title is rendered bold; subtitle, content, and footer follow in a flat stack.

## Dependencies

| Dependency      | Kind  | Usage                    | Required |
| --------------- | ----- | ------------------------ | -------- |
| `textPrimary`   | color | Title text (bold)        | Yes      |
| `textSecondary` | color | Subtitle text            | No       |
| `borderNeutral` | color | Border and divider lines | Yes      |

## Edge cases

- When `titlePlacement` is `"border"` and `width` is a string (e.g., `"100%"`),
  the width MUST fall back to the terminal column count (default 80)
- Title truncation in border mode MUST preserve the ellipsis character within the
  available inner width
- An absent `footer` MUST produce no extra spacing at the bottom
- An absent `subtitle` MUST produce no extra line between title and content/divider
- `showTitleDivider` MUST have no effect in border placement mode
