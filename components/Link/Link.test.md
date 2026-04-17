---
kind: test
component: Link
version: 1
---

# Link Tests — Basic Rendering

## renders children as display text

```props
url: "https://example.com"
children: "Click here"
```

```expect
Click here
```

## renders URL as display text when children omitted

```props
url: "https://example.com"
```

```expect
https://example.com
```

## applies color prop

```props
url: "https://example.com"
children: "Styled link"
color: markdownLink
```

```style
- selector: label("Styled link")
  color: markdownLink
```

## applies bold prop

```props
url: "https://example.com"
children: "Bold link"
bold: true
```

```style
- selector: label("Bold link")
  bold: true
```

## applies both color and bold

```props
url: "https://example.com"
children: "Fancy"
color: statusInfo
bold: true
```

```style
- selector: label("Fancy")
  color: statusInfo
  bold: true
```

## renders with no styling when color and bold omitted

```props
url: "https://example.com"
children: "Plain"
```

```style
- selector: label("Plain")
  bold: false
```

---

# Link Tests — OSC 8 Escape Sequence

## wraps text in OSC 8 sequence

```props
url: "https://example.com"
children: "Link"
```

```expect_raw
\e]8;;https://example.com\aLink\e]8;;\a
```

## uses URL as display text in OSC 8 when no children

```props
url: "https://github.com"
```

```expect_raw
\e]8;;https://github.com\ahttps://github.com\e]8;;\a
```

---

# Link Tests — URL Sanitization

## strips ESC character from URL

```props
url: "https://evil.com\x1b]malicious"
children: "Safe"
```

```expect_raw
\e]8;;https://evil.com]malicious\aSafe\e]8;;\a
```

## strips BEL character from URL

```props
url: "https://evil.com\x07inject"
children: "Safe"
```

```expect_raw
\e]8;;https://evil.cominject\aSafe\e]8;;\a
```

## strips C1 ST character from URL

```props
url: "https://evil.com\x9cbreak"
children: "Safe"
```

```expect_raw
\e]8;;https://evil.combreak\aSafe\e]8;;\a
```

## strips multiple control characters from URL

```props
url: "https://\x1b\x07\x9c.example.com"
children: "Clean"
```

```expect_raw
\e]8;;https://.example.com\aClean\e]8;;\a
```

## sanitized URL with all control characters produces empty href

```props
url: "\x1b\x07\x9c"
children: "Empty"
```

```expect_raw
\e]8;;\aEmpty\e]8;;\a
```

---

# Link Tests — Accessibility

## screen reader mode renders plain text without escape sequences

```props
url: "https://example.com"
children: "Click here"
```

```accessibility
screen_reader: true
```

```expect
Click here
```

## screen reader mode preserves color

```props
url: "https://example.com"
children: "Styled"
color: markdownLink
```

```accessibility
screen_reader: true
```

```style
- selector: label("Styled")
  color: markdownLink
```

## screen reader mode preserves bold

```props
url: "https://example.com"
children: "Bold"
bold: true
```

```accessibility
screen_reader: true
```

```style
- selector: label("Bold")
  bold: true
```

## screen reader mode shows URL when children omitted

```props
url: "https://example.com"
```

```accessibility
screen_reader: true
```

```expect
https://example.com
```

---

# Link Tests — Edge Cases

## handles empty children (renders URL)

```props
url: "https://example.com"
```

```expect
https://example.com
```

## handles URL with special characters

```props
url: "https://example.com/path?q=hello&lang=en#section"
children: "Search"
```

```expect
Search
```

## handles very long URL

```props
url: "https://example.com/a/very/deeply/nested/path/that/goes/on/and/on"
children: "Deep link"
```

```expect
Deep link
```
