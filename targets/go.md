---
kind: target
name: go
language: Go
runtime: go 1.22+
framework:
    name: Bubbletea
    version: ">=1.0"
    url: https://github.com/charmbracelet/bubbletea
    paradigm: Elm architecture (Model-Update-View)
styling:
    name: Lipgloss
    version: ">=1.0"
    url: https://github.com/charmbracelet/lipgloss
    role: ANSI styling (colors, bold, borders, layout)
testing:
    runner: go test
    framework: testing (stdlib)
    helper: teatest (github.com/charmbracelet/x/exp/teatest)

output:
    root: pkg/tuikit
    structure:
        tokens/colors.go: Semantic color types + resolveTokens()
        tokens/icons.go: Icon constants + semantic aliases
        tokens/breakpoints.go: Breakpoint constants + GetBreakpoint()
        components/{name}/{name}.go: Component Model + Update + View
        components/{name}/{name}_test.go: Tests
---

# Go Target — Bubbletea + Lipgloss

## Architecture pattern

Bubbletea uses the **Elm architecture**: every component is a `Model` struct with
`Init()`, `Update(msg)`, and `View()` methods. There is no virtual DOM — `View()`
returns a string of ANSI-styled text on every frame.

```go
type Model struct {
    items       []SelectItem
    highlighted int
    // ... state fields
}

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "up", "k":
            // handle navigation
        }
    }
    return m, nil
}

func (m Model) View() string {
    // render using lipgloss styles
    return s.String()
}
```

## Type mapping

| Spec type                 | Go type                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `string`                  | `string`                                                   |
| `number`                  | `int`                                                      |
| `boolean`                 | `bool`                                                     |
| `array<T>`                | `[]T`                                                      |
| `record<string, T>`       | `map[string]T`                                             |
| `callback(args) → void`   | `func(args)` — but in Bubbletea, prefer `tea.Cmd` returns  |
| `T` (generic)             | Go generics `[T any]` or `interface{}` for pre-1.18 compat |
| `string \| false \| null` | `*string` (nil = absent)                                   |
| `SelectItem<T>`           | `SelectItem[T any]` struct                                 |
| `color \| undefined`      | `*lipgloss.Color` (nil = no color, terminal default)       |
| `SemanticColor`           | `lipgloss.Color` (string underneath)                       |
| `IconGlyph`               | `string` (type alias: `type IconGlyph = string`)           |

## Callback translation

Bubbletea components don't use callbacks directly. Instead, they return **commands**
that emit **messages**. The spec's `onSelect` callback becomes:

```go
// Spec: onSelect: callback(item: SelectItem<T>) → void
// Go: return a Cmd that produces a SelectMsg

type SelectMsg[T any] struct {
    Item SelectItem[T]
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // On Enter:
    return m, func() tea.Msg {
        return SelectMsg[T]{Item: m.items[m.highlighted]}
    }
}
```

The parent component handles `SelectMsg` in its own `Update()`.

Similarly, `onEscape` becomes an `EscapeMsg`, and `onHighlight` becomes a `HighlightMsg`.

## State machine translation

Spec states map to an enum field on the Model:

```go
type State int
const (
    StateFocused State = iota
    StateSelected
    StateDismissed
)

type Model struct {
    state State
    // ...
}
```

Terminal states return a Cmd that signals completion to the parent.

## Token access

Tokens are accessed via package-level functions, not hooks:

```go
// Colors
colors := tokens.ResolveColors(ramps, tokens.ModeDefault)
style := lipgloss.NewStyle().Foreground(colors.TextPrimary)

// Icons
indicator := tokens.IconPrompt // "❯"

// Breakpoints
bp := tokens.GetBreakpoint(terminalWidth)
```

## Styling with Lipgloss

Lipgloss styles are the Go equivalent of Ink's `<Text color={} bold>`:

```go
// Spec: "key is bold in textPrimary"
keyStyle := lipgloss.NewStyle().
    Bold(true).
    Foreground(colors.TextPrimary)

// Spec: "label uses textSecondary"
labelStyle := lipgloss.NewStyle().
    Foreground(colors.TextSecondary)

// Rendering
output := keyStyle.Render("Esc") + " " + labelStyle.Render("to cancel")
```

## Composition

Bubbletea components compose by embedding child Models:

```go
type SelectModel struct {
    // ...
    hintBar hintbar.Model  // child component
}

func (m SelectModel) View() string {
    items := m.renderItems()
    hints := m.hintBar.View()
    return items + "\n" + hints
}
```

## Test pattern

Use teatest for component testing. The `.test.md` expect blocks become
string comparisons against `View()` output:

````go
func TestRendersNumberedItems(t *testing.T) {
    m := New([]SelectItem[string]{
        {Label: "Alpha", Value: "a"},
        {Label: "Beta", Value: "b"},
    })

    // Assert initial render (from ```expect block)
    expected := "❯ 1. Alpha\n  2. Beta\n↑↓ to navigate · Enter to select · Esc to cancel"
    got := stripAnsi(m.View())
    assert.Equal(t, expected, got)

    // Simulate input (from ```input block)
    m, _ = m.Update(tea.KeyMsg{Type: tea.KeyDown})

    // Assert after input (from next ```expect block)
    expected = "  1. Alpha\n❯ 2. Beta\n↑↓ to navigate · Enter to select · Esc to cancel"
    got = stripAnsi(m.View())
    assert.Equal(t, expected, got)
}
````

## Key mapping

| Spec key | `tea.KeyMsg`                                   |
| -------- | ---------------------------------------------- |
| `↑`      | `tea.KeyUp`                                    |
| `↓`      | `tea.KeyDown`                                  |
| `enter`  | `tea.KeyEnter`                                 |
| `escape` | `tea.KeyEsc`                                   |
| `ctrl+g` | `tea.KeyCtrlG`                                 |
| `k`, `j` | `tea.KeyRunes` with `string() == "k"` or `"j"` |
| `1-9`    | `tea.KeyRunes` with digit check                |

## Dependencies

```
github.com/charmbracelet/bubbletea v1.x
github.com/charmbracelet/lipgloss v1.x
github.com/charmbracelet/x/exp/teatest
github.com/basiclines/rampa-go  # or equivalent Go Rampa binding
```

## Demo CLI

Every target must include a demo that renders all components interactively.

```yaml
demo:
    entry: cmd/demo/main.go
    run_command: "go run ./cmd/demo"
```

The demo app is a Bubbletea program with a root Model that manages screen
navigation. It shows a menu of available components (using the Select component
itself), and selecting one switches to that component's demo screen.

Screens:

1. **Menu** — Select component listing all available demos
2. **HintBar demo** — renders several HintBar variants stacked vertically
3. **Select demo** — interactive Select with sample items + current marker
4. **SelectWithTextInput demo** — interactive variant with text input

The demo must use the generated tokens (colors from `ResolveFallbackColors()`,
icons from `tokens` package) — no hardcoded color values.
