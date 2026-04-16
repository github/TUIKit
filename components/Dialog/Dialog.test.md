---
kind: test
component: Dialog
version: 1
---

# Dialog Tests — Inside Placement (default)

## renders title and content with border

```props
title: "Confirm"
children: "Are you sure?"
```

```expect
╭──────────────╮
│ Confirm      │
│──────────────│
│ Are you sure?│
╰──────────────╯
```

## renders title bold in textPrimary

```props
title: "Title"
children: "Body"
```

```style
- selector: label("Title")
  bold: true
  color: textPrimary
```

## renders subtitle in textSecondary

```props
title: "Delete"
subtitle: "This cannot be undone"
children: "Proceed?"
```

```style
- selector: label("This cannot be undone")
  bold: false
  color: textSecondary
```

## renders border in borderNeutral

```props
title: "Info"
children: "Details here"
```

```style
- selector: component("Border")
  color: borderNeutral
```

## renders footer section

```props
title: "Action"
children: "Content"
footer: "Enter to confirm · Esc to cancel"
```

```expect
╭────────────────────────────────────╮
│ Action                             │
│────────────────────────────────────│
│ Content                            │
│                                    │
│ Enter to confirm · Esc to cancel   │
╰────────────────────────────────────╯
```

## hides divider when showTitleDivider is false

```props
title: "No Divider"
children: "Content"
showTitleDivider: false
```

```expect
╭──────────────╮
│ No Divider   │
│ Content      │
╰──────────────╯
```

## omits subtitle when not provided

```props
title: "Simple"
children: "Just content"
```

```expect
╭──────────────╮
│ Simple       │
│──────────────│
│ Just content │
╰──────────────╯
```

## omits footer when not provided

```props
title: "Minimal"
children: "Body only"
```

```expect
╭─────────────╮
│ Minimal     │
│─────────────│
│ Body only   │
╰─────────────╯
```

---

# Dialog Tests — Border Placement

## renders title embedded in top border

```props
title: "Session Info"
titlePlacement: "border"
width: 30
children: "Model: GPT-4"
```

```expect
╭ Session Info ───────────────╮
│ Model: GPT-4                │
╰─────────────────────────────╯
```

## title in border is bold textPrimary

```props
title: "Info"
titlePlacement: "border"
width: 30
children: "Content"
```

```style
- selector: label("Info")
  bold: true
  color: textPrimary
```

## truncates long title with ellipsis in border mode

```props
title: "This Is An Extremely Long Title That Exceeds Width"
titlePlacement: "border"
width: 20
children: "Content"
```

```expect
╭ This Is An Extr…╮
│ Content          │
╰──────────────────╯
```

## clamps width to minimum of 10

```props
title: "Tiny"
titlePlacement: "border"
width: 5
children: "X"
```

```expect
╭ Tiny ──╮
│ X      │
╰────────╯
```

## falls back to terminal width for string width in border mode

```props
title: "Wide"
titlePlacement: "border"
width: "100%"
children: "Full width"
```

```style
- selector: component("Border")
  color: borderNeutral
```

## renders subtitle in border placement

```props
title: "Dialog"
subtitle: "A description"
titlePlacement: "border"
width: 30
children: "Body"
```

```expect
╭ Dialog ─────────────────────╮
│ A description               │
│ Body                        │
╰─────────────────────────────╯
```

## renders footer in border placement

```props
title: "Act"
titlePlacement: "border"
width: 40
children: "Content"
footer: "Esc to close"
```

```expect
╭ Act ──────────────────────────────────╮
│ Content                               │
│                                       │
│ Esc to close                          │
╰───────────────────────────────────────╯
```

---

# Dialog Tests — Accessibility

## screen reader mode renders flat layout without borders

```props
title: "Confirm"
subtitle: "Important"
children: "File will be deleted."
footer: "Press Enter"
```

```accessibility
screen_reader: true
```

```expect
Confirm
Important
File will be deleted.
Press Enter
```

## screen reader mode renders title bold

```props
title: "Alert"
children: "Message"
```

```accessibility
screen_reader: true
```

```style
- selector: label("Alert")
  bold: true
```

## screen reader mode omits absent subtitle

```props
title: "Simple"
children: "Content"
```

```accessibility
screen_reader: true
```

```expect
Simple
Content
```

## screen reader mode omits absent footer

```props
title: "Minimal"
children: "Body"
```

```accessibility
screen_reader: true
```

```expect
Minimal
Body
```

---

# Dialog Tests — Edge Cases

## renders with custom padding

```props
title: "Padded"
children: "Content"
padding: 2
```

```style
- selector: component("Dialog")
  paddingX: 2
```

## renders with zero padding

```props
title: "Tight"
children: "Content"
padding: 0
```

```style
- selector: component("Dialog")
  paddingX: 0
```

## showTitleDivider has no effect in border placement

```props
title: "Border"
titlePlacement: "border"
showTitleDivider: false
width: 30
children: "Content"
```

```expect
╭ Border ─────────────────────╮
│ Content                     │
╰─────────────────────────────╯
```
