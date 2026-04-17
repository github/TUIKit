---
kind: test
component: Icons
version: 1
---

# createIcon factory tests

## renders glyph with default label

```props
factory: createIcon
glyph: "❯"
defaultLabel: "Prompt"
```

```expect
❯
```

```accessibility
announce: "Prompt"
aria-hidden: false
```

## renders glyph with overridden label

```props
factory: createIcon
glyph: "❯"
defaultLabel: "Prompt"
instanceProps:
  label: "Active selection"
```

```expect
❯
```

```accessibility
announce: "Active selection"
```

## decorative by default when label is empty

```props
factory: createIcon
glyph: "▋"
defaultLabel: ""
```

```expect
▋
```

```accessibility
aria-hidden: true
announce: null
```

## explicit decorative overrides non-empty label

```props
factory: createIcon
glyph: "❯"
defaultLabel: "Prompt"
instanceProps:
  decorative: true
```

```accessibility
aria-hidden: true
announce: null
```

## applies explicit color prop

```props
factory: createIcon
glyph: "❯"
defaultLabel: "Prompt"
instanceProps:
  color: selected
```

```style
- selector: label("❯")
  color: selected
```

## no color — inherits terminal foreground

```props
factory: createIcon
glyph: "○"
defaultLabel: "Empty"
```

```style
- selector: label("○")
  color: null
  description: No color is set; the glyph inherits the terminal default foreground.
```

---

# createColoredIcon factory tests

## colored=true applies semantic color automatically

```props
factory: createColoredIcon
glyph: "✓"
defaultLabel: "Success"
semanticColorKey: statusSuccess
instanceProps:
  colored: true
```

```expect
✓
```

```style
- selector: label("✓")
  color: statusSuccess
```

## colored=false with explicit color

```props
factory: createColoredIcon
glyph: "✓"
defaultLabel: "Success"
semanticColorKey: statusSuccess
instanceProps:
  colored: false
  color: brand
```

```style
- selector: label("✓")
  color: brand
```

## colored omitted with explicit color

```props
factory: createColoredIcon
glyph: "✗"
defaultLabel: "Error"
semanticColorKey: statusError
instanceProps:
  color: textSecondary
```

```style
- selector: label("✗")
  color: textSecondary
```

## no color props — inherits terminal foreground

```props
factory: createColoredIcon
glyph: "!"
defaultLabel: "Warning"
semanticColorKey: statusWarning
```

```style
- selector: label("!")
  color: null
  description: Neither colored nor color is set; inherits terminal foreground.
```

## colored icon respects label override

```props
factory: createColoredIcon
glyph: "✓"
defaultLabel: "Success"
semanticColorKey: statusSuccess
instanceProps:
  colored: true
  label: "Task complete"
```

```accessibility
announce: "Task complete"
aria-hidden: false
```

## colored icon respects decorative override

```props
factory: createColoredIcon
glyph: "✓"
defaultLabel: "Success"
semanticColorKey: statusSuccess
instanceProps:
  colored: true
  decorative: true
```

```accessibility
aria-hidden: true
announce: null
```

---

# Pre-built semantic icon instances

## IconSuccess renders check with success color

```props
instance: IconSuccess
instanceProps:
  colored: true
```

```expect
✓
```

```style
- selector: label("✓")
  color: statusSuccess
```

```accessibility
announce: "Success"
```

## IconError renders cross with error color

```props
instance: IconError
instanceProps:
  colored: true
```

```expect
✗
```

```style
- selector: label("✗")
  color: statusError
```

```accessibility
announce: "Error"
```

## IconWarning renders bang with warning color

```props
instance: IconWarning
instanceProps:
  colored: true
```

```expect
!
```

```style
- selector: label("!")
  color: statusWarning
```

```accessibility
announce: "Warning"
```

## IconInfoCompleted renders filled circle with info color

```props
instance: IconInfoCompleted
instanceProps:
  colored: true
```

```expect
●
```

```style
- selector: label("●")
  color: statusInfo
```

```accessibility
announce: "Completed"
```

## IconDisabled renders disabled icon with secondary color

```props
instance: IconDisabled
instanceProps:
  colored: true
```

```expect
⊘
```

```style
- selector: label("⊘")
  color: textSecondary
```

```accessibility
announce: "Disabled"
```

---

# Pre-built standard icon instances

## IconPrompt renders chevron right

```props
instance: IconPrompt
```

```expect
❯
```

```accessibility
announce: "Prompt"
```

## IconInfoWorking renders half circle

```props
instance: IconInfoWorking
```

```expect
◐
```

```accessibility
announce: "In progress"
```

## IconInfoEmpty renders empty circle

```props
instance: IconInfoEmpty
```

```expect
○
```

```accessibility
announce: "Empty"
```

## IconArrowRight renders right arrow

```props
instance: IconArrowRight
```

```expect
→
```

```accessibility
announce: "Keyboard Right"
```

## IconArrowLeft renders left arrow

```props
instance: IconArrowLeft
```

```expect
←
```

```accessibility
announce: "Keyboard Left"
```

## IconArrowUp renders up arrow

```props
instance: IconArrowUp
```

```expect
↑
```

```accessibility
announce: "Keyboard Up"
```

## IconArrowDown renders down arrow

```props
instance: IconArrowDown
```

```expect
↓
```

```accessibility
announce: "Keyboard Down"
```

## IconScrollbar renders scrollbar (decorative)

```props
instance: IconScrollbar
```

```expect
▋
```

```accessibility
aria-hidden: true
announce: null
```

## IconCheckboxChecked renders checked box

```props
instance: IconCheckboxChecked
```

```expect
[✓]
```

```accessibility
announce: "Checked"
```

## IconCheckboxUnchecked renders unchecked box

```props
instance: IconCheckboxUnchecked
```

```expect
[ ]
```

```accessibility
announce: "Unchecked"
```

## IconSeparatorWord renders dot separator (decorative)

```props
instance: IconSeparatorWord
```

```expect
·
```

```accessibility
aria-hidden: true
announce: null
```

## IconSeparatorList renders bullet (decorative)

```props
instance: IconSeparatorList
```

```expect
•
```

```accessibility
aria-hidden: true
announce: null
```

## IconNestingLast renders last-child connector (decorative)

```props
instance: IconNestingLast
```

```expect
└
```

```accessibility
aria-hidden: true
announce: null
```

## IconNestingMiddle renders middle-child connector (decorative)

```props
instance: IconNestingMiddle
```

```expect
├
```

```accessibility
aria-hidden: true
announce: null
```

## IconNestingSkip renders vertical line connector (decorative)

```props
instance: IconNestingSkip
```

```expect
│
```

```accessibility
aria-hidden: true
announce: null
```

---

# Semantic icon without colored prop

## IconSuccess without colored uses no color

```props
instance: IconSuccess
```

```style
- selector: label("✓")
  color: null
  description: Without colored=true, the semantic icon has no automatic color.
```

## IconSuccess with explicit color override

```props
instance: IconSuccess
instanceProps:
  color: brand
```

```style
- selector: label("✓")
  color: brand
```

---

# Display name

## createIcon sets displayName with label

```props
factory: createIcon
glyph: "❯"
defaultLabel: "Prompt"
```

```meta
displayName: "Icon(Prompt)"
```

## createIcon sets displayName for decorative

```props
factory: createIcon
glyph: "▋"
defaultLabel: ""
```

```meta
displayName: "Icon(decorative)"
```

## createColoredIcon sets displayName with label

```props
factory: createColoredIcon
glyph: "✓"
defaultLabel: "Success"
semanticColorKey: statusSuccess
```

```meta
displayName: "Icon(Success)"
```
