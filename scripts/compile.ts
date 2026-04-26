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
 *   bun run compile build   --target <name> [--component <name>] [--model <id>] [--effort <level>] [--verbose] [--no-lock]
 *   bun run compile lock    --target <name> [--component <name>] | --all-targets
 *   bun run compile clean   --target <name> | --all-targets
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import chalk from "chalk";

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
    sections.push("1. Read the target definition to understand the framework and paradigm.");
    sections.push("2. For each component listed above, **read the full spec file** from disk, then implement it.");
    sections.push("3. For each component with a test file, **read the test spec** and implement runnable tests.");
    sections.push("4. For each component with a preview file, **read the preview spec** and build a demo screen.");
    sections.push("5. For each token listed above, **read the full spec file** from disk, then implement it.");
    sections.push(`6. Output all files to: \`${relative(SPECS_DIR, distDir)}/\``);
    sections.push(`   This is the dist directory — keep all generated code here, separate from specs.`);
    sections.push("");

    if (existsSync(DEMO_PATH)) {
        sections.push("---");
        sections.push("## Demo specification");
        sections.push("");
        sections.push("The demo app is an interactive component preview browser.");
        sections.push(`Read the full spec before building the demo: \`${relative(SPECS_DIR, DEMO_PATH)}\``);
        sections.push("");
    }

    sections.push("---");
    sections.push("## Verification (REQUIRED)");
    sections.push("");
    sections.push("After generating ALL files, you MUST verify in this order:");
    sections.push("");
    sections.push("1. **Run unit tests**: Execute the target's test command and ensure ALL tests pass.");
    sections.push("   Fix any failures before proceeding.");
    sections.push("2. **Build the demo**: Compile/build the demo CLI and verify it starts without errors.");
    sections.push("3. **Verify demo --list**: Run the demo with `--list` and confirm all components/tokens appear.");
    sections.push("4. **Verify demo --snapshot**: For EVERY component from `--list`, run");
    sections.push("   `--component <Name> --snapshot` and confirm it exits 0 with non-empty output.");
    sections.push("   If any snapshot fails, fix the demo wiring before continuing.");
    sections.push("5. **Run demo smoke tests**: Execute the demo test file and ensure all snapshot tests pass.");
    sections.push("6. **Report**: State the final unit test count, demo smoke test count, and pass/fail status.");
    sections.push("");

    return sections.join("\n");
}

// ── Gum helpers ────────────────────────────────────────────────────────────

function hasGum(): boolean {
    const result = spawnSync("gum", ["--version"], { stdio: "ignore" });
    return result.error === undefined && result.status === 0;
}

function gum(args: string[], input?: string): string {
    const result = spawnSync("gum", args, {
        encoding: "utf-8",
        stdio: [input ? "pipe" : "inherit", "pipe", "inherit"],
        input,
    });
    return (result.stdout ?? "").trim();
}

function gumStyle(text: string, opts: Record<string, string | number> = {}): void {
    const flags = Object.entries(opts).flatMap(([k, v]) => [`--${k}`, String(v)]);
    spawnSync("gum", ["style", ...flags, text], { stdio: "inherit" });
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

function confirmPass(): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = require("node:readline").createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(`\n  Do another pass? ${chalk.dim("[Y/n]")} `, (answer: string) => {
            rl.close();
            const a = answer.trim().toLowerCase();
            resolve(a === "" || a === "y" || a === "yes");
        });
    });
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
    useGum: boolean,
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

    if (!process.stdin.isTTY || !useGum) {
        return { id: defaultModel.id, name: defaultModel.name };
    }

    const items = models.map((m) => `${m.name} (${m.id})`);
    const selected = gum(
        [
            "choose",
            "--header",
            "Select model:",
            "--selected",
            `${defaultModel.name} (${defaultModel.id})`,
            ...items,
        ],
    );

    const match = selected.match(/\(([^)]+)\)$/);
    const id = match?.[1] ?? defaultModel.id;
    const model = models.find((m) => m.id === id) ?? defaultModel;
    return { id: model.id, name: model.name };
}

async function pickEffort(useGum: boolean, preselected?: string): Promise<ReasoningEffort> {
    const defaultEffort = (preselected && ["low", "medium", "high", "xhigh"].includes(preselected))
        ? preselected
        : "high";

    if (!process.stdin.isTTY || !useGum) return defaultEffort as ReasoningEffort;

    const result = gum(["choose", "--header", "Reasoning effort:", "--selected", defaultEffort, "low", "medium", "high", "xhigh"]);
    if (["low", "medium", "high", "xhigh"].includes(result)) return result as ReasoningEffort;
    return defaultEffort as ReasoningEffort;
}

async function pickOutputDir(useGum: boolean, target: string, preselected?: string): Promise<string> {
    const defaultDir = preselected
        ? join(process.cwd(), preselected)
        : join(DEFAULT_DIST_DIR, target);
    const displayDefault = relative(SPECS_DIR, defaultDir) || ".";

    if (!process.stdin.isTTY || !useGum) return defaultDir;

    const result = gum(["input", "--header", "Output directory:", "--value", displayDefault]);
    if (!result || result === displayDefault) return defaultDir;
    return join(SPECS_DIR, result);
}

async function promptBuildConfig(
    client: import("@github/copilot-sdk").CopilotClient,
    flags: { model?: string; effort?: string; out?: string },
    target: string,
): Promise<BuildConfig> {
    const useGum = hasGum();
    if (!useGum && process.stdin.isTTY) {
        log(chalk.dim("  Tip: install gum for interactive prompts → brew install gum\n"));
    }

    // Fetch available models to validate and check capabilities
    const models = await client.listModels();

    // Always prompt for model (flag value becomes the pre-selected default)
    const model = await pickModel(client, useGum, flags.model);

    // Check if model supports reasoning effort
    const modelInfo = models.find((m) => m.id === model.id);
    const supportsEffort = !!(modelInfo?.supportedReasoningEfforts && modelInfo.supportedReasoningEfforts.length > 0);

    // Always prompt for effort if model supports it (flag becomes default)
    let effort: ReasoningEffort | undefined;
    if (supportsEffort) {
        effort = await pickEffort(useGum, flags.effort);
    }

    // Always prompt for output location (flag or dist/ as default)
    const distDir = await pickOutputDir(useGum, target, flags.out);

    return { model: model.id, effort, distDir, supportsEffort };
}

function printBuildHeader(target: string, config: BuildConfig, useGum: boolean): void {
    const effortStr = config.effort ? ` · Effort: ${config.effort}` : "";
    const header = [
        `TUIkit compiler`,
        `Target: ${target} · Model: ${config.model}`,
        `${effortStr ? effortStr.slice(3) : ""}Output: ${relative(SPECS_DIR, config.distDir)}/`,
    ].join("\n");

    if (useGum) {
        gumStyle(header, { border: "rounded", padding: "1 2", "border-foreground": "6" });
    } else {
        log(`\n${chalk.cyan("●")} ${chalk.bold("TUIkit compiler")}`);
        log(`  Target: ${chalk.bold(target)} · Model: ${chalk.bold(config.model)}${effortStr}`);
        log(`  Output: ${relative(SPECS_DIR, config.distDir)}/\n`);
    }
}

function printSummary(
    target: string,
    config: BuildConfig,
    metrics: CompileMetrics,
    outDir: string,
    useGum: boolean,
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
        `✓ Compilation complete — target: ${target}${passLabel}`,
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
    if (useGum) {
        gumStyle(body, { border: "rounded", padding: "1 2", "border-foreground": "2" });
    } else {
        log(body);
    }
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
): Promise<void> {
    const useGum = hasGum();
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
    printBuildHeader(target, config, useGum);
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

IMPORTANT:
- Do NOT spawn sub-agents or delegate to the task tool. Do ALL work yourself directly.
- Do NOT ask the user questions. Proceed with your best judgment.
- Read ALL referenced spec files from disk before implementing.
- Output all generated code to the specified output directory.
- Run tests after implementation and fix any failures.
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

    // 8. SIGINT handler
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

    // 9. Event handlers
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
            log(chalk.dim(`\n⚙ ${toolName}${argStr ? ` ${argStr}` : ""}`));
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
            log(chalk.dim(`    ⚙ ${toolName}${argStr ? ` ${argStr}` : ""}`));
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

    // Show summary for this pass
    printSummary(target, config, metrics, outDir, useGum, noLock, passNumber);

    if (metrics.errors.length > 0) {
        log(chalk.yellow("⚠ Completed with errors:"));
        for (const err of metrics.errors) {
            log(`  ${chalk.red("•")} ${err}`);
        }
        log("");
    }

    // 11. Multi-pass loop — offer to do another pass
    while (process.stdin.isTTY && !aborted) {
        let wantMore: boolean;
        if (useGum) {
            const r = spawnSync("gum", ["confirm", "--default=yes", "Do another pass? (improves consistency)"], { stdio: "inherit" });
            wantMore = r.status === 0;
        } else {
            wantMore = await confirmPass();
        }

        if (!wantMore) break;

        passNumber++;
        currentPhase = "Starting";
        // Reset per-pass metrics (keep cumulative totals)
        const prevTokensIn = metrics.inputTokens;
        const prevTokensOut = metrics.outputTokens;
        const prevReasoning = metrics.reasoningTokens;
        const prevToolCalls = metrics.toolCalls;
        metrics.errors = [];

        log(`\n${chalk.cyan("●")} Pass ${passNumber} — sending improvement prompt...\n`);

        await session.send({
            prompt: [
                "Do another pass over the compilation output.",
                "Re-read the original spec files and the compile prompt at " +
                    `\`${relative(SPECS_DIR, promptPath)}\` to check what you may have missed.`,
                "Focus on:",
                "- Missing or incomplete component implementations",
                "- Tests that are failing or missing",
                "- Inconsistencies between the spec and the generated code",
                "- Demo wiring for any new components",
                "- Token usage correctness",
                "After fixing, run the tests again and report results.",
            ].join("\n"),
        });

        await waitForIdle();

        // Complete final phase
        if (!verbose && currentPhase !== "Starting") {
            log(`  ${chalk.green("✓")} ${currentPhase}`);
        }

        printSummary(target, config, metrics, outDir, useGum, noLock, passNumber);

        if (metrics.errors.length > 0) {
            log(chalk.yellow("⚠ Pass completed with errors:"));
            for (const err of metrics.errors) {
                log(`  ${chalk.red("•")} ${err}`);
            }
            log("");
        }
    }

    // 12. Auto-lock (unless --no-lock or errors occurred)
    if (!noLock && metrics.errors.length === 0) {
        cmdLock(target, componentFilter);
    }

    // 13. Cleanup
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
  --no-lock         Skip auto-lock after successful build

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
        }
    }

    return { command, target, allTargets, component, out, model, effort, verbose, noLock };
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
                await cmdBuild(t, args.component, distDir, args.model, args.effort, args.verbose, args.noLock);
            }
        } else if (args.target) {
            await cmdBuild(args.target, args.component, distDir, args.model, args.effort, args.verbose, args.noLock);
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
