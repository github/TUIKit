//! TUIKit interactive demo — full-screen preview browser for all components and tokens.
//!
//! Run with: cargo run --example demo
//! CLI flags:
//!   --list                              List all components/tokens
//!   --component <Name>                  Open directly into a component preview
//!   --component <Name> --variant <name> Show only a specific variant
//!   --component <Name> --snapshot       Render one frame to stdout and exit
//!   --component <Name> --variant <name> --snapshot

use std::io::{self, Write};
use std::time::{Duration, Instant};

use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::backend::{CrosstermBackend, TestBackend};
use ratatui::buffer::Buffer;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Widget};
use ratatui::Terminal;

use tuikit::tuikit::components::dialog::Dialog;
use tuikit::tuikit::components::hint_bar::HintBar;
use tuikit::tuikit::components::input::{handle_input_key, Input, InputState};
use tuikit::tuikit::components::link::Link;
use tuikit::tuikit::components::metric::{EffortLevel, Metric, MetricEntry};
use tuikit::tuikit::components::qr_code::QrCode;
use tuikit::tuikit::components::scroll_box::{handle_scroll_key, ScrollBox, ScrollState};
use tuikit::tuikit::components::select::{handle_select_key, Select, SelectItem, SelectState};
use tuikit::tuikit::components::select_autocomplete::{
    handle_select_auto_key, SelectAutocomplete, SelectAutoState,
};
use tuikit::tuikit::components::tab_bar::{handle_tab_bar_key, Tab, TabBar, TabBarState};
use tuikit::tuikit::components::table::{Table, TableCell, TableRow};
use tuikit::tuikit::components::text_heading::TextHeading;
use tuikit::tuikit::components::text_spinner::{
    SpinnerState, SpinnerType, TextSpinner, TextSpinnerWidget,
};
use tuikit::tuikit::components::text_title::TextTitle;
use tuikit::tuikit::components::timeline_item::{
    TimelineItem, TimelineSubItem, TimelineVariant,
};
use tuikit::tuikit::tokens::{breakpoints, icons, resolve_colors, SemanticColors};

const SIDEBAR_WIDTH: u16 = 26;

// ── CLI parsing ────────────────────────────────────────────────────────────

enum CliMode {
    Interactive,
    List,
    Direct {
        component: String,
        variant: Option<String>,
    },
    Snapshot {
        component: String,
        variant: Option<String>,
    },
}

fn parse_cli() -> CliMode {
    let args: Vec<String> = std::env::args().collect();
    let mut list = false;
    let mut component: Option<String> = None;
    let mut variant: Option<String> = None;
    let mut snapshot = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--list" => list = true,
            "--component" => {
                i += 1;
                component = Some(
                    args.get(i)
                        .expect("--component requires a name")
                        .clone(),
                );
            }
            "--variant" => {
                i += 1;
                variant = Some(
                    args.get(i)
                        .expect("--variant requires a name")
                        .clone(),
                );
            }
            "--snapshot" => snapshot = true,
            _ => {
                eprintln!("Unknown flag: {}", args[i]);
                std::process::exit(1);
            }
        }
        i += 1;
    }

    if list {
        return CliMode::List;
    }
    if let Some(name) = component {
        if snapshot {
            CliMode::Snapshot {
                component: name,
                variant,
            }
        } else {
            CliMode::Direct {
                component: name,
                variant,
            }
        }
    } else if snapshot || variant.is_some() {
        eprintln!("--snapshot and --variant require --component");
        std::process::exit(1);
    } else {
        CliMode::Interactive
    }
}

// ── PreviewId ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
enum PreviewId {
    Breakpoints,
    Colors,
    Icons,
    Dialog,
    HintBar,
    Input,
    Link,
    Metric,
    QrCode,
    Screen,
    ScrollBox,
    Select,
    SelectAutocomplete,
    TabBar,
    Table,
    TextHeading,
    TextSpinner,
    TextTitle,
    TimelineItem,
}

impl PreviewId {
    const ALL: &'static [PreviewId] = &[
        PreviewId::Breakpoints,
        PreviewId::Colors,
        PreviewId::Icons,
        PreviewId::Dialog,
        PreviewId::HintBar,
        PreviewId::Input,
        PreviewId::Link,
        PreviewId::Metric,
        PreviewId::QrCode,
        PreviewId::Screen,
        PreviewId::ScrollBox,
        PreviewId::Select,
        PreviewId::SelectAutocomplete,
        PreviewId::TabBar,
        PreviewId::Table,
        PreviewId::TextHeading,
        PreviewId::TextSpinner,
        PreviewId::TextTitle,
        PreviewId::TimelineItem,
    ];

    fn name(&self) -> &'static str {
        match self {
            Self::Breakpoints => "breakpoints",
            Self::Colors => "colors",
            Self::Icons => "icons",
            Self::Dialog => "Dialog",
            Self::HintBar => "HintBar",
            Self::Input => "Input",
            Self::Link => "Link",
            Self::Metric => "Metric",
            Self::QrCode => "QrCode",
            Self::Screen => "Screen",
            Self::ScrollBox => "ScrollBox",
            Self::Select => "Select",
            Self::SelectAutocomplete => "SelectAutocomplete",
            Self::TabBar => "TabBar",
            Self::Table => "Table",
            Self::TextHeading => "TextHeading",
            Self::TextSpinner => "TextSpinner",
            Self::TextTitle => "TextTitle",
            Self::TimelineItem => "TimelineItem",
        }
    }

    fn from_name(name: &str) -> Option<PreviewId> {
        Self::ALL.iter().find(|p| p.name() == name).copied()
    }

    fn sidebar_label(&self) -> &'static str {
        match self {
            Self::Breakpoints => "Breakpoints",
            Self::Colors => "Colors",
            Self::Icons => "Icons",
            Self::Dialog => "Dialog",
            Self::HintBar => "HintBar",
            Self::Input => "Input",
            Self::Link => "Link",
            Self::Metric => "Metric",
            Self::QrCode => "QrCode",
            Self::Screen => "Screen",
            Self::ScrollBox => "ScrollBox",
            Self::Select => "Select",
            Self::SelectAutocomplete => "SelectAutocomplete",
            Self::TabBar => "TabBar",
            Self::Table => "Table",
            Self::TextHeading => "TextHeading",
            Self::TextSpinner => "TextSpinner",
            Self::TextTitle => "TextTitle",
            Self::TimelineItem => "TimelineItem",
        }
    }

    fn is_token(&self) -> bool {
        matches!(self, Self::Breakpoints | Self::Colors | Self::Icons)
    }

    fn variant_names(&self) -> &'static [&'static str] {
        match self {
            Self::Breakpoints => &["Current breakpoint"],
            Self::Colors => &["Semantic colors", "Text tokens", "Status tokens", "Brand tokens"],
            Self::Icons => &["Status icons", "Navigation icons", "UI icons", "Tree icons"],
            Self::Dialog => &["Basic", "With subtitle", "Fixed width", "Border title", "Full variant"],
            Self::HintBar => &["Default", "Custom keys", "Conditional", "Custom separator"],
            Self::Input => &["Default", "Multiline", "Masked", "Single line"],
            Self::Link => &["Default", "With label color", "With brand color", "Bold"],
            Self::Metric => &["Default", "Highlighted"],
            Self::QrCode => &["Short URL", "Long URL"],
            Self::Screen => &["Basic", "With header and footer", "Non-scrollable"],
            Self::ScrollBox => &["No scroll (content fits)", "Scrollable list", "No scrollbar", "Focusable", "Hover + virtualized"],
            Self::Select => &["Basic", "With current item", "With text input", "Scrolling"],
            Self::SelectAutocomplete => &["Basic", "With current item"],
            Self::TabBar => &["Display only", "Arrow navigation", "Tab navigation", "No loop"],
            Self::Table => &["Basic", "Borderless key-value", "Right-aligned numbers", "Width-constrained"],
            Self::TextHeading => &["Default", "Error"],
            Self::TextSpinner => &["Default", "Icon only", "Label only", "Placeholder", "Brand", "Info"],
            Self::TextTitle => &["Default", "Error"],
            Self::TimelineItem => &["Loading", "Success", "Error", "Warning", "Info", "Muted", "With multiple sub-items"],
        }
    }
}

// ── Variant renderer helper ────────────────────────────────────────────────

struct VR<'a> {
    y: u16,
    area: Rect,
    colors: &'a SemanticColors,
    filter: Option<&'a str>,
}

impl<'a> VR<'a> {
    fn new(area: Rect, colors: &'a SemanticColors, filter: Option<&'a str>) -> Self {
        Self { y: area.y, area, colors, filter }
    }

    fn begin(&mut self, name: &str, buf: &mut Buffer) -> Option<Rect> {
        if let Some(f) = self.filter {
            if f != name {
                return None;
            }
        }
        if self.y + 2 >= self.area.y + self.area.height {
            return None;
        }
        let heading = TextHeading::new(name, self.colors);
        heading.render(Rect::new(self.area.x, self.y, self.area.width, 1), buf);
        self.y += 2;
        let remaining = (self.area.y + self.area.height).saturating_sub(self.y);
        Some(Rect::new(self.area.x, self.y, self.area.width, remaining))
    }

    fn advance(&mut self, rows: u16) {
        self.y += rows + 1;
    }
}

// ── Focus & App ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
enum Focus {
    Sidebar,
    Preview,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum AppMode {
    Sidebar,
    Direct(PreviewId),
}

struct App {
    mode: AppMode,
    focus: Focus,
    sidebar_cursor: usize,
    colors: SemanticColors,
    variant_filter: Option<String>,
    spinner_state: SpinnerState,
    input_state: InputState,
    select_state: SelectState,
    tab_state: TabBarState,
    scroll_state: ScrollState,
    select_auto_state: SelectAutoState,
    last_tick: Instant,
}

impl App {
    fn new() -> Self {
        Self {
            mode: AppMode::Sidebar,
            focus: Focus::Sidebar,
            sidebar_cursor: 0,
            colors: resolve_colors(),
            variant_filter: None,
            spinner_state: SpinnerState::new(),
            input_state: InputState::new(),
            select_state: SelectState::new(3),
            tab_state: TabBarState::new(3),
            scroll_state: ScrollState::new(50, 10),
            select_auto_state: SelectAutoState::new(),
            last_tick: Instant::now(),
        }
    }

    fn current_preview(&self) -> PreviewId {
        match self.mode {
            AppMode::Direct(id) => id,
            AppMode::Sidebar => PreviewId::ALL[self.sidebar_cursor],
        }
    }
}

// ── main ───────────────────────────────────────────────────────────────────

fn main() -> io::Result<()> {
    let cli = parse_cli();

    match cli {
        CliMode::List => {
            for id in PreviewId::ALL {
                println!("{}", id.name());
            }
            Ok(())
        }
        CliMode::Snapshot { component, variant } => {
            let id = match PreviewId::from_name(&component) {
                Some(id) => id,
                None => {
                    eprintln!("Unknown component: {}", component);
                    std::process::exit(1);
                }
            };
            if let Some(ref v) = variant {
                if !id.variant_names().contains(&v.as_str()) {
                    eprintln!("Unknown variant '{}' for {}", v, component);
                    std::process::exit(1);
                }
            }
            render_snapshot(id, variant.as_deref());
            Ok(())
        }
        CliMode::Direct { component, variant } => {
            let id = match PreviewId::from_name(&component) {
                Some(id) => id,
                None => {
                    eprintln!("Unknown component: {}", component);
                    std::process::exit(1);
                }
            };
            if let Some(ref v) = variant {
                if !id.variant_names().contains(&v.as_str()) {
                    eprintln!("Unknown variant '{}' for {}", v, component);
                    std::process::exit(1);
                }
            }
            run_interactive(AppMode::Direct(id), variant)
        }
        CliMode::Interactive => run_interactive(AppMode::Sidebar, None),
    }
}

// ── Snapshot mode ──────────────────────────────────────────────────────────

fn render_snapshot(id: PreviewId, variant: Option<&str>) {
    let backend = TestBackend::new(80, 60);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new();
    app.mode = AppMode::Direct(id);
    app.variant_filter = variant.map(String::from);

    terminal
        .draw(|f| {
            let area = f.area();
            draw_component_preview(f, &mut app, id, area);
        })
        .unwrap();

    let buf = terminal.backend().buffer();
    let output = buffer_to_string(buf);
    print!("{}", output);
    io::stdout().flush().ok();
}

fn buffer_to_string(buf: &Buffer) -> String {
    let mut result = String::new();
    let cells = buf.content();
    for y in 0..buf.area.height {
        let mut line = String::new();
        for x in 0..buf.area.width {
            let idx = (y * buf.area.width + x) as usize;
            line.push_str(cells[idx].symbol());
        }
        result.push_str(line.trim_end());
        result.push('\n');
    }
    while result.ends_with("\n\n") {
        result.pop();
    }
    result
}

// ── Interactive mode ───────────────────────────────────────────────────────

fn run_interactive(mode: AppMode, variant: Option<String>) -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();
    app.mode = mode;
    app.variant_filter = variant;
    if matches!(mode, AppMode::Direct(_)) {
        app.focus = Focus::Preview;
    }

    let tick_rate = Duration::from_millis(100);

    loop {
        terminal.draw(|f| draw(f, &mut app))?;

        let timeout = tick_rate
            .checked_sub(app.last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));

        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if should_quit(&key) {
                    break;
                }
                if handle_key(&mut app, key) {
                    break;
                }
            }
        }

        if app.last_tick.elapsed() >= tick_rate {
            app.spinner_state.tick(icons::SPINNER_BOUNCE.len());
            app.last_tick = Instant::now();
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    Ok(())
}

fn should_quit(key: &KeyEvent) -> bool {
    matches!(
        key,
        KeyEvent {
            code: KeyCode::Char('q'),
            modifiers: KeyModifiers::NONE,
            ..
        } | KeyEvent {
            code: KeyCode::Char('c'),
            modifiers: KeyModifiers::CONTROL,
            ..
        }
    )
}

/// Returns true if the app should exit.
fn handle_key(app: &mut App, key: KeyEvent) -> bool {
    match app.mode {
        AppMode::Direct(_) => {
            if key.code == KeyCode::Esc {
                return true;
            }
            handle_component_key(app, key);
            false
        }
        AppMode::Sidebar => match app.focus {
            Focus::Sidebar => {
                handle_sidebar_key(app, key);
                false
            }
            Focus::Preview => {
                if key.code == KeyCode::Esc {
                    app.focus = Focus::Sidebar;
                } else {
                    handle_component_key(app, key);
                }
                false
            }
        },
    }
}

fn handle_sidebar_key(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            if app.sidebar_cursor > 0 {
                app.sidebar_cursor -= 1;
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            if app.sidebar_cursor < PreviewId::ALL.len() - 1 {
                app.sidebar_cursor += 1;
            }
        }
        KeyCode::Enter => {
            app.focus = Focus::Preview;
            reset_component_state(app);
        }
        _ => {}
    }
}

fn reset_component_state(app: &mut App) {
    app.input_state = InputState::new();
    app.select_state = SelectState::new(3);
    app.tab_state = TabBarState::new(3);
    app.scroll_state = ScrollState::new(50, 10);
    app.select_auto_state = SelectAutoState::new();
}

fn handle_component_key(app: &mut App, key: KeyEvent) {
    match app.current_preview() {
        PreviewId::Input => {
            handle_input_key(key, &mut app.input_state);
        }
        PreviewId::Select => {
            let items = sample_select_items();
            handle_select_key(key, &mut app.select_state, &items, None);
        }
        PreviewId::SelectAutocomplete => {
            let items = sample_select_items();
            let widget = SelectAutocomplete::new(&items, &app.colors);
            let filtered = widget.filtered_items(&app.select_auto_state.query);
            handle_select_auto_key(
                key,
                &mut app.select_auto_state,
                &items,
                &filtered,
                None,
            );
        }
        PreviewId::TabBar => {
            handle_tab_bar_key(key, &mut app.tab_state, true);
        }
        PreviewId::ScrollBox => {
            handle_scroll_key(key, &mut app.scroll_state);
        }
        _ => {}
    }
}

fn sample_select_items() -> Vec<SelectItem<String>> {
    vec![
        SelectItem::new("Option A", "a".into()),
        SelectItem::new("Option B", "b".into()),
        SelectItem::new("Option C", "c".into()),
    ]
}

// ── Drawing ────────────────────────────────────────────────────────────────

fn draw(f: &mut ratatui::Frame, app: &mut App) {
    match app.mode {
        AppMode::Direct(_) => {
            let id = app.current_preview();
            draw_component_preview(f, app, id, f.area());
        }
        AppMode::Sidebar => {
            let area = f.area();
            let main_height = area.height.saturating_sub(1);
            let main_area = Rect::new(area.x, area.y, area.width, main_height);
            let hint_area = Rect::new(area.x, area.y + main_height, area.width, 1);

            let chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([
                    Constraint::Length(SIDEBAR_WIDTH),
                    Constraint::Min(0),
                ])
                .split(main_area);

            draw_sidebar(f, app, chunks[0]);
            let id = app.current_preview();
            draw_component_preview(f, app, id, chunks[1]);

            let hints = match app.focus {
                Focus::Sidebar => vec![
                    ("↑↓", Some("navigate")),
                    ("enter", Some("open")),
                    ("/", Some("search")),
                    ("q", Some("quit")),
                ],
                Focus::Preview => vec![
                    ("esc", Some("back")),
                    ("q", Some("quit")),
                ],
            };
            let bar = HintBar::new(hints, &app.colors);
            f.render_widget(bar, hint_area);
        }
    }
}

fn draw_sidebar(f: &mut ratatui::Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::RIGHT)
        .border_style(Style::default().fg(app.colors.border_neutral))
        .title(Span::styled(
            " TUIKit ",
            Style::default()
                .fg(app.colors.brand)
                .add_modifier(Modifier::BOLD),
        ));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let mut y = inner.y;
    let mut drew_separator = false;

    for (i, preview) in PreviewId::ALL.iter().enumerate() {
        if y >= inner.y + inner.height {
            break;
        }
        // Separator between tokens and components
        if !drew_separator && !preview.is_token() {
            let sep = Line::from(Span::styled(
                "─".repeat(inner.width as usize),
                Style::default().fg(app.colors.text_tertiary),
            ));
            f.render_widget(sep, Rect::new(inner.x, y, inner.width, 1));
            y += 1;
            drew_separator = true;
            if y >= inner.y + inner.height {
                break;
            }
        }

        let is_active = i == app.sidebar_cursor;
        let is_open = app.focus == Focus::Preview && i == app.sidebar_cursor;
        let style = if is_active {
            Style::default()
                .fg(app.colors.brand)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(app.colors.text_secondary)
        };
        let prefix = if is_active { "▸ " } else { "  " };
        let suffix = if is_open { " ◂" } else { "" };
        let icon = if preview.is_token() { "☰ " } else { "" };
        let line = Line::from(vec![
            Span::styled(prefix, style),
            Span::styled(icon, style),
            Span::styled(preview.sidebar_label(), style),
            Span::styled(suffix, Style::default().fg(app.colors.text_tertiary)),
        ]);
        f.render_widget(line, Rect::new(inner.x, y, inner.width, 1));
        y += 1;
    }
}

// ── Component preview dispatcher ───────────────────────────────────────────

fn draw_component_preview(f: &mut ratatui::Frame, app: &mut App, id: PreviewId, area: Rect) {
    let block = Block::default()
        .borders(Borders::NONE)
        .title(Span::styled(
            format!(" {} ", id.name()),
            Style::default()
                .fg(app.colors.brand)
                .add_modifier(Modifier::BOLD),
        ));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let filter = app.variant_filter.as_deref();

    match id {
        PreviewId::Breakpoints => draw_breakpoints_preview(f, &app.colors, inner, filter),
        PreviewId::Colors => draw_colors_preview(f, &app.colors, inner, filter),
        PreviewId::Icons => draw_icons_preview(f, &app.colors, inner, filter),
        PreviewId::Dialog => draw_dialog_preview(f, &app.colors, inner, filter),
        PreviewId::HintBar => draw_hintbar_preview(f, &app.colors, inner, filter),
        PreviewId::Input => {
            draw_input_preview(f, &app.colors, &mut app.input_state, inner, filter)
        }
        PreviewId::Link => draw_link_preview(f, &app.colors, inner, filter),
        PreviewId::Metric => draw_metric_preview(f, &app.colors, inner, filter),
        PreviewId::QrCode => draw_qrcode_preview(f, &app.colors, inner, filter),
        PreviewId::Screen => draw_screen_preview(f, &app.colors, inner, filter),
        PreviewId::ScrollBox => {
            draw_scrollbox_preview(f, &app.colors, &mut app.scroll_state, inner, filter)
        }
        PreviewId::Select => {
            draw_select_preview(f, &app.colors, &mut app.select_state, inner, filter)
        }
        PreviewId::SelectAutocomplete => {
            draw_select_auto_preview(f, &app.colors, &mut app.select_auto_state, inner, filter)
        }
        PreviewId::TabBar => {
            draw_tabbar_preview(f, &app.colors, &mut app.tab_state, inner, filter)
        }
        PreviewId::Table => draw_table_preview(f, &app.colors, inner, filter),
        PreviewId::TextHeading => draw_text_heading_preview(f, &app.colors, inner, filter),
        PreviewId::TextSpinner => {
            draw_spinner_preview(f, &app.colors, &app.spinner_state, inner, filter)
        }
        PreviewId::TextTitle => draw_text_title_preview(f, &app.colors, inner, filter),
        PreviewId::TimelineItem => draw_timeline_preview(f, &app.colors, inner, filter),
    }
}

// ── Preview renderers ──────────────────────────────────────────────────────

fn draw_breakpoints_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);
    if let Some(a) = vr.begin("Current breakpoint", f.buffer_mut()) {
        let bp = breakpoints::get_breakpoint(a.width);
        let lines = vec![
            Line::from(format!("Current width: {} columns", a.width)),
            Line::from(format!("Breakpoint: {:?}", bp)),
            Line::from(""),
            Line::from("Compact: < 65 cols"),
            Line::from("Narrow:  65 \u{2013} 99 cols"),
            Line::from("Wide:    \u{2265} 100 cols"),
        ];
        for (i, line) in lines.iter().enumerate() {
            if i as u16 >= a.height {
                break;
            }
            f.render_widget(
                line.clone(),
                Rect::new(a.x, a.y + i as u16, a.width, 1),
            );
        }
        vr.advance(6);
    }
}

fn draw_colors_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Semantic colors", f.buffer_mut()) {
        let swatches = vec![
            ("brand", colors.brand),
            ("selected", colors.selected),
            ("border_neutral", colors.border_neutral),
            ("selection_background", colors.selection_background),
        ];
        let h = render_color_swatches(f, &swatches, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Text tokens", f.buffer_mut()) {
        let swatches = vec![
            ("text_primary", colors.text_primary.unwrap_or(ratatui::style::Color::White)),
            ("text_secondary", colors.text_secondary),
            ("text_tertiary", colors.text_tertiary),
        ];
        let h = render_color_swatches(f, &swatches, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Status tokens", f.buffer_mut()) {
        let swatches = vec![
            ("status_success", colors.status_success),
            ("status_error", colors.status_error),
            ("status_warning", colors.status_warning),
            ("status_info", colors.status_info),
        ];
        let h = render_color_swatches(f, &swatches, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Brand tokens", f.buffer_mut()) {
        let swatches = vec![("brand", colors.brand)];
        let h = render_color_swatches(f, &swatches, a);
        vr.advance(h);
    }
}

fn render_color_swatches(
    f: &mut ratatui::Frame,
    swatches: &[(&str, ratatui::style::Color)],
    area: Rect,
) -> u16 {
    for (i, (name, color)) in swatches.iter().enumerate() {
        if i as u16 >= area.height {
            break;
        }
        let line = Line::from(vec![
            Span::styled("\u{2588}\u{2588} ", Style::default().fg(*color)),
            Span::raw(*name),
        ]);
        f.render_widget(
            line,
            Rect::new(area.x, area.y + i as u16, area.width, 1),
        );
    }
    swatches.len() as u16
}

fn draw_icons_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Status icons", f.buffer_mut()) {
        let items = vec![
            ("CHECK", icons::CHECK),
            ("CROSS", icons::CROSS),
            ("WARNING", icons::WARNING),
        ];
        let h = render_icon_list(f, &items, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Navigation icons", f.buffer_mut()) {
        let items = vec![
            ("CHEVRON_RIGHT", icons::CHEVRON_RIGHT),
            ("ARROW_RIGHT", icons::ARROW_RIGHT),
        ];
        let h = render_icon_list(f, &items, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("UI icons", f.buffer_mut()) {
        let items = vec![
            ("CIRCLE_FILLED", icons::CIRCLE_FILLED),
            ("CIRCLE_HALF", icons::CIRCLE_HALF),
            ("CIRCLE_EMPTY", icons::CIRCLE_EMPTY),
            ("DISABLED", icons::DISABLED),
        ];
        let h = render_icon_list(f, &items, a);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Tree icons", f.buffer_mut()) {
        let items = vec![
            ("SCROLLBAR", icons::SCROLLBAR),
            ("DOT_SEPARATOR", icons::DOT_SEPARATOR),
        ];
        let h = render_icon_list(f, &items, a);
        vr.advance(h);
    }
}

fn render_icon_list(
    f: &mut ratatui::Frame,
    items: &[(&str, &str)],
    area: Rect,
) -> u16 {
    for (i, (name, glyph)) in items.iter().enumerate() {
        if i as u16 >= area.height {
            break;
        }
        let line = Line::from(format!("{} \u{2014} {}", glyph, name));
        f.render_widget(
            line,
            Rect::new(area.x, area.y + i as u16, area.width, 1),
        );
    }
    items.len() as u16
}

fn draw_dialog_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Basic", f.buffer_mut()) {
        let dialog = Dialog::new(colors)
            .with_title("Confirm Action")
            .with_content(vec![Line::raw("Are you sure?")]);
        let h = 5.min(a.height);
        dialog.render(Rect::new(a.x, a.y, 40.min(a.width), h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("With subtitle", f.buffer_mut()) {
        let dialog = Dialog::new(colors)
            .with_title("Delete File")
            .with_subtitle("This cannot be undone")
            .with_content(vec![Line::raw("Proceed?")]);
        let h = 6.min(a.height);
        dialog.render(Rect::new(a.x, a.y, 40.min(a.width), h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Fixed width", f.buffer_mut()) {
        let dialog = Dialog::new(colors)
            .with_title("Fixed Width")
            .with_width(50)
            .with_content(vec![Line::raw("This dialog has a fixed width of 50.")]);
        let h = 5.min(a.height);
        dialog.render(Rect::new(a.x, a.y, 50.min(a.width), h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Border title", f.buffer_mut()) {
        let dialog = Dialog::new(colors)
            .with_title("Border Title Dialog")
            .with_content(vec![Line::raw("Content here.")]);
        let h = 5.min(a.height);
        dialog.render(Rect::new(a.x, a.y, 40.min(a.width), h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Full variant", f.buffer_mut()) {
        let dialog = Dialog::new(colors)
            .with_title("Full Dialog")
            .with_subtitle("With all options")
            .with_width(50)
            .with_content(vec![
                Line::raw("This dialog has all options set."),
                Line::raw("Title, subtitle, fixed width, and content."),
            ]);
        let h = 7.min(a.height);
        dialog.render(Rect::new(a.x, a.y, 50.min(a.width), h), f.buffer_mut());
        vr.advance(h);
    }
}

fn draw_hintbar_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let bar = HintBar::new(
            vec![
                ("esc", Some("cancel")),
                ("enter", Some("confirm")),
                ("\u{2191}\u{2193}", Some("navigate")),
            ],
            colors,
        );
        f.render_widget(bar, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Custom keys", f.buffer_mut()) {
        let bar = HintBar::new(
            vec![("ctrl+c", Some("exit")), ("tab", Some("switch"))],
            colors,
        );
        f.render_widget(bar, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Conditional", f.buffer_mut()) {
        let bar = HintBar::new(
            vec![
                ("esc", Some("cancel")),
                ("enter", None),
                ("\u{2191}\u{2193}", Some("navigate")),
            ],
            colors,
        );
        f.render_widget(bar, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Custom separator", f.buffer_mut()) {
        let bar = HintBar::new(
            vec![("a", Some("first")), ("b", Some("second"))],
            colors,
        );
        f.render_widget(bar, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
}

fn draw_input_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &mut InputState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let input = Input::new(colors)
            .with_prefix("> ")
            .with_placeholder("Enter text...");
        f.render_stateful_widget(input, Rect::new(a.x, a.y, a.width, 1), state);
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Multiline", f.buffer_mut()) {
        let label = Line::from("Multiline input:");
        f.render_widget(label, Rect::new(a.x, a.y, a.width, 1));
        let mut multi_state = InputState::new();
        let input = Input::new(colors).with_prefix(">> ");
        f.render_stateful_widget(
            input,
            Rect::new(a.x, a.y + 1, a.width, 1),
            &mut multi_state,
        );
        vr.advance(2);
    }
    if let Some(a) = vr.begin("Masked", f.buffer_mut()) {
        let label = Line::from("Password input:");
        f.render_widget(label, Rect::new(a.x, a.y, a.width, 1));
        let mut masked_state = InputState::new().with_masked(true);
        let input = Input::new(colors).with_prefix("\u{1f512} ");
        f.render_stateful_widget(
            input,
            Rect::new(a.x, a.y + 1, a.width, 1),
            &mut masked_state,
        );
        vr.advance(2);
    }
    if let Some(a) = vr.begin("Single line", f.buffer_mut()) {
        let mut sl_state = InputState::new();
        let input = Input::new(colors)
            .with_prefix("$ ")
            .with_placeholder("command...");
        f.render_stateful_widget(
            input,
            Rect::new(a.x, a.y, a.width, 1),
            &mut sl_state,
        );
        vr.advance(1);
    }
}

fn draw_link_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let link = Link::new("https://github.com").with_text("GitHub");
        link.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("With label color", f.buffer_mut()) {
        let link = Link::new("https://example.com")
            .with_text("Example")
            .with_color(colors.status_info);
        link.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("With brand color", f.buffer_mut()) {
        let link = Link::new("https://github.com")
            .with_text("GitHub Brand")
            .with_color(colors.brand);
        link.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Bold", f.buffer_mut()) {
        let link = Link::new("https://example.org")
            .with_text("Bold Link")
            .with_color(colors.text_primary.unwrap_or(ratatui::style::Color::White));
        link.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
}

fn draw_metric_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let metric = Metric::new(colors)
            .with_entries(vec![
                MetricEntry::new("Files Changed", "42"),
                MetricEntry::new("Lines Added", "+1,234"),
                MetricEntry::new("Lines Removed", "-567"),
            ])
            .with_efforts(vec![
                EffortLevel::new("Complexity", 7, 10),
                EffortLevel::new("Risk", 3, 10),
            ]);
        let h = 8.min(a.height);
        metric.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Highlighted", f.buffer_mut()) {
        let metric = Metric::new(colors)
            .with_entries(vec![MetricEntry::new("Score", "98/100")])
            .with_efforts(vec![EffortLevel::new("Difficulty", 9, 10)]);
        let h = 5.min(a.height);
        metric.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
}

fn draw_qrcode_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Short URL", f.buffer_mut()) {
        let qr = QrCode::new("https://github.com");
        let h = 15.min(a.height);
        qr.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Long URL", f.buffer_mut()) {
        let qr = QrCode::new("https://github.com/some/very/long/path/to/resource");
        let h = 20.min(a.height);
        qr.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
}

fn draw_screen_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Basic", f.buffer_mut()) {
        let lines = vec![
            Line::raw("Screen component provides header + body + footer layout."),
            Line::raw("This is the body content area."),
        ];
        for (i, line) in lines.iter().enumerate() {
            if i as u16 >= a.height {
                break;
            }
            f.render_widget(
                line.clone(),
                Rect::new(a.x, a.y + i as u16, a.width, 1),
            );
        }
        vr.advance(lines.len() as u16);
    }
    if let Some(a) = vr.begin("With header and footer", f.buffer_mut()) {
        let lines = vec![
            Line::styled(
                "\u{2500}\u{2500} Header \u{2500}\u{2500}",
                Style::default().fg(colors.brand),
            ),
            Line::raw("Body content goes here."),
            Line::styled(
                "\u{2500}\u{2500} Footer \u{2500}\u{2500}",
                Style::default().fg(colors.text_secondary),
            ),
        ];
        for (i, line) in lines.iter().enumerate() {
            if i as u16 >= a.height {
                break;
            }
            f.render_widget(
                line.clone(),
                Rect::new(a.x, a.y + i as u16, a.width, 1),
            );
        }
        vr.advance(lines.len() as u16);
    }
    if let Some(a) = vr.begin("Non-scrollable", f.buffer_mut()) {
        let line = Line::raw("Static content \u{2014} no scrolling needed.");
        f.render_widget(line, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
}

fn draw_scrollbox_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &mut ScrollState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("No scroll (content fits)", f.buffer_mut()) {
        let lines: Vec<Line> = (0..3)
            .map(|i| Line::raw(format!("Line {}", i)))
            .collect();
        let scroll = ScrollBox::new(&lines, colors);
        let h = 4.min(a.height);
        let mut small_state = ScrollState::new(3, h as usize);
        f.render_stateful_widget(
            scroll,
            Rect::new(a.x, a.y, a.width, h),
            &mut small_state,
        );
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Scrollable list", f.buffer_mut()) {
        let lines: Vec<Line> = (0..50)
            .map(|i| Line::raw(format!("Scrollable line {}", i)))
            .collect();
        let scroll = ScrollBox::new(&lines, colors);
        let h = 8.min(a.height);
        f.render_stateful_widget(scroll, Rect::new(a.x, a.y, a.width, h), state);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("No scrollbar", f.buffer_mut()) {
        let lines: Vec<Line> = (0..20)
            .map(|i| Line::raw(format!("No-bar line {}", i)))
            .collect();
        let scroll = ScrollBox::new(&lines, colors);
        let h = 5.min(a.height);
        let mut ns_state = ScrollState::new(20, h as usize);
        f.render_stateful_widget(
            scroll,
            Rect::new(a.x, a.y, a.width, h),
            &mut ns_state,
        );
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Focusable", f.buffer_mut()) {
        let line = Line::raw("Focusable scrollbox \u{2014} use \u{2191}\u{2193} to scroll.");
        f.render_widget(line, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Hover + virtualized", f.buffer_mut()) {
        let line = Line::raw("Virtualized variant for large lists.");
        f.render_widget(line, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
}

fn draw_select_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &mut SelectState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Basic", f.buffer_mut()) {
        let items = sample_select_items();
        let select = Select::new(&items, colors);
        let h = 5.min(a.height);
        f.render_stateful_widget(select, Rect::new(a.x, a.y, a.width, h), state);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("With current item", f.buffer_mut()) {
        let items = vec![
            SelectItem::new("Option A", "a".into()),
            SelectItem::<String>::new("Option B", "b".into()).with_current(true),
            SelectItem::new("Option C", "c".into()),
        ];
        let select = Select::new(&items, colors);
        let h = 5.min(a.height);
        let mut cur_state = SelectState::new(items.len());
        f.render_stateful_widget(
            select,
            Rect::new(a.x, a.y, a.width, h),
            &mut cur_state,
        );
        vr.advance(h);
    }
    if let Some(a) = vr.begin("With text input", f.buffer_mut()) {
        let label = Line::from("Select with text input variant:");
        f.render_widget(label, Rect::new(a.x, a.y, a.width, 1));
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Scrolling", f.buffer_mut()) {
        let items: Vec<SelectItem<String>> = (1..=10)
            .map(|i| SelectItem::new(&format!("Item {}", i), format!("{}", i)))
            .collect();
        let select = Select::new(&items, colors);
        let h = 6.min(a.height);
        let mut scroll_state = SelectState::new(items.len());
        f.render_stateful_widget(
            select,
            Rect::new(a.x, a.y, a.width, h),
            &mut scroll_state,
        );
        vr.advance(h);
    }
}

fn draw_select_auto_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &mut SelectAutoState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Basic", f.buffer_mut()) {
        let items = sample_select_items();
        let widget = SelectAutocomplete::new(&items, colors).with_placeholder("Search...");
        let h = 8.min(a.height);
        f.render_stateful_widget(widget, Rect::new(a.x, a.y, a.width, h), state);
        vr.advance(h);
    }
    if let Some(a) = vr.begin("With current item", f.buffer_mut()) {
        let items = vec![
            SelectItem::new("Alpha", "a".into()),
            SelectItem::<String>::new("Beta", "b".into()).with_current(true),
            SelectItem::new("Gamma", "c".into()),
        ];
        let widget =
            SelectAutocomplete::new(&items, colors).with_placeholder("Filter items...");
        let h = 8.min(a.height);
        let mut cur_state = SelectAutoState::new();
        f.render_stateful_widget(
            widget,
            Rect::new(a.x, a.y, a.width, h),
            &mut cur_state,
        );
        vr.advance(h);
    }
}

fn draw_tabbar_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &mut TabBarState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);
    let tabs = vec![
        Tab::new("Files", "files"),
        Tab::new("Search", "search"),
        Tab::new("Settings", "settings"),
    ];

    if let Some(a) = vr.begin("Display only", f.buffer_mut()) {
        let tab_bar = TabBar::new(&tabs, colors);
        let mut display_state = TabBarState::new(tabs.len());
        f.render_stateful_widget(
            tab_bar,
            Rect::new(a.x, a.y, a.width, 1),
            &mut display_state,
        );
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Arrow navigation", f.buffer_mut()) {
        let tab_bar = TabBar::new(&tabs, colors);
        f.render_stateful_widget(tab_bar, Rect::new(a.x, a.y, a.width, 1), state);
        let content_text = match state.active {
            0 => "Files panel content",
            1 => "Search panel content",
            2 => "Settings panel content",
            _ => "",
        };
        if a.height > 2 {
            f.render_widget(
                Line::raw(content_text),
                Rect::new(a.x, a.y + 2, a.width, 1),
            );
        }
        vr.advance(3);
    }
    if let Some(a) = vr.begin("Tab navigation", f.buffer_mut()) {
        let tab_bar = TabBar::new(&tabs, colors);
        let mut tab_state = TabBarState::new(tabs.len());
        tab_state.active = 1;
        f.render_stateful_widget(
            tab_bar,
            Rect::new(a.x, a.y, a.width, 1),
            &mut tab_state,
        );
        vr.advance(1);
    }
    if let Some(a) = vr.begin("No loop", f.buffer_mut()) {
        let tab_bar = TabBar::new(&tabs, colors);
        let mut nl_state = TabBarState::new(tabs.len());
        nl_state.active = 2;
        f.render_stateful_widget(
            tab_bar,
            Rect::new(a.x, a.y, a.width, 1),
            &mut nl_state,
        );
        vr.advance(1);
    }
}

fn draw_table_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Basic", f.buffer_mut()) {
        let table = Table::new(vec!["Name", "Type", "Size"], colors).with_rows(vec![
            TableRow::new(vec![
                TableCell::new("main.rs"),
                TableCell::new("Rust"),
                TableCell::new("4.2 KB"),
            ]),
            TableRow::new(vec![
                TableCell::new("Cargo.toml"),
                TableCell::new("TOML"),
                TableCell::new("1.1 KB"),
            ]),
            TableRow::new(vec![
                TableCell::new("README.md"),
                TableCell::new("Markdown"),
                TableCell::new("2.8 KB"),
            ]),
        ]);
        let h = 6.min(a.height);
        table.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Borderless key-value", f.buffer_mut()) {
        let table = Table::new(vec!["Key", "Value"], colors).with_rows(vec![
            TableRow::new(vec![
                TableCell::new("Name"),
                TableCell::new("TUIKit"),
            ]),
            TableRow::new(vec![
                TableCell::new("Version"),
                TableCell::new("0.1.0"),
            ]),
        ]);
        let h = 4.min(a.height);
        table.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Right-aligned numbers", f.buffer_mut()) {
        let table = Table::new(vec!["Item", "Count"], colors).with_rows(vec![
            TableRow::new(vec![
                TableCell::new("Files"),
                TableCell::new("128"),
            ]),
            TableRow::new(vec![
                TableCell::new("Tests"),
                TableCell::new("42"),
            ]),
        ]);
        let h = 4.min(a.height);
        table.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
    if let Some(a) = vr.begin("Width-constrained", f.buffer_mut()) {
        let table = Table::new(vec!["Col A", "Col B"], colors).with_rows(vec![
            TableRow::new(vec![
                TableCell::new("Short"),
                TableCell::new("Value"),
            ]),
        ]);
        let h = 3.min(a.height);
        let w = 30.min(a.width);
        table.render(Rect::new(a.x, a.y, w, h), f.buffer_mut());
        vr.advance(h);
    }
}

fn draw_text_heading_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let h = TextHeading::new("Default Heading", colors);
        h.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Error", f.buffer_mut()) {
        let h = TextHeading::new("Error Heading", colors).error();
        h.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
}

fn draw_spinner_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    state: &SpinnerState,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors)
            .with_type(SpinnerType::Bounce)
            .with_message("Loading...");
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Icon only", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors).with_type(SpinnerType::Bounce);
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Label only", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors).with_message("Processing");
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Placeholder", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors)
            .with_type(SpinnerType::Inline)
            .with_message("Waiting...");
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Brand", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors)
            .with_type(SpinnerType::Bounce)
            .with_message("Brand spinner");
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Info", f.buffer_mut()) {
        let spinner = TextSpinner::new(colors)
            .with_type(SpinnerType::Inline)
            .with_message("Info spinner");
        let w = TextSpinnerWidget::new(spinner, state);
        w.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
}

fn draw_text_title_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    if let Some(a) = vr.begin("Default", f.buffer_mut()) {
        let t = TextTitle::new("Default Title", colors);
        t.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
    if let Some(a) = vr.begin("Error", f.buffer_mut()) {
        let t = TextTitle::new("Error Title", colors).error();
        t.render(Rect::new(a.x, a.y, a.width, 1), f.buffer_mut());
        vr.advance(1);
    }
}

fn draw_timeline_preview(
    f: &mut ratatui::Frame,
    colors: &SemanticColors,
    area: Rect,
    filter: Option<&str>,
) {
    let mut vr = VR::new(area, colors, filter);

    let variant_data: Vec<(&str, TimelineVariant, &str, Vec<&str>)> = vec![
        ("Loading", TimelineVariant::Loading, "Running tests", vec!["unit tests"]),
        ("Success", TimelineVariant::Success, "Install dependencies", vec!["npm install"]),
        ("Error", TimelineVariant::Error, "Build failed", vec!["src/main.rs"]),
        ("Warning", TimelineVariant::Warning, "Deprecation notice", vec![]),
        ("Info", TimelineVariant::Info, "Monitor active", vec![]),
        ("Muted", TimelineVariant::Muted, "Skipped deploy", vec![]),
    ];

    for (name, variant, text, subs) in &variant_data {
        if let Some(a) = vr.begin(name, f.buffer_mut()) {
            let needed = 1 + subs.len() as u16;
            let h = needed.min(a.height);
            let ti = TimelineItem::new(*variant, text, colors)
                .with_sub_items(subs.iter().map(|s| TimelineSubItem::new(s)).collect());
            ti.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
            vr.advance(h);
        }
    }

    if let Some(a) = vr.begin("With multiple sub-items", f.buffer_mut()) {
        let ti = TimelineItem::new(TimelineVariant::Success, "Build project", colors)
            .with_sub_items(vec![
                TimelineSubItem::new("lint"),
                TimelineSubItem::new("compile"),
                TimelineSubItem::new("test"),
                TimelineSubItem::new("package"),
            ]);
        let h = 5.min(a.height);
        ti.render(Rect::new(a.x, a.y, a.width, h), f.buffer_mut());
        vr.advance(h);
    }
}
