---
kind: token
name: icons
description: >
    Centralized icon constants for consistent UI across the CLI.
    All icons are Unicode characters that render well in most terminals.
version: 1
guidelines:
    - Use single-width characters only (avoid double-width CJK symbols, emoji)
    - Prefer ASCII or common Unicode symbols (Box Drawing, Geometric Shapes, Arrows)
    - Avoid emoji (inconsistent width, font support varies)
    - Test across macOS Terminal, iTerm2, Windows Terminal, GNOME Terminal, VS Code terminal
    - Stick to characters in common monospace fonts (Menlo, Consolas, DejaVu Sans Mono, SF Mono)

groups:
    status:
        description: State and outcome indicators
        glyphs:
            CIRCLE_FILLED: { char: "●", role: "Completed/active state" }
            CIRCLE_HALF: { char: "◐", role: "In-progress/partial state" }
            CIRCLE_EMPTY: { char: "○", role: "Empty/pending state" }
            CROSS: { char: "✗", role: "Error/failure" }
            CHECK: { char: "✓", role: "Success/confirmation" }
            TASK: { char: "✔", role: "Task completed (heavier check)" }
            WARNING: { char: "!", role: "Warning/caution" }
            DISABLED: { char: "⊘", role: "Disabled/unavailable" }
            CHEVRON_RIGHT: { char: "❯", role: "Prompt indicator, active selection" }
        semantic_aliases:
            iconSuccess: CHECK
            iconError: CROSS
            iconWarning: WARNING
            iconPrompt: CHEVRON_RIGHT
            iconDisabled: DISABLED
            iconWorking: CIRCLE_HALF
            iconCompleted: CIRCLE_FILLED
            iconEmpty: CIRCLE_EMPTY

    navigation:
        description: Directional indicators and keyboard key representations
        glyphs:
            ARROW_RIGHT: { char: "→", role: "Right direction / next" }
            ARROW_LEFT: { char: "←", role: "Left direction / previous" }
            ARROW_UP: { char: "↑", role: "Up direction" }
            ARROW_DOWN: { char: "↓", role: "Down direction" }
        semantic_aliases:
            iconArrowRight: ARROW_RIGHT
            iconArrowLeft: ARROW_LEFT
            iconArrowUp: ARROW_UP
            iconArrowDown: ARROW_DOWN

    spinner:
        description: Animation frames for loading indicators
        glyphs:
            SPINNER_DOT: { char: "∙", role: "Spinner frame (dot)" }
            SPINNER_DOT_SMALL: { char: "∘", role: "Spinner frame (small dot)" }
            SPINNER_FILLED: { char: "◉", role: "Spinner frame (filled)" }
            SPINNER_RING: { char: "◎", role: "Spinner frame (ring)" }
            SPINNER_CIRCLE: { char: "○", role: "Spinner frame (circle)" }
        sequences:
            inline: [SPINNER_DOT, SPINNER_FILLED, SPINNER_RING]
            alt_screen:
                [
                    SPINNER_DOT,
                    SPINNER_DOT_SMALL,
                    SPINNER_CIRCLE,
                    SPINNER_RING,
                    SPINNER_FILLED,
                    SPINNER_RING,
                    SPINNER_CIRCLE,
                    SPINNER_DOT_SMALL,
                ]

    ui:
        description: Interactive UI element indicators
        glyphs:
            SCROLLBAR: { char: "▋", role: "Scrollbar thumb" }
            CHECKBOX_UNCHECKED: { char: "[ ]", role: "Unchecked checkbox" }
            CHECKBOX_CHECKED: { char: "[✓]", role: "Checked checkbox" }

    separator:
        description: Inline separators and list markers
        glyphs:
            DOT_SEPARATOR: { char: "·", role: "Word-level separator (used in hint bars)" }
            BULLET: { char: "•", role: "List item marker" }

    nesting:
        description: Tree and hierarchy connectors
        glyphs:
            CHILD_LAST: { char: "└", role: "Last child in tree" }
            CHILD_MIDDLE: { char: "├", role: "Middle child in tree" }
            CHILD_SKIP: { char: "│", role: "Vertical continuation line" }
---

# Icon Tokens

All UI icons are defined here as Unicode glyphs. Components reference icons by their
semantic name (e.g., `iconPrompt`, `iconSuccess`) — never by raw character.

## Design principles

- **Single-width only**: every glyph occupies exactly one terminal column (except
  multi-char glyphs like `CHECKBOX_*` which are explicitly sized)
- **Font-safe**: only characters present in standard monospace fonts
- **Semantic aliasing**: status icons have semantic aliases (`iconSuccess` → `CHECK`)
  so components express intent, not appearance

## Implementation guide

1. Define all glyphs as constants (strings or a glyph type)
2. Expose both flat access (`Icon.CHECK`) and semantic access (`IconStatus.success`)
3. Spinner sequences are ordered arrays — animate by cycling through indices
4. The `semantic_aliases` in the `status` group are the preferred API for components
