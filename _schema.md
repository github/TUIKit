---
kind: schema
name: _schema
description: >
    Meta-spec that defines the format for all TUIkit component and token specs.
    Agents read this before generating new specs or compiling specs to code.
version: 2
---

# TUIkit Spec Format

This document defines the spec format used to describe TUIkit tokens and components
in a language-agnostic way. Specs are the **source of truth** for cross-language
code generation.

## Conformance language (RFC 2119)

All specs use RFC 2119 keywords to distinguish normative requirements from
informative guidance:

- **MUST** / **MUST NOT**: Absolute requirement or prohibition. Agents MUST
  generate code that enforces this.
- **SHOULD** / **SHOULD NOT**: Strong recommendation. Agents SHOULD generate
  this unless the target framework makes it impractical.
- **MAY**: Optional behavior. Agents MAY omit or make configurable.

All Behavior, Visual rules, and Edge cases sections MUST use conformance
keywords for any statement that affects rendered output or interaction logic.

## File structure

```
specs/
  _schema.md              ← this file (meta-spec)
  README.md               ← getting started guide
  compile.ts              ← compiler CLI (status/prompt/lock/clean)
  lint.ts                 ← linter CLI (validate specs against schema)
  targets/
    go.md                 ← Go + Bubbletea + Lipgloss
    bun.md                ← Bun + Ink + React
    rust.md               ← Rust + Ratatui + Crossterm
    csharp.md             ← C# + Spectre.Console
    {target}.lock.json    ← generated lock file (tracks compiled state)
  tokens/
    colors.md             ← semantic color tokens
    icons.md              ← icon glyphs and semantic aliases
    breakpoints.md        ← responsive width thresholds
  components/
    {Name}/
      {Name}.md           ← component spec
      {Name}.test.md      ← component test spec
      {Name}.preview.md   ← component preview spec
  dist/                   ← compiled output (gitignored)
    {target}/             ← generated code per target
      _compile-prompt.md  ← the prompt fed to the agent
      ...                 ← generated source files
```

---

## Compilation workflow

The compiler detects spec changes via content hashing and generates
self-contained prompts for LLM agents.

### Commands

```bash
# Show dirty/clean status for all targets
bun compile.ts status

# Show status for a specific target
bun compile.ts status --target go

# Generate compilation prompt for all dirty specs
bun compile.ts prompt --target go

# Generate prompt for a single component
bun compile.ts prompt --target go --component HintBar

# Lock spec hashes after successful compilation
bun compile.ts lock --target go

# Remove lock file and generated prompts
bun compile.ts clean --target go
```

### Lock file format

Lock files track which spec versions have been compiled. A spec is
"dirty" when its content hash differs from the locked hash, or when the
schema hash changes (invalidating all entries).

```json
{
    "target": "go",
    "schemaHash": "ea8e9c21ed0044cc",
    "updatedAt": "2026-03-28T00:00:00.000Z",
    "entries": {
        "components/HintBar": {
            "version": "1",
            "specHash": "a1b2c3d4e5f60718",
            "testHash": "1234abcd5678ef90",
            "lockedAt": "2026-03-28T00:00:00.000Z"
        }
    }
}
```

### Workflow

1. Edit specs (component, token, or test files)
2. Run `status` to see what changed
3. Run `prompt --target <name>` to generate a compilation prompt
4. Feed the prompt to an LLM agent (e.g. Copilot CLI)
5. Verify generated code passes tests
6. Run `lock --target <name>` to snapshot current hashes

---

## Token spec format

Token specs define shared design values consumed by all components.

### Frontmatter (required)

```yaml
kind: token # always "token"
name: string # token group name (e.g., "colors", "icons", "breakpoints")
description: string # what this token group provides
version: number # spec version (increment on breaking changes)
```

### Frontmatter (token-specific)

Token specs define their data directly in frontmatter. The format varies by token type:

- **colors**: `tokens:` map with ramp coordinates and fallbacks per color mode
- **icons**: `groups:` map with glyph definitions and semantic aliases
- **breakpoints**: `values:` map with width thresholds

### Body

The markdown body contains:

- Design principles (why these tokens exist)
- Implementation guide (how to build them in a target language)

---

## Component spec format

### Frontmatter (required)

```yaml
kind: component # always "component"
name: string # PascalCase component name
description: string # one-line summary
version: number # spec version
category: string # one of: input, display, navigation, layout, feedback
```

### Frontmatter: tokens

Declares which tokens this component uses. Agents use this to generate correct
imports and ensure token availability.

```yaml
tokens:
    colors: [textPrimary, textSecondary, selected, ...]
    icons: [iconPrompt, iconSuccess, ...]
```

### Frontmatter: props

Typed prop definitions. Every prop must declare type, required, and description.

```yaml
props:
    propName:
        type: string | number | boolean | array<T> | record<K,V> | callback(args) | T
        required: boolean
        default: value # only if required is false
        description: string
```

Supported types:

- Primitives: `string`, `number`, `boolean`
- Collections: `array<T>`, `record<string, T>`
- Callbacks: `callback(arg1: type, arg2: type) → returnType`
- Unions: `string | false | null`
- Generic: `T` (component is generic over T)
- References: `SelectItem<T>` (references another type defined in the spec)

### Frontmatter: types (optional)

Define supporting types used by props.

```yaml
types:
    SelectItem:
        generic: T
        fields:
            label: { type: string, required: true, description: "Display text" }
            value: { type: T, required: true, description: "Backing value" }
            current: { type: boolean, required: false, description: "Marks as active choice" }
```

### Frontmatter: states (optional)

Defines a state machine for interactive components. Stateless components omit this.

```yaml
states:
    initial: idle
    definitions:
        idle:
            description: Component mounted, waiting for focus
            transitions:
                focus: focused
        focused:
            description: Component has keyboard focus
            transitions:
                select: selected
                escape: dismissed
        selected:
            description: User confirmed a choice
            terminal: true
        dismissed:
            description: User cancelled
            terminal: true
```

Rules:

- `initial` is the entry state
- `terminal: true` states emit a callback and end interaction
- Transitions are `trigger: targetState` pairs
- Triggers can be keyboard keys, programmatic events, or timers

### Frontmatter: keyboard (optional)

Maps keyboard input to actions. Actions reference state transitions or callbacks.

```yaml
keyboard:
    "↑": { action: "move selection up", wrap: true }
    "↓": { action: "move selection down", wrap: true }
    k: { action: "move selection up", note: "vim binding" }
    j: { action: "move selection down", note: "vim binding" }
    enter: { action: "confirm selection → fires onSelect" }
    escape: { action: "cancel → fires onEscape" }
    ctrl+g: { action: "cancel (alternative)", same_as: escape }
    "1-9": { action: "select item by number (1-indexed)" }
```

### Frontmatter: breakpoints (optional)

Defines responsive behavior at different terminal widths.

```yaml
breakpoints:
    compact: # < 80 columns
        description: what changes at this breakpoint
    narrow: # 80-119 columns
        description: what changes at this breakpoint
    wide: # ≥ 120 columns
        description: what changes at this breakpoint
```

### Frontmatter: accessibility (optional)

Screen reader and assistive technology behavior. Uses ARIA terminology for
formal role/state/property definitions.

```yaml
accessibility:
    role: string # ARIA role (e.g., "listbox", "textbox", "dialog", "status")
    properties: # static ARIA attributes set once on mount
        aria-label: string # MUST be descriptive of the component purpose
        aria-describedby: string # MAY reference hint text or description
    states: # dynamic ARIA states that change during interaction
        aria-selected: string # description of when true/false
        aria-expanded: string # description of when true/false
    announce:
        on_mount: string # screen reader announcement on first render
        on_change: string # announcement when state changes
    screen_reader_adaptations:
        - when: string # condition (e.g., "screen reader detected")
          change: string # what changes in rendering
```

Rules:

- Every interactive component MUST define `role` and `announce.on_mount`
- Components with selection MUST define `states.aria-selected`
- `screen_reader_adaptations` MUST describe visual-to-text replacements
  (e.g., replacing glyphs with text suffixes)

### Frontmatter: animation (optional)

Animation definitions with accessibility controls.

```yaml
animation:
    name:
        frames: [frame1, frame2, ...] # or reference to icon spinner sequence
        interval_ms: number
        disable_when: [screen_reader, reduced_motion]
```

### Frontmatter: constants (optional)

Named values that are part of the component contract (not configuration).
Constants differ from props in that they are fixed, not user-provided.

```yaml
constants:
    MIN_DIALOG_WIDTH:
        type: number
        value: 30
        description: "Minimum character width for dialog rendering"
```

### Frontmatter: variants (optional)

Describes alternate forms of the component that share most behavior but
differ in specific props or rendering. Variants MUST reference the base
component and list only the differences.

```yaml
variants:
    UncontrolledInput:
        description: "Input that manages its own value state internally"
        props_override:
            value: { required: false }
            onChange: { required: false }
        props_added:
            defaultValue: { type: string, required: false, description: "Initial value" }
```

### Frontmatter: security (optional)

Input sanitization and output safety rules. Components that accept URLs,
user-provided text, or render external content MUST define this section.

```yaml
security:
    sanitization:
        - input: url
          rule: "MUST strip ESC (0x1B), BEL (0x07), and ST (0x9C) characters"
          reason: "Prevent terminal escape injection via malicious URLs"
```

### Frontmatter: dependencies (required)

Every component MUST declare its dependencies on tokens and other components.
This enables the compiler to build dependency graphs and detect breaking changes.

```yaml
dependencies:
    tokens:
        - name: selected
          kind: color
          usage: "Highlight indicator and text color"
          required: true
        - name: iconPrompt
          kind: icon
          usage: "Selection indicator glyph"
          required: true
    components:
        - name: HintBar
          usage: "Keyboard navigation hints in footer"
          required: false
    dependents: # other components that use this one
        - SelectAutocomplete
        - FilterMenu
```

Rules:

- `required: true` tokens MUST be available at render time; absence is an error
- `required: false` tokens MAY be absent; component MUST render without them
- `dependents` is informational; used by the compiler for cascade invalidation

Declares how this component composes with other components.

```yaml
composition:
    children:
        - component: HintBar
          slot: footer
          default_props: { hints: { ... } }
          optional: true # can be hidden via prop
    slots:
        footer: { description: "Bottom area for hints or actions" }
```

### Body sections

The markdown body follows a consistent structure:

#### 1. Overview (required)

One paragraph describing the component's purpose.

#### 2. Visual rules (required)

Bullet list of styling rules. MUST reference token names, MUST NOT use raw colors.
MUST use RFC 2119 keywords.

```markdown
## Visual rules

- Selected item text MUST use the `selected` color token
- Selection indicator MUST use `iconPrompt`
- Current item MUST show `iconSuccess` in `statusSuccess` color
- Unselected items SHOULD use `textOnBackgroundSecondary`
```

#### 3. Rendering example (required)

Shows expected output with annotations.

````markdown
## Rendering example

Given items: ["Alpha", "Beta (current)", "Gamma"]

```
❯ 1. Alpha
  2. Beta ✓
  3. Gamma
↑↓ to navigate · Enter to select · Esc to cancel
```
````

#### 4. Behavior (optional, for interactive components)

Describes interaction patterns. For keyboard-driven interactions, MUST use
numbered algorithmic steps rather than prose:

```markdown
### Escape key processing

When the user presses Escape while in the `focused` state:

1. Let item be escapeItem if provided and not null, else undefined
2. If item is defined:
   a. Call onSelect(item)
   b. Transition to `dismissed` state
   c. Terminate processing
3. Let callback be onEscape if provided, else undefined
4. If callback is defined:
   a. Call callback()
   b. Transition to `dismissed` state
   c. Terminate processing
5. Otherwise, remain in `focused` state and discard the keystroke
```

#### 5. Dependencies (required)

Summary table of tokens and components consumed. MUST match the
`dependencies` frontmatter section.

```markdown
## Dependencies

| Dependency      | Kind      | Usage               | Required |
| --------------- | --------- | ------------------- | -------- |
| `selected`      | color     | Highlight text      | Yes      |
| `statusSuccess` | color     | Current item glyph  | No       |
| `iconPrompt`    | icon      | Selection indicator | Yes      |
| `HintBar`       | component | Footer hints        | No       |
```

#### 6. Variants (optional)

Describes component variants (e.g., SelectWithTextInput).

#### 6. Edge cases (optional)

Documents boundary behavior.

---

## Test spec format

### Frontmatter (required)

```yaml
kind: test
component: string # must match a component spec name
version: number
```

### Test blocks

Each test is an H2 heading followed by fenced code blocks:

#### Props block (required per test)

````yaml
# Inside ```props block
items: ["Alpha", "Beta"]
onSelect: callback
````

#### Expect block — normative character grid assertion

The expect block is **normative**. The rendered character grid is the
source of truth for output validation. No alternative rendering is valid
for the given props.

````
# Inside ```expect block — exact terminal output (normative)
❯ 1. Alpha
  2. Beta
````

The expect block matches **plain text only** — no ANSI codes. The test harness
strips ANSI before comparison.

#### Input block — simulates keyboard input

````yaml
# Inside ```input block
↓           # single key
↓ ↓ ↓      # sequence (space-separated)
"hello"     # text input (quoted)
````

Input blocks are applied **sequentially** before the next expect block.

#### Style block — semantic style assertions

````yaml
# Inside ```style block
- selector: key("Esc") # targets a rendered text segment
  bold: true
  color: textPrimary # references a semantic token name
- selector: separator
  color: textSecondary
````

Selectors:

- `key("text")` — matches a key label
- `label("text")` — matches an action label
- `item(index)` — matches a list item by 0-based index
- `indicator(index)` — matches a selection indicator
- `separator` — matches separators
- `component("Name")` — matches a child component

#### State block — state machine assertions

````yaml
# Inside ```state block
before: idle
trigger: focus
after: focused
````

#### Accessibility block — screen reader assertions

````yaml
# Inside ```accessibility block
announce: "Select: 3 items. Alpha, Beta, Gamma. Use arrow keys to navigate."
````

### Test sequencing

Tests within a single H2 section run **top to bottom**. Blocks are:

1. `props` — set up component
2. `expect` — assert initial render
3. `input` — simulate interaction
4. `expect` — assert updated render
5. (repeat input → expect as needed)

This enables multi-step interaction tests:

````markdown
## navigates down then selects

​`props
items: ["A", "B", "C"]
​`

​`expect
❯ 1. A
  2. B
  3. C
​`

​`input
↓
​`

​```expect

1. A
   ❯ 2. B
2. C
   ​```

​`input
enter
​`

​`state
after: selected
selected_value: "B"
​`
````

---

## Preview spec format

Preview specs define how a component is showcased in the demo app. Each file
lists named variants with their props — the demo app renders all variants for
the selected component.

### Frontmatter (required)

```yaml
kind: preview
component: string # must match a component spec name (or "colors", "icons", "breakpoints" for tokens)
version: number
```

### Variant blocks

Each variant is an H2 heading followed by a `props` fenced code block:

````markdown
## Default hints

​`props
hints:
  enter: "select"
  esc: "cancel"
  up-down: "navigate"
​`

## Custom separator

​`props
hints:
  a: "one"
  b: "two"
  c: "three"
separator: " | "
​`
````

Rules:

- Each `## heading` names the variant (displayed as a label in the demo)
- Each `props` block contains YAML props passed to the component
- Variants render **top to bottom** in the demo screen
- For token previews, the `props` block contains display configuration
  (e.g., which token groups to show)
- Preview specs MUST NOT duplicate test logic — they showcase visual
  surface area, not assert correctness

---

## Target spec format

Target specs define how component/token specs compile to a specific language + framework.

### Frontmatter (required)

```yaml
kind: target
name: string # short identifier (e.g., "go", "bun", "rust")
language: string # programming language
runtime: string # runtime + minimum version
framework:
    name: string # TUI framework name
    version: string # minimum version
    paradigm: string # architectural pattern
```

### Required body sections

1. **Architecture pattern** — how the framework structures components
2. **Type mapping** — table mapping spec types → language types
3. **Callback translation** — how spec callbacks become idiomatic (messages, actions, props)
4. **State machine translation** — how spec states map to the framework pattern
5. **Token access** — how components consume color/icon/breakpoint tokens
6. **Styling** — how to apply semantic colors and bold/italic to rendered text
7. **Composition** — how parent components embed children
8. **Test pattern** — how `.test.md` blocks become runnable tests
9. **Key mapping** — table mapping spec keyboard names to framework key events
10. **Dependencies** — required packages/modules

### Demo CLI (required)

Every target **must** include a demo CLI tool that renders all generated components
interactively. This is the primary visual verification mechanism.

```yaml
demo:
    entry: path/to/demo entrypoint
    run_command: "command to start the demo"
    description: >
        Interactive preview of all components. Cycles through each component
        with live keyboard interaction.
```

The demo must:

- Render each component in isolation so visual output can be inspected
- Support keyboard interaction (navigate, select, escape)
- Use the generated token system (colors, icons) — not hardcoded values
- Be runnable with a single command from the target directory

---

## Versioning and diff-based updates

Each spec has a `version` field. When a spec changes:

1. Bump `version`
2. The lockfile (per target language) records `{ spec_hash, generated_file_hashes }`
3. Only specs with changed hashes trigger regeneration
4. The agent receives: current generated code + spec diff → produces code patch
5. Tests run against patched code
6. If green, lockfile updates; if red, agent iterates

---

## Naming conventions

| Thing       | Convention         | Example                          |
| ----------- | ------------------ | -------------------------------- |
| Spec files  | PascalCase.md      | `Select.md`, `HintBar.md`        |
| Test files  | PascalCase.test.md | `Select.test.md`                 |
| Token files | lowercase.md       | `colors.md`, `icons.md`          |
| Props       | camelCase          | `onSelect`, `hideHints`          |
| Tokens      | camelCase          | `textPrimary`, `iconPrompt`      |
| States      | lowercase          | `idle`, `focused`, `selected`    |
| Categories  | lowercase          | `input`, `display`, `navigation` |
