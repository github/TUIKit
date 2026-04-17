---
kind: test
component: TimelineItem
version: 1
---

# Named variant rendering

## renders loading variant

```props
title: "Fetching"
variant: "loading"
```

```expect
○ Fetching
```

```style
- selector: indicator(0)
  color: textSecondary
```

## renders success variant

```props
title: "Grep"
variant: "success"
```

```expect
● Grep
```

```style
- selector: indicator(0)
  color: statusSuccess
```

## renders error variant

```props
title: "Build"
variant: "error"
```

```expect
✗ Build
```

```style
- selector: indicator(0)
  color: statusError
```

## renders warning variant

```props
title: "Lint"
variant: "warning"
```

```expect
! Lint
```

```style
- selector: indicator(0)
  color: statusWarning
```

## renders info variant

```props
title: "Status"
variant: "info"
```

```expect
● Status
```

```style
- selector: indicator(0)
  color: statusInfo
```

## renders muted variant

```props
title: "Skipped"
variant: "muted"
```

```expect
○ Skipped
```

```style
- selector: indicator(0)
  color: textTertiary
```

## renders brand variant

```props
title: "Copilot"
variant: "brand"
```

```expect
● Copilot
```

```style
- selector: indicator(0)
  color: brand
```

## renders selected variant

```props
title: "Active"
variant: "selected"
```

```expect
● Active
```

```style
- selector: indicator(0)
  color: selected
```

---

# Title and description

## renders title with inline description

```props
title: "Grep"
variant: "success"
description: '"pattern" in *.ts'
```

```expect
● Grep "pattern" in *.ts
```

## title is bold

```props
title: "Build"
variant: "success"
```

```style
- selector: label("Build")
  bold: true
```

## description uses descriptionColor

```props
title: "Grep"
variant: "success"
description: "found 5 matches"
```

```style
- selector: label("found 5 matches")
  color: textSecondary
```

## description newlines replaced with spaces in single-line mode

```props
title: "Read"
variant: "info"
description: "line one\nline two"
```

```expect
● Read line one line two
```

## empty title renders icon and description only

```props
title: ""
variant: "info"
description: "An informational message"
```

```expect
● An informational message
```

---

# Multiline description

## description wraps when descriptionMultiline is true

```props
title: "Error"
variant: "error"
description: "This is a long error message that should wrap to multiple lines"
descriptionMultiline: true
```

```style
- selector: label("Error")
  bold: true
- selector: label("This is a long error message that should wrap to multiple lines")
  color: textSecondary
  wrap: true
```

## multiline stacks title and description vertically

```props
title: "Notice"
variant: "info"
description: "Details below the title"
descriptionMultiline: true
```

```expect
● Notice
  Details below the title
```

---

# Nested mode

## nested hides the icon

```props
title: "Child entry"
variant: "success"
nested: true
```

```expect
Child entry
```

---

# Sub-items

## renders single sub-item with last connector

```props
title: "Grep"
variant: "success"
subItems: ["5 files found"]
```

```expect
● Grep
  └ 5 files found
```

## renders multiple sub-items with tree connectors

```props
title: "Build"
variant: "error"
subItems: ["Error on line 42", "Missing import"]
```

```expect
✗ Build
  │ Error on line 42
  └ Missing import
```

## renders three sub-items

```props
title: "Scan"
variant: "info"
subItems: ["file1.ts", "file2.ts", "file3.ts"]
```

```expect
● Scan
  │ file1.ts
  │ file2.ts
  └ file3.ts
```

## sub-item connectors use borderNeutral color

```props
title: "Test"
variant: "success"
subItems: ["result 1", "result 2"]
```

```style
- selector: label("│")
  color: borderNeutral
  aria-hidden: true
- selector: label("└")
  color: borderNeutral
  aria-hidden: true
```

## error variant sub-items use statusError color

```props
title: "Compile"
variant: "error"
subItems: ["type error in foo.ts"]
```

```style
- selector: label("type error in foo.ts")
  color: statusError
```

## muted variant sub-items use textTertiary color

```props
title: "Old"
variant: "muted"
subItems: ["stale data"]
```

```style
- selector: label("stale data")
  color: textTertiary
```

## non-error sub-items use textSecondary color

```props
title: "Fetch"
variant: "success"
subItems: ["200 OK"]
```

```style
- selector: label("200 OK")
  color: textSecondary
```

---

# Expanded content

## renders bordered content box when expanded

```props
title: "Details"
variant: "info"
expanded: true
children: "Expanded content here"
```

```style
- selector: component("content-box")
  borderLeft: true
  borderColor: borderNeutral
  description: >
    Expanded content is rendered in a box with left border only,
    in borderNeutral color, with left padding and vertical padding.
```

## content hidden when expanded is false

```props
title: "Details"
variant: "info"
expanded: false
children: "Should not appear"
```

```expect
● Details
```

## content box appears above sub-items

```props
title: "Tool"
variant: "success"
expanded: true
children: "Output data"
subItems: ["summary line"]
```

```style
description: >
  When both expanded content and sub-items are present,
  the bordered content box renders above the sub-items.
```

## expanded content promotes sub-item color to textPrimary

```props
title: "Expanded"
variant: "success"
expanded: true
children: "Content"
subItems: ["detail line"]
```

```style
- selector: label("detail line")
  color: textPrimary
  description: >
    When content is expanded, string sub-item text color is
    promoted from subItemColor to textPrimary for better contrast.
```

---

# Custom variant

## renders custom variant with explicit colors

```props
title: "Custom"
variant:
  iconColor: statusWarning
  icon: "◐"
  titleColor: textPrimary
```

```expect
◐ Custom
```

```style
- selector: indicator(0)
  color: statusWarning
- selector: label("Custom")
  color: textPrimary
  bold: true
```

## custom variant defaults icon to CIRCLE_FILLED

```props
title: "Default Icon"
variant:
  iconColor: brand
```

```expect
● Default Icon
```

## custom variant defaults descriptionColor to textSecondary

```props
title: "Desc"
variant:
  iconColor: statusInfo
description: "info text"
```

```style
- selector: label("info text")
  color: textSecondary
```

## custom variant with background color

```props
title: "Highlighted"
variant:
  iconColor: brand
  backgroundColor: backgroundSecondary
```

```style
- selector: component("TimelineItem")
  backgroundColor: backgroundSecondary
```

---

# Icon accessibility

## icon is aria-hidden

```props
title: "Test"
variant: "success"
```

```accessibility
- selector: indicator(0)
  aria-hidden: true
  description: >
    The status icon glyph is always aria-hidden since it is
    decorative. The variant meaning is conveyed through text context.
```

## tree connectors are aria-hidden

```props
title: "Test"
variant: "success"
subItems: ["detail"]
```

```accessibility
- selector: label("└")
  aria-hidden: true
  description: >
    Tree connectors (├, └, │) are decorative and aria-hidden.
```

---

# Edge cases

## no sub-items or children — only header

```props
title: "Simple"
variant: "info"
```

```expect
● Simple
```

## expanded true but no children — no content box

```props
title: "Empty"
variant: "info"
expanded: true
```

```expect
● Empty
```

## sub-items with description

```props
title: "Grep"
variant: "success"
description: "found matches"
subItems: ["file1.ts", "file2.ts"]
```

```expect
● Grep found matches
  │ file1.ts
  └ file2.ts
```
