---
kind: component
name: Icons
description: Factory system for creating icon components with consistent accessibility and optional semantic coloring.
version: 2
category: display

tokens:
    colors: [statusSuccess, statusError, statusWarning, statusInfo, textSecondary, selected, brand, textTertiary]
    icons:
        [
            CHECK,
            CROSS,
            WARNING,
            CIRCLE_FILLED,
            CIRCLE_HALF,
            CIRCLE_EMPTY,
            DISABLED,
            CHEVRON_RIGHT,
            ARROW_RIGHT,
            ARROW_LEFT,
            ARROW_UP,
            ARROW_DOWN,
            SCROLLBAR,
            CHECKBOX_CHECKED,
            CHECKBOX_UNCHECKED,
            DOT_SEPARATOR,
            BULLET,
            CHILD_LAST,
            CHILD_MIDDLE,
            CHILD_SKIP,
        ]

factories:
    createIcon:
        description: >
            Creates a basic icon component that renders a Unicode glyph with optional
            explicit color and accessibility attributes.
        parameters:
            glyph:
                type: string
                description: The Unicode character to render
            defaultLabel:
                type: string
                description: >
                    Default aria-label for screen readers. When empty string,
                    the icon is decorative by default.
        returns:
            type: IconComponent
            props: IconProps

    createColoredIcon:
        description: >
            Creates a semantic icon component that supports automatic coloring via
            the `colored` prop. When `colored` is true, the icon automatically applies
            the mapped semantic color from the color token system. Otherwise behaves
            like a basic icon with manual `color` prop.
        parameters:
            glyph:
                type: string
                description: The Unicode character to render
            defaultLabel:
                type: string
                description: Default aria-label for screen readers
            semanticColorKey:
                type: string
                description: >
                    Key in the semantic color token map to use when colored=true
                    (e.g., "statusSuccess", "statusError")
        returns:
            type: SemanticIconComponent
            props: SemanticIconProps

props:
    label:
        type: string
        required: false
        description: >
            Override the default aria-label. Useful when the same icon glyph
            is reused in different semantic contexts.

    decorative:
        type: boolean
        required: false
        description: >
            If true, the icon is hidden from screen readers (aria-hidden="true")
            and no aria-label is set. Defaults to true when the effective label
            is an empty string.

    color:
        type: SemanticColor
        required: false
        description: >
            Explicit color override. Must be a semantic color token value, not a
            raw color string. Available on both IconProps and SemanticIconProps
            (mutually exclusive with colored on SemanticIconProps).

    colored:
        type: boolean
        required: false
        description: >
            SemanticIconProps only. When true, automatically applies the semantic
            color mapped at factory creation time. Cannot be used together with
            the color prop.

instances:
    semantic_icons:
        description: Icons created with createColoredIcon — support the colored prop
        items:
            IconSuccess:
                glyph: CHECK (✓)
                defaultLabel: "Success"
                semanticColorKey: statusSuccess
            IconError:
                glyph: CROSS (✗)
                defaultLabel: "Error"
                semanticColorKey: statusError
            IconWarning:
                glyph: WARNING (!)
                defaultLabel: "Warning"
                semanticColorKey: statusWarning
            IconInfoCompleted:
                glyph: CIRCLE_FILLED (●)
                defaultLabel: "Completed"
                semanticColorKey: statusInfo
            IconDisabled:
                glyph: DISABLED (⊘)
                defaultLabel: "Disabled"
                semanticColorKey: textSecondary

    standard_icons:
        description: Icons created with createIcon — use explicit color prop only
        items:
            IconPrompt:
                glyph: CHEVRON_RIGHT (❯)
                defaultLabel: "Prompt"
            IconInfoWorking:
                glyph: CIRCLE_HALF (◐)
                defaultLabel: "In progress"
            IconInfoEmpty:
                glyph: CIRCLE_EMPTY (○)
                defaultLabel: "Empty"
            IconArrowRight:
                glyph: ARROW_RIGHT (→)
                defaultLabel: "Keyboard Right"
            IconArrowLeft:
                glyph: ARROW_LEFT (←)
                defaultLabel: "Keyboard Left"
            IconArrowUp:
                glyph: ARROW_UP (↑)
                defaultLabel: "Keyboard Up"
            IconArrowDown:
                glyph: ARROW_DOWN (↓)
                defaultLabel: "Keyboard Down"
            IconScrollbar:
                glyph: SCROLLBAR (▋)
                defaultLabel: ""
                note: Decorative by default (empty label)
            IconCheckboxChecked:
                glyph: CHECKBOX_CHECKED ([✓])
                defaultLabel: "Checked"
            IconCheckboxUnchecked:
                glyph: CHECKBOX_UNCHECKED ([ ])
                defaultLabel: "Unchecked"
            IconSeparatorWord:
                glyph: DOT_SEPARATOR (·)
                defaultLabel: ""
                note: Decorative by default (empty label)
            IconSeparatorList:
                glyph: BULLET (•)
                defaultLabel: ""
                note: Decorative by default (empty label)
            IconNestingLast:
                glyph: CHILD_LAST (└)
                defaultLabel: ""
                note: Decorative by default (empty label)
            IconNestingMiddle:
                glyph: CHILD_MIDDLE (├)
                defaultLabel: ""
                note: Decorative by default (empty label)
            IconNestingSkip:
                glyph: CHILD_SKIP (│)
                defaultLabel: ""
                note: Decorative by default (empty label)

accessibility:
    role: img
    properties:
        aria-label: "{defaultLabel} (overridden by label prop)"
        aria-hidden: "true when decorative"
    announce:
        on_mount: "{label} (when not decorative)"
    screen_reader_adaptations:
        - when: screen reader detected
          change: 'Icons with non-empty labels MUST be announced by their aria-label. Icons with empty labels (or decorative=true) MUST be hidden via aria-hidden="true".'

dependencies:
    tokens:
        - name: statusSuccess
          kind: color
          usage: "IconSuccess semantic color"
          required: true
        - name: statusError
          kind: color
          usage: "IconError semantic color"
          required: true
        - name: statusWarning
          kind: color
          usage: "IconWarning semantic color"
          required: true
        - name: statusInfo
          kind: color
          usage: "IconInfoCompleted semantic color"
          required: true
        - name: textSecondary
          kind: color
          usage: "IconDisabled semantic color"
          required: true
        - name: selected
          kind: color
          usage: "Selection indicator color"
          required: false
        - name: brand
          kind: color
          usage: "Brand-colored icon variant"
          required: false
        - name: textTertiary
          kind: color
          usage: "Tertiary text color for icons"
          required: false
        - name: CHECK
          kind: icon
          usage: "Success glyph (✓)"
          required: true
        - name: CROSS
          kind: icon
          usage: "Error glyph (✗)"
          required: true
        - name: WARNING
          kind: icon
          usage: "Warning glyph (!)"
          required: true
        - name: CIRCLE_FILLED
          kind: icon
          usage: "Completed state glyph (●)"
          required: true
        - name: CIRCLE_HALF
          kind: icon
          usage: "In-progress state glyph (◐)"
          required: true
        - name: CIRCLE_EMPTY
          kind: icon
          usage: "Empty state glyph (○)"
          required: true
        - name: DISABLED
          kind: icon
          usage: "Disabled state glyph (⊘)"
          required: true
        - name: CHEVRON_RIGHT
          kind: icon
          usage: "Prompt indicator glyph (❯)"
          required: true
        - name: ARROW_RIGHT
          kind: icon
          usage: "Right arrow glyph (→)"
          required: true
        - name: ARROW_LEFT
          kind: icon
          usage: "Left arrow glyph (←)"
          required: true
        - name: ARROW_UP
          kind: icon
          usage: "Up arrow glyph (↑)"
          required: true
        - name: ARROW_DOWN
          kind: icon
          usage: "Down arrow glyph (↓)"
          required: true
        - name: SCROLLBAR
          kind: icon
          usage: "Scrollbar indicator glyph (▋)"
          required: true
        - name: CHECKBOX_CHECKED
          kind: icon
          usage: "Checked checkbox glyph ([✓])"
          required: true
        - name: CHECKBOX_UNCHECKED
          kind: icon
          usage: "Unchecked checkbox glyph ([ ])"
          required: true
        - name: DOT_SEPARATOR
          kind: icon
          usage: "Word separator glyph (·)"
          required: true
        - name: BULLET
          kind: icon
          usage: "List separator glyph (•)"
          required: true
        - name: CHILD_LAST
          kind: icon
          usage: "Last nesting connector (└)"
          required: true
        - name: CHILD_MIDDLE
          kind: icon
          usage: "Middle nesting connector (├)"
          required: true
        - name: CHILD_SKIP
          kind: icon
          usage: "Skip nesting connector (│)"
          required: true
    components: []
---

# Icons

A factory-based icon system that produces consistent, accessible icon components.
Two factory functions create all icon instances:

- **`createIcon`** — produces basic icons with optional explicit `color` prop
- **`createColoredIcon`** — produces semantic icons that support `colored` prop
  for automatic semantic coloring, plus explicit `color` as a fallback

## Visual rules

- Each icon MUST render a single Unicode glyph from the icon token system
- Color MUST be applied to the glyph text only (no background)
- When no color is provided, the icon MUST inherit the terminal foreground color
- Semantic icons with `colored=true` MUST use their mapped color token automatically
- The `color` and `colored` props MUST NOT be used together on semantic icons

## Accessibility rules

- Every icon MUST have a **default aria-label** set at factory creation time
- The `label` prop MUST override the default aria-label
- When the effective label is an empty string, the icon MUST be **decorative by default**:
  `aria-hidden="true"` MUST be set and `aria-label` MUST NOT be set
- The `decorative` prop MUST explicitly override the auto-detection:
    - `decorative=true` → MUST be aria-hidden, no label
    - `decorative=false` → MUST be announced, even if label is empty

## Factory pattern

### createIcon(glyph, defaultLabel)

Returns a component that renders `glyph` with:

- Optional `color` (explicit SemanticColor)
- Optional `label` (overrides defaultLabel)
- Optional `decorative` (overrides auto-detection)

### createColoredIcon(glyph, defaultLabel, semanticColorKey)

Returns a component with all `createIcon` capabilities plus:

- `colored=true` → automatically applies `colors[semanticColorKey]`
- `colored=false` (or omitted) + `color` → uses explicit color

The discriminated union ensures `colored` and `color` cannot both be provided.

## Rendering example

```
✓ Success       ← IconSuccess with colored=true → statusSuccess color
✗ Error         ← IconError with colored=true → statusError color
❯               ← IconPrompt with color=selected → selected color
○               ← IconInfoEmpty (no color) → terminal foreground
```

## Pre-built instance reference

### Semantic icons (support colored prop)

| Instance          | Glyph | Label     | Semantic Color |
| ----------------- | ----- | --------- | -------------- |
| IconSuccess       | ✓     | Success   | statusSuccess  |
| IconError         | ✗     | Error     | statusError    |
| IconWarning       | !     | Warning   | statusWarning  |
| IconInfoCompleted | ●     | Completed | statusInfo     |
| IconDisabled      | ⊘     | Disabled  | textSecondary  |

### Standard icons (explicit color only)

| Instance              | Glyph | Label          | Decorative? |
| --------------------- | ----- | -------------- | ----------- |
| IconPrompt            | ❯     | Prompt         | No          |
| IconInfoWorking       | ◐     | In progress    | No          |
| IconInfoEmpty         | ○     | Empty          | No          |
| IconArrowRight        | →     | Keyboard Right | No          |
| IconArrowLeft         | ←     | Keyboard Left  | No          |
| IconArrowUp           | ↑     | Keyboard Up    | No          |
| IconArrowDown         | ↓     | Keyboard Down  | No          |
| IconScrollbar         | ▋     | (none)         | Yes         |
| IconCheckboxChecked   | [✓]   | Checked        | No          |
| IconCheckboxUnchecked | [ ]   | Unchecked      | No          |
| IconSeparatorWord     | ·     | (none)         | Yes         |
| IconSeparatorList     | •     | (none)         | Yes         |
| IconNestingLast       | └     | (none)         | Yes         |
| IconNestingMiddle     | ├     | (none)         | Yes         |
| IconNestingSkip       | │     | (none)         | Yes         |

## Dependencies

| Dependency           | Kind  | Usage                            | Required |
| -------------------- | ----- | -------------------------------- | -------- |
| `statusSuccess`      | color | IconSuccess semantic color       | Yes      |
| `statusError`        | color | IconError semantic color         | Yes      |
| `statusWarning`      | color | IconWarning semantic color       | Yes      |
| `statusInfo`         | color | IconInfoCompleted semantic color | Yes      |
| `textSecondary`      | color | IconDisabled semantic color      | Yes      |
| `selected`           | color | Selection indicator color        | No       |
| `brand`              | color | Brand-colored icon variant       | No       |
| `textTertiary`       | color | Tertiary text color for icons    | No       |
| `CHECK`              | icon  | Success glyph (✓)                | Yes      |
| `CROSS`              | icon  | Error glyph (✗)                  | Yes      |
| `WARNING`            | icon  | Warning glyph (!)                | Yes      |
| `CIRCLE_FILLED`      | icon  | Completed state glyph (●)        | Yes      |
| `CIRCLE_HALF`        | icon  | In-progress state glyph (◐)      | Yes      |
| `CIRCLE_EMPTY`       | icon  | Empty state glyph (○)            | Yes      |
| `DISABLED`           | icon  | Disabled state glyph (⊘)         | Yes      |
| `CHEVRON_RIGHT`      | icon  | Prompt indicator glyph (❯)       | Yes      |
| `ARROW_RIGHT`        | icon  | Right arrow glyph (→)            | Yes      |
| `ARROW_LEFT`         | icon  | Left arrow glyph (←)             | Yes      |
| `ARROW_UP`           | icon  | Up arrow glyph (↑)               | Yes      |
| `ARROW_DOWN`         | icon  | Down arrow glyph (↓)             | Yes      |
| `SCROLLBAR`          | icon  | Scrollbar indicator glyph (▋)    | Yes      |
| `CHECKBOX_CHECKED`   | icon  | Checked checkbox glyph ([✓])     | Yes      |
| `CHECKBOX_UNCHECKED` | icon  | Unchecked checkbox glyph ([ ])   | Yes      |
| `DOT_SEPARATOR`      | icon  | Word separator glyph (·)         | Yes      |
| `BULLET`             | icon  | List separator glyph (•)         | Yes      |
| `CHILD_LAST`         | icon  | Last nesting connector (└)       | Yes      |
| `CHILD_MIDDLE`       | icon  | Middle nesting connector (├)     | Yes      |
| `CHILD_SKIP`         | icon  | Skip nesting connector (│)       | Yes      |
