---
kind: target
name: node
language: TypeScript
runtime: Node.js 20+
framework:
    name: Ink
    version: ">=5.0"
    url: https://github.com/vadimdemedes/ink
    paradigm: React (declarative, virtual DOM, hooks)
styling:
    name: Chalk
    version: ">=5.0"
    url: https://github.com/chalk/chalk
    role: ANSI color encoding (hex → SGR codes)
testing:
    runner: npx vitest run
    framework: vitest
    helper: ink-testing-library

output:
    root: src/tuikit
    structure:
        tokens/colors.ts: SemanticColors type + resolveTokens()
        tokens/icons.ts: Icon constants + semantic aliases
        tokens/breakpoints.ts: Breakpoint constants + getBreakpoint()
        components/{Name}/{Name}.tsx: Component function
        components/{Name}/{Name}.test.tsx: Tests
        hooks/useColors.ts: React hook for color access
        hooks/useBreakpoint.ts: React hook for responsive breakpoints
        index.ts: Public re-exports
---

# Node Target — Ink + React

## Architecture pattern

This target uses React + Ink on the Node.js runtime. Components are functional
React components with hooks. Uses npm for package management and vitest for
testing.

```tsx
import { Box, Text } from "ink";
import { useColors } from "../hooks/useColors";

export function HintBar({ hints, separator = " · " }: HintBarProps) {
    const colors = useColors();
    const entries = Object.entries(hints).filter(([, v]) => Boolean(v));

    return (
        <Text color={colors.textSecondary}>
            {entries.map(([key, label], i) => (
                <Text key={key}>
                    {i > 0 && separator}
                    <Text bold color={colors.textPrimary}>
                        {formatKey(key)}
                    </Text>{" "}
                    {label}
                </Text>
            ))}
        </Text>
    );
}
```

## Type mapping

| Spec type                 | TypeScript type                        |
| ------------------------- | -------------------------------------- |
| `string`                  | `string`                               |
| `number`                  | `number`                               |
| `boolean`                 | `boolean`                              |
| `array<T>`                | `T[]`                                  |
| `record<string, T>`       | `Record<string, T>`                    |
| `callback(args) → void`   | `(args) => void`                       |
| `T` (generic)             | `<T>` generic parameter                |
| `string \| false \| null` | `string \| false \| null \| undefined` |
| `SelectItem<T>`           | `interface SelectItem<T> { ... }`      |
| `color \| undefined`      | `SemanticColor \| undefined`           |
| `SemanticColor`           | Branded `string` type                  |
| `IconGlyph`               | Branded `string` type                  |

## Callback translation

Callbacks map directly to React props — no translation needed:

```tsx
// Spec: onSelect: callback(item: SelectItem<T>) → void
// Node/Ink: Direct prop
interface SelectProps<T> {
    onSelect: (item: SelectItem<T>) => void;
}
```

## State machine translation

Spec states map to `useState` + conditional logic:

```tsx
type State = "focused" | "selected" | "dismissed";

function Select<T>({ items, onSelect }: SelectProps<T>) {
    const [state, setState] = useState<State>("focused");
    const [highlighted, setHighlighted] = useState(0);

    useInput((key) => {
        if (state !== "focused") return;
        if (key.return) {
            setState("selected");
            onSelect(items[highlighted]);
        }
    });
}
```

## Token access

Tokens are accessed via React hooks:

```tsx
// Colors — via hook (memoized per render)
const colors = useColors();
<Text color={colors.textPrimary}>Hello</Text>;

// Icons — direct import (static constants)
import { IconStatus } from "../tokens/icons";
<Text>{IconStatus.prompt}</Text>;

// Breakpoints — via hook (reactive to terminal resize)
const { breakpoint, isCompact } = useBreakpoint();
```

## Styling with Ink

Ink's `<Text>` and `<Box>` are the styling primitives:

```tsx
// Spec: "key is bold in textPrimary"
<Text bold color={colors.textPrimary}>Esc</Text>

// Spec: "label uses textSecondary"
<Text color={colors.textSecondary}>to cancel</Text>

// Spec: layout direction vertical
<Box flexDirection="column">
    {items.map(item => <Text key={item.key}>{item.label}</Text>)}
</Box>
```

## Composition

React composition is natural — components are JSX children:

```tsx
function Select<T>({ items, hideHints }: SelectProps<T>) {
    return (
        <>
            <Box flexDirection="column">{items.map((item, i) => renderItem(item, i))}</Box>
            {!hideHints && <HintBar hints={{ "up-down": "to navigate", enter: "to select" }} />}
        </>
    );
}
```

## Input handling

Use the `useInput` hook (Ink's keyboard handler):

```tsx
import { useInput } from "ink";
// Or the wrapped version for Kitty protocol support:
import useInput from "../hooks/useInput";

useInput((input, key) => {
    if (key.upArrow) {
        /* move up */
    }
    if (key.downArrow) {
        /* move down */
    }
    if (key.return) {
        /* select */
    }
    if (key.escape) {
        /* cancel */
    }
});
```

## Test pattern

Use `ink-testing-library` for component testing. The `.test.md` expect blocks
become string comparisons against rendered output:

````tsx
import { render } from "ink-testing-library";
import { HintBar } from "./HintBar";

test("renders basic hints with separator", () => {
    const { lastFrame } = render(
        <HintBar hints={{ esc: "to cancel", enter: "to select" }} />
    );

    // ```expect block → string comparison
    const expected = "Esc to cancel · Enter to select";
    expect(stripAnsi(lastFrame())).toBe(expected);
});

test("moves highlight down on arrow key", () => {
    const { lastFrame, stdin } = render(
        <Select items={[...]} onSelect={() => {}} />
    );

    // ```input block → stdin.write
    stdin.write("\x1B[B"); // Down arrow

    // ```expect block → string comparison
    expect(stripAnsi(lastFrame())).toContain("❯ 2. Beta");
});
````

## Key mapping

| Spec key | Ink `useInput` key               |
| -------- | -------------------------------- |
| `↑`      | `key.upArrow`                    |
| `↓`      | `key.downArrow`                  |
| `enter`  | `key.return`                     |
| `escape` | `key.escape`                     |
| `ctrl+g` | `key.ctrl && input === "g"`      |
| `k`, `j` | `input === "k"`, `input === "j"` |
| `1-9`    | `/^[1-9]$/.test(input)`          |

| Spec key | stdin raw bytes |
| -------- | --------------- |
| `↑`      | `\x1B[A`        |
| `↓`      | `\x1B[B`        |
| `enter`  | `\r`            |
| `escape` | `\x1B`          |
| `ctrl+g` | `\x07`          |

## Node-specific notes

- Use TypeScript with `tsx` or `ts-node` for execution without a build step
- Use `vitest` for testing: `describe`, `it`, `expect`, `beforeEach`
- ESM modules by default (`"type": "module"`)
- Ink works on Node.js without modification
- Use `npm install` for dependency management

## Dependencies

```json
{
    "dependencies": {
        "ink": "^5.0.0",
        "react": "^18.0.0",
        "chalk": "^5.0.0",
        "@basiclines/rampa": "^1.0.0"
    },
    "devDependencies": {
        "@types/react": "^18.0.0",
        "ink-testing-library": "^4.0.0",
        "vitest": "^3.0.0",
        "tsx": "^4.0.0"
    }
}
```

## Demo CLI

Every target must include a demo that renders all components interactively.

```yaml
demo:
    entry: demo.tsx
    run_command: "npx tsx demo.tsx"
```

The demo app is a multi-screen Ink application. It shows a menu of available
components, and selecting one renders that component live with full keyboard
interaction. Pressing Escape returns to the menu.

Screens:

1. **Menu** — Select component listing all available demos
2. **HintBar demo** — renders several HintBar variants (basic, custom separator, conditional)
3. **Select demo** — interactive Select with sample items + current marker
4. **SelectWithTextInput demo** — interactive variant with text input

The demo must use the generated tokens (colors from `useColors()`, icons from
`tokens/icons`) — no hardcoded color values.
