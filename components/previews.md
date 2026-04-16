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

### File structure

The demo MUST be split into separate modules — not a single monolithic file.
Recommended structure:

```
demo entrypoint         Main entry, CLI flag parsing, app bootstrap
  preview/
    registry            Component/token registry (names, variant definitions)
    sidebar             Sidebar component (list, search, highlight, scroll)
    preview_panel       Main panel (mounts/unmounts active component preview)
    app                 Root app shell (layout, focus routing, HintBar)
    cli                 CLI flag handlers (--list, --snapshot, --component)
    variants/
      tokens            Token preview renderers (colors grid, icons grid, etc.)
      components        Component preview variant factories (read from registry)
```

Each preview variant factory creates a **live component instance** with initial
props from the `.preview.md` spec. The registry maps component names to their
variant factories.

This separation ensures:
- **Testability**: Each module can be tested independently
- **Debuggability**: Bugs are isolated to specific modules, not buried in 1000+ lines
- **Maintainability**: Adding a new component preview means adding to the registry, not editing a giant file

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
- **Active preview**: When a component is opened, render its `.preview.md`
  variants. If the content overflows, wrap it in a **ScrollBox**.
- **Interactive previews**: Every variant MUST be a live, interactive instance.
  The `props` block defines **initial** props, not a static snapshot. Components
  MUST respond to keyboard input, update state, and re-render in real time.
- **Variant navigation with TabBar**: When a component has multiple preview
  variants, use a **TabBar** at the top of the preview panel with one tab per
  variant. Only the active variant is mounted and receives keyboard focus.
  This avoids the problem of multiple interactive instances competing for
  input (e.g., two Select lists both capturing arrow keys). Switching tabs
  unmounts the previous variant and mounts the new one with fresh initial props.

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
12. All CLI subcommands below work correctly.

## CLI interface

The demo MUST support the following command-line flags in addition to the
default interactive TUI mode. These enable automated testing by LLM agents
and CI pipelines without requiring interactive PTY access.

### Flags

```
(no flags)                          Launch full interactive TUI (default)
--list                              Print all component/token names, one per line, then exit
--component <Name>                  Open directly into that component's preview (skip sidebar)
--component <Name> --variant <name> Render only the named variant
--component <Name> --snapshot       Render one frame of all variants to stdout and exit
--component <Name> --variant <name> --snapshot  Render one frame of a single variant and exit
```

### `--list`

Print every available component and token name to stdout, one per line,
sorted alphabetically (tokens first, then components). Exit with code 0.

```
breakpoints
colors
icons
Dialog
HintBar
Input
...
```

This lets agents discover what's available without launching the TUI.

### `--component <Name>`

Skip the sidebar and open directly into the named component's preview
screen. The component renders in full-screen with all its variants, fully
interactive. `Escape` or `q` exits the app (no sidebar to return to).

The `<Name>` MUST match exactly (case-sensitive) one of the names from `--list`.
If the name is not found, print an error message and exit with code 1.

### `--variant <name>`

Requires `--component`. Renders only the named variant (matching the
`## heading` from the `.preview.md` file). If the variant name is not
found, print an error to stderr and exit with code 1.

### `--snapshot`

Requires `--component`. Renders one frame of the component preview to
stdout and exits immediately with code 0. Does NOT enter the alternate
screen buffer or start the interactive event loop. The output is the
exact same rendered text that the TUI would display — same code path,
same token resolution, same layout — just captured as a single frame.

This is the primary mechanism for automated testing: an agent can run
`--component Select --snapshot` and inspect the output to verify correct
rendering without needing to interact with a TUI.

When combined with `--variant`, only that variant's frame is rendered.

### Examples

Use the target's run command (defined in `targets/{target}.md` under `demo.run_command`):

```
<run_command> --list
<run_command> --component Select
<run_command> --component Select --variant "With current item"
<run_command> --component Select --snapshot
<run_command> --component HintBar --variant "Default hints" --snapshot
```

### Demo smoke tests (REQUIRED)

The demo MUST include automated tests that verify every component renders
without errors via `--snapshot`. This is the integration test layer that
catches wiring bugs (wrong init, broken update routing, missing imports)
that unit tests miss.

For each component/token listed by `--list`, the test:
1. Runs `<run_command> --component <Name> --snapshot`
2. Asserts exit code 0 (no panic, no crash)
3. Asserts stdout is non-empty (something rendered)

Implement this as a single parameterized or table-driven test in the
target's test framework. The test should programmatically get the list
of components (via `--list` or by reading the component registry), then
loop over each one and run a snapshot assertion.
