---
kind: demo
name: TUIkit Preview
description: >
    Full-screen TUI component preview app with a sidebar browser and
    main preview panel. Uses the generated TUIkit components themselves
    to build the interface.
version: 3
---

## Architecture

The demo is a **full-screen TUI** that takes over the alternate screen buffer.
It uses a two-panel layout: a persistent sidebar on the left for component
navigation, and a main panel on the right for the active component preview.

```
┌──────────────────────┬──────────────────────────────────────────┐
│  TUIkit Preview      │                                          │
│                      │  TextTitle                               │
│  ▸ Search...         │  ──────────────────────────────────────  │
│                      │                                          │
│    Colors          ◂ │  ## Default                              │
│    Icons             │  ┌──────────────────────────────────┐    │
│    Breakpoints       │  │  My Page Title                   │    │
│  ──────────────────  │  └──────────────────────────────────┘    │
│    Dialog            │                                          │
│    HintBar           │  ## Error variant                        │
│    Input             │  ┌──────────────────────────────────┐    │
│    Link              │  │  Error Title                     │    │
│    Metric            │  └──────────────────────────────────┘    │
│    QrCode            │                                          │
│    Screen            │                                          │
│    ScrollBox         │                                          │
│    Select            │                                          │
│    SelectAutocompl.  │                                          │
│    TabBar            │                                          │
│    Table             │                                          │
│    TextHeading       │                                          │
│    TextSpinner       │                                          │
│    TextTitle         │                                          │
│    TimelineItem      │                                          │
│                      │                                          │
├──────────────────────┴──────────────────────────────────────────┤
│  ↑↓ navigate · enter open · / search · q quit                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar (left panel)

- **Width**: Fixed, ~24 columns. MUST NOT resize or collapse.
- **Header**: `"TUIkit Preview"` rendered with **TextTitle**.
- **Search input**: A text input at the top of the sidebar for fuzzy filtering.
  Typing narrows the component list in real time. The search input only receives
  keyboard events when the sidebar has focus.
- **Component list**: All components and tokens listed alphabetically. Tokens
  appear first, separated from components by a dim horizontal rule. The
  currently highlighted item is visually marked (e.g., `▸` prefix or
  inverted colors). When a component is open in the main panel, show an
  indicator (e.g., `◂`) next to its name.
- **Scrolling**: If the list exceeds the sidebar height, it MUST scroll to
  keep the highlighted item visible.

### Main panel (right panel)

- **Content**: When no component is selected, show a centered placeholder
  message (e.g., `"Select a component to preview"`).
- **Active preview**: When a component is opened, render all its `.preview.md`
  variants stacked vertically, each with a **TextHeading** label showing the
  variant name. If the content overflows, wrap it in a **ScrollBox**.
- **Interactive previews**: Every variant MUST be a live, interactive instance.
  The `props` block defines **initial** props, not a static snapshot. Components
  MUST respond to keyboard input, update state, and re-render in real time.

## Focus model

The app has exactly two focus states: **sidebar** and **preview**.

### Sidebar focus (default)

- `↑` / `↓` — Move highlight up/down in the component list.
- `Enter` — Open the highlighted component in the main panel and switch focus
  to the preview.
- `/` or typing any character — Activate the search input and begin filtering.
- `Escape` (while searching) — Clear search and return to full list.
- `q` — Quit the app (restore main screen buffer and exit).

### Preview focus

- All keyboard events are forwarded to the active preview component (e.g.,
  arrow keys for Select, typing for Input, tab switching for TabBar).
- `Escape` — Unmount the component preview, clear the main panel, and return
  focus to the sidebar. The sidebar selection stays on the same component.

**Important**: While the preview has focus, the sidebar MUST NOT respond to
keyboard events. The sidebar remains visible but inert until `Escape` returns
focus to it.

## Preview rendering

Each component's preview screen is built from its `.preview.md` file:

- Each `## heading` in the preview spec becomes a **TextHeading** label.
- Each `props` block is parsed and passed as **initial** props to a live
  component instance rendered below the label.
- Variants render **top to bottom** in the main panel.
- For token previews (colors, icons, breakpoints), render values in a
  readable grid or list format.

### Interactivity examples

- A **Select** preview MUST allow arrow-key navigation and item selection.
- An **Input** preview MUST accept typed text and display it live.
- A **TabBar** preview MUST allow switching between tabs.
- A **Dialog** preview MUST allow confirming or cancelling.
- A **TextSpinner** preview MUST animate its spinner frames.
- A **ScrollBox** preview MUST scroll its content on key press.

Display-only components (TextTitle, TextHeading, Link, Metric, etc.) render
with the given props and MUST use live token values.

## HintBar (always visible at bottom)

The bottom row spans the full width and shows contextual keyboard hints:

- **Sidebar focus**: `↑↓ navigate · enter open · / search · q quit`
- **Sidebar focus + searching**: `↑↓ navigate · enter open · esc clear · q quit`
- **Preview focus**: Component-specific hints plus `esc back · q quit`.
  For example: `↑↓ navigate · enter select · esc back · q quit` for Select,
  `type to input · esc back · q quit` for Input.

## Styling

- MUST use semantic color tokens — no hardcoded ANSI codes or hex values.
- The sidebar border uses `borderSecondary` token.
- The highlighted item in the sidebar uses `backgroundHighlight` + `textPrimary`.
- The main panel background is the default terminal background.
- Dim text (`textSecondary`) for the placeholder message and separator rules.

## Verification checklist

Before considering the demo complete, verify:

1. App takes over the full terminal (alternate screen buffer).
2. Sidebar and main panel render side by side at startup.
3. All components and tokens appear in the sidebar list.
4. `↑` / `↓` moves the sidebar highlight; `Enter` opens the component.
5. Main panel shows all preview variants as live, interactive instances.
6. While previewing, the sidebar is visible but does not respond to keys.
7. `Escape` from preview returns focus to the sidebar; component unmounts.
8. Fuzzy search filters the sidebar list in real time.
9. HintBar updates to match the current focus state.
10. `q` quits the app cleanly (restores terminal state).
11. All styling uses semantic color tokens.
