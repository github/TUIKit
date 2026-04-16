---
kind: component
name: Link
description: Terminal hyperlink using the OSC 8 escape sequence.
version: 2
category: navigation

tokens:
    colors: []
    icons: []

props:
    url:
        type: string
        required: true
        description: >
            The URL the link points to. Used to construct the OSC 8 hyperlink
            escape sequence.

    children:
        type: slot
        required: false
        description: >
            Display text for the link. When omitted, the URL itself is shown
            as the display text.

    color:
        type: SemanticColor
        required: false
        description: >
            Text color — must be a semantic color token from the color system.
            When omitted, the text inherits the surrounding color.

    bold:
        type: boolean
        required: false
        description: Whether to render the text as bold.

accessibility:
    role: link
    properties:
        aria-label: "{display text} ({url})"
    announce:
        on_mount: "Link: {display text}"
        on_change: "Link target changed to {url}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              OSC 8 escape sequences are omitted entirely. The link renders as
              plain styled text (with color and bold applied) so that screen
              reader output is not polluted with raw escape codes.

security:
    url_sanitization:
        description: >
            Before embedding the URL in the OSC 8 sequence, control characters
            (ESC \x1b, BEL \x07, C1 ST \x9c) are stripped from the URL. This
            prevents injection of escape sequences through malicious URLs.
        stripped_characters: ["\x1b", "\x07", "\x9c"]

dependencies:
    tokens: []
    components: []
---

# Link

A terminal hyperlink component that uses the OSC 8 escape sequence to make
text clickable in supporting terminals. Falls back to plain styled text in
screen reader mode for accessibility.

## Visual rules

- Text color MUST be set by the `color` prop (any semantic color token)
- Text weight MUST be set by the `bold` prop
- When `children` is omitted, the URL MUST be displayed as the link text
- The OSC 8 escape sequence MUST wrap the display text:
  `ESC]8;;<url>BEL<text>ESC]8;;BEL`
- In screen reader mode, only the styled display text MUST be rendered (no
  escape sequences)

## Rendering example

### Standard mode

Given:

```
url: "https://example.com"
children: "Click here"
color: markdownLink
```

Terminal output (with escape sequences):

```
\e]8;;https://example.com\aClick here\e]8;;\a
```

Visible to user:

```
Click here
^^^^^^^^^^
clickable hyperlink in markdownLink color
```

### URL as display text

Given:

```
url: "https://example.com"
```

Visible to user:

```
https://example.com
```

### Screen reader mode

Given:

```
url: "https://example.com"
children: "Click here"
color: markdownLink
bold: true
```

Output (no escape sequences):

```
Click here
^^^^^^^^^^
bold, markdownLink color, plain text
```

## Security

URLs are sanitized before embedding in OSC 8 sequences. The following
control characters are removed:

| Character | Hex    | Name                 |
| --------- | ------ | -------------------- |
| ESC       | `\x1b` | Escape               |
| BEL       | `\x07` | Bell                 |
| ST        | `\x9c` | C1 String Terminator |

This prevents an attacker from injecting arbitrary escape sequences via
a crafted URL.

## Dependencies

| Dependency | Kind | Usage                       | Required |
| ---------- | ---- | --------------------------- | -------- |
| _(none)_   | —    | No fixed token dependencies | —        |

## Edge cases

- A URL containing only control characters MUST be sanitized to an empty string,
  producing a no-op hyperlink
- The `color` prop MAY accept any semantic color token; it MUST NOT be restricted
  to a fixed set
- When both `children` and `color` are omitted, the link MUST render the URL as
  unstyled text with the OSC 8 sequence
