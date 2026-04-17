// Demo is an interactive TUI component browser for TUIKit.
// Two-panel layout: sidebar browser on the left, main preview on the right.
//
// CLI flags:
//
//	(no flags)                             Launch full interactive TUI
//	--list                                 Print all component/token names
//	--component <Name>                     Open directly into a component
//	--component <Name> --variant <name>    Open a specific variant
//	--component <Name> --snapshot          Render one frame to stdout and exit
//	--component <Name> --variant <n> --snapshot  Render one variant frame
package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/basiclines/tuikit/pkg/tuikit/components/dialog"
	"github.com/basiclines/tuikit/pkg/tuikit/components/hintbar"
	"github.com/basiclines/tuikit/pkg/tuikit/components/icons"
	"github.com/basiclines/tuikit/pkg/tuikit/components/input"
	"github.com/basiclines/tuikit/pkg/tuikit/components/link"
	"github.com/basiclines/tuikit/pkg/tuikit/components/metric"
	"github.com/basiclines/tuikit/pkg/tuikit/components/qrcode"
	"github.com/basiclines/tuikit/pkg/tuikit/components/screen"
	"github.com/basiclines/tuikit/pkg/tuikit/components/scrollbox"
	"github.com/basiclines/tuikit/pkg/tuikit/components/selectautocomplete"
	"github.com/basiclines/tuikit/pkg/tuikit/components/selectcomp"
	"github.com/basiclines/tuikit/pkg/tuikit/components/tabbar"
	"github.com/basiclines/tuikit/pkg/tuikit/components/tablecomp"
	"github.com/basiclines/tuikit/pkg/tuikit/components/textheading"
	"github.com/basiclines/tuikit/pkg/tuikit/components/textspinner"
	"github.com/basiclines/tuikit/pkg/tuikit/components/texttitle"
	"github.com/basiclines/tuikit/pkg/tuikit/components/timelineitem"
	"github.com/basiclines/tuikit/pkg/tuikit/tokens"
)

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

// componentDef defines a previewable component/token with its variant names.
type componentDef struct {
	Name     string
	IsToken  bool
	Variants []string // matches ## headings from .preview.md
}

// ComponentRegistry is the ordered list of all previewable items.
// Tokens first (lowercase), then components (PascalCase), alphabetical within
// each group.
var ComponentRegistry = []componentDef{
	{Name: "breakpoints", IsToken: true, Variants: []string{"Current breakpoint"}},
	{Name: "colors", IsToken: true, Variants: []string{"Semantic colors", "Text tokens", "Status tokens", "Brand tokens"}},
	{Name: "icons", IsToken: true, Variants: []string{"Status icons", "Navigation icons", "UI icons", "Tree icons"}},
	{Name: "Dialog", Variants: []string{"Basic", "With subtitle", "Fixed width", "Border title", "Full variant"}},
	{Name: "HintBar", Variants: []string{"Default", "Custom keys", "Conditional", "Custom separator"}},
	{Name: "Input", Variants: []string{"Default", "Multiline", "Masked", "Single line"}},
	{Name: "Link", Variants: []string{"Default", "With label color", "With brand color", "Bold"}},
	{Name: "Metric", Variants: []string{"Default", "Highlighted"}},
	{Name: "QrCode", Variants: []string{"Short URL", "Long URL"}},
	{Name: "Screen", Variants: []string{"Basic", "With header and footer", "Non-scrollable"}},
	{Name: "ScrollBox", Variants: []string{"No scroll (content fits)", "Scrollable list", "No scrollbar", "Focusable", "Hover + virtualized"}},
	{Name: "Select", Variants: []string{"Basic", "With current item", "With text input", "Scrolling"}},
	{Name: "SelectAutocomplete", Variants: []string{"Basic", "With current item"}},
	{Name: "TabBar", Variants: []string{"Display only", "Arrow navigation", "Tab navigation", "No loop"}},
	{Name: "Table", Variants: []string{"Basic", "Borderless key-value", "Right-aligned numbers", "Width-constrained"}},
	{Name: "TextHeading", Variants: []string{"Default", "Error"}},
	{Name: "TextSpinner", Variants: []string{"Default", "Icon only", "Label only", "Placeholder", "Brand", "Info"}},
	{Name: "TextTitle", Variants: []string{"Default", "Error"}},
	{Name: "TimelineItem", Variants: []string{"Loading", "Success", "Error", "Warning", "Info", "Muted", "With multiple sub-items"}},
}

// ComponentNames returns the list of all component/token names.
func ComponentNames() []string {
	names := make([]string, len(ComponentRegistry))
	for i, c := range ComponentRegistry {
		names[i] = c.Name
	}
	return names
}

func findComponentDef(name string) *componentDef {
	for i := range ComponentRegistry {
		if ComponentRegistry[i].Name == name {
			return &ComponentRegistry[i]
		}
	}
	return nil
}

func (c *componentDef) hasVariant(name string) bool {
	for _, v := range c.Variants {
		if v == name {
			return true
		}
	}
	return false
}

// sidebarDisplayName returns a human-friendly label for the sidebar.
func sidebarDisplayName(name string) string {
	if len(name) > 0 && name[0] >= 'a' && name[0] <= 'z' {
		return strings.ToUpper(name[:1]) + name[1:]
	}
	return name
}

// ---------------------------------------------------------------------------
// Snapshot rendering — pure functions, no TUI required
// ---------------------------------------------------------------------------

// RenderSnapshot renders one frame of a component (all variants or a single
// variant) to a string. Used by --snapshot and by the demo smoke tests.
func RenderSnapshot(compName, variantFilter string, colors tokens.SemanticColors, width int) string {
	comp := findComponentDef(compName)
	if comp == nil {
		return ""
	}

	var b strings.Builder
	for _, vName := range comp.Variants {
		if variantFilter != "" && vName != variantFilter {
			continue
		}
		heading := textheading.New(vName, colors)
		b.WriteString(heading.View() + "\n")
		b.WriteString(renderVariant(compName, vName, colors, width))
		b.WriteString("\n\n")
	}
	return strings.TrimRight(b.String(), "\n")
}

//nolint:cyclop // switch on component names is inherently long
func renderVariant(compName, variant string, colors tokens.SemanticColors, width int) string {
	switch compName {
	// ---- Tokens ----
	case "breakpoints":
		return renderBreakpointVariant(variant, colors, width)
	case "colors":
		return renderColorVariant(variant, colors)
	case "icons":
		return renderIconVariant(variant, colors)

	// ---- Components ----
	case "Dialog":
		return renderDialogVariant(variant, colors)
	case "HintBar":
		return renderHintBarVariant(variant, colors)
	case "Input":
		return renderInputVariant(variant, colors)
	case "Link":
		return renderLinkVariant(variant, colors)
	case "Metric":
		return renderMetricVariant(variant, colors)
	case "QrCode":
		return renderQrCodeVariant(variant)
	case "Screen":
		return renderScreenVariant(variant, colors)
	case "ScrollBox":
		return renderScrollBoxVariant(variant, colors)
	case "Select":
		return renderSelectVariant(variant, colors)
	case "SelectAutocomplete":
		return renderSelectAutocompleteVariant(variant, colors)
	case "TabBar":
		return renderTabBarVariant(variant, colors, width)
	case "Table":
		return renderTableVariant(variant, colors)
	case "TextHeading":
		return renderTextHeadingVariant(variant, colors)
	case "TextSpinner":
		return renderTextSpinnerVariant(variant, colors)
	case "TextTitle":
		return renderTextTitleVariant(variant, colors)
	case "TimelineItem":
		return renderTimelineItemVariant(variant, colors)
	}
	return ""
}

// --- Token variant renderers ---

func renderBreakpointVariant(_ string, colors tokens.SemanticColors, width int) string {
	bp := tokens.GetBreakpoint(width)
	bpStyle := lipgloss.NewStyle().Foreground(colors.Selected).Bold(true)
	var b strings.Builder
	b.WriteString(fmt.Sprintf("  Terminal width: %d columns\n", width))
	b.WriteString(fmt.Sprintf("  Current breakpoint: %s\n\n", bpStyle.Render(bp.String())))
	b.WriteString(fmt.Sprintf("  Compact:  < 80 columns  %s\n", checkIf(bp == tokens.BreakpointCompact, colors)))
	b.WriteString(fmt.Sprintf("  Narrow:   80–119        %s\n", checkIf(bp == tokens.BreakpointNarrow, colors)))
	b.WriteString(fmt.Sprintf("  Wide:     ≥ 120         %s\n", checkIf(bp == tokens.BreakpointWide, colors)))
	return b.String()
}

func renderColorVariant(variant string, colors tokens.SemanticColors) string {
	type ce struct {
		name  string
		color lipgloss.Color
	}
	var entries []ce
	switch variant {
	case "Text tokens":
		entries = []ce{
			{"TextSecondary", colors.TextSecondary},
			{"TextTertiary", colors.TextTertiary},
		}
	case "Status tokens":
		entries = []ce{
			{"StatusSuccess", colors.StatusSuccess},
			{"StatusWarning", colors.StatusWarning},
			{"StatusError", colors.StatusError},
			{"StatusInfo", colors.StatusInfo},
		}
	case "Brand tokens":
		entries = []ce{
			{"Brand", colors.Brand},
			{"BrandBright", colors.BrandBright},
			{"Selected", colors.Selected},
			{"SelectedBright", colors.SelectedBright},
		}
	default: // Semantic colors
		entries = []ce{
			{"Selected", colors.Selected},
			{"SelectedBright", colors.SelectedBright},
			{"StatusSuccess", colors.StatusSuccess},
			{"StatusWarning", colors.StatusWarning},
			{"StatusError", colors.StatusError},
			{"StatusInfo", colors.StatusInfo},
			{"Brand", colors.Brand},
			{"TextSecondary", colors.TextSecondary},
			{"TextTertiary", colors.TextTertiary},
			{"BorderNeutral", colors.BorderNeutral},
		}
	}
	var b strings.Builder
	for _, e := range entries {
		swatch := lipgloss.NewStyle().Background(e.color).Render("  ")
		label := lipgloss.NewStyle().Foreground(e.color).Render(e.name)
		b.WriteString(fmt.Sprintf("  %s  %s\n", swatch, label))
	}
	return b.String()
}

func renderIconVariant(variant string, colors tokens.SemanticColors) string {
	type ie struct{ name, glyph string }
	var list []ie
	switch variant {
	case "Navigation icons":
		list = []ie{
			{"ArrowUp", tokens.ArrowUp}, {"ArrowDown", tokens.ArrowDown},
			{"ArrowLeft", tokens.ArrowLeft}, {"ArrowRight", tokens.ArrowRight},
		}
	case "UI icons":
		list = []ie{
			{"CheckboxChecked", tokens.CheckboxChecked}, {"CheckboxUnchecked", tokens.CheckboxUnchecked},
			{"Scrollbar", tokens.Scrollbar}, {"SeparatorWord", tokens.DotSeparator},
			{"SeparatorList", tokens.Bullet},
		}
	case "Tree icons":
		list = []ie{
			{"NestingLast", tokens.ChildLast}, {"NestingMiddle", tokens.ChildMiddle},
			{"NestingSkip", tokens.ChildSkip},
		}
	default: // Status icons
		list = []ie{
			{"Success", tokens.Check}, {"Error", tokens.Cross},
			{"Warning", tokens.Warning}, {"Prompt", tokens.ChevronRight},
			{"InfoCompleted", tokens.CircleFilled}, {"InfoWorking", tokens.CircleHalf},
			{"InfoEmpty", tokens.CircleEmpty},
		}
	}
	var b strings.Builder
	for _, ic := range list {
		i := icons.CreateIcon(ic.glyph, ic.name)
		b.WriteString(fmt.Sprintf("  %s  %s\n", i.View(colors), ic.name))
	}
	return b.String()
}

// --- Component variant renderers ---

func renderDialogVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "With subtitle":
		return dialog.New("Confirm Delete", "Are you sure?", colors).
			WithSubtitle("This action cannot be undone").View()
	case "Fixed width":
		return dialog.New("Narrow Dialog", "Content constrained to 40 columns.", colors).
			WithWidth(40).View()
	case "Border title":
		return dialog.New("Session Info", "Model: GPT-4 · Tokens: 1,234", colors).
			WithTitlePlacement("border").View()
	case "Full variant":
		return dialog.New("Permissions", "Allow access to this folder?", colors).
			WithTitlePlacement("border").WithSubtitle("Required for this workspace").View()
	default: // Basic
		return dialog.New("Notice", "This is a simple dialog.", colors).View()
	}
}

func renderHintBarVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Custom keys":
		return hintbar.New([]hintbar.Hint{
			{Key: "tab", Label: "next file"}, {Key: "shift-tab", Label: "previous file"},
			{Key: "s", Label: "to save"}, {Key: "esc", Label: "to close"},
		}, colors).View()
	case "Conditional":
		return hintbar.New([]hintbar.Hint{
			{Key: "up-down", Label: "to navigate"}, {Key: "enter", Label: "to select"},
			{Key: "esc", Label: "to cancel"},
		}, colors).View()
	case "Custom separator":
		return hintbar.New([]hintbar.Hint{
			{Key: "a", Label: "one"}, {Key: "b", Label: "two"}, {Key: "c", Label: "three"},
		}, colors).WithSeparator(" | ").View()
	default: // Default
		return hintbar.New([]hintbar.Hint{
			{Key: "up-down", Label: "to navigate"}, {Key: "enter", Label: "to select"},
			{Key: "esc", Label: "to cancel"},
		}, colors).View()
	}
}

func renderInputVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Multiline":
		return input.New(colors).WithPlaceholder("Type here... (Shift+Enter for newlines)").View()
	case "Masked":
		return input.New(colors).WithPlaceholder("Enter password...").WithMask("*").View()
	case "Single line":
		return input.New(colors).WithPlaceholder("No newlines allowed...").WithSingleLine(true).View()
	default: // Default
		return input.New(colors).WithPlaceholder("Type here...").View()
	}
}

func renderLinkVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "With label color":
		return link.New("https://github.com").WithColor(colors.MarkdownLink).View()
	case "With brand color":
		return link.New("https://github.com").WithColor(colors.Brand).View()
	case "Bold":
		return link.New("https://github.com").WithColor(colors.MarkdownLink).WithBold(true).View()
	default: // Default
		return link.New("https://github.com").View()
	}
}

func renderMetricVariant(variant string, colors tokens.SemanticColors) string {
	chars := []metric.MetricChar{
		metric.NewUniformChar("U+25A0", "■"),
		metric.NewUniformChar("U+2588", "█"),
		metric.NewProgressiveChar("U+28xx", []string{"⣀", "⣤", "⣶", "⣿"}),
	}
	met := metric.New(chars, colors)
	_ = variant // Highlighted variant uses same data (color override not yet wired)
	return met.View()
}

func renderQrCodeVariant(variant string) string {
	switch variant {
	case "Long URL":
		return qrcode.New("https://github.com/github/copilot-agent-runtime/tasks/abc-123").View()
	default:
		return qrcode.New("https://github.com").View()
	}
}

func renderScreenVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "With header and footer":
		lines := []string{
			"10:21:03 Server starting on port 3000",
			"10:21:04 Connected to database",
			"10:21:05 Registered 14 API routes",
		}
		return screen.New(lines, 10, colors).
			WithHeader("Screen — Screen.tsx\nApplication Log (3 entries)").
			WithFooter("↑↓ scroll · Esc back").View()
	case "Non-scrollable":
		lines := []string{"Line 1", "Line 2", "Line 3"}
		return screen.New(lines, 10, colors).
			WithScrollable(false).WithHeader("Static Screen").WithFooter("Esc back").View()
	default: // Basic
		lines := []string{
			"10:21:03 Server starting on port 3000",
			"10:21:04 Connected to database",
			"10:21:05 Registered 14 API routes",
		}
		return screen.New(lines, 10, colors).View()
	}
}

func renderScrollBoxVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Scrollable list":
		lines := []string{
			"  ◎ 001 [INFO ] Server starting on port 3000",
			"  ◎ 002 [INFO ] Loading configuration from .env",
			"  ✓ 003 [OK   ] Connected to database",
			"  ◎ 004 [INFO ] Processing batch job #1284",
			"  ✓ 005 [OK   ] Batch job completed (42 items)",
			"  ! 006 [WARN ] Redis not configured",
			"  ◎ 007 [INFO ] Incoming webhook from GitHub",
			"  ✖ 008 [ERROR] Build failed: missing dependency",
		}
		return scrollbox.New(lines, 5, colors).View()
	case "No scrollbar":
		lines := []string{"Item 0", "Item 1", "Item 2", "Item 3", "Item 4", "Item 5"}
		return scrollbox.New(lines, 4, colors).WithShowScrollbar(false).View()
	case "Focusable":
		lines := []string{
			"❯ 001 [INFO ] First item", "  002 [WARN ] Second item",
			"  003 [OK   ] Third item", "  004 [INFO ] Fourth item",
		}
		return scrollbox.New(lines, 4, colors).View()
	case "Hover + virtualized":
		lines := []string{
			"❯ 001 [INFO ] Item one", "  002 [INFO ] Item two",
			"  003 [WARN ] Item three", "  004 [OK   ] Item four",
			"  005 [INFO ] Item five", "  006 [ERROR] Item six",
		}
		return scrollbox.New(lines, 4, colors).View()
	default: // No scroll (content fits)
		lines := []string{
			"  ◎ 001 [INFO ] Server starting on port 3000",
			"  ✓ 002 [OK   ] Connected to database",
			"  ◎ 003 [INFO ] Registered 14 API routes",
		}
		return scrollbox.New(lines, 5, colors).View()
	}
}

func renderSelectVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "With current item":
		items := []selectcomp.SelectItem[string]{
			{Label: "Alpha", Value: "alpha"},
			{Label: "Beta", Value: "beta", Current: true},
			{Label: "Gamma", Value: "gamma"},
		}
		return selectcomp.New(items, colors).
			WithEscapeItem(selectcomp.SelectItem[string]{Label: "Cancel", Value: "cancel"}).View()
	case "With text input":
		items := []selectcomp.SelectItem[string]{
			{Label: "Alpha", Value: "alpha"},
			{Label: "Beta", Value: "beta"},
		}
		return selectcomp.New(items, colors).
			WithEscapeItem(selectcomp.SelectItem[string]{Label: "Something else...", Value: "other"}).View()
	case "Scrolling":
		items := []selectcomp.SelectItem[string]{
			{Label: "Alpha", Value: "alpha"}, {Label: "Beta", Value: "beta"},
			{Label: "Gamma", Value: "gamma"}, {Label: "Delta", Value: "delta"},
			{Label: "Epsilon", Value: "epsilon"}, {Label: "Zeta", Value: "zeta"},
			{Label: "Eta", Value: "eta"}, {Label: "Theta", Value: "theta"},
			{Label: "Iota", Value: "iota"}, {Label: "Kappa", Value: "kappa"},
		}
		return selectcomp.New(items, colors).
			WithEscapeItem(selectcomp.SelectItem[string]{Label: "Cancel", Value: "cancel"}).View()
	default: // Basic
		items := []selectcomp.SelectItem[string]{
			{Label: "Alpha", Value: "alpha"},
			{Label: "Beta", Value: "beta"},
			{Label: "Gamma", Value: "gamma"},
		}
		return selectcomp.New(items, colors).
			WithEscapeItem(selectcomp.SelectItem[string]{Label: "Cancel", Value: "cancel"}).View()
	}
}

func renderSelectAutocompleteVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "With current item":
		items := []selectautocomplete.Item{
			{Label: "Alpha", Value: "alpha"},
			{Label: "Beta", Value: "beta", Current: true},
			{Label: "Gamma", Value: "gamma"},
		}
		return selectautocomplete.New(items, colors).
			WithEscapeItem(selectautocomplete.Item{Label: "Cancel", Value: "cancel"}).
			WithSearchPlaceholder("Search...").View()
	default: // Basic
		items := []selectautocomplete.Item{
			{Label: "Alpha", Value: "alpha"},
			{Label: "Beta", Value: "beta"},
			{Label: "Gamma", Value: "gamma"},
		}
		return selectautocomplete.New(items, colors).
			WithEscapeItem(selectautocomplete.Item{Label: "Cancel", Value: "cancel"}).
			WithSearchPlaceholder("Search options...").View()
	}
}

func renderTabBarVariant(variant string, colors tokens.SemanticColors, width int) string {
	switch variant {
	case "Arrow navigation":
		items := []tabbar.TabItem{
			{Value: "1", Label: "index.ts"}, {Value: "2", Label: "utils.ts"},
			{Value: "3", Label: "config.ts"}, {Value: "4", Label: "types.ts"},
			{Value: "5", Label: "test.ts"},
		}
		return tabbar.New(items, 0, colors).WithNavKeys("arrow-only").WithWidth(width).View()
	case "Tab navigation":
		items := []tabbar.TabItem{
			{Value: "1", Label: "Overview"}, {Value: "2", Label: "Details"},
			{Value: "3", Label: "Settings"},
		}
		return tabbar.New(items, 0, colors).WithNavKeys("tab-only").WithWidth(width).View()
	case "No loop":
		items := []tabbar.TabItem{
			{Value: "1", Label: "First"}, {Value: "2", Label: "Second"},
			{Value: "3", Label: "Third"},
		}
		return tabbar.New(items, 0, colors).WithNavKeys("all").WithLoop(false).WithWidth(width).View()
	default: // Display only
		items := []tabbar.TabItem{
			{Value: "overview", Label: "Overview"}, {Value: "details", Label: "Details"},
			{Value: "settings", Label: "Settings"}, {Value: "about", Label: "About"},
		}
		return tabbar.New(items, 1, colors).WithWidth(width).View()
	}
}

func renderTableVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Borderless key-value":
		rows := [][]tablecomp.TableCell{
			{tablecomp.NewTextCell("Type"), tablecomp.NewTextCell("stdio")},
			{tablecomp.NewTextCell("Status"), tablecomp.NewTextCell("Connected")},
			{tablecomp.NewTextCell("Model"), tablecomp.NewTextCell("GPT-4")},
		}
		return tablecomp.New(rows, colors).WithBorderStyle("none").View()
	case "Right-aligned numbers":
		rows := [][]tablecomp.TableCell{
			{tablecomp.NewTextCell("Latency"), tablecomp.NewTextCell("42"), tablecomp.NewTextCell("ms")},
			{tablecomp.NewTextCell("Tokens"), tablecomp.NewTextCell("1234"), tablecomp.NewTextCell("tok")},
			{tablecomp.NewTextCell("Cost"), tablecomp.NewTextCell("0.03"), tablecomp.NewTextCell("USD")},
		}
		return tablecomp.New(rows, colors).
			WithHeaders([]string{"Metric", "Value", "Unit"}).
			WithAlign([]string{"left", "right", "left"}).View()
	case "Width-constrained":
		rows := [][]tablecomp.TableCell{
			{tablecomp.NewTextCell("E001"), tablecomp.NewTextCell("Missing required field 'name' in configuration")},
			{tablecomp.NewTextCell("E002"), tablecomp.NewTextCell("Connection timeout after 30 seconds")},
		}
		return tablecomp.New(rows, colors).
			WithHeaders([]string{"Error", "Message"}).WithWidth(60).View()
	default: // Basic
		rows := [][]tablecomp.TableCell{
			{tablecomp.NewTextCell("/help"), tablecomp.NewTextCell("Show all commands")},
			{tablecomp.NewTextCell("/theme"), tablecomp.NewTextCell("Change color theme")},
			{tablecomp.NewTextCell("/clear"), tablecomp.NewTextCell("Clear conversation")},
		}
		return tablecomp.New(rows, colors).
			WithHeaders([]string{"Command", "Description"}).View()
	}
}

func renderTextHeadingVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Error":
		return textheading.New("Error Details", colors).WithType("error").View()
	default:
		return textheading.New("Section Heading", colors).View()
	}
}

func renderTextSpinnerVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Icon only":
		return textspinner.New(colors).View()
	case "Label only":
		return textspinner.New(colors).WithShowIcon(false).WithText("Unlimited reqs.").View()
	case "Placeholder":
		return textspinner.New(colors).WithText("Waiting for input").WithVariant(textspinner.VariantPlaceholder).View()
	case "Brand":
		return textspinner.New(colors).WithText("Thinking").WithVariant(textspinner.VariantBrand).View()
	case "Info":
		return textspinner.New(colors).WithText("Compacting conversation history").WithVariant(textspinner.VariantInfo).View()
	default: // Default
		return textspinner.New(colors).WithText("Loading").View()
	}
}

func renderTextTitleVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Error":
		return texttitle.New("Something went wrong", colors).WithType("error").View()
	default:
		return texttitle.New("Welcome to TUIkit", colors).View()
	}
}

func renderTimelineItemVariant(variant string, colors tokens.SemanticColors) string {
	switch variant {
	case "Success":
		return timelineitem.New("Grep", timelineitem.VariantSuccess, colors).
			WithDescription(`"pattern" in *.ts`).
			WithSubItems([]string{"5 files found"}).View()
	case "Error":
		return timelineitem.New("Bash", timelineitem.VariantError, colors).
			WithDescription("npm run build").
			WithSubItems([]string{"Exit code 1"}).View()
	case "Warning":
		return timelineitem.New("Bash", timelineitem.VariantWarning, colors).
			WithDescription("rm -rf /").
			WithSubItems([]string{"Rejected by you."}).View()
	case "Info":
		return timelineitem.New("Compacted", timelineitem.VariantInfo, colors).
			WithDescription("Removed 42 messages").View()
	case "Muted":
		return timelineitem.New("Read", timelineitem.VariantMuted, colors).
			WithDescription("src/index.ts").
			WithSubItems([]string{"24 lines"}).View()
	case "With multiple sub-items":
		return timelineitem.New("Edit", timelineitem.VariantSuccess, colors).
			WithDescription("src/auth.ts").
			WithSubItems([]string{"Added JWT validation", "Removed deprecated handler", "+12 -8 lines"}).View()
	default: // Loading
		return timelineitem.New("Grep", timelineitem.VariantLoading, colors).
			WithDescription(`"pattern" in *.ts`).View()
	}
}

func checkIf(active bool, colors tokens.SemanticColors) string {
	if active {
		return lipgloss.NewStyle().Foreground(colors.StatusSuccess).Render(tokens.Check)
	}
	return " "
}

// ---------------------------------------------------------------------------
// Interactive TUI model
// ---------------------------------------------------------------------------

type focus int

const (
	focusSidebar focus = iota
	focusPreview
)

// TickMsg triggers spinner animation.
type TickMsg time.Time

type model struct {
	colors      tokens.SemanticColors
	focus       focus
	highlighted int
	openIndex   int // -1 = nothing open
	searchTerm  string
	searching   bool
	width       int
	height      int
	sidebarW    int

	// When non-empty, skip sidebar and open directly into this component.
	directComponent string

	// Reusable component models for interactive previews
	spinner     textspinner.Model
	inputModel  input.Model
	tabModel    tabbar.Model
	selectModel selectcomp.Model
	scrollModel scrollbox.Model
	saModel     selectautocomplete.Model
}

func initialModel() model {
	colors := tokens.ResolveColors(tokens.ModeDefault)
	return model{
		colors:   colors,
		focus:    focusSidebar,
		openIndex: -1,
		sidebarW: 24,
		spinner:  textspinner.New(colors).WithText("Loading demo..."),
	}
}

// initInteractiveModels creates/resets the interactive component models used
// in the preview panel.
func (m *model) initInteractiveModels() {
	colors := m.colors

	m.spinner = textspinner.New(colors).WithText("Loading demo...")

	m.selectModel = selectcomp.New([]selectcomp.SelectItem[string]{
		{Label: "Alpha", Value: "alpha"},
		{Label: "Beta", Value: "beta"},
		{Label: "Gamma", Value: "gamma"},
	}, colors).WithEscapeItem(selectcomp.SelectItem[string]{Label: "Cancel", Value: "cancel"})

	m.tabModel = tabbar.New([]tabbar.TabItem{
		{Value: "overview", Label: "Overview"},
		{Value: "details", Label: "Details"},
		{Value: "settings", Label: "Settings"},
		{Value: "about", Label: "About"},
	}, 0, colors)

	m.inputModel = input.New(colors).WithPlaceholder("Type here...")

	m.saModel = selectautocomplete.New([]selectautocomplete.Item{
		{Label: "Alpha", Value: "alpha"},
		{Label: "Beta", Value: "beta"},
		{Label: "Gamma", Value: "gamma"},
	}, colors).WithEscapeItem(selectautocomplete.Item{Label: "Cancel", Value: "cancel"}).
		WithSearchPlaceholder("Search options...")

	scrollLines := make([]string, 20)
	for i := range scrollLines {
		scrollLines[i] = fmt.Sprintf("Scrollable line %d", i+1)
	}
	m.scrollModel = scrollbox.New(scrollLines, 8, colors)
}

func (m model) Init() tea.Cmd {
	return tea.Batch(tickCmd())
}

func tickCmd() tea.Cmd {
	return tea.Tick(120*time.Millisecond, func(t time.Time) tea.Msg {
		return TickMsg(t)
	})
}

func (m model) filteredEntries() []componentDef {
	if m.searchTerm == "" {
		return ComponentRegistry
	}
	term := strings.ToLower(m.searchTerm)
	var out []componentDef
	for _, e := range ComponentRegistry {
		if fuzzyMatch(strings.ToLower(e.Name), term) {
			out = append(out, e)
		}
	}
	return out
}

func fuzzyMatch(text, pattern string) bool {
	pi := 0
	for ti := 0; ti < len(text) && pi < len(pattern); ti++ {
		if text[ti] == pattern[pi] {
			pi++
		}
	}
	return pi == len(pattern)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		// On first size message with --component, jump to that component.
		if m.directComponent != "" {
			idx := m.resolveIndex(m.directComponent)
			if idx >= 0 {
				m.openIndex = idx
				m.focus = focusPreview
				m.initInteractiveModels()
			}
			m.directComponent = "" // consume
		}
		return m, nil

	case TickMsg:
		newSp, cmd := m.spinner.Update(textspinner.TickMsg{})
		m.spinner = newSp.(textspinner.Model)
		return m, tea.Batch(cmd, tickCmd())

	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}

		if m.focus == focusSidebar {
			// q quits from sidebar (unless searching)
			if msg.String() == "q" && !m.searching {
				return m, tea.Quit
			}
			return m.updateSidebar(msg)
		}
		return m.updatePreview(msg)
	}
	return m, nil
}

func (m model) updateSidebar(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	entries := m.filteredEntries()

	if m.searching {
		switch msg.Type {
		case tea.KeyEscape:
			m.searching = false
			m.searchTerm = ""
			m.highlighted = 0
			return m, nil
		case tea.KeyBackspace:
			if len(m.searchTerm) > 0 {
				m.searchTerm = m.searchTerm[:len(m.searchTerm)-1]
				m.highlighted = 0
			}
			return m, nil
		case tea.KeyUp:
			if len(entries) > 0 && m.highlighted > 0 {
				m.highlighted--
			}
			return m, nil
		case tea.KeyDown:
			if len(entries) > 0 && m.highlighted < len(entries)-1 {
				m.highlighted++
			}
			return m, nil
		case tea.KeyEnter:
			if len(entries) > 0 {
				m.openIndex = m.resolveIndex(entries[m.highlighted].Name)
				m.focus = focusPreview
				m.searching = false
				m.initInteractiveModels()
			}
			return m, nil
		case tea.KeyRunes:
			m.searchTerm += string(msg.Runes)
			m.highlighted = 0
			return m, nil
		}
		return m, nil
	}

	switch msg.String() {
	case "up", "k":
		if m.highlighted > 0 {
			m.highlighted--
		}
	case "down", "j":
		if len(entries) > 0 && m.highlighted < len(entries)-1 {
			m.highlighted++
		}
	case "enter":
		if len(entries) > 0 {
			m.openIndex = m.resolveIndex(entries[m.highlighted].Name)
			m.focus = focusPreview
			m.initInteractiveModels()
		}
	case "/":
		m.searching = true
	default:
		if msg.Type == tea.KeyRunes {
			m.searching = true
			m.searchTerm = string(msg.Runes)
			m.highlighted = 0
		}
	}
	return m, nil
}

func (m model) resolveIndex(name string) int {
	for i, e := range ComponentRegistry {
		if e.Name == name {
			return i
		}
	}
	return -1
}

func (m model) isTextInputComponent() bool {
	if m.openIndex < 0 || m.openIndex >= len(ComponentRegistry) {
		return false
	}
	name := ComponentRegistry[m.openIndex].Name
	return name == "Input" || name == "SelectAutocomplete"
}

func (m model) updatePreview(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Escape always returns to sidebar
	if msg.String() == "esc" {
		m.focus = focusSidebar
		return m, nil
	}

	// q quits from preview (except for text-input components where it is
	// forwarded as a typed character)
	if msg.String() == "q" && !m.isTextInputComponent() {
		return m, tea.Quit
	}

	if m.openIndex < 0 || m.openIndex >= len(ComponentRegistry) {
		return m, nil
	}

	name := ComponentRegistry[m.openIndex].Name
	switch name {
	case "Input":
		newM, cmd := m.inputModel.Update(msg)
		m.inputModel = newM.(input.Model)
		return m, cmd
	case "TabBar":
		newM, cmd := m.tabModel.Update(msg)
		m.tabModel = newM.(tabbar.Model)
		return m, cmd
	case "Select":
		newM, cmd := m.selectModel.Update(msg)
		m.selectModel = newM.(selectcomp.Model)
		// Reset terminal state so the demo stays interactive
		if m.selectModel.State != selectcomp.StateFocused {
			m.selectModel.State = selectcomp.StateFocused
		}
		return m, cmd
	case "SelectAutocomplete":
		newM, cmd := m.saModel.Update(msg)
		m.saModel = newM.(selectautocomplete.Model)
		if m.saModel.State != selectautocomplete.StateFocused {
			m.saModel.State = selectautocomplete.StateFocused
		}
		return m, cmd
	case "ScrollBox":
		newM, cmd := m.scrollModel.Update(msg)
		m.scrollModel = newM.(scrollbox.Model)
		return m, cmd
	}
	return m, nil
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

func (m model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Initializing..."
	}

	sidebar := m.renderSidebar()
	preview := m.renderPreview()

	mainW := m.width - m.sidebarW - 3
	if mainW < 10 {
		mainW = 10
	}

	sidebarStyle := lipgloss.NewStyle().
		Width(m.sidebarW).
		Height(m.height - 2).
		BorderStyle(lipgloss.NormalBorder()).
		BorderRight(true).
		BorderForeground(m.colors.BorderNeutral).
		PaddingRight(1)

	previewStyle := lipgloss.NewStyle().
		Width(mainW).
		Height(m.height - 2).
		PaddingLeft(1)

	if m.focus == focusSidebar {
		sidebarStyle = sidebarStyle.BorderForeground(m.colors.Selected)
	}

	content := lipgloss.JoinHorizontal(lipgloss.Top,
		sidebarStyle.Render(sidebar),
		previewStyle.Render(preview),
	)

	hints := m.buildHintBar()
	return content + "\n" + hints.View()
}

func (m model) renderSidebar() string {
	var b strings.Builder

	title := texttitle.New("TUIkit Preview", m.colors)
	b.WriteString(title.View())
	b.WriteString("\n\n")

	if m.searching {
		searchStyle := lipgloss.NewStyle().Foreground(m.colors.Selected)
		b.WriteString(searchStyle.Render(tokens.IconPrompt+" "+m.searchTerm) + "█\n\n")
	} else {
		dimStyle := lipgloss.NewStyle().Foreground(m.colors.TextTertiary)
		b.WriteString(dimStyle.Render("  ▸ Search...") + "\n\n")
	}

	entries := m.filteredEntries()
	lastWasToken := false

	for i, e := range entries {
		if lastWasToken && !e.IsToken {
			dimStyle := lipgloss.NewStyle().Foreground(m.colors.TextTertiary)
			b.WriteString(dimStyle.Render("  ──────────────────") + "\n")
			lastWasToken = false
		}
		if e.IsToken {
			lastWasToken = true
		}

		prefix := "  "
		nameStyle := lipgloss.NewStyle()
		if i == m.highlighted {
			prefix = lipgloss.NewStyle().Foreground(m.colors.Selected).Render(tokens.IconPrompt) + " "
			nameStyle = nameStyle.Foreground(m.colors.Selected)
		}

		suffix := ""
		if m.openIndex >= 0 && ComponentRegistry[m.openIndex].Name == e.Name {
			suffix = " " + lipgloss.NewStyle().Foreground(m.colors.TextSecondary).Render("◂")
		}

		b.WriteString(prefix + nameStyle.Render(sidebarDisplayName(e.Name)) + suffix + "\n")
	}

	return b.String()
}

func (m model) renderPreview() string {
	if m.openIndex < 0 {
		placeholder := lipgloss.NewStyle().Foreground(m.colors.TextSecondary)
		return placeholder.Render("Select a component to preview")
	}

	entry := ComponentRegistry[m.openIndex]
	var b strings.Builder

	compHeading := textheading.New(sidebarDisplayName(entry.Name), m.colors)
	b.WriteString(compHeading.View() + "\n\n")

	for vi, vName := range entry.Variants {
		variantHeading := lipgloss.NewStyle().
			Foreground(m.colors.TextSecondary).Bold(true).Render("## " + vName)
		b.WriteString(variantHeading + "\n")

		b.WriteString(m.renderInteractiveVariant(entry.Name, vName))
		if vi < len(entry.Variants)-1 {
			b.WriteString("\n\n")
		}
	}

	return b.String()
}

// renderInteractiveVariant renders a live (possibly stateful) variant.
// For interactive components it uses the model's persistent sub-models;
// for display-only components it creates a fresh instance (same as snapshot).
func (m model) renderInteractiveVariant(compName, variant string) string {
	switch compName {
	case "Select":
		if variant == "Basic" {
			return m.selectModel.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	case "SelectAutocomplete":
		if variant == "Basic" {
			return m.saModel.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	case "Input":
		if variant == "Default" {
			return m.inputModel.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	case "TabBar":
		if variant == "Display only" {
			return m.tabModel.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	case "ScrollBox":
		if variant == "Scrollable list" {
			return m.scrollModel.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	case "TextSpinner":
		if variant == "Default" {
			return m.spinner.View()
		}
		return renderVariant(compName, variant, m.colors, m.width)
	default:
		return renderVariant(compName, variant, m.colors, m.width)
	}
}

func (m model) buildHintBar() hintbar.Model {
	var hints []hintbar.Hint

	if m.focus == focusSidebar {
		hints = append(hints, hintbar.Hint{Key: "up-down", Label: "navigate"})
		hints = append(hints, hintbar.Hint{Key: "enter", Label: "open"})
		if m.searching {
			hints = append(hints, hintbar.Hint{Key: "esc", Label: "clear"})
		} else {
			hints = append(hints, hintbar.Hint{Key: "/", Label: "search"})
		}
		hints = append(hints, hintbar.Hint{Key: "q", Label: "quit"})
	} else {
		if m.openIndex >= 0 {
			name := ComponentRegistry[m.openIndex].Name
			switch name {
			case "Select", "SelectAutocomplete":
				hints = append(hints, hintbar.Hint{Key: "up-down", Label: "navigate"})
				hints = append(hints, hintbar.Hint{Key: "enter", Label: "select"})
			case "TabBar":
				hints = append(hints, hintbar.Hint{Key: "left-right", Label: "switch tab"})
			case "Input":
				hints = append(hints, hintbar.Hint{Key: "type", Label: "to input"})
			case "ScrollBox":
				hints = append(hints, hintbar.Hint{Key: "up-down", Label: "scroll"})
			}
		}
		hints = append(hints, hintbar.Hint{Key: "esc", Label: "back"})
		hints = append(hints, hintbar.Hint{Key: "q", Label: "quit"})
	}

	return hintbar.New(hints, m.colors)
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

func main() {
	listFlag := flag.Bool("list", false, "Print all component/token names, one per line")
	compFlag := flag.String("component", "", "Component name to preview")
	variantFlag := flag.String("variant", "", "Variant name (requires --component)")
	snapshotFlag := flag.Bool("snapshot", false, "Render one frame to stdout and exit (requires --component)")
	flag.Parse()

	// --list
	if *listFlag {
		for _, name := range ComponentNames() {
			fmt.Println(name)
		}
		os.Exit(0)
	}

	// --variant without --component
	if *variantFlag != "" && *compFlag == "" {
		fmt.Fprintln(os.Stderr, "Error: --variant requires --component")
		os.Exit(1)
	}

	// --snapshot without --component
	if *snapshotFlag && *compFlag == "" {
		fmt.Fprintln(os.Stderr, "Error: --snapshot requires --component")
		os.Exit(1)
	}

	// --component
	if *compFlag != "" {
		comp := findComponentDef(*compFlag)
		if comp == nil {
			fmt.Fprintf(os.Stderr, "Error: component %q not found\n", *compFlag)
			os.Exit(1)
		}

		if *variantFlag != "" && !comp.hasVariant(*variantFlag) {
			fmt.Fprintf(os.Stderr, "Error: variant %q not found in component %q\n", *variantFlag, *compFlag)
			os.Exit(1)
		}

		// --snapshot: render one frame and exit
		if *snapshotFlag {
			colors := tokens.ResolveColors(tokens.ModeDefault)
			output := RenderSnapshot(*compFlag, *variantFlag, colors, 80)
			fmt.Print(output)
			os.Exit(0)
		}

		// Interactive direct-component mode
		m := initialModel()
		m.directComponent = *compFlag
		p := tea.NewProgram(m, tea.WithAltScreen())
		if _, err := p.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		os.Exit(0)
	}

	// Default: full interactive TUI
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
