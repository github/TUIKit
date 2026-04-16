---
kind: test
component: TabBar
version: 1
---

# TabBar Tests

## renders all tabs when they fit

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 0
terminalWidth: 80
```

```expect
[Alpha]  Beta  Gamma
```

## selected tab uses inverse styling

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 1
terminalWidth: 80
```

```expect
Alpha  [Beta]
```

```style
- selector: tab(0)
  color: textSecondary
- selector: tab(1)
  color: selected
  inverse: true
```

## navigates right on arrow key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 0
navigationKeys: "arrow-only"
onNavigate: callback
terminalWidth: 80
```

```input
→
```

```state
callback_fired: onNavigate
callback_args: [1]
```

## navigates left on arrow key

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 2
navigationKeys: "arrow-only"
onNavigate: callback
terminalWidth: 80
```

```input
←
```

```state
callback_fired: onNavigate
callback_args: [1]
```

## wraps from last to first when loop is true

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 1
navigationKeys: "arrow-only"
onNavigate: callback
loop: true
terminalWidth: 80
```

```input
→
```

```state
callback_fired: onNavigate
callback_args: [0]
```

## wraps from first to last when loop is true

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 0
navigationKeys: "arrow-only"
onNavigate: callback
loop: true
terminalWidth: 80
```

```input
←
```

```state
callback_fired: onNavigate
callback_args: [1]
```

## does not wrap when loop is false

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 1
navigationKeys: "arrow-only"
onNavigate: callback
loop: false
terminalWidth: 80
```

```input
→
```

```expect
Alpha  [Beta]
```

## fires onSelect on Enter

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 1
navigationKeys: "arrow-only"
onSelect: callback
terminalWidth: 80
```

```input
enter
```

```state
callback_fired: onSelect
callback_args: [{ label: "Beta", value: "b" }, 1]
```

## tab key navigates when navigationKeys is tab-only

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 0
navigationKeys: "tab-only"
onNavigate: callback
terminalWidth: 80
```

```input
tab
```

```state
callback_fired: onNavigate
callback_args: [1]
```

## shift+tab navigates backward when navigationKeys is tab-only

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 2
navigationKeys: "tab-only"
onNavigate: callback
terminalWidth: 80
```

```input
shift+tab
```

```state
callback_fired: onNavigate
callback_args: [1]
```

## arrow keys ignored when navigationKeys is tab-only

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 0
navigationKeys: "tab-only"
onNavigate: callback
terminalWidth: 80
```

```input
→
```

```expect
[Alpha]  Beta
```

## all mode accepts both arrows and tab

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 0
navigationKeys: "all"
onNavigate: callback
terminalWidth: 80
```

```input
tab
```

```state
callback_fired: onNavigate
callback_args: [1]
```

---

# Carousel overflow tests

## shows arrows when tabs overflow

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
  - { label: "Epsilon", value: "e" }
selectedIndex: 2
terminalWidth: 30
```

```expect
← Beta  [Gamma]  Delta →
```

## shows only right arrow at start

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
  - { label: "Epsilon", value: "e" }
selectedIndex: 0
terminalWidth: 30
```

```expect
[Alpha]  Beta  Gamma →
```

## shows only left arrow at end

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
  - { label: "Epsilon", value: "e" }
selectedIndex: 4
terminalWidth: 30
```

```expect
← Gamma  Delta  [Epsilon]
```

## arrow indicators use textSecondary

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
  - { label: "Epsilon", value: "e" }
selectedIndex: 2
terminalWidth: 30
```

```style
- selector: component("IconArrowLeft")
  color: textSecondary
- selector: component("IconArrowRight")
  color: textSecondary
```

## suffix reduces available tab space

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
selectedIndex: 0
suffixWidth: 6
terminalWidth: 40
```

```style
- selector: table
  note: suffix width is subtracted from available space before carousel calculation
```

## narrow terminal shows only selected tab

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 1
terminalWidth: 12
```

```expect
← [Beta] →
```

---

# Accessibility assertions

## screen reader shows all tabs as flat text

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
selectedIndex: 1
label: "Files"
screen_reader: true
terminalWidth: 30
```

```expect
Files: current tab: Beta, Alpha, Gamma
```

## screen reader omits arrow indicators

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
  - { label: "Gamma", value: "c" }
  - { label: "Delta", value: "d" }
  - { label: "Epsilon", value: "e" }
selectedIndex: 2
screen_reader: true
terminalWidth: 30
```

```expect
current tab: Gamma, Alpha, Beta, Delta, Epsilon
```

## screen reader renders suffix after tab list

```props
items:
  - { label: "Alpha", value: "a" }
  - { label: "Beta", value: "b" }
selectedIndex: 0
label: "Files"
suffix: "[1/2]"
screen_reader: true
terminalWidth: 80
```

```expect
Files: current tab: Alpha, Beta [1/2]
```
