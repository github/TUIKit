---
kind: target
name: rust
language: Rust
runtime: rustc 1.75+ (2024 edition)
framework:
    name: Ratatui
    version: ">=0.28"
    url: https://github.com/ratatui/ratatui
    paradigm: Immediate-mode rendering (draw every frame)
backend:
    name: Crossterm
    version: ">=0.28"
    url: https://github.com/crossterm-rs/crossterm
    role: Terminal I/O, raw mode, event polling
testing:
    runner: cargo test
    framework: built-in (#[cfg(test)] mod tests)
    helper: ratatui TestBackend

output:
    root: src/tuikit
    structure:
        tokens/colors.rs: SemanticColors struct + resolve_tokens()
        tokens/icons.rs: Icon constants + semantic aliases
        tokens/breakpoints.rs: Breakpoint enum + get_breakpoint()
        tokens/mod.rs: Module re-exports
        components/{name}/mod.rs: Component struct + impl Widget/StatefulWidget
        components/{name}/{name}_test.rs: Tests
        lib.rs: Crate root with pub mod declarations
---

# Rust Target — Ratatui + Crossterm

## Architecture pattern

Ratatui uses **immediate-mode rendering**: the application owns an event loop,
reads input events, mutates state, and calls `draw()` which renders the entire
UI from scratch each frame. There is no virtual DOM or reconciler.

```rust
// Application loop
loop {
    terminal.draw(|frame| {
        // Render components by passing Frame + state
        select.render(frame, area, &mut state);
    })?;

    // Poll for input
    if let Event::Key(key) = crossterm::event::read()? {
        select.handle_key(key, &mut state);
    }

    if state.is_terminal() {
        break;
    }
}
```

Components implement Ratatui's `StatefulWidget` trait:

```rust
pub struct Select<T> {
    items: Vec<SelectItem<T>>,
    colors: SemanticColors,
    hide_hints: bool,
}

pub struct SelectState {
    highlighted: usize,
    state: ComponentState,
}

impl<T> StatefulWidget for Select<T> {
    type State = SelectState;

    fn render(self, area: Rect, buf: &mut Buffer, state: &mut Self::State) {
        // Draw items, indicators, hint bar into the buffer
    }
}
```

## Type mapping

| Spec type                 | Rust type                                                          |
| ------------------------- | ------------------------------------------------------------------ |
| `string`                  | `String` or `&str` (prefer `&str` for display, `String` for owned) |
| `number`                  | `usize` (indices), `i32` (general), `u16` (terminal coordinates)   |
| `boolean`                 | `bool`                                                             |
| `array<T>`                | `Vec<T>`                                                           |
| `record<string, T>`       | `Vec<(&str, T)>` (ordered) or `HashMap<String, T>`                 |
| `callback(args) → void`   | `Option<Box<dyn FnMut(args)>>` or return an `Action` enum          |
| `T` (generic)             | `<T: Clone>` generic parameter                                     |
| `string \| false \| null` | `Option<String>` (None = absent)                                   |
| `SelectItem<T>`           | `struct SelectItem<T> { ... }`                                     |
| `color \| undefined`      | `Option<Color>` (None = terminal default)                          |
| `SemanticColor`           | `ratatui::style::Color`                                            |
| `IconGlyph`               | `&'static str`                                                     |

## Callback translation

Rust components avoid callbacks in the traditional sense. Instead, they return
**action enums** that the parent handles:

```rust
// Spec: onSelect: callback(item: SelectItem<T>) → void
// Rust: Return an Action from handle_key()

#[derive(Debug, Clone)]
pub enum SelectAction<T> {
    Selected(SelectItem<T>),
    Dismissed,
    Highlighted(SelectItem<T>),
    None,
}

impl<T: Clone> Select<T> {
    pub fn handle_key(&self, key: KeyEvent, state: &mut SelectState) -> SelectAction<T> {
        match key.code {
            KeyCode::Enter => {
                state.state = ComponentState::Selected;
                SelectAction::Selected(self.items[state.highlighted].clone())
            }
            KeyCode::Esc => {
                state.state = ComponentState::Dismissed;
                // return escape item or Dismissed
            }
            _ => SelectAction::None,
        }
    }
}
```

## State machine translation

Spec states map to an enum + struct:

```rust
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ComponentState {
    Focused,
    Selected,
    Dismissed,
}

impl ComponentState {
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Selected | Self::Dismissed)
    }
}

pub struct SelectState {
    pub highlighted: usize,
    pub state: ComponentState,
}
```

## Token access

Tokens are resolved at initialization and passed as references:

```rust
// Colors — resolved once, passed to components
let colors = tokens::resolve_colors(&ramps, ColorMode::Default);
let select = Select::new(&items, &colors);

// Icons — static constants
use tokens::icons::{ICON_PROMPT, ICON_SUCCESS};

// Breakpoints
let bp = tokens::get_breakpoint(terminal_width);
```

## Styling with Ratatui

Ratatui uses `Style` structs applied to `Span`s and `Line`s:

```rust
use ratatui::style::{Style, Modifier};
use ratatui::text::{Span, Line};

// Spec: "key is bold in textPrimary"
let key_style = Style::default()
    .fg(colors.text_primary)
    .add_modifier(Modifier::BOLD);

// Spec: "label uses textSecondary"
let label_style = Style::default()
    .fg(colors.text_secondary);

// Rendering a hint
let hint = Line::from(vec![
    Span::styled("Esc", key_style),
    Span::raw(" "),
    Span::styled("to cancel", label_style),
]);
```

## Rendering into Buffer

Ratatui renders by writing directly into a `Buffer`:

```rust
impl StatefulWidget for HintBar {
    type State = ();

    fn render(self, area: Rect, buf: &mut Buffer, _state: &mut ()) {
        let spans: Vec<Span> = self.hints.iter()
            .filter(|(_, v)| v.is_some())
            .enumerate()
            .flat_map(|(i, (key, label))| {
                let mut parts = vec![];
                if i > 0 {
                    parts.push(Span::styled(&self.separator, self.sep_style));
                }
                parts.push(Span::styled(format_key(key), self.key_style));
                parts.push(Span::raw(" "));
                parts.push(Span::styled(label.as_ref().unwrap(), self.label_style));
                parts
            })
            .collect();

        let line = Line::from(spans);
        buf.set_line(area.x, area.y, &line, area.width);
    }
}
```

## Composition

Components compose by rendering children into sub-areas of the buffer:

```rust
impl<T: Clone> StatefulWidget for Select<T> {
    type State = SelectState;

    fn render(self, area: Rect, buf: &mut Buffer, state: &mut Self::State) {
        // Split area: items above, hint bar below
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(self.items.len() as u16),
                Constraint::Length(1), // hint bar
            ])
            .split(area);

        // Render items into top chunk
        self.render_items(chunks[0], buf, state);

        // Render hint bar into bottom chunk
        if !self.hide_hints {
            let hint_bar = HintBar::new(&self.hint_entries, &self.colors);
            Widget::render(hint_bar, chunks[1], buf);
        }
    }
}
```

## Test pattern

Use Ratatui's `TestBackend` for component testing. The `.test.md` expect blocks
become buffer content comparisons:

````rust
#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::{backend::TestBackend, Terminal};

    #[test]
    fn renders_numbered_items_with_first_highlighted() {
        let backend = TestBackend::new(60, 5);
        let mut terminal = Terminal::new(backend).unwrap();
        let colors = tokens::resolve_fallback_colors(ColorMode::Default);

        let items = vec![
            SelectItem { label: "Alpha".into(), value: "a", current: false },
            SelectItem { label: "Beta".into(), value: "b", current: false },
        ];
        let select = Select::new(&items, &colors);
        let mut state = SelectState::default();

        terminal.draw(|f| {
            select.render(f.area(), f.buffer_mut(), &mut state);
        }).unwrap();

        // ```expect block → buffer line comparison
        let buf = terminal.backend().buffer();
        assert_eq!(extract_text(buf, 0), "❯ 1. Alpha");
        assert_eq!(extract_text(buf, 1), "  2. Beta");
    }

    #[test]
    fn moves_highlight_down_on_arrow_key() {
        // ... setup ...

        // ```input block → simulate key event
        let action = select.handle_key(
            KeyEvent::new(KeyCode::Down, KeyModifiers::NONE),
            &mut state,
        );

        // Re-render and assert
        // ```expect block
        assert_eq!(state.highlighted, 1);
    }
}
````

## Key mapping

| Spec key | Crossterm `KeyCode`                            |
| -------- | ---------------------------------------------- |
| `↑`      | `KeyCode::Up`                                  |
| `↓`      | `KeyCode::Down`                                |
| `enter`  | `KeyCode::Enter`                               |
| `escape` | `KeyCode::Esc`                                 |
| `ctrl+g` | `KeyCode::Char('g')` + `KeyModifiers::CONTROL` |
| `k`, `j` | `KeyCode::Char('k')`, `KeyCode::Char('j')`     |
| `1-9`    | `KeyCode::Char('1'..='9')`                     |

## Naming conventions

| Spec convention     | Rust convention                            |
| ------------------- | ------------------------------------------ |
| `camelCase` props   | `snake_case` fields                        |
| `PascalCase` types  | `PascalCase` types                         |
| `camelCase` tokens  | `snake_case` fields (e.g., `text_primary`) |
| `UPPER_CASE` icons  | `UPPER_SNAKE_CASE` constants               |
| `onSelect` callback | `SelectAction::Selected` enum variant      |

## Dependencies

```toml
[dependencies]
ratatui = "0.28"
crossterm = "0.28"

[dev-dependencies]
# TestBackend is included in ratatui
```

## Demo CLI

Every target must include a demo that renders all components interactively.

```yaml
demo:
    entry: examples/demo.rs
    run_command: "cargo run --example demo"
```

The demo app sets up a Crossterm raw-mode terminal with Ratatui and runs an
event loop. It shows a menu of available components (using the Select component
itself), and selecting one switches to that component's demo screen.

Screens:

1. **Menu** — Select component listing all available demos
2. **HintBar demo** — renders several HintBar variants in stacked layout areas
3. **Select demo** — interactive Select with sample items + current marker
4. **SelectWithTextInput demo** — interactive variant with text input

The demo must use the generated tokens (colors from `resolve_fallback_tokens()`,
icons from `tokens::icons`) — no hardcoded color values.

## Rust-specific considerations

- **Ownership**: Components borrow tokens (`&SemanticColors`) rather than owning them.
  Items are `Clone` to allow returning from actions.
- **Lifetimes**: Prefer owned `String` in `SelectItem` to avoid lifetime complexity.
  Use `&str` for static display strings (icons, separators).
- **Error handling**: Key handling returns `SelectAction`, not `Result`. Terminal I/O
  errors are handled at the application loop level, not inside components.
- **No async**: Components are synchronous. The event loop is a blocking
  `crossterm::event::read()` call. Async (tokio) is optional and not required for
  basic TUI rendering.
