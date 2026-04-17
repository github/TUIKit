---
kind: component
name: Screen
description: Full-height page shell that composes optional header/footer with a scrollable content region.
version: 2
category: layout

tokens:
    colors: [selectionBackground]
    icons: []

props:
    header:
        type: ReactNode
        required: false
        description: Optional top region, usually title/status content.

    children:
        type: ReactNode
        required: true
        description: Main body content.

    footer:
        type: ReactNode
        required: false
        description: Optional bottom region, often keyboard hints.

    onClose:
        type: callback() → void
        required: false
        description: Fires when Escape is pressed.

    scrollable:
        type: boolean
        required: false
        default: true
        description: When true, wraps children in ScrollBox; when false, renders children directly.

    textSelection:
        type: boolean
        required: false
        default: true
        description: Enables text selection forwarding from the internal ScrollBox.

    scrollTo:
        type: number
        required: false
        description: Imperative display-row offset forwarded to the internal ScrollBox.

    scrollKey:
        type: string | number
        required: false
        description: Remount key for the internal ScrollBox; changing it resets internal scroll state.

states:
    initial: active
    definitions:
        active:
            description: Screen is mounted and rendering header/content/footer.
            transitions:
                close: closed
        closed:
            description: onClose was fired from Escape.
            terminal: true
            emits: onClose

keyboard:
    escape:
        action: Fire onClose when provided
        note: No-op when onClose is not provided.

accessibility:
    role: region
    properties:
        aria-label: "Screen container"
    announce:
        on_mount: "Screen opened"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Selection overlay highlighting remains non-verbal and MUST NOT add
              spoken noise; only textual header/content/footer output is announced.

dependencies:
    tokens:
        - name: selectionBackground
          kind: color
          usage: "Selection highlight color pushed to selection overlay"
          required: true
    components:
        - name: ScrollBox
          usage: "Default scrollable content wrapper when scrollable is true"
          required: false
    dependents: []
---

# Screen

Screen is a page-level layout primitive for full-terminal flows. It stacks:

1. Optional header
2. Main content region
3. Optional footer

When `scrollable` is true (default), children are rendered through `ScrollBox`
to provide scrolling, screen-region selection callbacks, and clipboard integration.

## Visual rules

- The component MUST render in vertical document order: header, content, footer
- Header and footer MUST keep natural height (no forced expansion)
- Content region MUST consume remaining vertical space
- With `scrollable=true`, content MUST be wrapped by `ScrollBox`
- With `scrollable=false`, children MUST render directly without `ScrollBox`

## Rendering example

Given:

```yaml
header: "Title"
children: ["Line 1", "Line 2"]
footer: "Esc to close"
```

```
Title
Line 1
Line 2
Esc to close
```

## Behavior

### Escape close

- Pressing Escape MUST fire `onClose` when `onClose` is provided
- Pressing Escape MUST do nothing when `onClose` is omitted

### Scroll wrapper behavior

- `scrollable=true` MUST create an internal `ScrollBox` instance
- `scrollable=false` MUST skip creating `ScrollBox`
- `scrollTo` and `scrollKey` MUST only affect behavior when `scrollable=true`

### Selection lifecycle

- Selection region updates from the internal `ScrollBox` MUST be forwarded to the
  selection overlay when `textSelection=true`
- When `textSelection=false`, Screen MUST NOT forward region updates
- When content identity changes and an existing selection is stale, Screen MUST
  clear the active selection

## Dependencies

| Dependency            | Kind      | Usage                                              | Required |
| --------------------- | --------- | -------------------------------------------------- | -------- |
| `selectionBackground` | color     | Selection highlight color for overlay              | Yes      |
| `ScrollBox`           | component | Default content viewport when `scrollable` is true | No       |

## Edge cases

- If `onClose` is not provided, Escape MUST NOT throw or crash
- If `header` is omitted, content MUST render at the top without blank placeholder rows
- If `footer` is omitted, content MUST render through to the bottom without footer chrome
- If content is replaced with a new tree, stale selection coordinates MUST be cleared
