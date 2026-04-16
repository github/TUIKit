---
kind: target
name: csharp
language: C#
runtime: .NET 8+
framework:
    name: Spectre.Console
    version: ">=0.49"
    url: https://github.com/spectreconsole/spectre.console
    paradigm: Immediate-mode rendering via AnsiConsole + Live/Status widgets
styling:
    name: Spectre.Console (built-in)
    version: ">=0.49"
    url: https://spectreconsole.net/markup
    role: Markup-based ANSI styling (colors, bold, borders, tables, layout)
testing:
    runner: dotnet test
    framework: xUnit
    helper: Spectre.Console.Testing (Fake console + snapshot assertions)

output:
    root: src/TuiKit
    structure:
        Tokens/Colors.cs: Semantic color record + ResolveColors()
        Tokens/Icons.cs: Icon constants + semantic aliases
        Tokens/Breakpoints.cs: Breakpoint enum + GetBreakpoint()
        Components/{Name}/{Name}.cs: Component class
        Components/{Name}/{Name}Tests.cs: Tests
---

# C# Target — Spectre.Console

## Architecture pattern

Spectre.Console uses **immediate-mode rendering**: components are renderables
that implement `IRenderable`, or use `AnsiConsole.Write()` / `Live()` for
interactive updates. There is no retained-mode tree or virtual DOM.

For **stateless components** (HintBar, Dialog, Table, Link, TextHeading, TextTitle,
TimelineItem, Metric, QrCode, Icons), implement as a class that produces a
renderable or string:

```csharp
public class HintBar : IRenderable
{
    public required HintBarItem[] Items { get; init; }

    public Measurement Measure(RenderOptions options, int maxWidth) { ... }
    public IEnumerable<Segment> Render(RenderOptions options, int maxWidth) { ... }
}
```

For **stateful/interactive components** (Select, SelectAutocomplete, Input,
TabBar, TextSpinner), use a prompt-style pattern or `Live()` display
with a state loop:

```csharp
public class SelectPrompt<T>
{
    private readonly List<SelectItem<T>> _items;
    private int _highlighted;
    private SelectState _state = SelectState.Focused;

    public SelectResult<T> Show(IAnsiConsole console)
    {
        return console.Live(new Panel(""))
            .Start(ctx =>
            {
                while (_state == SelectState.Focused)
                {
                    ctx.UpdateTarget(Render());
                    HandleKey(console.Input.ReadKey(true));
                }
                return new SelectResult<T>(_items[_highlighted]);
            });
    }
}
```

## Type mapping

| Spec type                 | C# type                                       |
| ------------------------- | --------------------------------------------- |
| `string`                  | `string`                                      |
| `number`                  | `int`                                         |
| `boolean`                 | `bool`                                        |
| `array<T>`                | `T[]` or `IReadOnlyList<T>`                   |
| `record<string, T>`       | `Dictionary<string, T>`                       |
| `callback(args) → void`   | `Action<Args>` or event                       |
| `T` (generic)             | `T` (C# generics)                             |
| `string \| false \| null` | `string?` (null = absent)                     |
| `SelectItem<T>`           | `record SelectItem<T>(string Label, T Value)` |
| `color \| undefined`      | `Color?` (null = no color, terminal default)  |
| `SemanticColor`           | `Color` (Spectre.Console.Color)               |
| `IconGlyph`               | `string` (or `const string`)                  |

## Callback translation

Spectre.Console interactive components return results rather than using callbacks.
The spec's `onSelect` becomes a return value:

```csharp
// Spec: onSelect: callback(item: SelectItem<T>) → void
// C#: method returns the selected item

public record SelectResult<T>(SelectItem<T> Item);

public SelectResult<T> Show(IAnsiConsole console)
{
    // ... interactive loop ...
    return new SelectResult<T>(_items[_highlighted]);
}
```

For `onEscape`, throw a `PromptCancelledException` or return a result
with a `Cancelled` flag:

```csharp
public record SelectResult<T>(SelectItem<T>? Item, bool Cancelled = false);
```

For `onHighlight`, expose an event:

```csharp
public event Action<SelectItem<T>>? Highlighted;
```

## State machine translation

Spec states map to an enum:

```csharp
public enum SelectState
{
    Focused,
    Selected,
    Dismissed
}

public class SelectPrompt<T>
{
    private SelectState _state = SelectState.Focused;
    // ...
}
```

Terminal states exit the interactive loop and return the result.

## Token access

Tokens are accessed via static classes and methods:

```csharp
// Colors
var colors = SemanticColors.Resolve(ramps, ColorMode.Default);
var style = new Style(foreground: colors.TextPrimary);

// Icons
var indicator = Icons.Prompt; // "❯"

// Breakpoints
var bp = Breakpoints.Get(console.Profile.Width);
```

## Styling with Spectre.Console

Spectre.Console uses markup syntax or `Style` objects:

```csharp
// Spec: "key is bold in textPrimary"
var keyStyle = new Style(foreground: colors.TextPrimary, decoration: Decoration.Bold);

// Spec: "label uses textSecondary"
var labelStyle = new Style(foreground: colors.TextSecondary);

// Rendering via Markup
console.Write(new Markup($"[bold {colors.TextPrimary}]Esc[/] "));
console.Write(new Markup($"[{colors.TextSecondary}]to cancel[/]"));

// Rendering via Text renderable
var text = new Text("Esc", keyStyle);
```

For composing styled segments without Markup escaping issues, prefer
building `Segment` lists or using `Paragraph`:

```csharp
var paragraph = new Paragraph();
paragraph.Append("Esc", keyStyle);
paragraph.Append(" ");
paragraph.Append("to cancel", labelStyle);
```

## Composition

Components compose by nesting renderables:

```csharp
public class SelectView<T> : IRenderable
{
    private readonly SelectPrompt<T> _prompt;
    private readonly HintBar _hintBar;

    public IEnumerable<Segment> Render(RenderOptions options, int maxWidth)
    {
        foreach (var segment in RenderItems(options, maxWidth))
            yield return segment;
        yield return Segment.LineBreak;
        foreach (var segment in _hintBar.Render(options, maxWidth))
            yield return segment;
    }
}
```

## Test pattern

Use `Spectre.Console.Testing` with `TestConsole` for snapshot testing.
The `.test.md` expect blocks become string comparisons against rendered output:

````csharp
[Fact]
public void RendersNumberedItems()
{
    var console = new TestConsole();
    var select = new SelectPrompt<string>(new[]
    {
        new SelectItem<string>("Alpha", "a"),
        new SelectItem<string>("Beta", "b"),
    });

    // Assert initial render (from ```expect block)
    var output = select.RenderToString();
    Assert.Equal(
        "❯ 1. Alpha\n  2. Beta\n↑↓ to navigate · Enter to select · Esc to cancel",
        StripAnsi(output)
    );

    // Simulate input (from ```input block)
    select.HandleKey(new ConsoleKeyInfo('\0', ConsoleKey.DownArrow, false, false, false));

    // Assert after input (from next ```expect block)
    output = select.RenderToString();
    Assert.Equal(
        "  1. Alpha\n❯ 2. Beta\n↑↓ to navigate · Enter to select · Esc to cancel",
        StripAnsi(output)
    );
}
````

## Key mapping

| Spec key | `ConsoleKey`                         |
| -------- | ------------------------------------ |
| `↑`      | `ConsoleKey.UpArrow`                 |
| `↓`      | `ConsoleKey.DownArrow`               |
| `enter`  | `ConsoleKey.Enter`                   |
| `escape` | `ConsoleKey.Escape`                  |
| `ctrl+g` | `ConsoleKey.G` with `Modifiers.Ctrl` |
| `k`, `j` | `ConsoleKey.K` / `ConsoleKey.J`      |
| `1-9`    | `ConsoleKey.D1` .. `ConsoleKey.D9`   |
| `tab`    | `ConsoleKey.Tab`                     |

## Dependencies

```xml
<PackageReference Include="Spectre.Console" Version="0.49.*" />
<PackageReference Include="Spectre.Console.Testing" Version="0.49.*" />
<PackageReference Include="xunit" Version="2.*" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
```

## Demo CLI

Every target must include a demo that renders all components interactively.

```yaml
demo:
    entry: Demo/Program.cs
    run_command: "dotnet run --project Demo"
```

The demo app uses `AnsiConsole.Live()` for a root screen that manages
navigation. It shows a menu of available components (using the Select
component itself), and selecting one switches to that component's demo screen.

Screens:

1. **Menu** -- Select component listing all available demos
2. **HintBar demo** -- renders several HintBar variants stacked vertically
3. **Select demo** -- interactive Select with sample items + current marker
4. **SelectWithTextInput demo** -- interactive variant with text input

The demo must use the generated tokens (colors from `SemanticColors.Resolve()`,
icons from `Icons` class) -- no hardcoded color values.
