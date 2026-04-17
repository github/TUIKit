#!/usr/bin/env bun
import React, { useState, useMemo, useEffect } from "react";
import { render as inkRender, Box, Text, useInput, useApp } from "ink";
import { render as testRender } from "ink-testing-library";
import { useColors } from "./src/tuikit/hooks/useColors.js";
import { useBreakpoint } from "./src/tuikit/hooks/useBreakpoint.js";
import { TextTitle } from "./src/tuikit/components/TextTitle/TextTitle.js";
import { TextHeading } from "./src/tuikit/components/TextHeading/TextHeading.js";
import { HintBar } from "./src/tuikit/components/HintBar/HintBar.js";
import { Select } from "./src/tuikit/components/Select/Select.js";
import { Input } from "./src/tuikit/components/Input/Input.js";
import { Link } from "./src/tuikit/components/Link/Link.js";
import { TextSpinner } from "./src/tuikit/components/TextSpinner/TextSpinner.js";
import { ScrollBox } from "./src/tuikit/components/ScrollBox/ScrollBox.js";
import {
  IconSuccess, IconError, IconWarning, IconInfoCompleted, IconDisabled,
  IconPrompt, IconInfoWorking, IconInfoEmpty,
  IconArrowRight, IconArrowLeft, IconArrowUp, IconArrowDown,
  IconScrollbar, IconCheckboxChecked, IconCheckboxUnchecked,
  IconSeparatorWord, IconSeparatorList,
  IconNestingLast, IconNestingMiddle, IconNestingSkip,
} from "./src/tuikit/components/Icons/Icons.js";
import { Dialog } from "./src/tuikit/components/Dialog/Dialog.js";
import { TimelineItem } from "./src/tuikit/components/TimelineItem/TimelineItem.js";
import { TabBar } from "./src/tuikit/components/TabBar/TabBar.js";
import { Table } from "./src/tuikit/components/Table/Table.js";
import { QrCode } from "./src/tuikit/components/QrCode/QrCode.js";
import { Screen } from "./src/tuikit/components/Screen/Screen.js";
import { Metric } from "./src/tuikit/components/Metric/Metric.js";
import { SelectAutocomplete } from "./src/tuikit/components/SelectAutocomplete/SelectAutocomplete.js";
import { COMPACT_MAX, NARROW_MIN, NARROW_MAX, WIDE_MIN } from "./src/tuikit/tokens/breakpoints.js";

// ─── Preview Variant Registry ───────────────────────────────────────

interface PreviewVariant {
  name: string;
  render: (hasFocus: boolean) => React.ReactNode;
}

interface PreviewEntry {
  name: string;
  type: "token" | "component";
  variants: PreviewVariant[];
}

// Token preview components (stateless)

function ColorsSemanticPreview() {
  const colors = useColors();
  const entries = Object.entries(colors).filter(([, v]) => v != null);
  return (
    <Box flexDirection="column">
      {entries.map(([name, hex]) => (
        <Box key={name} gap={1}>
          <Text color={hex as string}>██</Text>
          <Text>{name}</Text>
          <Text dimColor>{hex as string}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ColorsTextPreview() {
  const colors = useColors();
  const tokens = ["textPrimary", "textSecondary", "textTertiary", "textDisabled", "textOnBackground", "textOnBackgroundSecondary"] as const;
  return (
    <Box flexDirection="column">
      {tokens.map((t) => (
        <Box key={t} gap={1}>
          <Text color={(colors as any)[t]}>██ {t}</Text>
          <Text dimColor>{(colors as any)[t] ?? "–"}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ColorsStatusPreview() {
  const colors = useColors();
  const tokens = ["statusSuccess", "statusError", "statusWarning", "statusInfo"] as const;
  return (
    <Box flexDirection="column">
      {tokens.map((t) => (
        <Box key={t} gap={1}>
          <Text color={(colors as any)[t]}>██ {t}</Text>
          <Text dimColor>{(colors as any)[t] ?? "–"}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ColorsBrandPreview() {
  const colors = useColors();
  const tokens = ["brand", "accent", "selected"] as const;
  return (
    <Box flexDirection="column">
      {tokens.map((t) => (
        <Box key={t} gap={1}>
          <Text color={(colors as any)[t]}>██ {t}</Text>
          <Text dimColor>{(colors as any)[t] ?? "–"}</Text>
        </Box>
      ))}
    </Box>
  );
}

function IconGroupPreview({ icons }: { icons: Array<[string, React.FC<any>]> }) {
  return (
    <Box flexDirection="column">
      {icons.map(([label, Comp]) => (
        <Box key={label} gap={1}>
          <Comp colored />
          <Text>{label}</Text>
        </Box>
      ))}
    </Box>
  );
}

const STATUS_ICONS: Array<[string, React.FC<any>]> = [
  ["IconSuccess", IconSuccess], ["IconError", IconError], ["IconWarning", IconWarning],
  ["IconPrompt", IconPrompt], ["IconInfoCompleted", IconInfoCompleted],
  ["IconInfoWorking", IconInfoWorking], ["IconInfoEmpty", IconInfoEmpty],
];
const NAV_ICONS: Array<[string, React.FC<any>]> = [
  ["IconArrowUp", IconArrowUp], ["IconArrowDown", IconArrowDown],
  ["IconArrowLeft", IconArrowLeft], ["IconArrowRight", IconArrowRight],
];
const UI_ICONS: Array<[string, React.FC<any>]> = [
  ["IconCheckboxChecked", IconCheckboxChecked], ["IconCheckboxUnchecked", IconCheckboxUnchecked],
  ["IconScrollbar", IconScrollbar], ["IconSeparatorWord", IconSeparatorWord],
  ["IconSeparatorList", IconSeparatorList],
];
const TREE_ICONS: Array<[string, React.FC<any>]> = [
  ["IconNestingLast", IconNestingLast], ["IconNestingMiddle", IconNestingMiddle],
  ["IconNestingSkip", IconNestingSkip],
];
const ALL_ICONS: Array<[string, React.FC<any>]> = [...STATUS_ICONS, ...NAV_ICONS, ...UI_ICONS, ...TREE_ICONS];

// Interactive preview sub-components

function InputPreview({ hasFocus }: { hasFocus: boolean }) {
  const [text, setText] = useState("");
  return <Input value={text} onChange={setText} placeholder="Type here..." focus={hasFocus} />;
}

function InputMultilinePreview({ hasFocus }: { hasFocus: boolean }) {
  const [text, setText] = useState("");
  return <Input value={text} onChange={setText} placeholder="Type here... (Shift+Enter for newlines)" maxLines={5} focus={hasFocus} />;
}

function InputMaskedPreview({ hasFocus }: { hasFocus: boolean }) {
  const [text, setText] = useState("");
  return <Input value={text} onChange={setText} mask="*" placeholder="Enter password..." focus={hasFocus} />;
}

function InputSingleLinePreview({ hasFocus }: { hasFocus: boolean }) {
  const [text, setText] = useState("");
  return <Input value={text} onChange={setText} singleLine placeholder="No newlines allowed..." focus={hasFocus} />;
}

function TabBarInteractivePreview({ hasFocus, items, selectedIndex: initial, navigationKeys, loop }: {
  hasFocus: boolean;
  items: Array<{ value: string; label: string }>;
  selectedIndex: number;
  navigationKeys?: "arrow-only" | "tab-only" | "all";
  loop?: boolean;
}) {
  const [tab, setTab] = useState(initial);
  return (
    <TabBar
      items={items}
      selectedIndex={tab}
      onNavigate={hasFocus ? setTab : undefined}
      navigationKeys={navigationKeys}
      loop={loop}
    />
  );
}

// ─── Build the registry from preview specs ──────────────────────────

const PREVIEW_REGISTRY: PreviewEntry[] = [
  // --- Tokens (alphabetical, lowercase names) ---
  {
    name: "breakpoints",
    type: "token",
    variants: [
      {
        name: "Current breakpoint",
        render: () => {
          const bp = useBreakpoint();
          return (
            <Box flexDirection="column">
              <Text>breakpoint: <Text bold>{bp.breakpoint}</Text></Text>
              <Text>columns: {bp.terminalWidth}  rows: {bp.terminalHeight}</Text>
              <Text>compact: ≤{COMPACT_MAX}</Text>
              <Text>narrow: {NARROW_MIN}–{NARROW_MAX}</Text>
              <Text>wide: ≥{WIDE_MIN}</Text>
            </Box>
          );
        },
      },
    ],
  },
  {
    name: "colors",
    type: "token",
    variants: [
      { name: "Semantic colors", render: () => <ColorsSemanticPreview /> },
      { name: "Text tokens", render: () => <ColorsTextPreview /> },
      { name: "Status tokens", render: () => <ColorsStatusPreview /> },
      { name: "Brand tokens", render: () => <ColorsBrandPreview /> },
    ],
  },
  {
    name: "icons",
    type: "token",
    variants: [
      { name: "Status icons", render: () => <IconGroupPreview icons={STATUS_ICONS} /> },
      { name: "Navigation icons", render: () => <IconGroupPreview icons={NAV_ICONS} /> },
      { name: "UI icons", render: () => <IconGroupPreview icons={UI_ICONS} /> },
      { name: "Tree icons", render: () => <IconGroupPreview icons={TREE_ICONS} /> },
    ],
  },

  // --- Components (alphabetical, PascalCase names) ---
  {
    name: "Dialog",
    type: "component",
    variants: [
      {
        name: "Basic",
        render: () => (
          <Dialog title="Notice"><Text>This is a simple dialog.</Text></Dialog>
        ),
      },
      {
        name: "With subtitle",
        render: () => (
          <Dialog title="Confirm Delete" subtitle="This action cannot be undone">
            <Text>Are you sure?</Text>
          </Dialog>
        ),
      },
      {
        name: "Fixed width",
        render: () => (
          <Dialog title="Narrow Dialog" width={40}>
            <Text>Content constrained to 40 columns.</Text>
          </Dialog>
        ),
      },
      {
        name: "Border title",
        render: () => (
          <Dialog title="Session Info" titlePlacement="border">
            <Text>Model: GPT-4 · Tokens: 1,234</Text>
          </Dialog>
        ),
      },
      {
        name: "Full variant",
        render: () => (
          <Dialog title="Permissions" titlePlacement="border" subtitle="Required for this workspace">
            <Text>Allow access to this folder?</Text>
          </Dialog>
        ),
      },
    ],
  },
  {
    name: "HintBar",
    type: "component",
    variants: [
      {
        name: "Default",
        render: () => (
          <HintBar hints={{ "up-down": "to navigate", enter: "to select", esc: "to cancel" }} />
        ),
      },
      {
        name: "Custom keys",
        render: () => (
          <HintBar hints={{ tab: "next file", "shift-tab": "previous file", s: "to save", esc: "to close" }} />
        ),
      },
      {
        name: "Conditional",
        render: () => (
          <HintBar hints={{ "up-down": "to navigate", enter: "to select", s: false, esc: "to cancel" }} />
        ),
      },
      {
        name: "Custom separator",
        render: () => (
          <HintBar hints={{ a: "one", b: "two", c: "three" }} separator=" | " />
        ),
      },
    ],
  },
  {
    name: "Icons",
    type: "component",
    variants: [
      { name: "All icons", render: () => <IconGroupPreview icons={ALL_ICONS} /> },
    ],
  },
  {
    name: "Input",
    type: "component",
    variants: [
      { name: "Default", render: (f) => <InputPreview hasFocus={f} /> },
      { name: "Multiline", render: (f) => <InputMultilinePreview hasFocus={f} /> },
      { name: "Masked", render: (f) => <InputMaskedPreview hasFocus={f} /> },
      { name: "Single line", render: (f) => <InputSingleLinePreview hasFocus={f} /> },
    ],
  },
  {
    name: "Link",
    type: "component",
    variants: [
      { name: "Default", render: () => <Link url="https://github.com" /> },
      { name: "With label color", render: () => {
        const colors = useColors();
        return <Link url="https://github.com" color={colors.markdownLink}>GitHub</Link>;
      }},
      { name: "With brand color", render: () => {
        const colors = useColors();
        return <Link url="https://github.com" color={colors.brand}>GitHub</Link>;
      }},
      { name: "Bold", render: () => {
        const colors = useColors();
        return <Link url="https://github.com" color={colors.markdownLink} bold>GitHub</Link>;
      }},
    ],
  },
  {
    name: "Metric",
    type: "component",
    variants: [
      {
        name: "Default",
        render: () => (
          <Metric chars={[
            { code: "U+25A0", char: "■" },
            { code: "U+2588", char: "█" },
            { code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] },
          ]} />
        ),
      },
      {
        name: "Highlighted",
        render: () => {
          const colors = useColors();
          return (
            <Metric
              chars={[
                { code: "U+25A0", char: "■" },
                { code: "U+2588", char: "█" },
                { code: "U+28xx", char: ["⣀", "⣤", "⣶", "⣿"] },
              ]}
              activeColor={colors.selected}
            />
          );
        },
      },
    ],
  },
  {
    name: "QrCode",
    type: "component",
    variants: [
      { name: "Short URL", render: () => <QrCode value="https://github.com" /> },
      { name: "Long URL", render: () => <QrCode value="https://github.com/github/copilot-agent-runtime/tasks/abc-123" /> },
    ],
  },
  {
    name: "Screen",
    type: "component",
    variants: [
      {
        name: "Basic",
        render: () => (
          <Screen fullScreen={false}>
            <Text>10:21:03 Server starting on port 3000</Text>
            <Text>10:21:04 Connected to database</Text>
            <Text>10:21:05 Registered 14 API routes</Text>
          </Screen>
        ),
      },
      {
        name: "With header and footer",
        render: () => (
          <Screen
            fullScreen={false}
            header={<Box flexDirection="column"><Text>Screen — Screen.tsx</Text><Text>Application Log (3 entries)</Text></Box>}
            footer={<Text>↑↓ scroll · Esc back</Text>}
          >
            <Text>10:21:03 Server starting on port 3000</Text>
            <Text>10:21:04 Connected to database</Text>
            <Text>10:21:05 Registered 14 API routes</Text>
          </Screen>
        ),
      },
      {
        name: "Non-scrollable",
        render: () => (
          <Screen fullScreen={false} header="Static Screen" footer="Esc back">
            <Text>Line 1</Text>
            <Text>Line 2</Text>
            <Text>Line 3</Text>
          </Screen>
        ),
      },
    ],
  },
  {
    name: "ScrollBox",
    type: "component",
    variants: [
      {
        name: "No scroll (content fits)",
        render: () => (
          <ScrollBox height={6} keyboardScroll={false}>
            <Text>  ◎ 001 [INFO ] Server starting on port 3000</Text>
            <Text>  ✓ 002 [OK   ] Connected to database</Text>
            <Text>  ◎ 003 [INFO ] Registered 14 API routes</Text>
          </ScrollBox>
        ),
      },
      {
        name: "Scrollable list",
        render: (f) => (
          <ScrollBox height={6} keyboardScroll={f}>
            <Text>  ◎ 001 [INFO ] Server starting on port 3000</Text>
            <Text>  ◎ 002 [INFO ] Loading configuration from .env</Text>
            <Text>  ✓ 003 [OK   ] Connected to database</Text>
            <Text>  ◎ 004 [INFO ] Processing batch job #1284</Text>
            <Text>  ✓ 005 [OK   ] Batch job completed (42 items)</Text>
            <Text>  ! 006 [WARN ] Redis not configured</Text>
            <Text>  ◎ 007 [INFO ] Incoming webhook from GitHub</Text>
            <Text>  ✖ 008 [ERROR] Build failed: missing dependency</Text>
          </ScrollBox>
        ),
      },
      {
        name: "No scrollbar",
        render: () => (
          <ScrollBox height={4} showScrollbar={false} keyboardScroll={false}>
            {Array.from({ length: 6 }, (_, i) => <Text key={i}>Item {i}</Text>)}
          </ScrollBox>
        ),
      },
      {
        name: "Focusable",
        render: (f) => (
          <ScrollBox height={4} keyboardScroll={f} onFocusLine={() => {}}>
            <Text>❯ 001 [INFO ] First item</Text>
            <Text>  002 [WARN ] Second item</Text>
            <Text>  003 [OK   ] Third item</Text>
            <Text>  004 [INFO ] Fourth item</Text>
          </ScrollBox>
        ),
      },
      {
        name: "Hover + virtualized",
        render: (f) => (
          <ScrollBox height={4} keyboardScroll={f} virtualized onFocusLine={() => {}} onHoverLine={() => {}}>
            <Text>❯ 001 [INFO ] Item one</Text>
            <Text>  002 [INFO ] Item two</Text>
            <Text>  003 [WARN ] Item three</Text>
            <Text>  004 [OK   ] Item four</Text>
            <Text>  005 [INFO ] Item five</Text>
            <Text>  006 [ERROR] Item six</Text>
          </ScrollBox>
        ),
      },
    ],
  },
  {
    name: "Select",
    type: "component",
    variants: [
      {
        name: "Basic",
        render: () => (
          <Select
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta" },
              { label: "Gamma", value: "gamma" },
            ]}
            onSelect={() => {}}
            escapeItem={{ label: "Cancel", value: "cancel" }}
          />
        ),
      },
      {
        name: "With current item",
        render: () => (
          <Select
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta", current: true },
              { label: "Gamma", value: "gamma" },
            ]}
            onSelect={() => {}}
            escapeItem={{ label: "Cancel", value: "cancel" }}
          />
        ),
      },
      {
        name: "With text input",
        render: () => (
          <Select
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta" },
            ]}
            onSelect={() => {}}
            escapeItem={{ label: "Something else...", value: "other" }}
          />
        ),
      },
      {
        name: "Scrolling",
        render: () => (
          <Select
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta" },
              { label: "Gamma", value: "gamma" },
              { label: "Delta", value: "delta" },
              { label: "Epsilon", value: "epsilon" },
              { label: "Zeta", value: "zeta" },
              { label: "Eta", value: "eta" },
              { label: "Theta", value: "theta" },
              { label: "Iota", value: "iota" },
              { label: "Kappa", value: "kappa" },
            ]}
            onSelect={() => {}}
            escapeItem={{ label: "Cancel", value: "cancel" }}
          />
        ),
      },
    ],
  },
  {
    name: "SelectAutocomplete",
    type: "component",
    variants: [
      {
        name: "Basic",
        render: () => (
          <SelectAutocomplete
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta" },
              { label: "Gamma", value: "gamma" },
            ]}
            onSelect={() => {}}
            onEscape={() => {}}
            placeholder="Search options..."
          />
        ),
      },
      {
        name: "With current item",
        render: () => (
          <SelectAutocomplete
            items={[
              { label: "Alpha", value: "alpha" },
              { label: "Beta", value: "beta", current: true },
              { label: "Gamma", value: "gamma" },
            ]}
            onSelect={() => {}}
            onEscape={() => {}}
            placeholder="Search..."
          />
        ),
      },
    ],
  },
  {
    name: "TabBar",
    type: "component",
    variants: [
      {
        name: "Display only",
        render: () => (
          <TabBar
            items={[
              { value: "overview", label: "Overview" },
              { value: "details", label: "Details" },
              { value: "settings", label: "Settings" },
              { value: "about", label: "About" },
            ]}
            selectedIndex={1}
          />
        ),
      },
      {
        name: "Arrow navigation",
        render: (f) => (
          <TabBarInteractivePreview
            hasFocus={f}
            items={[
              { value: "1", label: "index.ts" },
              { value: "2", label: "utils.ts" },
              { value: "3", label: "config.ts" },
              { value: "4", label: "types.ts" },
              { value: "5", label: "test.ts" },
            ]}
            selectedIndex={0}
            navigationKeys="arrow-only"
          />
        ),
      },
      {
        name: "Tab navigation",
        render: (f) => (
          <TabBarInteractivePreview
            hasFocus={f}
            items={[
              { value: "1", label: "Overview" },
              { value: "2", label: "Details" },
              { value: "3", label: "Settings" },
            ]}
            selectedIndex={0}
            navigationKeys="tab-only"
          />
        ),
      },
      {
        name: "No loop",
        render: (f) => (
          <TabBarInteractivePreview
            hasFocus={f}
            items={[
              { value: "1", label: "First" },
              { value: "2", label: "Second" },
              { value: "3", label: "Third" },
            ]}
            selectedIndex={0}
            navigationKeys="all"
            loop={false}
          />
        ),
      },
    ],
  },
  {
    name: "Table",
    type: "component",
    variants: [
      {
        name: "Basic",
        render: () => (
          <Table
            headers={["Command", "Description"]}
            rows={[
              ["/help", "Show all commands"],
              ["/theme", "Change color theme"],
              ["/clear", "Clear conversation"],
            ]}
          />
        ),
      },
      {
        name: "Borderless key-value",
        render: () => (
          <Table
            rows={[
              ["Type", "stdio"],
              ["Status", "Connected"],
              ["Model", "GPT-4"],
            ]}
            borderStyle="none"
          />
        ),
      },
      {
        name: "Right-aligned numbers",
        render: () => (
          <Table
            headers={["Metric", "Value", "Unit"]}
            rows={[
              ["Latency", "42", "ms"],
              ["Tokens", "1234", "tok"],
              ["Cost", "0.03", "USD"],
            ]}
            align={["left", "right", "left"]}
          />
        ),
      },
      {
        name: "Width-constrained",
        render: () => (
          <Table
            headers={["Error", "Message"]}
            rows={[
              ["E001", "Missing required field 'name' in configuration"],
              ["E002", "Connection timeout after 30 seconds"],
            ]}
            width={60}
          />
        ),
      },
    ],
  },
  {
    name: "TextHeading",
    type: "component",
    variants: [
      { name: "Default", render: () => <TextHeading>Section Heading</TextHeading> },
      { name: "Error", render: () => <TextHeading type="error">Error Details</TextHeading> },
    ],
  },
  {
    name: "TextSpinner",
    type: "component",
    variants: [
      { name: "Default", render: () => <TextSpinner text="Loading" /> },
      { name: "Icon only", render: () => <TextSpinner /> },
      { name: "Label only", render: () => <TextSpinner text="Unlimited reqs." icon={false} /> },
      { name: "Placeholder", render: () => <TextSpinner text="Waiting for input" variant="placeholder" /> },
      { name: "Brand", render: () => <TextSpinner text="Thinking" variant="brand" /> },
      { name: "Info", render: () => <TextSpinner text="Compacting conversation history" variant="info" /> },
    ],
  },
  {
    name: "TextTitle",
    type: "component",
    variants: [
      { name: "Default", render: () => <TextTitle>Welcome to TUIkit</TextTitle> },
      { name: "Error", render: () => <TextTitle type="error">Something went wrong</TextTitle> },
    ],
  },
  {
    name: "TimelineItem",
    type: "component",
    variants: [
      { name: "Loading", render: () => <TimelineItem variant="loading" title="Grep" description={'"pattern" in *.ts'} /> },
      { name: "Success", render: () => <TimelineItem variant="success" title="Grep" description={'"pattern" in *.ts'} subItems={["5 files found"]} /> },
      { name: "Error", render: () => <TimelineItem variant="error" title="Bash" description="npm run build" subItems={["Exit code 1"]} /> },
      { name: "Warning", render: () => <TimelineItem variant="warning" title="Bash" description="rm -rf /" subItems={["Rejected by you."]} /> },
      { name: "Info", render: () => <TimelineItem variant="info" title="Compacted" description="Removed 42 messages" /> },
      { name: "Muted", render: () => <TimelineItem variant="muted" title="Read" description="src/index.ts" subItems={["24 lines"]} /> },
      {
        name: "With multiple sub-items",
        render: () => (
          <TimelineItem
            variant="success"
            title="Edit"
            description="src/auth.ts"
            subItems={["Added JWT validation", "Removed deprecated handler", "+12 -8 lines"]}
          />
        ),
      },
    ],
  },
];

// Computed lookup maps
const REGISTRY_MAP = new Map(PREVIEW_REGISTRY.map((e) => [e.name, e]));
const ALL_NAMES = PREVIEW_REGISTRY.map((e) => e.name);

// ─── Variant renderer component ─────────────────────────────────────

function VariantRenderer({ entry, variantFilter, hasFocus }: {
  entry: PreviewEntry;
  variantFilter?: string;
  hasFocus: boolean;
}) {
  const variants = variantFilter
    ? entry.variants.filter((v) => v.name === variantFilter)
    : entry.variants;
  return (
    <Box flexDirection="column" gap={1}>
      {variants.map((v) => (
        <Box key={v.name} flexDirection="column">
          <TextHeading>{v.name}</TextHeading>
          {v.render(hasFocus)}
        </Box>
      ))}
    </Box>
  );
}

// ─── CLI Argument Parsing ───────────────────────────────────────────

const args = process.argv.slice(2);
const listFlag = args.includes("--list");
const snapshotFlag = args.includes("--snapshot");
const componentIdx = args.indexOf("--component");
const componentArg = componentIdx >= 0 ? args[componentIdx + 1] : undefined;
const variantIdx = args.indexOf("--variant");
const variantArg = variantIdx >= 0 ? args[variantIdx + 1] : undefined;

// ─── --list mode ────────────────────────────────────────────────────

if (listFlag) {
  for (const name of ALL_NAMES) {
    console.log(name);
  }
  process.exit(0);
}

// ─── --snapshot mode ────────────────────────────────────────────────

if (snapshotFlag) {
  if (!componentArg) {
    process.stderr.write("Error: --snapshot requires --component <Name>\n");
    process.exit(1);
  }
  const entry = REGISTRY_MAP.get(componentArg);
  if (!entry) {
    process.stderr.write(`Error: unknown component "${componentArg}"\n`);
    process.exit(1);
  }
  if (variantArg) {
    const found = entry.variants.some((v) => v.name === variantArg);
    if (!found) {
      process.stderr.write(`Error: unknown variant "${variantArg}" for component "${componentArg}"\n`);
      process.exit(1);
    }
  }
  const { lastFrame, unmount } = testRender(
    React.createElement(VariantRenderer, { entry, variantFilter: variantArg, hasFocus: false })
  );
  const frame = lastFrame();
  unmount();
  process.stdout.write((frame ?? "") + "\n");
  process.exit(0);
}

// ─── --component (interactive single-component mode) ────────────────

if (componentArg && !snapshotFlag) {
  const entry = REGISTRY_MAP.get(componentArg);
  if (!entry) {
    process.stderr.write(`Error: unknown component "${componentArg}"\n`);
    process.exit(1);
  }
  if (variantArg) {
    const found = entry.variants.some((v) => v.name === variantArg);
    if (!found) {
      process.stderr.write(`Error: unknown variant "${variantArg}" for component "${componentArg}"\n`);
      process.exit(1);
    }
  }

  function SingleComponentApp() {
    const { exit } = useApp();
    const colors = useColors();
    useInput((input, key) => {
      if (key.escape || input === "q") exit();
    });
    return (
      <Screen
        header={<TextTitle>{componentArg!}</TextTitle>}
        footer={<HintBar hints={{ esc: "quit", q: "quit" }} />}
      >
        <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
          <VariantRenderer entry={entry!} variantFilter={variantArg} hasFocus={true} />
        </Box>
      </Screen>
    );
  }

  process.stdout.write("\x1b[?1049h");
  const app = inkRender(React.createElement(SingleComponentApp));
  app.waitUntilExit().then(() => {
    process.stdout.write("\x1b[?1049l");
  });
} else {
  // ─── Default: full interactive TUI ──────────────────────────────────

  // Sidebar display names: tokens use display casing, components use their name
  const TOKEN_DISPLAY = PREVIEW_REGISTRY.filter((e) => e.type === "token").map((e) => ({
    name: e.name,
    display: e.name.charAt(0).toUpperCase() + e.name.slice(1),
  }));
  const COMPONENT_DISPLAY = PREVIEW_REGISTRY.filter((e) => e.type === "component").map((e) => ({
    name: e.name,
    display: e.name,
  }));
  const SEPARATOR = "──────────────────";

  type SidebarItem = { kind: "entry"; name: string; display: string } | { kind: "separator" };
  const SIDEBAR_ITEMS: SidebarItem[] = [
    ...TOKEN_DISPLAY.map((t) => ({ kind: "entry" as const, name: t.name, display: t.display })),
    { kind: "separator" as const },
    ...COMPONENT_DISPLAY.map((c) => ({ kind: "entry" as const, name: c.name, display: c.display })),
  ];

  type FocusState = "sidebar" | "searching" | "preview";

  function App() {
    const colors = useColors();
    const { exit } = useApp();

    const [focus, setFocus] = useState<FocusState>("sidebar");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [openName, setOpenName] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = useMemo(() => {
      if (!searchQuery) return SIDEBAR_ITEMS;
      const q = searchQuery.toLowerCase();
      return SIDEBAR_ITEMS.filter(
        (item) => item.kind === "separator" || item.display.toLowerCase().includes(q)
      );
    }, [searchQuery]);

    useEffect(() => {
      setSelectedIdx((prev) => {
        const max = filteredItems.length - 1;
        if (prev > max) return Math.max(0, max);
        if (filteredItems[prev]?.kind === "separator") {
          return prev + 1 <= max ? prev + 1 : Math.max(0, prev - 1);
        }
        return prev;
      });
    }, [filteredItems]);

    const moveSelection = (dir: 1 | -1) => {
      setSelectedIdx((prev) => {
        let next = prev + dir;
        if (next < 0) next = 0;
        if (next >= filteredItems.length) next = filteredItems.length - 1;
        if (filteredItems[next]?.kind === "separator") next += dir;
        if (next < 0) next = 0;
        if (next >= filteredItems.length) next = filteredItems.length - 1;
        return next;
      });
    };

    useInput((input, key) => {
      if (input === "q" && focus !== "searching" && focus !== "preview") {
        exit();
        return;
      }

      if (focus === "searching") {
        if (key.escape) { setSearchQuery(""); setFocus("sidebar"); return; }
        if (key.return) {
          const item = filteredItems[selectedIdx];
          if (item?.kind === "entry") {
            setOpenName(item.name);
            setFocus("preview");
          }
          return;
        }
        if (key.backspace || key.delete) { setSearchQuery((q) => q.slice(0, -1)); return; }
        if (key.upArrow) { moveSelection(-1); return; }
        if (key.downArrow) { moveSelection(1); return; }
        if (input && !key.ctrl && !key.meta) { setSearchQuery((q) => q + input); }
        return;
      }

      if (focus === "preview") {
        if (key.escape) { setOpenName(null); setFocus("sidebar"); }
        return;
      }

      // Sidebar
      if (key.escape) return;
      if (input === "/" || (input && !key.ctrl && !key.meta && input !== "j" && input !== "k" && input !== "q")) {
        setFocus("searching");
        if (input !== "/") setSearchQuery((q) => q + input);
        return;
      }
      if (key.upArrow || input === "k") { moveSelection(-1); return; }
      if (key.downArrow || input === "j") { moveSelection(1); return; }
      if (key.return) {
        const item = filteredItems[selectedIdx];
        if (item?.kind === "entry") {
          setOpenName(item.name);
          setFocus("preview");
        }
        return;
      }
    });

    const sidebarWidth = 24;
    let hints: Record<string, string | false>;
    if (focus === "searching") {
      hints = { "up-down": "navigate", enter: "open", esc: "clear", q: false };
    } else if (focus === "preview") {
      hints = { esc: "back", q: "quit" };
    } else {
      hints = { "up-down": "navigate", enter: "open", "/": "search", q: "quit" };
    }

    const openEntry = openName ? REGISTRY_MAP.get(openName) : undefined;

    return (
      <Screen
        header={<Box><TextTitle>TUIKit Preview</TextTitle></Box>}
        footer={<HintBar hints={hints} />}
      >
        <Box flexGrow={1}>
          <Box
            flexDirection="column"
            width={sidebarWidth}
            borderStyle="single"
            borderRight
            borderLeft={false}
            borderTop={false}
            borderBottom={false}
            borderColor={colors.borderNeutral}
          >
            <Box marginBottom={1}>
              <Text>{focus === "searching" ? "▸ " : "  "}</Text>
              <Input
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search..."
                focus={focus === "searching"}
                showCursor={focus === "searching"}
              />
            </Box>
            {filteredItems.map((item, i) => {
              if (item.kind === "separator") {
                return <Text key="sep" color={colors.textSecondary}>{SEPARATOR}</Text>;
              }
              const isHighlighted = i === selectedIdx && focus !== "preview";
              const isOpen = item.name === openName;
              return (
                <Text key={item.name}>
                  <Text color={isHighlighted ? colors.selected : colors.textSecondary}>
                    {isHighlighted ? "▸ " : "  "}{item.display}
                  </Text>
                  {isOpen ? <Text color={colors.textSecondary}> ◂</Text> : null}
                </Text>
              );
            })}
          </Box>

          <Box flexDirection="column" flexGrow={1} paddingLeft={2}>
            {openEntry ? (
              <>
                <Box marginBottom={1}>
                  <TextTitle>{openName!}</TextTitle>
                </Box>
                <VariantRenderer entry={openEntry} hasFocus={focus === "preview"} />
              </>
            ) : (
              <Box flexGrow={1} justifyContent="center" alignItems="center">
                <Text color={colors.textSecondary}>Select a component to preview</Text>
              </Box>
            )}
          </Box>
        </Box>
      </Screen>
    );
  }

  process.stdout.write("\x1b[?1049h");
  const app = inkRender(React.createElement(App));
  app.waitUntilExit().then(() => {
    process.stdout.write("\x1b[?1049l");
  });
}
