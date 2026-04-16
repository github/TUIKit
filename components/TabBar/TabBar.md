---
kind: component
name: TabBar
description: Horizontal tab bar with responsive carousel overflow and keyboard navigation.
version: 2
category: navigation

tokens:
  colors: [selected, textSecondary]
  icons: [iconArrowLeft, iconArrowRight]

types:
  TabItem:
    generic: T
    fields:
      value: { type: T, required: true, description: "Unique identifier for this tab" }
      label: { type: string, required: true, description: "Display label for the tab" }

  TabNavigationKeys:
    description: Which key sets drive tab navigation.
    enum: [all, arrow-only, tab-only]

props:
  items:
    type: array<TabItem<T>>
    required: true
    description: Array of tab items to display.

  selectedIndex:
    type: number
    required: true
    description: Index of the currently selected tab.

  onSelect:
    type: callback(item: TabItem<T>, index: number) → void
    required: false
    description: Fires when Enter is pressed on the focused tab.

  onNavigate:
    type: callback(index: number) → void
    required: false
    description: >
      Fires when the user navigates to a different tab. The parent controls
      selectedIndex — this component is controlled (not self-managing).

  enableKeyboardNavigation:
    type: boolean
    required: false
    default: false
    description: >
      Deprecated. Enables arrow-key navigation. Prefer navigationKeys for
      explicit control. When set without navigationKeys, behaves as "arrow-only".

  navigationKeys:
    type: TabNavigationKeys
    required: false
    description: >
      Which keys trigger tab navigation. Setting this prop implicitly enables
      keyboard navigation. When omitted, falls back to enableKeyboardNavigation.
      "arrow-only" — left/right arrow keys.
      "tab-only" — Tab (next) and Shift+Tab (previous).
      "all" — both arrow keys and Tab/Shift+Tab.

  suffix:
    type: ReactNode
    required: false
    description: Optional content rendered after the last visible tab (e.g., a "[1/5]" counter).

  suffixWidth:
    type: number
    required: false
    default: 0
    description: >
      Character width of the suffix. Required for accurate responsive layout
      calculation — the carousel algorithm subtracts this from available width.

  label:
    type: string
    required: false
    description: Accessible label for the tab bar (used in screen reader output).

  loop:
    type: boolean
    required: false
    default: true
    description: >
      Whether navigation wraps from last tab to first (and vice versa).
      When false, navigation stops at the boundaries.

keyboard:
  "←":
    action: Navigate to previous tab (fires onNavigate)
    enabled_when: 'navigationKeys is "arrow-only" or "all"'
    wrap: loop prop
  "→":
    action: Navigate to next tab (fires onNavigate)
    enabled_when: 'navigationKeys is "arrow-only" or "all"'
    wrap: loop prop
  tab:
    action: Navigate to next tab
    enabled_when: 'navigationKeys is "tab-only" or "all"'
    wrap: loop prop
  shift+tab:
    action: Navigate to previous tab
    enabled_when: 'navigationKeys is "tab-only" or "all"'
    wrap: loop prop
  enter:
    action: Confirm current tab → fires onSelect

accessibility:
  role: tablist
  properties:
    aria-label: "Tab navigation"
  states:
    aria-selected: "true for the currently selected tab"
  announce:
    on_mount: "{label}: current tab: {selectedLabel}, {otherLabel1}, {otherLabel2}"
    on_change: "Tab {selectedLabel} selected, {index} of {count}"
  screen_reader_adaptations:
    - when: screen reader detected
      change: >
        Carousel windowing is disabled — all tabs are rendered as a flat text
        line. Arrow indicators are hidden. Format is a single line:
        "{label}: current tab: {selected}, {other1}, {other2} {suffix}"
    - when: screen reader detected
      change: >
        Tab chrome (brackets, inverse colors) is replaced with plain text labels
        so screen readers encounter clean readable text.

dependencies:
  tokens:
    - name: selected
      kind: color
      usage: "Selected tab text and inverse background"
      required: true
    - name: textSecondary
      kind: color
      usage: "Unselected tab labels and overflow arrows"
      required: true
    - name: iconArrowLeft
      kind: icon
      usage: "Left overflow indicator glyph"
      required: false
    - name: iconArrowRight
      kind: icon
      usage: "Right overflow indicator glyph"
      required: false
  components: []
  dependents: []

breakpoints:
  any:
    description: >
      The carousel algorithm adapts to any terminal width. It measures how many
      tabs fit in available space (terminal width minus suffix minus arrow
      indicators) and shows a sliding window centered on the selected tab.
---

# TabBar

A horizontal tab bar for switching between views. Tabs are laid out in a single
row. When all tabs cannot fit, a carousel mode activates with arrow indicators
showing hidden tabs in each direction.

## Visual rules

- **Selected tab**: MUST render with `selected` color and inverse text, wrapped in
  brackets: `[Label]`
- **Unselected tabs**: MUST render in `textSecondary` color without brackets
- **Tab gap**: MUST use two character spaces between each tab
- **Left overflow indicator**: MUST show `iconArrowLeft` glyph in `textSecondary` followed
  by a space, only when hidden tabs exist to the left
- **Right overflow indicator**: MUST show space followed by `iconArrowRight` glyph in
  `textSecondary`, only when hidden tabs exist to the right
- **Suffix**: MUST render after the rightmost visible tab (and after the right arrow
  if present)

## Behavior

The carousel MUST keep the selected tab visible at all times:

1. **Measure available width**: terminal width − suffix width − safety margin.
2. **First pass**: calculate how many tabs fit without reserving arrow space.
3. **Check overflow**: determine if left/right arrows would be needed.
4. **Second pass**: if arrows are needed, MUST subtract their widths and recalculate.
5. **Window**: a sliding window of visible tabs MUST be centered on the selected tab.
   When the window would extend past the start or end of the list, it MUST be clamped
   to the boundary.
6. Selected tab width MUST include bracket padding (+2 chars). Unselected tabs MUST NOT
   have extra padding.

## Rendering example

Given 5 tabs, selected index 1, enough space for 3:

```
← [Beta]  Gamma  Delta →
```

All tabs visible (no overflow):

```
Alpha  [Beta]  Gamma
```

With suffix:

```
Alpha  [Beta]  Gamma  [1/3]
```

## Rendering example (screen reader)

Given the same 5 tabs with label "Files":

```
Files: current tab: Beta, Alpha, Gamma, Delta, Epsilon
```

## Edge cases

- **Empty items**: MUST render nothing (no arrows, no suffix)
- **Single tab**: MUST render selected tab only, no arrows, no carousel
- **All tabs fit**: MUST NOT render arrows; all tabs MUST be visible
- **loop=false at boundaries**: navigation MUST stop; left arrow at index 0 and right
  arrow at last index MUST have no effect
- **loop=true (default)**: navigation MUST wrap — going past the last tab returns to
  the first, and vice versa
- **Very narrow terminal**: MAY show only the selected tab with both arrows

## Dependencies

| Dependency       | Kind  | Usage                                     | Required |
| ---------------- | ----- | ----------------------------------------- | -------- |
| `selected`       | color | Selected tab text and inverse background  | Yes      |
| `textSecondary`  | color | Unselected tab labels and overflow arrows | Yes      |
| `iconArrowLeft`  | icon  | Left overflow indicator glyph             | No       |
| `iconArrowRight` | icon  | Right overflow indicator glyph            | No       |
