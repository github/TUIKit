# Foundations

This document captures the design principles and best practices for building command-line interfaces.

| Section                                       | What it covers                                             |
| --------------------------------------------- | ---------------------------------------------------------- |
| [Web vs CLI](#web-vs-cli--a-different-medium) | Mental model shift for web developers                      |
| [Color](#color)                               | Semantic tokens, degradation, palette generation, contrast |
| [Typography](#typography)                     | Text styles, Unicode width, whitespace                     |
| [Icons](#icons)                               | Choosing icons, accessibility, ASCII fallbacks             |
| [Illustrations](#illustrations)               | ASCII art, braille patterns, ANSI illustrations            |
| [Animations](#animations)                     | Color vs frame animation, performance, SSH                 |
| [Layout](#layout)                             | Alignment, responsive width, stability, borders            |
| [TUI](#tui)                                   | When to use TUI, feedback, interactivity                   |
| [Accessibility](#accessibility)               | Screen readers, keyboard navigation, contrast              |
| [Help](#help)                                 | `--help` structure, discoverability, hint bars             |
| [Keybinds](#keybinds)                         | Conventions, Ctrl+C handling, modifier keys                |
| [Flags & Commands](#flags--commands)          | Naming, output, errors, composability                      |
| [Prompting](#prompting-and-user-interruption) | Minimize interruptions, opinionated defaults, autopilot    |
| [Buffer](#buffer)                             | Main vs alt screen, raw/cooked mode, hybrid rendering      |
| [Environment](#environment)                   | TTY detection, keyboard protocols, CI, config precedence   |

## Intro

A CLI is a conversation. The user types, the program responds. Every design decision should reduce friction in that exchange:

- **Conversation-first**: CLIs are text-based UI optimized for conversational interactions.
- **Respect the terminal**: Don't fight the user's environment.
- **Degrade gracefully**: Not every terminal supports every feature. Always have a fallback.
- **Show, don't block**: Prefer streaming output over waiting in silence.

Running a program is rarely a single invocation. Users iterate, they type, get an error, adjust, try again. This trial-and-error loop is a conversation, and your program should be a good conversational partner.

---

## Web vs CLI: A different medium

If you're coming from web or mobile development, the terminal is a fundamentally different canvas. Understanding what's absent helps you design within the constraints rather than fighting them.

### What the terminal doesn't have

| Web concept            | Terminal reality                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pixel-level layout** | Fixed-width character grid. Every glyph occupies 1 or 2 columns. No sub-pixel positioning.                                                                                      |
| **CSS / Flexbox**      | Ink provides a flexbox subset, but there's no cascade, no `z-index`, no overlapping layers.                                                                                     |
| **Scrollable views**   | No native scroll containers. The terminal scrolls the entire buffer, or you build your own.                                                                                     |
| **Mouse interaction**  | Optional and inconsistent. Keyboard is the primary input.                                                                                                                       |
| **Rich media**         | No images (unless Kitty/iTerm2 inline images). No video. No audio.                                                                                                              |
| **Fonts & sizing**     | One font, one size, decided by the user. You can't change it.                                                                                                                   |
| **Hover states**       | Don't exist. Discovery must happen through other means (hint bars, help text).                                                                                                  |
| **Opacity / layers**   | No transparency, no overlays. Everything occupies the same plane.                                                                                                               |
| **Responsive units**   | No `rem`, `vh`. You get column count, row count, and percentage widths (Ink supports `%`). Responsive design means measuring terminal width and adapting layout at breakpoints. |
| **Animation**          | No CSS transitions. Frame-by-frame updates to characters, foreground and background colors. Use sparingly — redraws are expensive and animation is generally inaccessible.      |

### What the terminal does better

The constraints aren't just limitations — they create advantages:

- **Instant alignment**: Monospace means columns line up without effort. Tables are natural.
- **Universal accessibility**: A character grid is inherently more screen-reader friendly than a visual layout.
- **Zero latency UI**: No network round-trips, no rendering pipeline. Keypress to output in milliseconds.
- **Composability**: Pipes, redirects, and scripting let users combine your tool with others. Web UIs are islands.
- **Information density**: More content per screen than most GUIs. Power users love this.
- **Keyboard-first**: No mouse-keyboard mode switching. Every action is a keypress away.

### Mental model shift

Stop thinking in pixels and DOM nodes. Think in:

- **Characters and columns**: Your unit of measurement. The terminal is a grid of fixed-width cells, each holding one character plus metadata (foreground color, background color, style attributes like bold or underline).
- **Lines and vertical flow**: Content stacks top-to-bottom
- **Bold and color**: Your main visual hierarchy tools (see Typography for why we avoid dim)
- **Escape sequences**: All styling and cursor movement happens through special byte sequences. Your framework handles this, but understanding it helps debug issues.
- **Keyboard events**: Your only reliable input.

The best CLI UIs feel fast, dense, and predictable. They don't try to be web apps in a terminal.

> For an interactive deep-dive into how the grid model, escape sequences, and keyboard input work, see [How Terminals Work](https://how-terminals-work.vercel.app/).

---

## Color

Color in the terminal is functional, not decorative. It directs attention, encodes status, and groups related information.

### Use color semantically

Every color choice should answer: _what does this color mean?_ If you can't answer, you probably don't need color.

| Purpose   | Example                               |
| --------- | ------------------------------------- |
| Status    | Green for success, red for error      |
| Hierarchy | Bright for primary, dim for secondary |
| Grouping  | Same color for related items          |

Note that brand colors are unpredictable when using the user's terminal theme, you can't guarantee how your palette will look. Your branding should live in illustrations, icons, and overall tone of voice rather than relying on specific color values.

Avoid using color as the _only_ signal. Pair it with text, icons, or position, this helps users with color blindness and monochrome terminals.

**How we do it:** The `useColors()` hook provides semantic color tokens (`textPrimary`, `statusError`, `diffTextAdditions`, etc.) that automatically adapt to the active theme. Components destructure only the tokens they need.

### Color depth and degradation

Terminals support different color depths. Design for the lowest common denominator and enhance upward:

| Depth      | Colors           | Support                                  |
| ---------- | ---------------- | ---------------------------------------- |
| No color   | 0                | Piped output, `NO_COLOR`                 |
| Basic      | 16 (ANSI)        | Nearly universal                         |
| 256-color  | 256              | Most modern terminals                    |
| True color | 16M (24-bit RGB) | iTerm2, Ghostty, Kitty, Windows Terminal |

Always respect `NO_COLOR` (https://no-color.org) and `FORCE_COLOR` environment variables.

**How we do it:** The color engine (`colorEngine.ts`) handles graceful degradation automatically — it detects the terminal's color capability and falls back through truecolor → 256-color → 16-color → no color, with hand-designed ANSI fallback tokens at each level. Components never need to worry about color support; they just use semantic tokens and the engine handles the rest.

### The palette generation problem

The terminal's 256-color palette seems like a good middle ground — more expressive than 16 ANSI colors, less overhead than truecolor. But the default palette clashes with custom base16 themes, has poor readability in dark shades, and produces inconsistent perceived brightness across hues.

The solution, [proposed by the Ghostty team](https://gist.github.com/jake-stewart/0a8ea46159a7da2c808e5be2177e1783), is to **generate the extended palette from the user's base16 colors** using perceptually uniform interpolation in CIELAB color space. This ensures:

- Colors stay harmonious with the user's chosen theme
- Shade steps have consistent perceived brightness across hues
- Light/dark theme switching works without per-app configuration

**How we do it:** Our color system (`tokens/colors.ts`) was directly inspired by this approach. We use the [Rampa SDK](https://github.com/basiclines/rampa-studio) to build perceptually uniform color ramps from the terminal's actual ANSI palette using CIELAB interpolation. Each ANSI color becomes a 2D ramp of saturation and lightness steps, and a neutral ramp provides a gradient from background to foreground. Semantic tokens are then picked from specific positions on these ramps.

By default, the color system queries the terminal's real colors and feeds them into the ramp builder. Named themes provide static palettes. Both paths flow through the same interpolation, so contrast is perceptually correct regardless of the user's terminal.

### Reading the user's palette

To adapt to the user's terminal theme, we query the terminal's actual colors via OSC escape sequences (see the terminal glossary). However, not all terminals respond reliably — some return stale defaults, some swallow the query entirely, and multiplexers like tmux may interfere. When the query fails or returns invalid data, the color engine falls back to hand-designed ANSI ramps that render correctly at any color depth. See `colorEngine.ts` for the full degradation logic.

### Contrast

Text must be readable against both light and dark backgrounds. Avoid hardcoding specific colors — use semantic tokens that adapt to the theme. Test your output with at least one light and one dark theme.

We validate contrast across 60+ real terminal themes (loaded from Ghostty's builtin palettes) using APCA (Accessible Perceptual Contrast Algorithm) with tiered thresholds: body text requires Lc ≥ 30, decorative elements Lc ≥ 15.

---

## Typography

Terminal typography is constrained: monospace fonts, fixed-width grids, limited styling. These constraints are also strengths — alignment is trivial, tables are natural, and spacing is precise.

### The Unicode width problem

Terminal typography maps Unicode into a fixed-width grid. Characters occupy one or two cells, combining marks overlay previous characters, and emoji sequences collapse into single glyphs. When terminals and applications disagree on width, layout breaks.

This is not a solved problem — terminal support varies dramatically. Avoid complex Unicode sequences (emoji ZWJ, exotic scripts) in critical UI elements. Stick to well-supported characters from common scripts and established icon sets.

### Text styles

Terminals support a small set of text decorations. Use them sparingly:

| Style         | ANSI  | Use for                                                                                                                |
| ------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| **Bold**      | SGR 1 | Titles, headings                                                                                                       |
| _Dim_         | SGR 2 | Inconsistent across terminals, only provides two levels (normal/dim). Use semantic color tokens for hierarchy instead. |
| _Italic_      | SGR 3 | Paths, metadata (limited support)                                                                                      |
| Underline     | SGR 4 | Links (in supporting terminals)                                                                                        |
| Strikethrough | SGR 9 | Avoid (poor support)                                                                                                   |

Bold is useful for titles and headings. Italic support varies — never rely on it alone. For text hierarchy beyond bold, use the color system's multiple lightness levels (`textPrimary`, `textSecondary`, `textTertiary`) rather than dim, which is unreliable and limits you to only two depths.

**How we do it:** TUIkit provides `TextTitle` (bold, primary color) and `TextHeading` (bold, secondary color) to establish a two-level heading hierarchy. Both support a `type="error"` variant that switches to the error status color for context-aware emphasis.

### Whitespace

Use blank lines to separate sections. Use indentation to show hierarchy. Consistent spacing makes dense output scannable:

```
✓ 3 files changed

  src/auth.ts     +12 −3
  src/config.ts    +4 −1
  test/auth.test.ts  +28

No issues found.
```

**How we do it:** Components use Ink's `marginBottom`, `marginTop`, and `paddingX` for consistent spacing. Key-value layouts use `.padEnd(n)` for column alignment. The TUIkit Table component handles column alignment and text wrapping automatically — it calculates column widths from the data, pads cells, and wraps on word boundaries, so you get aligned output without manual spacing.

---

## Icons

Icons in the terminal are Unicode characters. They add visual cues and reduce cognitive load — but only when used carefully.

### Choosing icons

- **Use widely supported Unicode** — Stick to characters in common monospace fonts. Avoid Nerd Fonts and emoji as primary icons (they have inconsistent width and rendering).
- **Prefer established conventions** — `✓` for success, `✗` for failure, `●` for active, `→` for navigation. Users already know these.
- **Keep icons small** — Single-character icons work best. Multi-character symbols can misalign in tables and columns.

### Meaningful vs decorative

Every icon is either _meaningful_ (conveys information) or _decorative_ (purely visual). This distinction matters for accessibility:

- **Meaningful icons** need a text alternative (label) for screen readers
- **Decorative icons** should be hidden from screen readers

**How we do it:** TUIkit Icon components reinforce color with meaning by default. Each icon bundles a glyph, a semantic color, and a text label for screen readers — so `IconSuccess` always carries the success color and the label "Success", and `IconError` always carries the error color and "Error". Icons can be flagged as decorative to hide them from assistive technology. This ensures every status indicator communicates through color, shape, _and_ text simultaneously.

### Internationalization

Unicode icon rendering varies across operating systems and terminal emulators. Test your icons on macOS, Linux, and Windows. Some characters that render perfectly on macOS may show as boxes or wrong-width glyphs elsewhere. When in doubt, provide ASCII-safe fallbacks:

```
✓ → *    ✗ → x    ● → @    → → >    • → -
```

---

## Illustrations

Terminals can't display images natively (with rare exceptions like Kitty and iTerm2 inline images). When you need diagrams, charts, or visual explanations in terminal output, you need to render them as text.

### ASCII art and diagrams

Simple diagrams using box-drawing characters (`─`, `│`, `┌`, `┐`, `└`, `┘`, `├`, `┤`) and ASCII art can communicate structure that paragraphs of text cannot — architecture diagrams, flow charts, directory trees, relationship maps.

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Input   │────▶│ Process  │────▶│  Output  │
└──────────┘     └──────────┘     └──────────┘
```

Keep diagrams simple and monochrome. Box-drawing characters are widely supported, but test across platforms — some terminals and fonts render them with gaps.

### Braille patterns

Braille characters (U+2800–U+28FF) are the highest-resolution graphics available in text mode. Each character represents a 2×4 grid of dots, giving you 8 individually controllable "pixels" per cell. They're ideal for sparklines, small charts, and anywhere you need finer detail than block elements provide:

```
Sparklines: ⣀⣤⣶⣿⣿⣷⣦
Progress:   ████████░░░░ 67%
```

### ANSI illustrations

Avoid rendering photos or 3D scenes in the terminal — the fidelity is never worth the complexity. Instead, consider building purpose-made ANSI illustrations as a branding element. ASCII characters have _shape_, not just density — a `T` is top-heavy, an `L` is bottom-left-heavy, a `/` is diagonal. Tools that match character shapes to contours (rather than just mapping brightness to density) produce dramatically sharper results, making hand-crafted terminal art a viable way to add personality to your CLI.

**How we do it:** We use [ASCII Motion](https://ascii-motion.app/) by [@cameronfoxly](https://github.com/cameronfoxly) to create and animate ASCII illustrations for the CLI. It provides a visual editor for designing text-based art and animations that render consistently in the terminal.

---

## Animations

Animations in the terminal must be deliberate. Unlike the web, every frame rewrite risks visual flicker, layout shifts, and wasted bandwidth over slow connections. The key insight by: **color is continuous, but position is discrete**. Characters snap to fixed grid positions — movement always appears as jumps from one cell to the next. But with truecolor you have millions of hues to interpolate between smoothly. Use color for smoothness and energy; use character changes for structure and state.

### Color-only animation

The safest animation technique is changing color while keeping text and layout identical. No characters move, no widths change — only the appearance shifts. This eliminates flicker and layout reflow entirely.

**How we do it:** `TextSpinner` includes a shimmer effect that sweeps a highlight color across text character-by-character without altering the text content — the string stays identical, only per-character color changes. Shimmer variants (`brand`, `info`, `selected`, `placeholder`) use semantic color pairs so they adapt to the active theme. Speed adapts to context: faster in alt-screen where the UI has dedicated attention, slower inline where it competes with reading.

### Frame-based animation

When you must animate content — spinners, progress indicators — keep the visual footprint constant. Every frame must occupy the same number of cells to prevent layout shifts.

**How we do it:** `TextSpinner` cycles through single-width Unicode characters (e.g., `∙ ◉ ◎`) where every frame occupies the same cell width. Alt-screen spinners use more frames and faster intervals; inline spinners are simpler and slower.

### Accessibility

Animations must be invisible to screen readers. A screen reader announcing every spinner frame is unusable.

**How we do it:** When `useIsScreenReaderEnabled()` returns true, all animation is disabled:

- `TextSpinner` returns static text instead of cycling frames

### Performance

At 60 FPS you have ~16ms per frame — that's your entire budget for logic, rendering, and terminal I/O. Not all terminals are equal: GPU-accelerated terminals (Kitty, Alacritty, Ghostty) handle this easily; legacy terminals and SSH connections struggle. Design for degradation — a smooth 30 FPS experience beats a stuttery 60.

Use a **two-tier animation strategy**: idle mode (event-driven, 0 FPS, CPU at rest) when nothing animates, and active mode (target frame rate) only when animations are in progress. Batch all output into a single write per frame, only update cells that changed (dirty rectangles), and skip identical frames entirely.

**SSH and remote sessions:** Every animation frame is transmitted over the network. A busy spinner running for minutes can generate gigabytes of escape sequence data over SSH. On slow connections or loaded servers, this degrades the session for all users. Remote sessions can be detected via `SSH_TTY`, `SSH_CONNECTION`, and `SSH_CLIENT` environment variables — we already do this with `isRemoteTerminal()` in `terminalFeatures.ts`, using it to gate features like clipboard access.

### Guidelines

- **Prefer color animation** over content animation — zero layout risk
- **Fixed cell width** for any frame-based animation — every frame must be the same width
- **Respect reduced motion** — disable animation for screen readers and when accessibility requires it
- **Slower inline, faster fullscreen** — inline animation competes with reading; fullscreen has dedicated attention
- **Configurable loop count** — not everything should animate forever; `TextSpinner` supports single, N, or infinite loops
- **Degrade for slow environments** — reduce animation complexity on slow connections rather than dropping frames

---

## Layout

In a monospace grid, alignment is readability. Misaligned content forces the eye to scan character-by-character. Aligned content lets users absorb structure at a glance.

### Column alignment

When displaying key-value pairs, labels, or any repeating structure, align columns consistently. This is the single most impactful readability technique in terminal output.

```
Bad:                          Good:
Type: stdio                   Type:      stdio
Status: Connected             Status:    Connected
Error: Connection refused     Error:     Connection refused
```

**How we do it:** Labels use `.padEnd(n)` with a width based on the longest label in the group. For dynamic content where label width varies (like server lists), the maximum width is computed from the data and all labels padded to match. For numeric data like line numbers, `.padStart()` right-aligns within a gutter width.

### Vertical flow and grouping

Content flows top-to-bottom. Group related items together and separate groups with whitespace. Use `marginBottom` / `marginTop` for section breaks, not empty text elements. Nest related content inside bordered containers with `paddingX` for breathing room.

### Horizontal layout

Use row layouts sparingly — they only work well when elements are short. For wider terminals, switch from stacked to side-by-side using breakpoint hooks. For hint bars and status lines, space-between justification pushes content to edges.

### Borders as containers

Use borders to visually isolate distinct content areas. They're the terminal equivalent of cards or panels. Reserve round borders for primary containers and single-line borders for nested/secondary content. Always include horizontal padding inside bordered boxes — text touching the border is hard to read.

Bear in mind that copying text from bordered elements will also copy the border's Unicode characters. Use borders sparingly if the user might need to copy values from within — or use them only in the alt screen buffer where you control the selection context.

### Responsive width

Terminal output must adapt to the available width. Don't assume 80 or 120 columns — many users split terminals, use small windows, or work on laptops. When longer output is needed, wrap gracefully rather than truncating.

**How we do it:** `useBreakpoint()` defines three width tiers — compact (< 80), narrow (80–119), wide (≥ 120) — so components can switch between stacked and side-by-side layouts at each tier. The TUIkit Table component auto-sizes columns to fit the terminal, shrinks proportionally when space is tight, and wraps on word boundaries rather than truncating. The TabBar ensures the active tab is always visible, even when there are more tabs than the terminal can display.

### Layout stability

Layout shifts — content jumping when elements appear, disappear, or resize — are the terminal equivalent of [Cumulative Layout Shift](https://web.dev/cls/) on the web. They disorient users and make content impossible to read during updates.

The core principle: **reserve space before you need it.**

**Fixed-width prefixes.** The timeline uses a constant 4-character prefix column. Status icons change (spinner → checkmark → error) but always occupy the same width. Content to the right never shifts.

**Explicit container widths.** When content changes dynamically, compute and set explicit widths instead of relying on percentage-based or flex auto-sizing. This prevents reflow when content length changes between renders.

**Batched state transitions.** When removing one element and adding another (e.g., replacing a loading spinner with a result), do both in the same render cycle. If they happen in separate frames, users see a flash of collapsed layout.

**Footer pinning.** Interactive UI areas (input fields, hint bars) must never be pushed off-screen by growing content. Use flex-shrink on fixed elements and allow only the scrollable content area to compress.

### Indentation and hierarchy

Use padding-left for nesting depth. Each level should indent by 1–2 characters — more than that wastes horizontal space. For tree-like structures, use connectors (`└`, `├`) as decorative elements with indentation to show parent-child relationships.

---

## TUI

A TUI (Terminal User Interface) is any interface that goes beyond simple line-by-line output — selections, progress indicators, interactive forms, live updates. Use TUI patterns when they reduce friction; avoid them when plain text would suffice.

### When to use TUI vs plain output

| Use TUI when...                     | Use plain text when...              |
| ----------------------------------- | ----------------------------------- |
| User must choose from options       | Output is informational only        |
| Progress needs to update in place   | A single status line suffices       |
| Data is best explored interactively | Data should be pipeable / greppable |
| Context helps decision-making       | User already knows what they want   |

### Feedback and progress

Never leave the user staring at a blank screen. **Responsive is more important than fast** — print something within 100ms. If you're making a network request, say so before you start, not after.

- **Spinners** for indeterminate progress (something is happening)
- **Progress bars** for determinate progress (X of Y complete)
- **Streaming output** for operations producing incremental results
- **Status lines** for multi-phase operations (Phase 1/3: Compiling...)

If stdout is not an interactive terminal, don't display any animations — spinners become Christmas trees in CI logs.

When state changes, tell the user what happened. Don't just silently succeed — confirm the new state so they can build a mental model of the system.

**How we do it:** `TextSpinner` combines a rotating icon with a shimmer text effect (see Animations). Beyond visual spinners, `useTerminalProgress` emits OSC 9;4 sequences to show native progress indicators in terminal title bars (Windows Terminal, iTerm2) — a subtle enhancement that helps when the terminal is backgrounded.

### Interactivity

Interactive elements should feel immediate:

- Respond to every keypress even if just to show the input was received
- Highlight the focused element clearly
- Show available actions (hint bars, key legends)
- Allow escape/cancel from any interactive state
- **Let the user escape** — make it obvious how to get out
- **Make it recoverable** — if the program fails mid-operation, the user should be able to hit ↑ Enter and pick up where they left off

---

## Accessibility

Accessibility in the terminal means supporting screen readers, keyboard-only navigation, and users with visual impairments. These aren't edge cases — they're design constraints that improve the experience for everyone.

### Screen readers

Terminal screen readers (VoiceOver, NVDA, JAWS) read text content linearly. Design with this in mind:

- **Provide text alternatives** for visual indicators (icons, colors, progress bars)
- **Hide decorative content** that would be noise (ASCII art, box-drawing characters, ornamental icons)
- **Use semantic structure** — screen readers can't see your visual hierarchy, so make it textual

**How we do it:** Components check `useIsScreenReaderEnabled()` and adapt their output. Decorative content (ASCII art mascots, ornamental icons) is hidden entirely. Table borders switch to "none" to reduce noise. Visual indicators get text alternatives — for example, a checkmark icon becomes the text " (current)" for screen readers.

### Keyboard navigation

All interactive elements must be keyboard accessible. This is usually free in terminals, but TUI components need explicit handling:

- **Focus order** should follow visual order (top-to-bottom, left-to-right)
- **Arrow keys** for navigation within a component
- **Enter** to confirm/select
- **Escape** to cancel/dismiss
- **Tab** for moving between components (when applicable)

**How we do it:** Interactive components like `SelectInput` support multiple navigation paradigms — arrow keys, vim-style `j`/`k`, Emacs-style `Ctrl+N`/`Ctrl+P`, and direct number keys `1`–`9` for quick selection — so users can navigate with whatever muscle memory they bring.

### Contrast and legibility

- Ensure text is readable in both light and dark themes
- Test with high-contrast terminal themes
- See Color section for semantic token approach and APCA validation

---

## Help

Help is how users discover what your CLI can do. It should be immediate, contextual, and scannable.

### `--help` output

Every command and subcommand should support `--help`. Structure it as: usage pattern → one-line summary → longer description → arguments → options → examples → learn more.

Commands should have both a **one-line summary** (what it does) and a **multi-line description** (the most critically important information a user needs). The summary appears in parent command listings; the description appears in `--help` output for that specific command.

### Principles

- **Lead with examples** — Users reach for examples before anything else. Show common use cases first, with real output when it helps.
- **Lead with usage** — Show the syntax pattern at the top.
- **One-line summary + description** — Every command gets a short summary for listings and a longer description for its own `--help`. Every flag gets a single-line explanation.
- **Display common flags first** — Don't bury the most-used options at the bottom.
- **Group logically** — Separate commands, options, and examples.
- **Align columns** — Use consistent indentation for scanability.
- **Concise by default, extensive on demand** — When run without arguments, show a brief description, a couple of examples, and a pointer to `--help`. Save the full listing for `--help`.

### Discoverability

CLIs don't have the luxury of visible menus. Make functionality discoverable through other means:

- **Suggest next commands** after operations complete — like `git status` suggesting `git add` and `git commit`.
- **Suggest corrections** when input is wrong — ask if they want to run the corrected version, but don't force it.
- **Provide a support path** — a URL or GitHub link in top-level help text for feedback and issues.
- **Link to web docs** from terminal help, especially for complex topics with more detail online.

### Contextual help

Beyond `--help`, surface help where users need it:

- **Error messages** that suggest the fix (see Commands > Error messages)
- **Hint bars** in interactive UIs showing available keybinds
- **Progressive disclosure** — `--help` should show concise, essential information. `--verbose` should increase detail during execution. Both are progressive disclosure but serve different moments.

**How we do it:** The `HintBar` component auto-formats key names (arrow keys → Unicode symbols, "esc" → "Esc") and renders them in a consistent style. Every interactive component (pickers, selects, dialogs) includes a HintBar, so users always know their available actions.

---

## Keybinds

Keyboard shortcuts are the primary interaction model in terminals. They must be discoverable, consistent, and unsurprising.

### Conventions

Follow established terminal conventions. Users have decades of muscle memory:

| Key       | Convention                 |
| --------- | -------------------------- |
| `Ctrl+C`  | Interrupt / cancel         |
| `Ctrl+D`  | End of input / exit        |
| `Ctrl+L`  | Clear screen               |
| `Ctrl+Z`  | Suspend (Unix)             |
| `↑` / `↓` | Navigate lists, history    |
| `Enter`   | Confirm / submit           |
| `Escape`  | Cancel / dismiss / go back |
| `Tab`     | Autocomplete / next field  |

Never override `Ctrl+C`. It is the user's emergency exit. When pressed, exit as soon as possible — say something immediately, before starting cleanup. If cleanup might take time, a second `Ctrl+C` should skip it.

**How we do it:** `Ctrl+C` uses a progressive exit strategy — each press cancels the most specific active operation before escalating: first cancel running shell executions, then close open dialogs, then abort the agent, then clear the input field, and finally shut down the application. `Ctrl+Z` properly suspends and resumes, restoring alt screen and Kitty protocol state on resume.

### Discoverability

Keybinds are useless if users don't know they exist:

- Show a **hint bar** at the bottom of interactive views with key actions
- List shortcuts in `--help` when relevant
- Use **consistent keybinds** across all interactive components — don't make `Enter` confirm in one place and `Space` confirm in another

**How we do it:** The `useInput` hook maps `Ctrl+N`/`Ctrl+P` as synonyms for down/up arrows, supporting both standard and Emacs navigation conventions without requiring user configuration.

Not all modifier key combinations work across terminals — `Alt+<key>` is inconsistent on macOS, `Shift+<key>` requires Kitty protocol, and function keys vary. Stick to simple keybinds; if you need modifiers, require only `Ctrl` and provide alternatives.

---

## Flags & Commands

### Flag naming

- **Use `--long-names`** for clarity — have full-length versions of all flags
- **Only use single-letter flags for common flags** — don't pollute the short-flag namespace
- **Use kebab-case**: `--no-color` not `--noColor`
- **Be consistent** across commands and **use standard names** when they exist

Common standard flags:

| Flag              | Convention                                                                |
| ----------------- | ------------------------------------------------------------------------- |
| `-h`, `--help`    | Show help                                                                 |
| `-v`, `--verbose` | More output (note: `-v` is `--version` in some CLIs, including `copilot`) |
| `-q`, `--quiet`   | Less output                                                               |
| `-f`, `--force`   | Skip confirmations                                                        |
| `-n`, `--dry-run` | Show what would happen without doing it                                   |
| `--json`          | Machine-readable JSON output                                              |
| `--no-color`      | Disable color                                                             |

### Flag values

- `--flag` enables, `--no-flag` disables — don't require `=true` or `=false`
- Support both `--format=json` and `--format json`
- Validate early and fail with a clear message listing valid options
- Default to the safer or more common option

### Dangerous operations

Match confirmation to severity: mild operations may not need confirmation, moderate ones prompt `y/yes` interactively (require `--force` in scripts), severe ones require typing the resource name.

### Command structure

Follow `tool <command> [subcommand] [flags] [args]`. Use `noun verb` for multi-level subcommands (`gh pr list`). Use verbs for actions (`create`, `delete`, `list`), nouns for resource groups. Be consistent — same verbs across all resource types. Avoid abbreviations and don't allow implicit prefix matching.

### Output

- **Human-friendly by default** — Pretty-printed, colored, readable
- **Machine-friendly on demand** — `--json` for structured output, `--plain` for strict line-based output
- **Respect pipes** — Detect when stdout is not a TTY and simplify output. Send data to stdout, messages to stderr.
- **Exit codes** — `0` for success, non-zero for failure
- **Don't be silent on success** — Confirm what happened, but keep it brief

### Error messages

Errors are documentation. A good error message guides the user toward a fix.

- **Catch errors and rewrite them for humans** — don't surface raw library errors
- **Include the fix, not just the problem**
- **Put the most important info last** — the eye is drawn to the end of output

```
✗ File not found: src/missing.ts

  Check the path and try again. Run "tool list" to see available files.
```

**How we do it:** `formatCapiError()` cascades through increasingly generic fallbacks — API-provided message → status+code-specific message → generic fallback. HTML error pages are detected and stripped rather than displayed as garbage.

### Composability

Your tool will become part of larger systems — scripts, CI pipelines, aliases:

- **stdout is for data, stderr is for messages**
- **Support `-` to read from stdin or write to stdout**
- **Don't require prompts** — always provide a flag-based alternative
- **Make it idempotent where possible** — running the same command twice should be safe
- **Make it crash-only** — exit immediately on interrupt, recover on next run
- **Never accept secrets via flags** — they leak into `ps` output and shell history. Use files, stdin, or a secret manager.
- **Prefer flags to positional args** — `tool --file foo.txt` is clearer and easier to extend than `tool foo.txt`

---

## Prompting and user interruption

CLI sessions can be long-lived and unattended — the user may step away while a task runs. Every prompt is friction, and every unnecessary interruption breaks flow. Design for autonomy: have opinionated defaults, make reasonable choices automatically, and only prompt the user when advancing is truly impossible without their input.

When you must prompt, make the default action the one that lets work continue. Never block on a confirmation that could be a flag. If the user wanted to be asked, they wouldn't have run the command.

**How we do it:** Autopilot mode is the clearest example — the agent runs continuously, making decisions and executing tools without asking for confirmation at each step. It only pauses when it genuinely cannot proceed without user input. This is the gold standard for long-lived CLI sessions: trust the defaults, minimize interruptions, and let the user review the outcome rather than approving every step.

**Non-interactive mode:** When stdin is not a TTY or stdout is piped, prompting is impossible — the user can't respond. In this case, never prompt: either use defaults or error immediately with a clear message explaining which flag to pass. This is an area we haven't fully standardized yet, but the principle is simple: if the user can't answer, don't ask.

---

## Buffer

Terminals have two screen buffers: the **main buffer** (normal scrollback) and the **alternate screen buffer** (full-screen overlay). Choosing the right buffer is a critical UX decision.

### Main buffer (default)

Content stays in scrollback after the program exits. The user can scroll up to see it.

**Use for:**

- Command output that the user might want to reference later
- Logs, build results, test output
- Short-lived prompts and confirmations

### Alternate screen buffer

A clean canvas that disappears when the program exits, restoring the previous terminal content.

**Use for:**

- Full-screen interactive applications (editors, file browsers, dashboards)
- UIs where the process replaces the screen entirely
- Interfaces that the user explicitly enters and exits

### Guidelines

- **Default to the alt screen buffer** — Copilot uses the alternate screen to avoid flickering issues with the main buffer. Most interactive CLI sessions benefit from a clean canvas.
- **Consider the main buffer** for non-interactive output (logs, build results) where the user might want to scroll back after the program exits
- **Consider hybrid rendering** — Tools like `fzf` render inline on the main screen so selections remain visible in scrollback after exit. This respects the terminal as a shared space rather than a blank canvas. Think about whether users will want to reference your output later.
- **Clean up on exit** — Always restore the previous buffer. A crashed program that leaves the terminal in alt-screen mode is hostile
- **Handle `Ctrl+C` gracefully** — Ensure buffer restoration even on interrupt

### Raw mode vs cooked mode

Terminals operate in two input modes:

- **Cooked mode** — The default. The kernel handles line editing and signals. Input arrives line-by-line after Enter.
- **Raw mode** — Every keypress is sent immediately. The program handles everything. This is what TUI apps use.

Always restore terminal mode on exit, including on crash.

**How we do it:** Alt screen entry is conditional — non-interactive modes avoid it entirely. On entry, Kitty keyboard protocol must be re-enabled since buffer switches reset keyboard mode. An `exitTrap` provides last-resort cleanup — even on unhandled crashes, the terminal is restored to a usable state. Suspend (`Ctrl+Z`) properly exits and re-enters the alt buffer on resume.

---

## Environment

A CLI must adapt to its environment. Terminal capabilities vary widely, and detecting them correctly is the difference between a polished and broken experience.

### Terminal glossary

| Term                  | What it is                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TTY**               | TeleType — originally a physical device, now means "interactive terminal." When code checks `isTTY`, it asks: is a human at the other end, or is this a pipe?                              |
| **PTY**               | Pseudo-TTY — a kernel abstraction that simulates a hardware terminal. A pair of file descriptors (master + slave) that sits between the terminal emulator and your program.                |
| **ConPTY**            | Windows equivalent of PTY. Introduced in Windows 10 to replace the legacy console API. node-pty uses ConPTY on Windows.                                                                    |
| **node-pty**          | Node.js library that creates PTY pairs. Our CLI uses it to spawn shell processes on all platforms (PTY on Unix, ConPTY on Windows).                                                        |
| **Terminal emulator** | The GUI app (Ghostty, iTerm2, Windows Terminal, Alacritty) that renders the character grid. Owns the master side of the PTY.                                                               |
| **ANSI escapes**      | Byte sequences (e.g., `\x1b[31m` for red) that control color, cursor position, and text style. Interpreted by the terminal emulator.                                                       |
| **Kitty protocol**    | Enhanced keyboard protocol. Standard terminals send ambiguous escape sequences; Kitty sends unambiguous key codes with modifiers and release events. Supported by Ghostty, Kitty, WezTerm. |
| **Bracketed paste**   | Protocol that wraps pasted text in escape markers so programs can distinguish paste from typed input.                                                                                      |
| **SGR**               | Select Graphic Rendition — the ANSI escape subset for text styling (bold, italic, color). e.g., SGR 1 = bold, SGR 31 = red foreground.                                                     |
| **OSC**               | Operating System Command — escape sequences for terminal-level features: setting window title, clipboard access, hyperlinks, color queries.                                                |
| **CSI**               | Control Sequence Introducer (`\x1b[`) — the prefix for most ANSI escapes: cursor movement, scrolling, SGR, Kitty key reports.                                                              |
| **`TERM`**            | Environment variable declaring terminal type (e.g., `xterm-256color`, `dumb`). Programs use it to decide what capabilities are available.                                                  |
| **`NO_COLOR`**        | Convention (no-color.org) — when set, programs must disable color output.                                                                                                                  |
| **`COLORTERM`**       | Signals color depth. `truecolor` or `24bit` means 16M colors.                                                                                                                              |
| **`TERM_PROGRAM`**    | Identifies the terminal emulator (e.g., `iTerm.app`, `ghostty`, `WezTerm`). Useful for enabling emulator-specific features.                                                                |
| **`SSH_TTY`**         | Set when connected over SSH. Signals a remote session — we use this to gate features like clipboard access and animation intensity.                                                        |

### TTY detection

Always check if stdout is a TTY before using interactive features. If it's a pipe, output plain text with no control codes. Terminals reporting `TERM=dumb` should also be treated as non-interactive.

### Keyboard and input

Modern terminals support the Kitty keyboard protocol (unambiguous key events), bracketed paste, and mouse reporting. Detect support before enabling and fall back to legacy escape sequences when unavailable.

### Non-interactive environments

CLIs run in CI, Docker, cron, and SSH. When there's no TTY, skip interactive prompts and require flags instead. Default to no color, don't assume terminal width, and provide ASCII fallbacks for Unicode icons.

### Configuration precedence

Flags → environment variables → project config → user config → system defaults. Check well-known env vars (`NO_COLOR`, `FORCE_COLOR`, `EDITOR`, `PAGER`, `TERM`, `COLUMNS`) before inventing your own.

---

## References

- [Command Line Interface Guidelines](https://clig.dev/) — Aanand Prasad, Ben Firshman, Carl Tashian, Eva Parish. An open-source guide to CLI design, updating UNIX principles for the modern day.
- [How Terminals Work](https://how-terminals-work.vercel.app/) — Interactive guide covering the grid model, escape sequences, keyboard input, PTY, raw/cooked mode, and alternate screen buffers.
- [no-color.org](https://no-color.org/) — Convention for disabling color output
- [State of Terminal Emulators in 2025](https://www.jeffquast.com/post/state-of-terminal-emulation-2025/) — Jeff Quast. Unicode width challenges, terminal capability fragmentation, and the state of emoji rendering across emulators.
- [Terminals Should Generate the 256-Color Palette from the User's Base16 Theme](https://gist.github.com/jake-stewart/0a8ea46159a7da2c808e5be2177e1783) — Jake Stewart (Ghostty team). The case for generating harmonious 256-color palettes via CIELAB interpolation from base16 colors, directly inspiring our color ramp architecture.
- [Awesome TUIs](https://github.com/rothgar/awesome-tuis) — Curated list of terminal user interfaces for inspiration and reference.
- [TUI Design Guide](https://gist.github.com/toby/bf1325449585be869a6b01a03d4cac44) — Toby. Comprehensive guide covering the grid model, screen modes, color history, OSC sequences, Unicode graphics, performance budgets, animation strategy, and tmux-based testing.
- [ASCII Rendering](https://alexharri.com/blog/ascii-rendering) — Alex Harri. Deep dive into shape-aware image-to-ASCII conversion, using character contours rather than just brightness for sharp terminal renderings.
- [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) - Useful Wikipedia article diving into the history and technical aspects of various escape codes mentioned here
