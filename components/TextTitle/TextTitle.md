---
kind: component
name: TextTitle
description: Renders bold primary heading text with an optional error variant.
version: 2
category: display

tokens:
    colors: [statusError]
    icons: []

props:
    type:
        type: string
        required: false
        description: >
            Optional variant. When set to "error", the title uses `statusError`
            color instead of the terminal default foreground.

    children:
        type: string
        required: true
        description: The text content to display.

dependencies:
    tokens:
        - name: statusError
          kind: color
          usage: "Error variant title color"
          required: false
    components: []

accessibility:
    role: heading
    properties:
        aria-level: "1"
        aria-label: "{children}"
    announce:
        on_mount: "Title: {children}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: "No visual adaptations needed; text content is already readable"
---

# TextTitle

A primary heading for top-level section titles. Always bold, using the
terminal's default foreground color. The `"error"` variant overrides the
color to `statusError`.

## Visual rules

- Text MUST be rendered **bold**
- Default color MUST be the terminal's native foreground (no explicit color token)
- When `type` is `"error"`, color MUST switch to `statusError`
- There MUST NOT be additional decoration, padding, or prefix

## Rendering example

Default:

```
Background Tasks
^^^^^^^^^^^^^^^^
bold / default foreground
```

Error variant (`type: "error"`):

```
Error
^^^^^
bold / statusError
```

## Dependencies

| Dependency    | Kind  | Usage                     | Required |
| ------------- | ----- | ------------------------- | -------- |
| `statusError` | color | Error variant title color | No       |
