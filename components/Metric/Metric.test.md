---
kind: test
component: Metric
version: 1
---

# Metric Tests

## renders header row with default levels

```props
chars: []
levels: ["low", "mid", "high", "max"]
```

```expect
Code      Char  low         mid         high        max
```

```style
- selector: label("Code")
  color: textSecondary
- selector: label("Char")
  color: textSecondary
- selector: label("low")
  color: textSecondary
```

## renders a uniform character row

```props
chars: [{ code: "U+2580", char: "▀" }]
```

```expect
Code      Char  low         mid         high        max

U+2580    ▀     ▀▀▀▀ low   ▀▀▀▀ mid   ▀▀▀▀ high  ▀▀▀▀ max
```

## renders a progressive character row

```props
chars: [{ code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] }]
```

```expect
Code      Char  low         mid         high        max

U+28xx    ⣀⣤⣶⣿  ⣀⣤⣶⣿ low  ⣀⣤⣶⣿ mid  ⣀⣤⣶⣿ high ⣀⣤⣶⣿ max
```

## progressive char column shows all variants joined

```props
chars: [{ code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] }]
```

```style
- selector: label("⣀⣤⣶⣿")
  color: null
```

## uniform active/inactive coloring in low column

```props
chars: [{ code: "U+2580", char: "▀" }]
```

```style
- selector: item(0)
  description: "In the 'low' column, first char is active, rest inactive"
- selector: indicator(0)
  color: textPrimary
```

## progressive active/inactive coloring progresses per column

```props
chars: [{ code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] }]
```

```style
- selector: item(0)
  description: >
    In each effort column, characters at or below the column index use
    activeColor (textPrimary), characters above use inactiveColor (textTertiary).
```

## custom levels changes column count

```props
chars: [{ code: "U+2580", char: "▀" }]
levels: ["low", "max"]
```

```expect
Code      Char  low       max

U+2580    ▀     ▀▀ low   ▀▀ max
```

## code column uses textSecondary

```props
chars: [{ code: "U+2580", char: "▀" }]
```

```style
- selector: label("U+2580")
  color: textSecondary
```

## level labels use textSecondary

```props
chars: [{ code: "U+2580", char: "▀" }]
```

```style
- selector: label(" low")
  color: textSecondary
- selector: label(" mid")
  color: textSecondary
```
