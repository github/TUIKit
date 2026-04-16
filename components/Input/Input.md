---
kind: component
name: Input
description: Text input with cursor navigation, UNIX keybindings, multiline support, and masking.
version: 2
category: input

tokens:
  colors: [textTertiary]
  icons: []

props:
  value:
    type: string
    required: true
    description: Current text value (controlled).

  onChange:
    type: callback(value: string)
    required: true
    description: Called when the text value changes.

  placeholder:
    type: string
    required: false
    default: ""
    description: Text displayed when value is empty.

  focus:
    type: boolean
    required: false
    default: true
    description: >
      Whether the input listens to keyboard events. Combined with
      terminal window focus to produce effective focus.

  mask:
    type: string
    required: false
    description: >
      Single character used to replace every character in the display.
      Useful for password fields (e.g., mask: "*").

  showCursor:
    type: boolean
    required: false
    default: true
    description: Whether to display the cursor with inverse video.

  onSubmit:
    type: callback(value: string)
    required: false
    description: Called when Enter is pressed (without backslash continuation).

  onSave:
    type: callback(value: string)
    required: false
    description: Called when Ctrl+S is pressed.

  cursorBlink:
    type: boolean
    required: false
    default: false
    description: Whether the cursor blinks on and off.

  cursorBlinkInterval:
    type: number
    required: false
    default: 530
    description: Blink interval in milliseconds.

  maxLines:
    type: number
    required: false
    default: 1
    description: >
      Maximum number of visible lines. When greater than 1, enables
      multiline editing with Shift+Enter for newlines.

  width:
    type: number
    required: false
    default: 0
    description: >
      Width for line wrapping. Required when maxLines > 1.
      Defaults to unlimited (no wrapping) for single-line inputs.

  onUpArrow:
    type: callback()
    required: false
    description: >
      Called when Up arrow is pressed while the cursor is on the first line.
      Used for history navigation or parent menu selection.

  onDownArrow:
    type: callback()
    required: false
    description: >
      Called when Down arrow is pressed while the cursor is on the last line.
      Used for history navigation or parent menu selection.

  singleLine:
    type: boolean
    required: false
    default: false
    description: >
      When true, prevents newline insertion (Shift+Enter, backslash+Enter)
      and strips newlines from pasted text.

  highlightPastedText:
    type: boolean
    required: false
    description: Reserved for API compatibility. Not currently used.

types:
  InputHandle:
    description: >
      Imperative handle exposed via ref. Allows programmatic text insertion
      at the current cursor position (e.g., for right-click paste).
    fields:
      insertText:
        type: callback(text: string)
        required: true
        description: Insert text at the current cursor position.

keyboard:
  # Character input
  "<char>":       { action: "insert character at cursor" }
  backspace:      { action: "delete character before cursor" }

  # Cursor movement
  "←":            { action: "move cursor left one character" }
  "→":            { action: "move cursor right one character" }
  "↑":            { action: "move cursor up one line (or fire onUpArrow at first line)" }
  "↓":            { action: "move cursor down one line (or fire onDownArrow at last line)" }
  home:           { action: "move to start of current visual line" }
  end:            { action: "move to end of current visual line" }
  ctrl+home:      { action: "move to absolute start of all text" }
  ctrl+end:       { action: "move to absolute end of all text" }

  # UNIX bindings
  ctrl+a:         { action: "move to start of visual line (cycles backward)" }
  ctrl+e:         { action: "move to end of visual line (cycles forward)" }
  ctrl+b:         { action: "move cursor left", same_as: "←" }
  ctrl+f:         { action: "move cursor right", same_as: "→" }
  ctrl+h:         { action: "backspace", same_as: backspace }
  ctrl+d:         { action: "forward delete" }
  ctrl+w:         { action: "delete word before cursor" }
  ctrl+u:         { action: "clear line before cursor" }
  ctrl+k:         { action: "clear line after cursor" }
  alt+left:       { action: "move cursor one word left" }
  alt+right:      { action: "move cursor one word right" }
  ctrl+left:      { action: "move cursor one word left", same_as: "alt+left" }
  ctrl+right:     { action: "move cursor one word right", same_as: "alt+right" }

  # Submission and special
  enter:          { action: "submit value via onSubmit (or newline if preceded by backslash)" }
  shift+enter:    { action: "insert newline (multiline only, ignored in singleLine mode)" }
  meta+enter:     { action: "insert newline (alternative)", same_as: "shift+enter" }
  ctrl+s:         { action: "fire onSave callback" }

  # Ignored (passed through to parent)
  ctrl+c:         { action: "ignored — handled by parent" }
  tab:            { action: "ignored — handled by parent" }
  shift+tab:      { action: "ignored — handled by parent" }
  escape:         { action: "ignored — handled by parent" }

accessibility:
  role: textbox
  properties:
    aria-label: "Text input"
    aria-multiline: "true when maxLines > 1"
  states:
    aria-disabled: "true when effective focus is lost"
  announce:
    on_mount: "Text input: {placeholder or empty}"
    on_change: "Character inserted or deleted at position {cursor}"
  screen_reader_adaptations:
    - when: screen reader detected
      change: "Cursor blink animation is disabled; cursor position is announced on movement"

variants:
  UncontrolledInput:
    description: >
      Convenience wrapper that manages its own state internally.
      Accepts initialValue instead of value/onChange.
    props_override:
      value: { removed: true }
      onChange: { required: false }
      initialValue:
        type: string
        required: false
        default: ""
        description: Starting text value.

dependencies:
  tokens:
    - name: textTertiary
      kind: color
      usage: "Placeholder text color"
      required: false
  components: []
---

# Input

A text input component with full UNIX keybinding support, cursor navigation,
multiline editing, masking, and placeholder display.

## Visual rules

- Text MUST be rendered in the default foreground color
- **Placeholder** text MUST use the `textTertiary` color token
- **Cursor** MUST be shown as inverse video on the character at the cursor position
- When the input is empty with a placeholder and cursor visible, the first
  placeholder character MUST be rendered with inverse video
- When the input is empty without a placeholder and cursor visible, a single
  inverse space MUST be rendered
- **Masked** text MUST replace every character with the mask character
- Cursor blink MUST toggle inverse video on/off at the configured interval
- Cursor MUST only be visible when the input has effective focus (prop focus AND
  terminal window focus)

## Rendering example

### Focused with text

```
hello wor█d
         ^
         inverse cursor at position 9
```

### Empty with placeholder

```
█ype a message...
^
inverse first char, rest in textTertiary
```

### Masked

```
●●●●●●●●█
         ^
         inverse cursor, all chars replaced with mask
```

### Multiline (maxLines: 3)

```
First line of text
Second line here
Third li█e visible
```

Lines beyond `maxLines` are scrolled out of view. The scroll offset adjusts
automatically to keep the cursor line visible.

## Behavior

### Focus

Effective focus is the combination of the `focus` prop AND terminal window
focus. When effective focus is lost:

- Keyboard input MUST be ignored
- Cursor MUST become invisible (no inverse video)
- Cursor blink MUST stop and reset to visible

### Cursor navigation

The cursor tracks a position within the text. In single-line mode, width is
treated as unlimited so all UNIX line-movement bindings operate on the entire
text. In multiline mode, the provided `width` drives visual line wrapping.

### Multiline

When `maxLines > 1`:

- Text MUST wrap at the `width` boundary into visual lines
- Shift+Enter (or Meta+Enter) MUST insert a newline character
- Up/Down arrows MUST navigate between visual lines
- At the first line, Up arrow MUST fire `onUpArrow`; at the last line, Down arrow
  MUST fire `onDownArrow`
- A scroll offset MUST keep the cursor line within the visible window

### Backslash continuation

When Enter is pressed and the character immediately before the cursor is a
backslash (`\`), the backslash MUST be removed and a newline MUST be inserted
instead of submitting. This mimics shell-style line continuation. This
behavior MUST be disabled in `singleLine` mode.

### Single-line mode

When `singleLine` is true:

- Shift+Enter and Meta+Enter MUST be ignored
- Backslash+Enter MUST NOT insert a newline
- Pasted text MUST have all newline characters stripped

## Dependencies

| Dependency     | Kind  | Usage                  | Required |
| -------------- | ----- | ---------------------- | -------- |
| `textTertiary` | color | Placeholder text color | No       |

## Edge cases

- If `focus` is true but the terminal window loses focus, input MUST be deactivated
- Cursor blink MUST reset to visible whenever focus changes
- An empty value with no placeholder and no cursor MUST render as empty text
- The `insertText` imperative handle MUST insert at the current cursor position
  and MUST trigger an onChange notification
