---
kind: test
component: Table
version: 1
---

# Table Tests

## renders basic rows without headers

```props
rows:
  - ["/help", "Show commands"]
  - ["/theme", "Change theme"]
borderStyle: "none"
```

```expect
/help   Show commands
/theme  Change theme
```

## renders headers in bold

```props
headers: ["Command", "Description"]
rows:
  - ["/help", "Show commands"]
borderStyle: "none"
```

```expect
Command  Description
/help    Show commands
```

```style
- selector: row(header)
  bold: true
```

## renders single borders with borderNeutral color

```props
headers: ["Name"]
rows:
  - ["Alpha"]
borderStyle: "single"
```

```style
- selector: border
  color: borderNeutral
```

## renders body text in textPrimary

```props
rows:
  - ["Alpha", "Beta"]
borderStyle: "none"
```

```style
- selector: cell(0, 0)
  color: textPrimary
- selector: cell(0, 1)
  color: textPrimary
```

## applies per-cell semantic color

```props
rows:
  - [["ERR", "statusError"], "Timed out"]
borderStyle: "none"
```

```style
- selector: cell(0, 0)
  color: statusError
- selector: cell(0, 1)
  color: textPrimary
```

## handles ragged rows with missing cells

```props
rows:
  - ["Alpha", "Beta", "Gamma"]
  - ["Delta"]
borderStyle: "none"
```

```expect
Alpha  Beta  Gamma
Delta
```

## renders nothing for empty rows

```props
rows: []
```

```expect

```

## wraps long words at column boundary

```props
rows:
  - ["Supercalifragilisticexpialidocious", "Short"]
width: 30
borderStyle: "none"
```

```expect
Supercalifragilisticex  Short
pialidocious
```

## respects per-column alignment

```props
headers: ["Left", "Right"]
rows:
  - ["a", "b"]
align: ["left", "right"]
borderStyle: "none"
```

```style
- selector: column(0)
  align: left
- selector: column(1)
  align: right
```

## removes borders when borderStyle is none

```props
rows:
  - ["Alpha", "Beta"]
borderStyle: "none"
```

```expect
Alpha  Beta
```

## caps width at the width prop

```props
rows:
  - ["Alpha", "Beta"]
width: 25
borderStyle: "single"
```

```style
- selector: table
  max_width: 25
```

---

# Accessibility assertions

## screen reader forces borders off

```props
rows:
  - ["Alpha", "Beta"]
headers: ["Col1", "Col2"]
borderStyle: "single"
screen_reader: true
```

```style
- selector: border
  visible: false
```

```expect
Col1   Col2
Alpha  Beta
```
