---
kind: component
name: TextHeading
description: Renders bold subheading text with an optional error variant.
version: 2
category: display

tokens:
    colors: [textSecondary, statusError]
    icons: []

props:
    type:
        type: string
        required: false
        description: >
            Optional variant. When set to "error", the heading uses `statusError`
            color instead of the default `textSecondary`.

    children:
        type: string
        required: true
        description: The text content to display.

dependencies:
    tokens:
        - name: textSecondary
          kind: color
          usage: "Default heading text color"
          required: true
        - name: statusError
          kind: color
          usage: "Error variant heading color"
          required: false
    components: []

accessibility:
    role: heading
    properties:
        aria-level: "2"
        aria-label: "{children}"
    announce:
        on_mount: "Heading: {children}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: "No visual adaptations needed; text content is already readable"
---

# TextHeading

A styled subheading used for section titles and secondary labels. Always bold,
defaulting to `textSecondary` color. The `"error"` variant switches to
`statusError` for error-context headings.

## Visual rules

- Text MUST be rendered **bold**
- Default color MUST be `textSecondary`
- When `type` is `"error"`, color MUST switch to `statusError`
- There MUST NOT be additional decoration, padding, or prefix

## Rendering example

Default:

```
Background Subagents
^^^^^^^^^^^^^^^^^^^^
bold / textSecondary
```

Error variant (`type: "error"`):

```
Something went wrong
^^^^^^^^^^^^^^^^^^^^
bold / statusError
```

## Dependencies

| Dependency      | Kind  | Usage                       | Required |
| --------------- | ----- | --------------------------- | -------- |
| `textSecondary` | color | Default heading text color  | Yes      |
| `statusError`   | color | Error variant heading color | No       |
