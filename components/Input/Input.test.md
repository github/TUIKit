---
kind: test
component: Input
version: 1
---

# Input Tests — Basic Rendering

## renders text value

```props
value: "hello"
onChange: callback
```

```expect
hello
```

## renders empty with cursor

```props
value: ""
onChange: callback
focus: true
showCursor: true
```

```expect
█
```

## renders placeholder when empty

```props
value: ""
placeholder: "Type here..."
onChange: callback
focus: true
showCursor: true
```

```expect
█ype here...
```

## renders placeholder without cursor when unfocused

```props
value: ""
placeholder: "Type here..."
onChange: callback
focus: false
```

```expect
Type here...
```

## renders empty without placeholder or cursor

```props
value: ""
onChange: callback
focus: false
showCursor: false
```

```expect

```

---

# Input Tests — Placeholder Styling

## placeholder uses textTertiary color

```props
value: ""
placeholder: "Search..."
onChange: callback
focus: false
```

```style
- selector: label("Search...")
  color: textTertiary
```

## placeholder partial text uses textTertiary after inverse first char

```props
value: ""
placeholder: "Search..."
onChange: callback
focus: true
showCursor: true
```

```style
- selector: label("earch...")
  color: textTertiary
```

---

# Input Tests — Cursor Display

## shows inverse cursor at position

```props
value: "abc"
onChange: callback
focus: true
showCursor: true
```

```expect
abc█
```

## hides cursor when showCursor is false

```props
value: "abc"
onChange: callback
focus: true
showCursor: false
```

```expect
abc
```

## hides cursor when focus is false

```props
value: "abc"
onChange: callback
focus: false
showCursor: true
```

```expect
abc
```

---

# Input Tests — Masking

## masks all characters

```props
value: "secret"
onChange: callback
mask: "*"
```

```expect
******
```

## masks with cursor

```props
value: "pass"
onChange: callback
mask: "●"
focus: true
showCursor: true
```

```expect
●●●●█
```

---

# Input Tests — Character Input

## inserts character at cursor

```props
value: ""
onChange: callback
focus: true
```

```input
"a"
```

```state
value: "a"
callback: onChange("a")
```

## inserts multiple characters sequentially

```props
value: ""
onChange: callback
focus: true
```

```input
"h" "i"
```

```state
value: "hi"
callback: onChange("hi")
```

---

# Input Tests — Backspace and Delete

## backspace deletes character before cursor

```props
value: "abc"
onChange: callback
focus: true
```

```input
backspace
```

```state
value: "ab"
callback: onChange("ab")
```

## ctrl+h acts as backspace

```props
value: "abc"
onChange: callback
focus: true
```

```input
ctrl+h
```

```state
value: "ab"
callback: onChange("ab")
```

## ctrl+d deletes character after cursor

```props
value: "abc"
onChange: callback
focus: true
```

```input
home ctrl+d
```

```state
value: "bc"
callback: onChange("bc")
```

---

# Input Tests — Word Operations

## ctrl+w deletes word before cursor

```props
value: "hello world"
onChange: callback
focus: true
```

```input
ctrl+w
```

```state
value: "hello "
callback: onChange("hello ")
```

## ctrl+u clears line before cursor

```props
value: "hello world"
onChange: callback
focus: true
```

```input
ctrl+u
```

```state
value: ""
callback: onChange("")
```

## ctrl+k clears line after cursor

```props
value: "hello world"
onChange: callback
focus: true
```

```input
home ctrl+k
```

```state
value: ""
callback: onChange("")
```

---

# Input Tests — Cursor Movement

## left arrow moves cursor left

```props
value: "abc"
onChange: callback
focus: true
showCursor: true
```

```input
←
```

```expect
ab█c
```

## right arrow moves cursor right from middle

```props
value: "abc"
onChange: callback
focus: true
showCursor: true
```

```input
← ← →
```

```expect
ab█c
```

## home moves to start of line

```props
value: "hello"
onChange: callback
focus: true
showCursor: true
```

```input
home
```

```expect
█ello
```

## end moves to end of line

```props
value: "hello"
onChange: callback
focus: true
showCursor: true
```

```input
home end
```

```expect
hello█
```

## ctrl+a moves to start of line

```props
value: "hello"
onChange: callback
focus: true
showCursor: true
```

```input
ctrl+a
```

```expect
█ello
```

## ctrl+e moves to end of line

```props
value: "hello"
onChange: callback
focus: true
showCursor: true
```

```input
home ctrl+e
```

```expect
hello█
```

## ctrl+b moves left

```props
value: "abc"
onChange: callback
focus: true
showCursor: true
```

```input
ctrl+b
```

```expect
ab█c
```

## ctrl+f moves right

```props
value: "abc"
onChange: callback
focus: true
showCursor: true
```

```input
ctrl+b ctrl+f
```

```expect
abc█
```

## alt+left moves one word left

```props
value: "hello world"
onChange: callback
focus: true
showCursor: true
```

```input
alt+left
```

```expect
hello █orld
```

## alt+right moves one word right

```props
value: "hello world"
onChange: callback
focus: true
showCursor: true
```

```input
home alt+right
```

```expect
hello█ world
```

---

# Input Tests — Submission

## enter fires onSubmit

```props
value: "done"
onChange: callback
onSubmit: callback
focus: true
```

```input
enter
```

```state
callback: onSubmit("done")
```

## backslash-enter inserts newline instead of submitting

```props
value: "line\\"
onChange: callback
onSubmit: callback
focus: true
```

```input
enter
```

```state
value: "line\n"
callback: onChange("line\n")
```

## backslash-enter is disabled in singleLine mode

```props
value: "line\\"
onChange: callback
onSubmit: callback
focus: true
singleLine: true
```

```input
enter
```

```state
callback: onSubmit("line\\")
```

---

# Input Tests — Save

## ctrl+s fires onSave

```props
value: "text"
onChange: callback
onSave: callback
focus: true
```

```input
ctrl+s
```

```state
callback: onSave("text")
```

---

# Input Tests — Multiline

## shift+enter inserts newline

```props
value: "line1"
onChange: callback
focus: true
maxLines: 3
width: 40
```

```input
shift+enter
```

```state
value: "line1\n"
callback: onChange("line1\n")
```

## up arrow at first line fires onUpArrow

```props
value: "first\nsecond"
onChange: callback
onUpArrow: callback
focus: true
maxLines: 3
width: 40
```

```input
ctrl+home ↑
```

```state
callback: onUpArrow()
```

## down arrow at last line fires onDownArrow

```props
value: "first\nsecond"
onChange: callback
onDownArrow: callback
focus: true
maxLines: 3
width: 40
```

```input
ctrl+end ↓
```

```state
callback: onDownArrow()
```

## up arrow navigates within text

```props
value: "first\nsecond"
onChange: callback
focus: true
maxLines: 3
width: 40
showCursor: true
```

```input
ctrl+end ↑
```

```expect
first█
second
```

## scrolls to keep cursor visible

```props
value: "line1\nline2\nline3\nline4\nline5"
onChange: callback
focus: true
maxLines: 2
width: 40
showCursor: true
```

```input
ctrl+end
```

```expect
line4
line5█
```

---

# Input Tests — Single-Line Mode

## shift+enter does nothing in singleLine mode

```props
value: "text"
onChange: callback
focus: true
singleLine: true
```

```input
shift+enter
```

```state
value: "text"
```

## strips newlines from pasted text in singleLine mode

```props
value: ""
onChange: callback
focus: true
singleLine: true
```

```input
"line1\nline2"
```

```state
value: "line1line2"
callback: onChange("line1line2")
```

---

# Input Tests — Cursor Blink

## cursor blinks at configured interval

```props
value: "text"
onChange: callback
focus: true
showCursor: true
cursorBlink: true
cursorBlinkInterval: 530
```

```state
cursor_visible: true
```

After 530ms:

```state
cursor_visible: false
```

After 1060ms:

```state
cursor_visible: true
```

## cursor blink resets when focus changes

```props
value: "text"
onChange: callback
focus: true
showCursor: true
cursorBlink: true
```

```state
cursor_visible: true
```

---

# Input Tests — Ignored Keys

## tab is ignored and passed to parent

```props
value: "text"
onChange: callback
focus: true
```

```input
tab
```

```state
value: "text"
```

## escape is ignored and passed to parent

```props
value: "text"
onChange: callback
focus: true
```

```input
escape
```

```state
value: "text"
```

## ctrl+c is ignored and passed to parent

```props
value: "text"
onChange: callback
focus: true
```

```input
ctrl+c
```

```state
value: "text"
```

---

# Input Tests — Imperative Handle

## insertText inserts at cursor position

```props
value: "helo"
onChange: callback
focus: true
```

```input
imperative:insertText("l")
```

```state
value: "helol"
callback: onChange("helol")
```
