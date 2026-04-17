// Package selectcomp implements a keyboard-navigable selection list.
package selectcomp

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/basiclines/tuikit/pkg/tuikit/components/hintbar"
	"github.com/basiclines/tuikit/pkg/tuikit/tokens"
)

// SelectItem represents a selectable option.
type SelectItem[T comparable] struct {
	Label   string
	Value   T
	Current bool
}

// State represents the component's state machine state.
type State int

const (
	StateFocused   State = iota
	StateSelected
	StateDismissed
)

// SelectMsg is emitted when the user selects an item.
type SelectMsg[T comparable] struct {
	Item SelectItem[T]
}

// EscapeMsg is emitted when the user presses Escape without escapeItem.
type EscapeMsg struct{}

// HighlightMsg is emitted when the highlighted item changes.
type HighlightMsg[T comparable] struct {
	Item SelectItem[T]
}

// Model is the Select Bubbletea model.
type Model struct {
	Items       []SelectItem[string]
	Highlighted int
	State       State
	EscapeItem  *SelectItem[string]
	HideHints   bool
	ExtraHints  []hintbar.Hint
	InitialItem *string
	HasOnEscape bool
	Colors      tokens.SemanticColors
}

// New creates a new Select model.
func New(items []SelectItem[string], colors tokens.SemanticColors) Model {
	return Model{
		Items:       items,
		Highlighted: 0,
		State:       StateFocused,
		Colors:      colors,
	}
}

// WithEscapeItem sets the escape item.
func (m Model) WithEscapeItem(item SelectItem[string]) Model {
	m.EscapeItem = &item
	return m
}

// WithInitialItem sets the initial highlight position by value.
func (m Model) WithInitialItem(value string) Model {
	m.InitialItem = &value
	allItems := m.allItems()
	for i, item := range allItems {
		if item.Value == value {
			m.Highlighted = i
			return m
		}
	}
	return m
}

// WithHideHints hides the hint bar.
func (m Model) WithHideHints(hide bool) Model {
	m.HideHints = hide
	return m
}

// WithExtraHints adds extra hints to merge into the HintBar.
func (m Model) WithExtraHints(hints []hintbar.Hint) Model {
	m.ExtraHints = hints
	return m
}

// WithOnEscape indicates that onEscape callback is provided.
func (m Model) WithOnEscape(has bool) Model {
	m.HasOnEscape = has
	return m
}

func (m Model) allItems() []SelectItem[string] {
	items := make([]SelectItem[string], len(m.Items))
	copy(items, m.Items)
	if m.EscapeItem != nil {
		items = append(items, *m.EscapeItem)
	}
	return items
}

// Init initializes the model.
func (m Model) Init() tea.Cmd {
	return nil
}

// Update handles keyboard input.
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if m.State != StateFocused {
		return m, nil
	}

	allItems := m.allItems()
	if len(allItems) == 0 {
		return m, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up", "k":
			if m.Highlighted > 0 {
				m.Highlighted--
				return m, func() tea.Msg {
					return HighlightMsg[string]{Item: allItems[m.Highlighted]}
				}
			}
		case "down", "j":
			if m.Highlighted < len(allItems)-1 {
				m.Highlighted++
				return m, func() tea.Msg {
					return HighlightMsg[string]{Item: allItems[m.Highlighted]}
				}
			}
		case "enter":
			m.State = StateSelected
			item := allItems[m.Highlighted]
			return m, func() tea.Msg {
				return SelectMsg[string]{Item: item}
			}
		case "esc", "ctrl+g":
			if m.EscapeItem != nil {
				m.State = StateDismissed
				item := *m.EscapeItem
				return m, func() tea.Msg {
					return SelectMsg[string]{Item: item}
				}
			}
			if m.HasOnEscape {
				m.State = StateDismissed
				return m, func() tea.Msg {
					return EscapeMsg{}
				}
			}
		case "1", "2", "3", "4", "5", "6", "7", "8", "9":
			num := int(msg.String()[0] - '0')
			if num >= 1 && num <= len(allItems) {
				m.State = StateSelected
				item := allItems[num-1]
				return m, func() tea.Msg {
					return SelectMsg[string]{Item: item}
				}
			}
		}
	}
	return m, nil
}

// View renders the Select component.
func (m Model) View() string {
	var b strings.Builder

	allItems := m.allItems()
	colors := m.Colors

	selectedStyle := lipgloss.NewStyle().Foreground(colors.Selected)
	unselectedStyle := lipgloss.NewStyle()
	if colors.TextOnBackgroundSecondary != nil {
		unselectedStyle = unselectedStyle.Foreground(*colors.TextOnBackgroundSecondary)
	}
	successStyle := lipgloss.NewStyle().Foreground(colors.StatusSuccess)

	for i, item := range allItems {
		isHighlighted := i == m.Highlighted
		isEscapeItem := m.EscapeItem != nil && i == len(m.Items)

		var line string
		num := i + 1
		label := item.Label

		// Build suffix
		suffix := ""
		if item.Current {
			suffix += " " + successStyle.Render(tokens.IconSuccess)
		}
		if isEscapeItem {
			suffix += " " + unselectedStyle.Render("(Esc)")
		}

		if isHighlighted {
			indicator := selectedStyle.Render(tokens.IconPrompt)
			text := selectedStyle.Render(fmt.Sprintf("%d. %s", num, label))
			line = indicator + " " + text + suffix
		} else {
			text := unselectedStyle.Render(fmt.Sprintf("%d. %s", num, label))
			line = "  " + text + suffix
		}

		b.WriteString(line)
		if i < len(allItems)-1 {
			b.WriteString("\n")
		}
	}

	if !m.HideHints {
		b.WriteString("\n")
		hb := m.buildHintBar()
		b.WriteString(hb.View())
	}

	return b.String()
}

// PlainView renders without ANSI (for testing).
func (m Model) PlainView() string {
	var b strings.Builder

	allItems := m.allItems()

	for i, item := range allItems {
		isHighlighted := i == m.Highlighted
		isEscapeItem := m.EscapeItem != nil && i == len(m.Items)

		num := i + 1
		label := item.Label

		suffix := ""
		if item.Current {
			suffix += " " + tokens.IconSuccess
		}
		if isEscapeItem {
			suffix += " (Esc)"
		}

		if isHighlighted {
			b.WriteString(fmt.Sprintf("%s %d. %s%s", tokens.IconPrompt, num, label, suffix))
		} else {
			b.WriteString(fmt.Sprintf("  %d. %s%s", num, label, suffix))
		}

		if i < len(allItems)-1 {
			b.WriteString("\n")
		}
	}

	if !m.HideHints {
		b.WriteString("\n")
		hb := m.buildHintBar()
		b.WriteString(hb.PlainView())
	}

	return b.String()
}

func (m Model) buildHintBar() hintbar.Model {
	var hints []hintbar.Hint
	hints = append(hints, hintbar.Hint{Key: "up-down", Label: "to navigate"})

	// Insert extra hints
	for _, h := range m.ExtraHints {
		hints = append(hints, h)
	}

	hints = append(hints, hintbar.Hint{Key: "enter", Label: "to select"})

	if m.EscapeItem != nil || m.HasOnEscape {
		hints = append(hints, hintbar.Hint{Key: "esc", Label: "to cancel"})
	}

	return hintbar.New(hints, m.Colors)
}

// SelectedItem returns the currently highlighted item.
func (m Model) SelectedItem() *SelectItem[string] {
	allItems := m.allItems()
	if m.Highlighted >= 0 && m.Highlighted < len(allItems) {
		item := allItems[m.Highlighted]
		return &item
	}
	return nil
}
