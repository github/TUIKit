#!/usr/bin/env bun
/**
 * TUIkit spec compiler
 *
 * Detects changed specs via content hashing and generates self-contained
 * compilation prompts for LLM agents. The `build` command uses the Copilot SDK
 * to launch an agent session that compiles specs into code automatically.
 *
 * Usage:
 *   bun run compile status  [--target <name>]
 *   bun run compile prompt  --target <name> [--component <name>]
 *   bun run compile build   --target <name> [--component <name>] [--model <id>] [--effort <level>] [--verbose] [--no-lock] [--autopilot]
 *   bun run compile lock    --target <name> [--component <name>] | --all-targets
 *   bun run compile clean   --target <name> | --all-targets
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import chalk from "chalk";
import * as clack from "@clack/prompts";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import boxen from "boxen";

marked.use(markedTerminal());

// biome-ignore lint/suspicious/noConsole: CLI tool — stdout is the interface
const log = (...args: unknown[]) => console.log(...args);

// ── Paths ──────────────────────────────────────────────────────────────────

const SPECS_DIR = join(dirname(new URL(import.meta.url).pathname), "..");
const TOKENS_DIR = join(SPECS_DIR, "tokens");
const COMPONENTS_DIR = join(SPECS_DIR, "components");
const TARGETS_DIR = join(SPECS_DIR, "targets");
const SCHEMA_PATH = join(SPECS_DIR, "docs", "schema.md");
const DEMO_PATH = join(SPECS_DIR, "components", "previews.md");
const DEFAULT_DIST_DIR = join(SPECS_DIR, "dist");

// ── Types ──────────────────────────────────────────────────────────────────

interface SpecEntry {
    name: string;
    kind: "token" | "component";
    specPath: string;
    testPath?: string;
    previewPath?: string;
    specHash: string;
    testHash?: string;
    version: string;
}

interface LockEntry {
    version: string;
    specHash: string;
    testHash?: string;
    lockedAt: string;
}

interface LockFile {
    target: string;
    schemaHash: string;
    updatedAt: string;
    entries: Record<string, LockEntry>;
}

type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

interface BuildConfig {
    model: string;
    effort: ReasoningEffort | undefined;
    distDir: string;
    supportsEffort: boolean;
}

interface CompileMetrics {
    startTime: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    toolCalls: number;
    filesWritten: Set<string>;
    filesDeleted: Set<string>;
    lastAssistantMessage: string;
    errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sha256(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function readFile(path: string): string {
    return readFileSync(path, "utf-8");
}

function extractFrontmatter(content: string): Record<string, string> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fm: Record<string, string> = {};
    const lines = match[1].split("\n");
    let currentKey: string | null = null;
    let currentValue = "";

    for (const line of lines) {
        // Indented line → either nested key (skip) or continuation of a folded scalar
        if (line.match(/^\s+/) && line.trim().length > 0) {
            if (currentKey && currentValue === ">") {
                // Folded scalar continuation — take the first indented line as the value
                fm[currentKey] = line.trim();
                currentKey = null;
                currentValue = "";
            }
            // Skip nested/indented keys (props, tokens, etc.)
            continue;
        }
        // Top-level key
        const sep = line.indexOf(":");
        if (sep > 0) {
            // Save previous folded scalar if not yet resolved
            if (currentKey && currentValue !== ">") {
                fm[currentKey] = currentValue;
            }
            currentKey = line.slice(0, sep).trim();
            currentValue = line.slice(sep + 1).trim();
            if (currentValue !== ">") {
                fm[currentKey] = currentValue;
                currentKey = null;
            }
        }
    }
    // Handle trailing folded scalar that was never resolved
    if (currentKey && currentValue === ">") {
        fm[currentKey] = "";
    }
    return fm;
}

function lockPath(target: string): string {
    return join(TARGETS_DIR, `${target}.lock.json`);
}

function readLock(target: string): LockFile | null {
    const p = lockPath(target);
    if (!existsSync(p)) return null;
    return JSON.parse(readFile(p));
}

function writeLock(lock: LockFile): void {
    writeFileSync(lockPath(lock.target), JSON.stringify(lock, null, 2) + "\n");
}

// ── Discovery ──────────────────────────────────────────────────────────────

function discoverTargets(): string[] {
    if (!existsSync(TARGETS_DIR)) return [];
    return readdirSync(TARGETS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));
}

function discoverSpecs(): SpecEntry[] {
    const specs: SpecEntry[] = [];

    // Token specs
    if (existsSync(TOKENS_DIR)) {
        for (const file of readdirSync(TOKENS_DIR).filter((f) => f.endsWith(".md") && !f.includes(".preview."))) {
            const specPath = join(TOKENS_DIR, file);
            const content = readFile(specPath);
            const fm = extractFrontmatter(content);
            const previewPath = join(TOKENS_DIR, file.replace(".md", ".preview.md"));
            specs.push({
                name: `tokens/${file.replace(".md", "")}`,
                kind: "token",
                specPath,
                previewPath: existsSync(previewPath) ? previewPath : undefined,
                specHash: sha256(content),
                version: fm.version || "0",
            });
        }
    }

    // Component specs
    if (existsSync(COMPONENTS_DIR)) {
        for (const dir of readdirSync(COMPONENTS_DIR)) {
            const dirPath = join(COMPONENTS_DIR, dir);
            if (!statSync(dirPath).isDirectory()) continue;

            const specPath = join(dirPath, `${dir}.md`);
            if (!existsSync(specPath)) continue;

            const content = readFile(specPath);
            const fm = extractFrontmatter(content);
            const testPath = join(dirPath, `${dir}.test.md`);
            const hasTest = existsSync(testPath);
            const previewPath = join(dirPath, `${dir}.preview.md`);
            const hasPreview = existsSync(previewPath);

            specs.push({
                name: `components/${dir}`,
                kind: "component",
                specPath,
                testPath: hasTest ? testPath : undefined,
                previewPath: hasPreview ? previewPath : undefined,
                specHash: sha256(content),
                testHash: hasTest ? sha256(readFile(testPath)) : undefined,
                version: fm.version || "0",
            });
        }
    }

    return specs;
}

// ── Diff ───────────────────────────────────────────────────────────────────

interface DiffResult {
    spec: SpecEntry;
    reason: "new" | "spec-changed" | "test-changed" | "schema-changed";
}

function computeDirty(specs: SpecEntry[], lock: LockFile | null, schemaHash: string): DiffResult[] {
    const dirty: DiffResult[] = [];

    for (const spec of specs) {
        const entry = lock?.entries[spec.name];

        if (!entry) {
            dirty.push({ spec, reason: "new" });
        } else if (lock && lock.schemaHash !== schemaHash) {
            dirty.push({ spec, reason: "schema-changed" });
        } else if (entry.specHash !== spec.specHash) {
            dirty.push({ spec, reason: "spec-changed" });
        } else if (spec.testHash && entry.testHash !== spec.testHash) {
            dirty.push({ spec, reason: "test-changed" });
        }
    }

    return dirty;
}

// ── Prompt generation ──────────────────────────────────────────────────────

function generatePrompt(target: string, specs: SpecEntry[], allSpecs: SpecEntry[], distDir: string): string {
    const targetSpec = readFile(join(TARGETS_DIR, `${target}.md`));

    const tokenSpecs = allSpecs.filter((s) => s.kind === "token");
    const componentSpecs = specs.filter((s) => s.kind === "component");

    const sections: string[] = [];

    sections.push(`# TUIkit compilation prompt — target: ${target}`);
    sections.push("");
    sections.push("You are a TUIkit spec compiler. Generate idiomatic code for the target");
    sections.push("framework based on the specs referenced below.");
    sections.push("");
    sections.push("This prompt is an **index** — it lists every spec with a summary and file");
    sections.push("paths. Read the full spec files from disk before implementing each component.");
    sections.push("");
    sections.push("## Key reference files");
    sections.push("");
    sections.push("Read these files **first** to understand the spec format, design principles, and target framework:");
    sections.push("");
    sections.push(`- **Meta-schema** (spec format, frontmatter rules, compilation workflow): \`docs/schema.md\``);
    sections.push(`- **Foundations** (color, typography, icons, layout, accessibility, keybinds): \`docs/foundations.md\``);
    sections.push("");

    sections.push("---");
    sections.push("## Target definition");
    sections.push("");
    sections.push(targetSpec);
    sections.push("");

    sections.push("---");
    sections.push("## Token specs");
    sections.push("");
    sections.push("Tokens define color, icon, and breakpoint values used across all components.");
    sections.push("**Read the full file content from disk** before implementing each one.");
    sections.push("");
    sections.push("Each token MUST be implemented as a **token provider** — a runtime function,");
    sections.push("hook, method, or trait that resolves token values from the current");
    sections.push("environment (terminal width, color mode, theme) at runtime. Components");
    sections.push("MUST consume tokens through these providers, never as hardcoded values.");
    sections.push("Token providers are the runtime layer between static token definitions");
    sections.push("and live component rendering.");
    sections.push("");
    sections.push("The provider pattern is idiomatic to each target. For example:");
    sections.push("- **React/Ink**: `useColors()`, `useBreakpoint()` hooks that re-render on change.");
    sections.push("- **Go/Bubbletea**: Methods on the model or a context struct updated via messages.");
    sections.push("- **Rust/Ratatui**: Methods on a state struct or trait implementations.");
    sections.push("");
    sections.push("Providers MUST recompute when their input context changes (e.g., terminal");
    sections.push("resize triggers breakpoint recalculation, theme change triggers color update).");
    sections.push("");
    for (const token of tokenSpecs) {
        const content = readFile(token.specPath);
        const fm = extractFrontmatter(content);
        const name = token.name.replace("tokens/", "");
        const description = fm.description || "No description";

        sections.push(`### ${name}`);
        sections.push("");
        sections.push(`- **Description**: ${description}`);
        sections.push(`- **Spec**: \`${relative(SPECS_DIR, token.specPath)}\``);
        if (token.previewPath) {
            sections.push(`- **Preview**: \`${relative(SPECS_DIR, token.previewPath)}\``);
        }
        sections.push("");
    }

    // Components as index — summary + file paths
    if (componentSpecs.length > 0) {
        sections.push("---");
        sections.push("## Components to compile");
        sections.push("");
        sections.push("Each component lists its description, category, and file paths.");
        sections.push("**Read the full file content from disk** before implementing each one.");
        sections.push("");

        for (const comp of componentSpecs) {
            const content = readFile(comp.specPath);
            const fm = extractFrontmatter(content);
            const name = comp.name.replace("components/", "");
            const description = fm.description || "No description";
            const category = fm.category || "unknown";

            sections.push(`### ${name}`);
            sections.push("");
            sections.push(`- **Description**: ${description}`);
            sections.push(`- **Category**: ${category}`);
            sections.push(`- **Spec**: \`${relative(SPECS_DIR, comp.specPath)}\``);
            if (comp.testPath) {
                sections.push(`- **Tests**: \`${relative(SPECS_DIR, comp.testPath)}\``);
            }
            if (comp.previewPath) {
                sections.push(`- **Preview**: \`${relative(SPECS_DIR, comp.previewPath)}\``);
            }
            sections.push("");
        }
    }

    sections.push("---");
    sections.push("## Instructions");
    sections.push("");
    sections.push("IMPORTANT: Do NOT spawn sub-agents or delegate to the task tool. Do ALL work yourself directly.");
    sections.push("");
    sections.push("### Philosophy: depth over breadth");
    sections.push("");
    sections.push("It is MUCH better to have a few components that work perfectly — with full");
    sections.push("interactivity, passing tests, and a working interactive demo — than many");
    sections.push("components that are half-baked. Each component you implement must be");
    sections.push("**complete and polished** before moving to the next one.");
    sections.push("");
    sections.push("### Workflow");
    sections.push("");
    sections.push("1. Read the target definition to understand the framework and paradigm.");
    sections.push("2. Implement all **tokens first** — read each token spec from disk, implement it.");
    sections.push("3. Then implement components **one at a time, fully**, in this order:");
    sections.push("   a. Read the full spec file from disk.");
    sections.push("   b. Implement the component with all variants and interactions.");
    sections.push("   c. Read the test spec and implement runnable tests. Run them — they must pass.");
    sections.push("   d. Wire the component into the interactive demo (see below).");
    sections.push("   e. Verify the component works in the demo with `--component <Name> --snapshot`.");
    sections.push("   f. Only then move to the next component.");
    sections.push(`4. Output all files to: \`${relative(SPECS_DIR, distDir)}/\``);
    sections.push(`   This is the dist directory — keep all generated code here, separate from specs.`);
    sections.push("");

    if (existsSync(DEMO_PATH)) {
        sections.push("---");
        sections.push("## Demo specification — INTERACTIVE PLAYGROUND (required)");
        sections.push("");
        sections.push("The demo is NOT a static listing. It is a **fully interactive playground**");
        sections.push("where you can navigate between components and interact with live instances.");
        sections.push(`Read the full spec: \`${relative(SPECS_DIR, DEMO_PATH)}\``);
        sections.push("");
        sections.push("Key requirements:");
        sections.push("- `--interactive` MUST launch a full-screen TUI with sidebar + preview panel.");
        sections.push("- Every previewed component MUST be a live, interactive instance (e.g., you can");
        sections.push("  type in an Input, navigate a Select, scroll a ScrollBox).");
        sections.push("- Implement the interactive mode **from the first component** — do not leave it");
        sections.push("  as a stub. It's better to have 3 components in a working playground than");
        sections.push("  10 components with `--interactive` not implemented.");
        sections.push("- `--list` and `--snapshot` modes are secondary — they must work, but the");
        sections.push("  interactive playground is the primary output.");
        sections.push("");
    }

    sections.push("---");
    sections.push("## Verification (REQUIRED)");
    sections.push("");
    sections.push("After implementing each component (not just at the end), verify:");
    sections.push("");
    sections.push("1. **Unit tests pass**: Run the target's test command for that component.");
    sections.push("2. **Demo snapshot works**: `--component <Name> --snapshot` exits 0 with output.");
    sections.push("3. **Interactive demo works**: `--interactive` launches and the component is navigable.");
    sections.push("");
    sections.push("After ALL components are done:");
    sections.push("");
    sections.push("4. **Full test suite**: Run all tests, ensure everything passes.");
    sections.push("5. **Demo smoke tests**: Run the demo test file, all snapshots pass.");
    sections.push("6. **Report**: State the final unit test count, demo smoke test count, and pass/fail status.");
    sections.push("");

    return sections.join("\n");
}

// ── Build helpers ──────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
}

/** Count LOC across files the agent actually wrote (ignores node_modules etc.) */
function countAgentOutput(filesWritten: Set<string>): { files: number; lines: number } {
    let lines = 0;
    let files = 0;
    for (const fp of filesWritten) {
        if (!existsSync(fp)) continue;
        files++;
        lines += readFileSync(fp, "utf-8").split("\n").length;
    }
    return { files, lines };
}

function summarizeArgs(args: unknown): string {
    if (!args || typeof args !== "object") return "";
    const obj = args as Record<string, unknown>;
    const path = obj.path ?? obj.file_path ?? obj.command;
    if (typeof path === "string") {
        const short = path.length > 60 ? `…${path.slice(-57)}` : path;
        return short;
    }
    return "";
}

function detectPhase(toolName: string, args: unknown): string {
    const obj = (args ?? {}) as Record<string, unknown>;
    const path = String(obj.path ?? obj.file_path ?? obj.filePath ?? obj.file ?? "");
    const cmd = String(obj.command ?? "");
    const tn = toolName.toLowerCase();

    if (tn.includes("read") || tn === "view") {
        if (path.includes("tokens/") || path.includes("components/") || path.includes("docs/")) {
            return "Reading specs";
        }
        return "Reading files";
    }
    if (tn.includes("edit") || tn.includes("create") || tn.includes("write")) {
        const match = path.match(/components\/(\w+)/);
        if (match) return `Implementing ${match[1]}`;
        if (path.includes("tokens/")) return "Implementing tokens";
        if (path.includes("demo")) return "Building demo";
        return "Writing files";
    }
    if (tn === "bash" || tn === "shell" || tn.includes("terminal") || tn.includes("command")) {
        if (cmd.includes("test")) return "Running tests";
        if (cmd.includes("build") || cmd.includes("compile")) return "Building";
        if (cmd.includes("run")) return "Running";
        return "Executing command";
    }
    if (tn === "glob" || tn === "grep" || tn.includes("search") || tn.includes("find")) return "Searching files";
    if (tn.includes("delete")) return "Cleaning up";
    return "Working";
}

// ── Build command ──────────────────────────────────────────────────────────

async function confirmPass(): Promise<boolean> {
    const result = await clack.confirm({
        message: "Do another pass? (improves consistency)",
        initialValue: true,
    });
    if (clack.isCancel(result)) return false;
    return result;
}

async function ensureCopilotAuth(): Promise<import("@github/copilot-sdk").CopilotClient> {
    const { CopilotClient } = await import("@github/copilot-sdk");
    const client = new CopilotClient({ useLoggedInUser: true });

    try {
        await client.start();
        await client.ping();
    } catch (err) {
        log(chalk.red("✗") + " Copilot authentication failed.\n");
        log("  The build command requires a valid GitHub Copilot subscription.");
        log("  Try one of:\n");
        log(`    ${chalk.cyan("copilot auth login")}          Sign in via browser`);
        log(`    ${chalk.cyan("export GITHUB_TOKEN=ghp_...")} Use a personal access token`);
        log(`    ${chalk.cyan("export GH_TOKEN=ghp_...")}     GitHub CLI token\n`);
        if (err instanceof Error) log(chalk.dim(`  Error: ${err.message}`));
        process.exit(1);
    }

    return client;
}

async function pickModel(
    client: import("@github/copilot-sdk").CopilotClient,
    preselected?: string,
): Promise<{ id: string; name: string }> {
    const models = await client.listModels();
    if (models.length === 0) {
        log(chalk.red("✗") + " No models available. Check your Copilot subscription.");
        process.exit(1);
    }

    const defaultModel =
        (preselected ? models.find((m) => m.id === preselected) : undefined) ??
        models.find((m) => m.id === "claude-sonnet-4") ??
        models[0];

    if (!process.stdin.isTTY) {
        return { id: defaultModel.id, name: defaultModel.name };
    }

    const result = await clack.select({
        message: "Select model:",
        options: models.map((m) => ({ value: m.id, label: `${m.name} (${m.id})` })),
        initialValue: defaultModel.id,
    });

    if (clack.isCancel(result)) {
        clack.cancel("Build cancelled.");
        process.exit(0);
    }

    const model = models.find((m) => m.id === result) ?? defaultModel;
    return { id: model.id, name: model.name };
}

async function pickEffort(preselected?: string): Promise<ReasoningEffort> {
    const defaultEffort = (preselected && ["low", "medium", "high", "xhigh"].includes(preselected))
        ? preselected
        : "high";

    if (!process.stdin.isTTY) return defaultEffort as ReasoningEffort;

    const result = await clack.select({
        message: "Reasoning effort:",
        options: [
            { value: "low", label: "low" },
            { value: "medium", label: "medium" },
            { value: "high", label: "high" },
            { value: "xhigh", label: "xhigh" },
        ],
        initialValue: defaultEffort,
    });

    if (clack.isCancel(result)) {
        clack.cancel("Build cancelled.");
        process.exit(0);
    }

    return result as ReasoningEffort;
}

async function pickOutputDir(target: string, preselected?: string): Promise<string> {
    const defaultDir = preselected
        ? join(process.cwd(), preselected)
        : join(DEFAULT_DIST_DIR, target);
    const displayDefault = relative(SPECS_DIR, defaultDir) || ".";

    if (!process.stdin.isTTY) return defaultDir;

    const result = await clack.text({
        message: "Output directory:",
        initialValue: displayDefault,
    });

    if (clack.isCancel(result)) {
        clack.cancel("Build cancelled.");
        process.exit(0);
    }

    if (!result || result === displayDefault) return defaultDir;
    return join(SPECS_DIR, result);
}

async function promptBuildConfig(
    client: import("@github/copilot-sdk").CopilotClient,
    flags: { model?: string; effort?: string; out?: string },
    target: string,
): Promise<BuildConfig> {
    clack.intro(chalk.cyan("TUIkit compiler"));

    // Fetch available models to validate and check capabilities
    const models = await client.listModels();

    // Always prompt for model (flag value becomes the pre-selected default)
    const model = await pickModel(client, flags.model);

    // Check if model supports reasoning effort
    const modelInfo = models.find((m) => m.id === model.id);
    const supportsEffort = !!(modelInfo?.supportedReasoningEfforts && modelInfo.supportedReasoningEfforts.length > 0);

    // Always prompt for effort if model supports it (flag becomes default)
    let effort: ReasoningEffort | undefined;
    if (supportsEffort) {
        effort = await pickEffort(flags.effort);
    }

    // Always prompt for output location (flag or dist/ as default)
    const distDir = await pickOutputDir(target, flags.out);

    return { model: model.id, effort, distDir, supportsEffort };
}

function printBuildHeader(target: string, config: BuildConfig, mode: string): void {
    const effortStr = config.effort ? ` · Effort: ${config.effort}` : "";
    log(`\n${chalk.cyan("●")} ${chalk.bold("TUIkit compiler")}`);
    log(`  Target: ${chalk.bold(target)} · Model: ${chalk.bold(config.model)}${effortStr}`);
    log(`  Output: ${relative(SPECS_DIR, config.distDir)}/ · Mode: ${mode}\n`);
}

function printSummary(
    target: string,
    config: BuildConfig,
    metrics: CompileMetrics,
    outDir: string,
    noLock: boolean,
    passNumber = 1,
): void {
    const elapsed = Date.now() - metrics.startTime;
    const { files, lines } = countAgentOutput(metrics.filesWritten);
    const deleted = metrics.filesDeleted.size;
    const totalTokens = metrics.inputTokens + metrics.outputTokens;

    const tokenDetail =
        `(${metrics.inputTokens.toLocaleString()} in / ${metrics.outputTokens.toLocaleString()} out` +
        `${metrics.reasoningTokens ? ` / ${metrics.reasoningTokens.toLocaleString()} reasoning` : ""})`;

    const passLabel = passNumber > 1 ? ` (pass ${passNumber})` : "";
    const filesLine = deleted > 0 ? `${files} written, ${deleted} deleted` : `${files} written`;
    const body = [
        `${chalk.green("✓")} Compilation complete — target: ${target}${passLabel}`,
        ``,
        `  Model:    ${config.model}${config.effort ? ` (${config.effort} effort)` : ""}`,
        `  Time:     ${formatDuration(elapsed)}`,
        `  Files:    ${filesLine}`,
        `  LOC:      ~${lines.toLocaleString()} lines`,
        `  Tokens:   ~${totalTokens.toLocaleString()} total ${tokenDetail}`,
        `  Tools:    ${metrics.toolCalls} calls`,
        `  Passes:   ${passNumber}`,
        ``,
        `  Output:   ${relative(SPECS_DIR, outDir)}/`,
        noLock ? `  Lock:     skipped (--no-lock)` : `  Lock:     ${relative(SPECS_DIR, lockPath(target))} updated`,
    ].join("\n");

    log("");
    log(body);
    log("");
}

async function cmdBuild(
    target: string,
    componentFilter?: string,
    _distDir: string = DEFAULT_DIST_DIR,
    flagModel?: string,
    flagEffort?: string,
    verbose = false,
    noLock = false,
    autopilot = false,
): Promise<void> {
    const { approveAll } = await import("@github/copilot-sdk");

    // 1. Quick check — any dirty specs at all?
    const specs = discoverSpecs();
    const schemaHash = sha256(readFile(SCHEMA_PATH));
    const lock = readLock(target);
    let dirty = computeDirty(specs, lock, schemaHash);

    if (componentFilter) {
        dirty = dirty.filter(
            (d) => d.spec.name === `components/${componentFilter}` || d.spec.name === `tokens/${componentFilter}`,
        );
    }

    if (dirty.length === 0) {
        log(`${chalk.green("✓")} No dirty specs for target "${target}". Nothing to compile.`);
        log(`  ${chalk.dim(`Lock: ${relative(SPECS_DIR, lockPath(target))}`)}`);
        return;
    }

    // 2. Auth first (fail fast before interactive prompts)
    log(chalk.dim("  Authenticating with Copilot..."));
    const client = await ensureCopilotAuth();

    // 3. Interactive config — always prompts with good defaults
    //    Flags pre-select the default; user can still change it.
    const config = await promptBuildConfig(
        client,
        {
            model: flagModel,
            effort: flagEffort,
            out: _distDir !== DEFAULT_DIST_DIR ? relative(process.cwd(), _distDir) : undefined,
        },
        target,
    );

    // 4. Generate prompt (uses config.distDir chosen by the user)
    const distDir = config.distDir;
    const dirtySpecs = dirty.map((d) => d.spec);
    const prompt = generatePrompt(target, dirtySpecs, specs, distDir);
    const outDir = distDir;
    mkdirSync(outDir, { recursive: true });
    const promptPath = join(outDir, "_compile-prompt.md");
    writeFileSync(promptPath, prompt);

    // 5. Print header
    printBuildHeader(target, config, sessionMode);
    log(`  ${chalk.dim(`${dirty.length} dirty specs to compile`)}\n`);

    // 6. Metrics
    const metrics: CompileMetrics = {
        startTime: Date.now(),
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        toolCalls: 0,
        filesWritten: new Set(),
        filesDeleted: new Set(),
        lastAssistantMessage: "",
        errors: [],
    };

    // 7. Create session
    const sessionMode = autopilot ? "autopilot" : "interactive";
    const sessionConfig: Record<string, unknown> = {
        model: config.model,
        onPermissionRequest: approveAll,
        streaming: true,
        systemMessage: {
            content: `
<compilation_context>
You are a TUIkit spec compiler. Your job is to read component specifications
and generate idiomatic code for the target framework.

Working directory: ${SPECS_DIR}
Output directory: ${relative(SPECS_DIR, outDir)}

PHILOSOPHY: Depth over breadth.
It is far better to deliver a few components that are fully complete —
with passing tests and working interactive demo — than many components
that are half-implemented. Completeness means: the component renders
correctly, responds to user input, is wired into the interactive
playground, and all tests pass.

RULES:
- Do NOT spawn sub-agents or delegate to the task tool. Do ALL work yourself directly.
- Do NOT ask the user questions. Proceed with your best judgment.
- Read ALL referenced spec files from disk before implementing.
- Output all generated code to the specified output directory.
- Implement one component at a time, fully, before starting the next.
- The interactive demo (--interactive) is the PRIMARY deliverable, not an afterthought.
- Run tests after EACH component and fix any failures before moving on.

${noLock ? "" : `LOCKING COMPLETED COMPONENTS:
After you fully complete a component (implementation + tests passing + demo wired),
lock it by running:
  bun run compile lock --target ${target} --component <Name>
This records the component as compiled so it won't be recompiled in future runs.
Only lock a component when you are confident it is DONE — tests pass, demo works.
Lock tokens the same way: bun run compile lock --target ${target} --component <token-name>
`}

DEPENDENCIES & KNOWLEDGE CUTOFF:
Your training data may be outdated. Before assuming a library doesn't exist or
falling back to self-contained polyfills, you MUST use web browsing / fetch to
check the library's actual npm registry page, GitHub repo, or documentation.
Install the real package if it exists. Only polyfill if you've confirmed the
package genuinely isn't published. This applies to ALL dependencies referenced
in the target spec (e.g., @opentui/*, ink, bubbletea crates, etc.).

MULTI-PASS APPROACH:
This session may receive multiple passes. At the END of each pass, you MUST
include a clear summary of what was accomplished and what remains. Structure
your final message like this:

## Pass summary
- What was completed (components, tests, demo wiring)
- Current test results (X passing, Y failing)
- Interactive demo status

## Next pass priorities
- List specific components or work items that should be tackled next
- Note any known issues or failing tests to fix
- If everything is complete, say so explicitly
</compilation_context>
`,
        },
    };
    if (config.effort && config.supportsEffort) {
        sessionConfig.reasoningEffort = config.effort;
    }

    let session: Awaited<ReturnType<typeof client.createSession>>;
    try {
        // biome-ignore lint/suspicious/noExplicitAny: SDK config types are complex
        session = await client.createSession(sessionConfig as any);
    } catch (err) {
        log(chalk.red("✗") + " Failed to create agent session.");
        if (err instanceof Error) log(chalk.dim(`  Error: ${err.message}`));
        log("\n  This could mean:");
        log("    • The model is unavailable or unsupported");
        log("    • Your Copilot subscription doesn't include this model");
        log("    • A transient service error — try again\n");
        await client.stop();
        process.exit(1);
    }

    // 8. Set SDK agent mode
    await session.rpc.mode.set({ mode: sessionMode });
    if (verbose) {
        log(chalk.dim(`  Agent mode: ${sessionMode}`));
    }

    // 9. SIGINT handler
    let aborted = false;
    const sigintHandler = async () => {
        if (aborted) return;
        aborted = true;
        log(chalk.yellow("\n\n⚠ Compilation interrupted"));
        try {
            await session.abort();
            await session.disconnect();
            await client.stop();
        } catch {
            /* best-effort cleanup */
        }
        process.exit(130);
    };
    process.on("SIGINT", sigintHandler);

    // 10. Event handlers
    let currentPhase = "Starting";

    if (verbose) {
        // ── Verbose mode: raw transcript ──
        session.on("assistant.message_delta", (event) => {
            process.stdout.write(event.data.deltaContent);
        });

        session.on("assistant.reasoning_delta", (event) => {
            process.stdout.write(chalk.dim(event.data.deltaContent));
        });

        session.on("tool.execution_start", (event) => {
            const { toolName } = event.data;
            const argStr = summarizeArgs(event.data.arguments);
            log(chalk.dim(`\n  ${toolName}${argStr ? ` ${argStr}` : ""}`));
        });

        session.on("tool.execution_complete", (event) => {
            const icon = event.data.success ? chalk.green("✓") : chalk.red("✗");
            const toolId = event.data.toolCallId.slice(0, 8);
            log(chalk.dim(`  ${icon} ${toolId}`));
        });
    } else {
        // ── Normal mode: compact status ──
        session.on("assistant.message_delta", () => {
            // Suppress in normal mode — we show phase-level status instead
        });

        session.on("tool.execution_start", (event) => {
            const { toolName } = event.data;
            const argStr = summarizeArgs(event.data.arguments);
            const phase = detectPhase(toolName, event.data.arguments);

            if (phase !== currentPhase) {
                // Complete previous phase
                if (currentPhase !== "Starting") {
                    log(`  ${chalk.green("✓")} ${currentPhase}`);
                }
                currentPhase = phase;
            }

            // Show current tool activity
            log(chalk.dim(`    ${toolName}${argStr ? ` ${argStr}` : ""}`));
        });
    }

    // Common event handlers for both modes
    session.on("assistant.message", (event) => {
        metrics.lastAssistantMessage = event.data.content;
    });

    session.on("assistant.usage", (event) => {
        metrics.inputTokens += event.data.inputTokens ?? 0;
        metrics.outputTokens += event.data.outputTokens ?? 0;
        metrics.reasoningTokens += event.data.reasoningTokens ?? 0;
    });

    session.on("tool.execution_start", (event) => {
        metrics.toolCalls++;
        const { toolName } = event.data;
        const args = event.data.arguments as Record<string, unknown> | undefined;
        if (args) {
            const filePath = (args.path ?? args.file_path ?? args.filePath ?? args.file) as string | undefined;
            const isWrite =
                toolName === "edit_file" ||
                toolName === "create_file" ||
                toolName === "write_file" ||
                toolName === "create" ||
                toolName === "edit" ||
                toolName === "write" ||
                toolName === "write_to_file" ||
                toolName === "str_replace_editor" ||
                toolName === "insert_edit_into_file" ||
                toolName.includes("edit") ||
                toolName.includes("create") ||
                toolName.includes("write");
            const isDelete = toolName === "delete_file" || toolName === "delete" || toolName.includes("delete");

            if (isDelete && filePath) {
                metrics.filesDeleted.add(filePath);
                metrics.filesWritten.delete(filePath);
            } else if (isWrite && filePath) {
                metrics.filesWritten.add(filePath);
            }
        }
    });

    session.on("session.error", (event) => {
        const msg = (event.data as { message?: string }).message ?? "Unknown error";
        metrics.errors.push(msg);
        if (verbose) {
            log(chalk.red(`\n✗ Session error: ${msg}`));
        } else {
            log(`  ${chalk.red("✗")} ${msg}`);
        }
    });

    // 10. Send prompt and wait for idle — with multi-pass loop
    let passNumber = 1;

    const waitForIdle = (): Promise<void> =>
        new Promise<void>((resolve) => {
            const unsub = session.on("session.idle", () => {
                unsub();
                resolve();
            });
        });

    await session.send({ prompt });
    await waitForIdle();

    // Complete final phase in normal mode
    if (!verbose && currentPhase !== "Starting") {
        log(`  ${chalk.green("✓")} ${currentPhase}`);
    }

    // Show the agent's last message as a pass recap
    if (metrics.lastAssistantMessage) {
        const rendered = marked(metrics.lastAssistantMessage.trim()) as string;
        log(`\n${boxen(rendered.trimEnd(), { padding: 1, dimBorder: true, title: "Agent summary", titleAlignment: "left" })}`);
    }

    // Show summary for this pass
    printSummary(target, config, metrics, outDir, noLock, passNumber);

    if (metrics.errors.length > 0) {
        log(chalk.yellow("⚠ Completed with errors:"));
        for (const err of metrics.errors) {
            log(`  ${chalk.red("•")} ${err}`);
        }
        log("");
    }

    // 11. Multi-pass loop
    const maxPasses = dirty.length + 5;
    while (!aborted) {
        if (autopilot) {
            if (passNumber >= maxPasses) {
                log(chalk.dim(`  Autopilot: reached max passes (${maxPasses}), stopping.\n`));
                break;
            }
        } else if (process.stdin.isTTY) {
            const wantMore = await confirmPass();
            if (!wantMore) break;
        } else {
            break;
        }

        passNumber++;
        currentPhase = "Starting";
        metrics.errors = [];

        const passLabel = autopilot ? `Pass ${passNumber}/${maxPasses}` : `Pass ${passNumber}`;
        log(`\n${chalk.cyan("●")} ${passLabel} — sending improvement prompt...\n`);

        await session.send({
            prompt: [
                "Do another pass over the compilation output.",
                "Re-read the original spec files and the compile prompt at " +
                    `\`${relative(SPECS_DIR, promptPath)}\` to check what you may have missed.`,
                "",
                "Remember: DEPTH OVER BREADTH. A few components working perfectly",
                "(with interactive demo) is better than many half-working ones.",
                "",
                "Focus on:",
                "- The interactive demo (`--interactive`) — it MUST work as a full-screen playground",
                "- Components already implemented: polish, fix bugs, ensure full interactivity",
                "- Tests that are failing or missing",
                "- Add the NEXT component (fully: implementation + tests + demo wiring)",
                "- Token usage correctness",
                "After fixing, run the tests and verify `--interactive` works, then report results.",
            ].join("\n"),
        });

        await waitForIdle();

        // Complete final phase
        if (!verbose && currentPhase !== "Starting") {
            log(`  ${chalk.green("✓")} ${currentPhase}`);
        }

        // Show the agent's last message as a pass recap
        if (metrics.lastAssistantMessage) {
            const rendered = marked(metrics.lastAssistantMessage.trim()) as string;
            log(`\n${boxen(rendered.trimEnd(), { padding: 1, dimBorder: true, title: "Agent summary", titleAlignment: "left" })}`);
        }

        printSummary(target, config, metrics, outDir, noLock, passNumber);

        if (metrics.errors.length > 0) {
            log(chalk.yellow("⚠ Pass completed with errors:"));
            for (const err of metrics.errors) {
                log(`  ${chalk.red("•")} ${err}`);
            }
            log("");
        }
    }

    // 12. Cleanup
    try {
        await session.disconnect();
        await client.stop();
    } catch {
        /* best-effort */
    }
    process.removeListener("SIGINT", sigintHandler);
}

// ── Commands ───────────────────────────────────────────────────────────────

function cmdStatus(targetFilter?: string): void {
    const specs = discoverSpecs();
    const targets = targetFilter ? [targetFilter] : discoverTargets();
    const schemaHash = sha256(readFile(SCHEMA_PATH));

    const tokenCount = specs.filter((s) => s.kind === "token").length;
    const componentCount = specs.filter((s) => s.kind === "component").length;
    log(`\n${chalk.cyan("●")} TUIkit specs: ${chalk.bold(String(specs.length))} ${chalk.dim(`(${tokenCount} tokens, ${componentCount} components)`)}`);
    log(`${chalk.cyan("●")} Schema hash: ${chalk.dim(schemaHash)}\n`);

    for (const target of targets) {
        const lock = readLock(target);
        const dirty = computeDirty(specs, lock, schemaHash);
        const locked = lock ? Object.keys(lock.entries).length : 0;

        const icon = dirty.length === 0 ? chalk.green("✓") : chalk.yellow("⚑");
        log(`${icon} ${chalk.bold(target)}: ${dirty.length > 0 ? chalk.yellow(`${dirty.length} dirty`) : chalk.green("0 dirty")}, ${locked} locked`);

        if (dirty.length > 0) {
            const maxLen = Math.max(...dirty.map((d) => d.spec.name.length));
            for (const d of dirty) {
                const tag = d.reason === "new" ? "NEW" : d.reason.toUpperCase();
                log(`   ${chalk.dim("├─")} ${d.spec.name.padEnd(maxLen)} ${chalk.dim(`[${tag}]`)}`);
            }
            log(`   ${chalk.dim("└─")} ${chalk.cyan(`bun run compile prompt --target ${target}`)}`);
        }

        if (lock) {
            log(`   ${chalk.dim(`   last locked: ${lock.updatedAt}`)}`);
        }
        log("");
    }
}

function cmdPrompt(target: string, componentFilter?: string, distDir: string = DEFAULT_DIST_DIR): void {
    const specs = discoverSpecs();
    const schemaHash = sha256(readFile(SCHEMA_PATH));
    const lock = readLock(target);
    let dirty = computeDirty(specs, lock, schemaHash);

    if (componentFilter) {
        dirty = dirty.filter(
            (d) => d.spec.name === `components/${componentFilter}` || d.spec.name === `tokens/${componentFilter}`,
        );
    }

    if (dirty.length === 0) {
        log(`${chalk.green("✓")} No dirty specs for target "${target}".`);
        log(`  ${chalk.dim(`Lock: ${relative(SPECS_DIR, lockPath(target))}`)}`);
        return;
    }

    const dirtySpecs = dirty.map((d) => d.spec);
    const outDir = join(distDir, target);
    const prompt = generatePrompt(target, dirtySpecs, specs, outDir);

    // Write prompt to dist directory
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "_compile-prompt.md");
    writeFileSync(outPath, prompt);

    log(`\n${chalk.cyan("●")} Compilation prompt for "${chalk.bold(target)}" ${chalk.dim(`(${dirty.length} dirty specs)`)}:`);
    log(`   ${chalk.dim(`→ ${relative(SPECS_DIR, outPath)}`)}`);
    log("");
    log("Dirty specs included:");
    const maxLen = Math.max(...dirty.map((d) => d.spec.name.length));
    for (const d of dirty) {
        log(`   ${chalk.dim("├─")} ${d.spec.name.padEnd(maxLen)} ${chalk.dim(`[${d.reason}]`)}`);
    }
    log("");
    log("Feed this prompt to an LLM agent, then run:");
    log(`   bun run compile lock --target ${target}`);
    log("");
}

function cmdLock(target: string, componentFilter?: string): void {
    const specs = discoverSpecs();
    const schemaHash = sha256(readFile(SCHEMA_PATH));
    const existing = readLock(target);
    const now = new Date().toISOString();

    const entries: Record<string, LockEntry> = existing?.entries ?? {};

    const toLock = componentFilter
        ? specs.filter((s) => s.name === `components/${componentFilter}` || s.name === `tokens/${componentFilter}`)
        : specs;

    for (const spec of toLock) {
        entries[spec.name] = {
            version: spec.version,
            specHash: spec.specHash,
            testHash: spec.testHash,
            lockedAt: now,
        };
    }

    const lock: LockFile = {
        target,
        schemaHash,
        updatedAt: now,
        entries,
    };

    writeLock(lock);

    log(`${chalk.green("✓")} Locked ${toLock.length} specs for "${target}"`);
    log(`   ${chalk.dim(`→ ${relative(SPECS_DIR, lockPath(target))}`)}`);
}

function cmdClean(target: string, distDir: string = DEFAULT_DIST_DIR): void {
    const p = lockPath(target);
    if (existsSync(p)) {
        rmSync(p);
        log(`${chalk.green("✓")} Removed lock file for "${target}"`);
    } else {
        log(chalk.dim(`No lock file found for "${target}"`));
    }

    const promptPath = join(distDir, target, "_compile-prompt.md");
    if (existsSync(promptPath)) {
        rmSync(promptPath);
        log(`${chalk.green("✓")} Removed compile prompt for "${target}"`);
    }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function usage(): void {
    log(`
TUIkit spec compiler — detect changes, generate prompts, compile via Copilot SDK.

Commands:
  status  [--target <name>]                    Show dirty/clean status
  prompt  --target <name> [--component <name>] Generate compilation prompt
          --all-targets                        Generate prompts for all targets
  build   --target <name> [--component <name>] Compile specs via Copilot SDK agent
          --all-targets                        Build all targets sequentially
  lock    --target <name> [--component <name>] Snapshot spec hashes to lock file
          --all-targets                        Lock all targets
  clean   --target <name>                      Remove lock file + prompt
          --all-targets                        Clean all targets

Build options:
  --model <id>      Model to use (e.g. claude-sonnet-4, gpt-5). Prompts if omitted.
  --effort <level>  Reasoning effort: low | medium | high | xhigh (default: high)
  --verbose         Show full agent transcript (raw streaming output)
  --no-lock         Suppress agent lock instructions (agent won't lock components)
  --autopilot       Use SDK autopilot mode — agent runs all passes autonomously

Common options:
  --out <dir>       Output directory for compiled code (default: dist/)

Examples:
  bun run compile status
  bun run compile prompt --target go
  bun run compile build --target go
  bun run compile build --target rust --model claude-sonnet-4 --effort high --verbose
  bun run compile build --target node --component HintBar
  bun run compile build --all-targets --model gpt-5 --effort xhigh
  bun run compile lock --target go
  bun run compile clean --target bun
`);
}

interface ParsedArgs {
    command: string;
    target?: string;
    allTargets: boolean;
    component?: string;
    out?: string;
    model?: string;
    effort?: string;
    verbose: boolean;
    noLock: boolean;
    autopilot: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
    const command = argv[0] || "status";
    let target: string | undefined;
    let allTargets = false;
    let component: string | undefined;
    let out: string | undefined;
    let model: string | undefined;
    let effort: string | undefined;
    let verbose = false;
    let noLock = false;
    let autopilot = false;

    for (let i = 1; i < argv.length; i++) {
        if (argv[i] === "--target" && argv[i + 1]) {
            target = argv[++i];
        } else if (argv[i] === "--all-targets") {
            allTargets = true;
        } else if (argv[i] === "--component" && argv[i + 1]) {
            component = argv[++i];
        } else if (argv[i] === "--out" && argv[i + 1]) {
            out = argv[++i];
        } else if (argv[i] === "--model" && argv[i + 1]) {
            model = argv[++i];
        } else if (argv[i] === "--effort" && argv[i + 1]) {
            effort = argv[++i];
        } else if (argv[i] === "--verbose") {
            verbose = true;
        } else if (argv[i] === "--no-lock") {
            noLock = true;
        } else if (argv[i] === "--autopilot") {
            autopilot = true;
        }
    }

    return { command, target, allTargets, component, out, model, effort, verbose, noLock, autopilot };
}

const args = parseArgs(process.argv.slice(2));
const distDir = args.out ? join(process.cwd(), args.out) : DEFAULT_DIST_DIR;
const noSubcommand = process.argv.length <= 2;

switch (args.command) {
    case "status":
        if (noSubcommand) usage();
        cmdStatus(args.target);
        break;
    case "prompt":
        if (args.allTargets) {
            for (const t of discoverTargets()) {
                cmdPrompt(t, args.component, distDir);
            }
        } else if (args.target) {
            cmdPrompt(args.target, args.component, distDir);
        } else {
            log("Error: --target <name> or --all-targets is required for prompt command");
            process.exit(1);
        }
        break;
    case "build":
        if (args.allTargets) {
            for (const t of discoverTargets()) {
                await cmdBuild(t, args.component, distDir, args.model, args.effort, args.verbose, args.noLock, args.autopilot);
            }
        } else if (args.target) {
            await cmdBuild(args.target, args.component, distDir, args.model, args.effort, args.verbose, args.noLock, args.autopilot);
        } else {
            log("Error: --target <name> or --all-targets is required for build command");
            process.exit(1);
        }
        break;
    case "lock":
        if (args.allTargets) {
            for (const t of discoverTargets()) {
                cmdLock(t, args.component);
            }
        } else if (args.target) {
            cmdLock(args.target, args.component);
        } else {
            log("Error: --target <name> or --all-targets is required for lock command");
            process.exit(1);
        }
        break;
    case "clean":
        if (args.allTargets) {
            for (const t of discoverTargets()) {
                cmdClean(t, distDir);
            }
        } else if (args.target) {
            cmdClean(args.target, distDir);
        } else {
            log("Error: --target <name> or --all-targets is required for clean command");
            process.exit(1);
        }
        break;
    case "help":
    case "--help":
    case "-h":
        usage();
        break;
    default:
        log(`Unknown command: ${args.command}`);
        usage();
        process.exit(1);
}
