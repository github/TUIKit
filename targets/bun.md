---
kind: target
name: bun
language: TypeScript
runtime: Bun 1.1+
framework:
    name: OpenTUI + React
    version: ">=0.1"
    url: https://github.com/anomalyco/opentui
    paradigm: React (JSX, hooks, functional components on native Zig core)
styling:
    builtin: true
    role: >
        OpenTUI handles styling natively via JSX props (fg, backgroundColor,
        bold, dim, etc.) and the style prop. No external styling library needed.
testing:
    runner: bun test
    framework: bun:test (Jest-compatible)
    helper: none (test against rendered output)

output:
    root: src/tuikit
    structure:
        tokens/colors.ts: Semantic color map + useColors() hook
        tokens/icons.ts: Icon constants + semantic aliases
        tokens/breakpoints.ts: Breakpoint constants + useBreakpoint() hook
        components/{Name}/{Name}.tsx: Component function
        components/{Name}/{Name}.test.tsx: Tests
        hooks/useColors.ts: React hook for color access
        hooks/useBreakpoint.ts: React hook for responsive breakpoints
        index.ts: Public re-exports
---

# Bun Target — OpenTUI + React

## Architecture pattern

This target uses **React with OpenTUI's native Zig renderer**. Components are
standard React functional components with hooks and JSX — the same mental model
as the node/Ink target — but rendered through OpenTUI's high-performance native
core instead of Ink's JS-based renderer.

### Entry point

```tsx
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

function App() {
    return (
        <box style={{ flexDirection: "column" }}>
            <text fg="#00FF00">Hello, TUIKit!</text>
        </box>
    );
}

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
```

### JSX intrinsic elements

OpenTUI React uses **lowercase** JSX elements that map to native renderables:

| Element | Purpose |
| ------- | ------- |
| `<text>` | Text display with styling (fg, bold, dim, underline) |
| `<span>` | Inline styled text (inside `<text>`) |
| `<strong>`, `<b>` | Bold text |
| `<em>`, `<i>` | Italic text |
| `<u>` | Underlined text |
| `<br>` | Line break |
| `<a>` | Link text |
| `<box>` | Container with flexbox layout, borders, padding |
| `<scrollbox>` | Scrollable container |
| `<input>` | Single-line text input |
| `<textarea>` | Multi-line text input |
| `<select>` | Selection list |
| `<tab-select>` | Tab-based selection |

**Important**: Use lowercase `<text>`, `<box>`, etc. — NOT capitalized. These
are JSX intrinsic elements provided by OpenTUI, not React components.

### tsconfig.json

```json
{
    "compilerOptions": {
        "lib": ["ESNext", "DOM"],
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "jsxImportSource": "@opentui/react",
        "strict": true,
        "skipLibCheck": true
    }
}
```

## Component example

```tsx
import { useColors } from "../hooks/useColors";

interface HintBarProps {
    hints: Record<string, string | false | null>;
    separator?: string;
}

export function HintBar({ hints, separator = " · " }: HintBarProps) {
    const colors = useColors();
    const entries = Object.entries(hints).filter(([, v]) => Boolean(v));

    return (
        <text>
            {entries.map(([key, label], i) => (
                <span key={key}>
                    {i > 0 && <span fg={colors.textSecondary}>{separator}</span>}
                    <b fg={colors.textPrimary}>{formatKey(key)}</b>
                    <span fg={colors.textSecondary}> {label}</span>
                </span>
            ))}
        </text>
    );
}
```

## Type mapping

| Spec type | TypeScript type |
| --------- | --------------- |
| `string` | `string` |
| `number` | `number` |
| `boolean` | `boolean` |
| `array<T>` | `T[]` |
| `record<string, T>` | `Record<string, T>` |
| `callback(args) → void` | `(args) => void` |
| `T` (generic) | `<T>` generic parameter |
| `string \| false \| null` | `string \| false \| null \| undefined` |
| `SelectItem<T>` | `interface SelectItem<T> { ... }` |
| `color \| undefined` | `string \| undefined` (hex or ANSI) |
| `SemanticColor` | `string` (hex color value) |
| `IconGlyph` | `string` |

## Callback translation

Callbacks map directly to React props — no translation needed:

```tsx
// Spec: onSelect: callback(item: SelectItem<T>) → void
// Bun/OpenTUI: Direct prop
interface SelectProps<T> {
    onSelect: (item: SelectItem<T>) => void;
}
```

## State machine translation

Spec states map to `useState` + conditional logic (same as React):

```tsx
type State = "focused" | "selected" | "dismissed";

function Select<T>({ items, onSelect }: SelectProps<T>) {
    const [state, setState] = useState<State>("focused");
    const [highlighted, setHighlighted] = useState(0);

    useKeyboard((key) => {
        if (state !== "focused") return;
        if (key.name === "return") {
            setState("selected");
            onSelect(items[highlighted]);
        }
    });
}
```

## Token access

Tokens are accessed via React hooks (same pattern as node target):

```tsx
// Colors — via hook (re-renders on theme change)
const colors = useColors();
<text fg={colors.textPrimary}>Hello</text>

// Icons — direct import (static constants)
import { IconStatus } from "../tokens/icons";
<text>{IconStatus.prompt}</text>

// Breakpoints — via hook (reactive to terminal resize)
const { breakpoint, isCompact } = useBreakpoint();
```

## Styling with OpenTUI

Styling is done via JSX props or the `style` prop on intrinsic elements:

```tsx
// Spec: "key is bold in textPrimary"
<b fg={colors.textPrimary}>Esc</b>

// Spec: "label uses textSecondary"
<span fg={colors.textSecondary}>to cancel</span>

// Spec: "dimmed text"
<text fg={colors.textSecondary} dim>optional</text>

// Spec: bordered container
<box style={{ border: true, borderStyle: "rounded", padding: 1 }}>
    <text>Inside a box</text>
</box>

// Spec: layout direction vertical
<box style={{ flexDirection: "column", gap: 1 }}>
    {items.map(item => <text key={item.key}>{item.label}</text>)}
</box>
```

## Composition

React composition is natural — components are JSX children:

```tsx
function Select<T>({ items, hideHints }: SelectProps<T>) {
    return (
        <box style={{ flexDirection: "column" }}>
            {items.map((item, i) => renderItem(item, i))}
            {!hideHints && <HintBar hints={{ "up-down": "navigate", enter: "select" }} />}
        </box>
    );
}
```

## Input handling

Use OpenTUI's `useKeyboard` hook:

```tsx
import { useKeyboard } from "@opentui/react";

useKeyboard((key) => {
    if (key.name === "up") { /* move up */ }
    if (key.name === "down") { /* move down */ }
    if (key.name === "return") { /* select */ }
    if (key.name === "escape") { /* cancel */ }
});
```

## Resize handling

Use OpenTUI's dimension hooks for responsive layout:

```tsx
import { useTerminalDimensions, useOnResize } from "@opentui/react";

function ResponsiveLayout() {
    const { width, height } = useTerminalDimensions();
    const isNarrow = width < 80;

    return (
        <box style={{ flexDirection: isNarrow ? "column" : "row" }}>
            {!isNarrow && <Sidebar />}
            <Content />
        </box>
    );
}
```

## Test pattern

Use `bun:test` for component testing. Render components and assert against
the output:

```tsx
import { describe, test, expect } from "bun:test";

describe("HintBar", () => {
    test("renders basic hints with separator", () => {
        const output = renderToString(
            <HintBar hints={{ esc: "to cancel", enter: "to select" }} />
        );
        expect(output).toContain("Esc");
        expect(output).toContain("to cancel");
        expect(output).toContain("·");
    });
});

describe("Select", () => {
    test("moves highlight down on key", () => {
        // Render, simulate key, assert
    });
});
```

## Key mapping

| Spec key | OpenTUI `key.name` |
| -------- | ------------------ |
| `↑` | `"up"` |
| `↓` | `"down"` |
| `enter` | `"return"` |
| `escape` | `"escape"` |
| `ctrl+g` | Check `key.ctrl && key.name === "g"` |
| `k`, `j` | `"k"`, `"j"` |
| `1-9` | `"1"` through `"9"` |
| `tab` | `"tab"` |

## Dependencies

```json
{
    "dependencies": {
        "@opentui/core": ">=0.1.0",
        "@opentui/react": ">=0.1.0",
        "react": "^19.0.0"
    },
    "devDependencies": {
        "@types/react": "^19.0.0",
        "@types/bun": "latest"
    }
}
```

**Note**: OpenTUI requires the Zig compiler installed on the system for building
the native core. Ensure `zig` is available in `PATH`.

## Bun-specific notes

- Bun natively supports TypeScript and JSX — no build step needed
- Use `bun test` for testing: `describe`, `test`, `expect`
- ESM modules by default (`"type": "module"`)
- Use `bun install` for dependency management
- OpenTUI is currently Bun-exclusive — it does not support Node.js yet
- The Zig native core compiles automatically on first `bun install`

## Demo CLI

Every target must include a demo that renders all components interactively.

```yaml
demo:
    entry: demo.tsx
    run_command: "bun run demo.tsx"
```

The demo app uses `createCliRenderer` + `createRoot` to render a React tree
into the terminal. It takes over the alternate screen and implements the
sidebar + preview panel layout using OpenTUI's native flexbox via `<box>`.
Input events use the `useKeyboard` hook routed to the active component.
