---
kind: component
name: ScrollBox
description: Scrollable viewport container with keyboard/mouse navigation, optional virtualization, and selection callbacks.
version: 2
category: layout

tokens:
    colors: [borderNeutral, selected]
    icons: []

types:
    ScrollState:
        fields:
            offset: { type: number, required: true, description: "Current scroll offset in display rows" }
            maxOffset: { type: number, required: true, description: "Maximum reachable offset for current content/viewport" }
            viewportHeight: { type: number, required: true, description: "Visible viewport height in rows" }
            contentHeight: { type: number, required: true, description: "Total content height in rows" }

    ScreenRegion:
        fields:
            startRow: { type: number, required: true, description: "Screen-row origin of selection start" }
            startCol: { type: number, required: true, description: "Screen-column origin of selection start" }
            endRow: { type: number, required: true, description: "Screen-row origin of selection end" }
            endCol: { type: number, required: true, description: "Screen-column origin of selection end" }

    ContentSelection:
        fields:
            startLine: { type: number, required: true, description: "Selection start line in content coordinates" }
            startChar: { type: number, required: true, description: "Selection start column in content coordinates" }
            endLine: { type: number, required: true, description: "Selection end line in content coordinates" }
            endChar: { type: number, required: true, description: "Selection end column in content coordinates" }

props:
    children:
        type: ReactNode
        required: true
        description: Scrollable content body.

    mouseScroll:
        type: boolean
        required: false
        default: true
        description: Enables wheel scrolling.

    keyboardScroll:
        type: boolean
        required: false
        default: true
        description: Enables keyboard scrolling shortcuts.

    showScrollbar:
        type: boolean
        required: false
        default: true
        description: Shows/hides vertical scrollbar track/thumb.

    textSelection:
        type: boolean
        required: false
        default: true
        description: Enables drag selection reporting.

    virtualized:
        type: boolean
        required: false
        default: false
        description: >
            In virtualized mode, each direct child is treated as one display row and
            only visible rows are rendered.

    onFocusLine:
        type: callback(index: number) → void
        required: false
        description: Fires when focus index changes via keyboard/mouse.

    onHoverLine:
        type: callback(index: number | null) → void
        required: false
        description: Fires when hovered row changes.

    onContentSelection:
        type: callback(selection: ContentSelection | null) → void
        required: false
        description: Reports content-coordinate text selection.

    onScreenRegion:
        type: callback(region: ScreenRegion | null) → void
        required: false
        description: Reports selection region mapped into absolute screen coordinates.

    onScroll:
        type: callback(state: ScrollState) → void
        required: false
        description: Fires on initial mount and whenever scroll offset changes.

    scrollTo:
        type: number
        required: false
        description: Imperative scroll target offset; clamped to valid range.

states:
    initial: idle
    definitions:
        idle:
            description: Mounted and awaiting input events.
            transitions:
                scroll: scrolling
                select: selecting
                focus: focusing
        scrolling:
            description: Offset changes from keyboard, mouse wheel, or scrollTo.
            transitions:
                settle: idle
        selecting:
            description: Mouse drag selection in progress.
            transitions:
                commit_selection: idle
                clear_selection: idle
        focusing:
            description: Focus index navigation mode.
            transitions:
                settle: idle

keyboard:
    "↑":
        action: Scroll up one row OR move focused line up when focus mode is active
    "↓":
        action: Scroll down one row OR move focused line down when focus mode is active
    pageup:
        action: Scroll up by one viewport page
    pagedown:
        action: Scroll down by one viewport page
    home:
        action: Jump to top (offset 0)
    end:
        action: Jump to bottom (offset maxOffset)
    j:
        action: Vim down
        same_as: "↓"
    k:
        action: Vim up
        same_as: "↑"
    ctrl+d:
        action: Scroll down by half viewport
    ctrl+u:
        action: Scroll up by half viewport
    g:
        action: Jump to top
    G:
        action: Jump to bottom

accessibility:
    role: region
    properties:
        aria-label: "Scrollable content"
    announce:
        on_mount: "Scrollable region"
        on_change: "Scroll position {offset} of {maxOffset}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Scrollbar chrome SHOULD be treated as decorative; logical text content
              remains primary output.

dependencies:
    tokens:
        - name: borderNeutral
          kind: color
          usage: "Scrollbar track"
          required: false
        - name: selected
          kind: color
          usage: "Scrollbar thumb"
          required: false
    components: []
    dependents:
        - name: Screen
          usage: "Main content viewport in page layouts"
---

# ScrollBox

ScrollBox provides a terminal viewport over potentially large content with support
for keyboard and mouse scrolling, focus navigation callbacks, and text selection
coordinate reporting.

## Visual rules

- Content MUST render in a constrained viewport and clip overflow
- When `showScrollbar=true` and content exceeds viewport, a 1-column scrollbar MUST render
- Scrollbar track MUST use `borderNeutral`; thumb MUST use `selected`
- When content fits viewport, scrollbar thumb MAY occupy full track height
- In `virtualized=true`, only the visible child slice MUST render

## Rendering example

Given:

```yaml
showScrollbar: true
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
  - "Item 4"
viewportHeight: 3
```

```
Item 0 │
Item 1 │
Item 2 │
```

After one down-scroll:

```
Item 1 │
Item 2 │
Item 3 │
```

## Behavior

### Scrolling

- Arrow keys MUST move by one row when keyboard scrolling is enabled
- PageUp/PageDown MUST move by one viewport page
- Home/g MUST jump to top; End/G MUST jump to bottom
- `ctrl+d` MUST move down by half viewport; `ctrl+u` MUST move up by half viewport
- All scrolling MUST clamp to `[0, maxOffset]`

### Focus mode

- When `onFocusLine` is provided, directional keys MUST update focused line index
- Focus index MUST NOT go below first or above last item
- Focus movement SHOULD auto-scroll to keep focused item visible

### Selection callbacks

- Drag selection MUST call `onContentSelection` with content coordinates
- Drag selection MUST call `onScreenRegion` with absolute screen coordinates
- Clearing selection MUST emit `null` to both callbacks

### Imperative scroll

- `scrollTo` MUST move to requested offset when provided
- `scrollTo` values above max MUST clamp to maxOffset
- `onScroll` MUST emit initial state on mount and subsequent offset updates

## Dependencies

| Dependency     | Kind      | Usage                       | Required |
| -------------- | --------- | --------------------------- | -------- |
| `borderNeutral`| color     | Scrollbar track             | No       |
| `selected`     | color     | Scrollbar thumb             | No       |
| `Screen`       | component | Typical parent integration  | No       |

## Edge cases

- With zero children, component MUST render safely without crashes
- With `keyboardScroll=false`, vim and arrow key scrolling MUST be disabled
- When content shrinks, current offset MUST clamp to new max offset
- Virtualized mode MUST treat each direct child as one display row
- Non-virtualized mode MUST support multi-row wrapped content trees
