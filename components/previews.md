---
kind: demo
name: TUIkit Preview
description: >
    Interactive component preview app that showcases all TUIkit components.
    Mirrors the `/tuikit` preview system — a searchable component picker with
    per-component multi-variant screens built from .preview.md specs.
version: 2
---

## Architecture

The demo app is a **component preview browser**:

```
┌─────────────────────────────────────────────┐
│  TUIkit Preview — {target name}             │  ← TextTitle
├─────────────────────────────────────────────┤
│  ▸ Search components...                     │  ← SelectAutocomplete picker
│                                             │
│    Colors            HintBar                │
│    Icons             Select                 │
│    Breakpoints       SelectAutocomplete     │
│    TextTitle         Input                  │
│    TextHeading       TabBar                 │
│    Link              Dialog                 │
│    TextSpinner       Table                  │
│    TimelineItem      QrCode                 │
│    Metric                                   │
│                                             │
├─────────────────────────────────────────────┤
│  ↑↓ navigate · enter select · q quit       │  ← HintBar
└─────────────────────────────────────────────┘
```

When a component is selected, the picker is replaced by that component's
preview screen showing all its variants. Pressing **Escape** returns to
the picker.

## Navigation

- **Picker screen**: Root screen shows a searchable list of all components
  using the **SelectAutocomplete** component. Typing filters the list.
- **Preview screen**: Selecting a component renders all its variants stacked
  vertically, each with a heading label. Pressing **Escape** returns to picker.
- **Quit**: Pressing **q** on the picker screen exits the app.

## Preview screens

Each component's preview screen is defined by its `.preview.md` file. The
demo app MUST render every variant listed in the preview spec, in order,
with the variant heading as a label above each one.

For token previews (colors, icons, breakpoints), render the token values
in a readable grid or list format.

## Header (always visible)

- **TextTitle**: `"TUIkit Preview — {target name}"` where target name is
  the language/framework (e.g., "Go + Bubbletea", "Bun + Ink",
  "Rust + Ratatui")
- Below the title, show breadcrumb: `"Home"` on picker, `"Home > {Name}"` on preview

## HintBar (always visible at bottom)

Contextual based on current screen:

- **Picker screen**: `↑↓ navigate · enter select · / search · q quit`
- **Preview screen**: `esc back · q quit`
- **Interactive previews** (Select, Input, TabBar): component-specific
  hints (e.g., `↑↓ navigate · enter select · esc back`)

## Verification checklist

Before considering the demo complete, verify:

1. All components appear in the picker (one entry per component/token)
2. Selecting each component renders its preview variants without errors
3. Escape returns from preview to picker
4. q quits the app from the picker screen
5. Search/filter works in the picker
6. HintBar updates contextually
7. All previews use semantic color tokens (no hardcoded colors)
8. Interactive components respond to keyboard input
