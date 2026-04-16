# TUIkit Specs

A spec-driven system for building UI components across programming languages.
Each component is defined as a language-agnostic markdown spec with behavioral
tests. An LLM agent acts as the "compiler" — reading specs and generating
idiomatic implementations per target framework.

## How it works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Spec files  │────▶│  compile.ts  │────▶│  LLM Agent      │
│  (.md)       │     │  (prompt)    │     │  (compiler)     │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐               │
                    │  lock file   │◀──────────────┤
                    │  (.json)     │               │
                    └──────────────┘     ┌─────────▼────────┐
                                         │  dist/{target}/   │
                                         │  (generated code) │
                                         └──────────────────┘
```

1. **Specs** define behavior + semantic tokens (like headless UI libraries)
2. **Target specs** define how to translate to a specific language/framework
3. **compile.ts** detects changed specs and generates a self-contained prompt
4. An **LLM agent** reads the prompt and generates idiomatic code
5. Generated code goes to **dist/** — specs stay clean
6. **Lock files** track which spec versions have been compiled

## Quick start

```bash
# Check what needs compiling
bun compile.ts status

# Generate a prompt for the Go target
bun compile.ts prompt --target go

# The prompt is written to dist/go/_compile-prompt.md
# Feed it to an LLM agent (e.g. Copilot CLI, Claude, etc.)
# The agent writes generated code to dist/go/

# After verifying the generated code works, lock the hashes
bun compile.ts lock --target go

# Lint all specs against the schema
bun lint.ts
```

## Specs directory structure

```
specs/
  _schema.md            Meta-spec — defines the format for all specs
  compile.ts            Compiler CLI
  lint.ts               Linter CLI
  targets/
    go.md               Go + Bubbletea target definition
    bun.md              Bun + Ink target definition
    rust.md             Rust + Ratatui target definition
    csharp.md           C# + Spectre.Console target definition
    *.lock.json         Lock files (per target, committed)
  tokens/
    colors.md           Semantic color tokens
    icons.md            Icon glyphs and aliases
    breakpoints.md      Responsive width thresholds
  components/
    {Name}/
      {Name}.md         Component spec
      {Name}.test.md    Behavioral test spec
  dist/                 Compiled output (gitignored)
    {target}/           One folder per target
```

## Writing specs

### Component spec

Each component is a markdown file with YAML frontmatter and prose body:

````yaml
---
kind: component
name: MyComponent
description: One-line summary.
version: 1
category: input          # input | display | navigation | layout | feedback

tokens:
    colors: [textPrimary, selected]
    icons: [iconPrompt]

props:
    label:
        type: string
        required: true
        description: Display text.

dependencies:
    tokens:
        - name: textPrimary
          kind: color
          usage: "Label text"
          required: true
    components: []

accessibility:
    role: button
    announce:
        on_mount: "Button: {label}"
---

## Visual rules

- Label text MUST use the `textPrimary` color token
- Active state MUST use the `selected` color token

## Rendering example

Given label: "Click me"

​```
Click me
​```

## Dependencies

| Dependency | Kind | Usage | Required |
|------------|------|-------|----------|
| `textPrimary` | color | Label text | Yes |
| `selected` | color | Active state | Yes |
````

### Test spec

Test specs live alongside component specs and use a block-based format:

```markdown
---
kind: test
component: MyComponent
version: 1
---

## renders label text

​`props
label: "Hello"
​`

​`expect
Hello
​`
```

See `_schema.md` for the full format reference, including `input`, `state`,
`style`, and `accessibility` test blocks.

### Conformance language

All normative sections (Visual rules, Behavior, Edge cases) use
[RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) keywords:

- **MUST** — absolute requirement
- **SHOULD** — strong recommendation
- **MAY** — optional behavior
- **MUST NOT** — absolute prohibition

## Compiling to a target

### Available targets

| Target   | Language   | Framework            | File                |
| -------- | ---------- | -------------------- | ------------------- |
| `go`     | Go         | Bubbletea + Lipgloss | `targets/go.md`     |
| `bun`    | TypeScript | Ink + React          | `targets/bun.md`    |
| `rust`   | Rust       | Ratatui + Crossterm  | `targets/rust.md`   |
| `csharp` | C#         | Spectre.Console      | `targets/csharp.md` |

### Workflow

```bash
# 1. See what's changed
bun compile.ts status

# 2. Generate the compilation prompt
bun compile.ts prompt --target go

# 3. Feed dist/go/_compile-prompt.md to an LLM agent
#    The agent generates code into dist/go/

# 4. Verify: run tests, check the demo CLI
cd dist/go && go test ./... && go run ./cmd/demo

# 5. Lock the hashes
bun compile.ts lock --target go
```

### Custom output directory

By default, compiled code goes to `specs/dist/`. Override with `--out`:

```bash
# Output to a separate repo or directory
bun compile.ts prompt --target go --out ~/my-tuikit-go

# The prompt and generated code go to ~/my-tuikit-go/go/
```

### Adding a new target

1. Create `targets/{name}.md` following the target spec format in `_schema.md`
2. Define: architecture pattern, type mapping, callback translation, state
   machine pattern, token access, styling, composition, test pattern, key
   mapping, dependencies, and demo CLI
3. Run `bun compile.ts status` — your target will show up with all specs dirty
4. Run `bun compile.ts prompt --target {name}` and compile

## Building your own component library

The specs are designed to bootstrap a full component library in your target
language. Use `--out` to point at your own project and maintain it independently.

### Initial compilation

```bash
# 1. Create your project directory
mkdir ~/my-tuikit-go && cd ~/my-tuikit-go
go mod init github.com/myorg/tuikit

# 2. Generate the full compilation prompt
cd /path/to/specs
bun compile.ts prompt --target go --out ~/my-tuikit-go

# 3. Feed the prompt to an LLM agent
#    Point the agent at ~/my-tuikit-go/go/_compile-prompt.md
#    It generates all components, tokens, and tests into ~/my-tuikit-go/go/

# 4. Verify everything works
cd ~/my-tuikit-go/go && go test ./...

# 5. Lock the compiled state
cd /path/to/specs
bun compile.ts lock --target go
```

Your component library now lives in `~/my-tuikit-go/` — a standalone project
you own, version, and publish independently of the specs.

### Incremental updates

When specs change (new components, bug fixes, behavior changes), you don't
need to recompile everything:

```bash
# See what changed since last compilation
bun compile.ts status --target go

# Generate a prompt with only dirty specs
bun compile.ts prompt --target go --out ~/my-tuikit-go

# The prompt tells the agent exactly which components to update
# Feed it to the agent — it patches your existing codebase

# Verify and lock
cd ~/my-tuikit-go/go && go test ./...
cd /path/to/specs && bun compile.ts lock --target go
```

### Extending with custom components

You can add components to the specs and compile them into your library:

1. Create `components/MyComponent/MyComponent.md` following the format
2. Create `components/MyComponent/MyComponent.test.md` with behavioral tests
3. Run `bun lint.ts` to validate against the schema
4. Run `bun compile.ts prompt --target go --out ~/my-tuikit-go`
5. The new component appears in the prompt alongside any other dirty specs

### Multiple targets from one spec set

The same specs can produce libraries for different languages simultaneously:

```bash
# Compile to all your targets
bun compile.ts prompt --target go --out ~/tuikit-go
bun compile.ts prompt --target rust --out ~/tuikit-rust
bun compile.ts prompt --target csharp --out ~/tuikit-csharp

# Each output is a standalone project with idiomatic code
# Lock each target independently
bun compile.ts lock --target go
bun compile.ts lock --target rust
bun compile.ts lock --target csharp
```

## Linting

```bash
# Lint all specs
bun lint.ts

# Lint a single component
bun lint.ts --component Select

# Show fix suggestions
bun lint.ts --fix
```

The linter checks:

- Required frontmatter fields and valid values
- Naming conventions (PascalCase components, camelCase props)
- RFC 2119 keyword usage in normative sections
- ARIA accessibility structure for interactive components
- Token cross-references resolve to known tokens
- Required body sections (Visual rules, Rendering example, Dependencies)
- Test specs reference existing components

## Design principles

- **Specs capture intent, not implementation** — ~95% behavioral intent vs.
  ~5% framework hints. This lets agents generate idiomatic code per framework
  rather than awkward transliterations.

- **Color tokens define meaning, not color values** — tokens like `textPrimary`
  and `selected` define UI roles. The color engine (Rampa, hardcoded hex,
  ANSI palette) is an implementation detail per target.

- **Layout is out of scope** — specs define behavior and semantic tokens.
  Spacing, padding, and spatial polish are per-target decisions (similar to
  headless UI libraries like Radix or Base UI).

- **Lock files enable incremental compilation** — only dirty specs trigger
  regeneration. Schema changes invalidate everything.
