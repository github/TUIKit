---
kind: test
component: ScrollBox
version: 1
---

# ScrollBox Tests

## renders children

```props
children:
  - "Item 1"
  - "Item 2"
  - "Item 3"
```

```expect
Item 1
Item 2
Item 3
```

## renders in virtualized mode

```props
virtualized: true
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
```

```expect
Item 0
Item 1
Item 2
```

## down arrow advances focus line

```props
onFocusLine: callback
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
```

```input
↓
```

```state
callback_fired: onFocusLine
focus_index: 1
```

## up arrow moves focus back

```props
onFocusLine: callback
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
```

```input
↓ ↓ ↑
```

```state
focus_index: 1
```

## boundary at bottom does not overflow focus index

```props
onFocusLine: callback
children:
  - "Item 0"
  - "Item 1"
```

```input
↓ ↓ ↓
```

```state
focus_index: 1
```

## vim j and k scroll or focus

```props
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
  - "Item 4"
```

```input
j j k
```

```state
offset_changed: true
```

## ctrl+d and ctrl+u perform half-page jumps

```props
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
  - "Item 4"
  - "Item 5"
  - "Item 6"
  - "Item 7"
```

```input
ctrl+d ctrl+u
```

```state
offset_changed: true
```

## g and G jump to top and bottom

```props
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
  - "Item 4"
```

```input
G g
```

```state
offset_after_G: max
offset_after_g: 0
```

## scrollTo is clamped and reported by onScroll

```props
scrollTo: 999
onScroll: callback
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
```

```state
callback_fired: onScroll
offset_clamped: true
```

## selection emits screen region and clears with null

```props
onScreenRegion: callback
onContentSelection: callback
children:
  - "Line A"
  - "Line B"
  - "Line C"
```

```state
selection_emitted: true
selection_cleared_emits_null: true
```

## keyboardScroll=false disables keyboard scrolling

```props
keyboardScroll: false
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
```

```input
j ↓ pagedown
```

```state
offset_changed: false
```

## handles empty content safely

```props
children: []
```

```expect

```
