---
kind: token
name: colors
description: Semantic color tokens that define UI intent across accessibility modes.
version: 2

color_modes: [default, dim, high-contrast, colorblind]

tokens:
    # ── Text ──────────────────────────────────────────────────────────────────

    textPrimary:
        role: Main body text
        nullable: true

    textSecondary:
        role: Supporting text, labels, descriptions

    textTertiary:
        role: De-emphasized text, timestamps, metadata

    textOnBackgroundSecondary:
        role: Text rendered on backgroundSecondary surface
        nullable: true

    # ── Backgrounds ───────────────────────────────────────────────────────────

    backgroundPrimary:
        role: Primary surface (typically terminal background)
        nullable: true

    backgroundSecondary:
        role: Elevated surface (cards, panels, code blocks)
        nullable: true
        high_contrast: collapses to terminal background — no subtle backgrounds

    # ── Status ────────────────────────────────────────────────────────────────

    statusInfo:
        role: Informational messages and indicators

    statusInfoBright:
        role: Bright variant of info (emphasis)

    statusSuccess:
        role: Positive outcomes, completed actions
        colorblind: must be distinguishable from statusError without red/green

    statusWarning:
        role: Caution, non-blocking issues

    statusError:
        role: Errors, destructive actions, failures
        colorblind: must be distinguishable from statusSuccess without red/green

    # ── Brand ─────────────────────────────────────────────────────────────────

    brand:
        role: Primary brand color

    brandBright:
        role: Bright brand variant (hover, emphasis)

    # ── UI ────────────────────────────────────────────────────────────────────

    selected:
        role: Selected/focused item indicator

    selectedBright:
        role: Bright selected variant (active state)

    selectionBackground:
        role: Background highlight for selected content

    borderNeutral:
        role: Container borders, dividers
        high_contrast: maximum visibility

    # ── Agent Modes ───────────────────────────────────────────────────────────

    modeInteractive:
        role: Interactive/chat mode indicator

    modePlan:
        role: Plan mode indicator

    modeAutopilot:
        role: Autopilot mode indicator

    modeShell:
        role: Shell mode indicator

    modePlanSoft:
        role: Subtle plan mode (backgrounds, secondary indicators)

    modeAutopilotSoft:
        role: Subtle autopilot mode

    modeShellSoft:
        role: Subtle shell mode

    # ── Diff ──────────────────────────────────────────────────────────────────

    diffTextAdditions:
        role: Added text in diffs
        colorblind: must be distinguishable from diffTextDeletions without red/green

    diffTextDeletions:
        role: Removed text in diffs
        colorblind: must be distinguishable from diffTextAdditions without red/green

    diffBackgroundAdditions:
        role: Background tint for added lines

    diffBackgroundDeletions:
        role: Background tint for deleted lines

    diffBackgroundAdditionsHighlighted:
        role: Highlighted word-level additions within a line

    diffBackgroundDeletionsHighlighted:
        role: Highlighted word-level deletions within a line

    # ── Markdown ──────────────────────────────────────────────────────────────

    markdownText:
        role: Markdown body text

    markdownLink:
        role: Hyperlinks in markdown

    markdownCode:
        role: Inline code and code blocks

    markdownBlockquote:
        role: Blockquote text

    markdownHr:
        role: Horizontal rules

    markdownImage:
        role: Image alt text indicator

    # ── Fixed ─────────────────────────────────────────────────────────────────

    ideVsCode:
        role: VS Code brand color
        type: fixed

    ideVsCodeInsiders:
        role: VS Code Insiders brand color
        type: fixed

    # ── Syntax Highlighting ───────────────────────────────────────────────────

    syntaxKeyword:
        role: Language keywords (if, else, return, function)

    syntaxString:
        role: String literals

    syntaxComment:
        role: Code comments

    syntaxFunction:
        role: Function and method names

    syntaxType:
        role: Type names, classes, interfaces

    syntaxVariable:
        role: Variable names (most common — blends with default text)

    syntaxNumber:
        role: Numeric literals

    syntaxOperator:
        role: Operators (+, -, =) — blends with default text

    syntaxPunctuation:
        role: Brackets, commas, semicolons

    syntaxConstant:
        role: Named constants, enums

    syntaxTag:
        role: HTML/XML/JSX tags

    syntaxAttribute:
        role: HTML/XML attributes
---

# Semantic Color Tokens

Semantic colors define UI intent — what a color **means**, not what it **looks like**.
Each target implementation resolves these tokens to actual colors using its own
color engine (Rampa ramps, hardcoded hex palette, ANSI names, etc.).

## Design principles

- **Semantic naming**: tokens describe _why_ a color exists, not _what hue_ it is
- **Mode parity**: every token must be considered across all 4 color modes
- **Colorblind safety**: tokens that form pairs (success/error, additions/deletions)
  must be distinguishable without relying on red/green
- **Nullable tokens**: tokens marked `nullable: true` may resolve to "no color" —
  meaning the terminal's native foreground/background shows through
- **High-contrast**: some tokens collapse or maximize in high-contrast mode (noted per token)

## Implementation guide

1. Create a `SemanticColors` struct/record with all token names as typed fields
2. Implement a color resolution strategy for your target (Rampa, hex table, ANSI names, etc.)
3. Ensure all 4 color modes are handled
4. Nullable tokens should be represented as optional types (e.g., `Option<Color>`, `*Color`, `undefined`)
5. Expose a `getColors(mode)` API that returns the resolved token set
