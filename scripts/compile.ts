#!/usr/bin/env bun
/**
 * TUIkit spec compiler
 *
 * Detects changed specs via content hashing and generates self-contained
 * compilation prompts for LLM agents. Lock files track which spec versions
 * have been compiled per target.
 *
 * Usage:
 *   bun scripts/compile.ts status [--target <name>]
 *   bun scripts/compile.ts prompt --target <name> [--component <name>]
 *   bun scripts/compile.ts lock   --target <name> [--component <name>]
 *   bun scripts/compile.ts clean  --target <name>
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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
    for (const line of match[1].split("\n")) {
        const sep = line.indexOf(":");
        if (sep > 0) {
            fm[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
        }
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
    const schema = readFile(SCHEMA_PATH);
    const targetSpec = readFile(join(TARGETS_DIR, `${target}.md`));

    const tokenSpecs = allSpecs.filter((s) => s.kind === "token");
    const componentSpecs = specs.filter((s) => s.kind === "component");

    const sections: string[] = [];

    sections.push(`# TUIkit compilation prompt — target: ${target}`);
    sections.push("");
    sections.push("You are a TUIkit spec compiler. Generate idiomatic code for the target");
    sections.push("framework based ONLY on the specs below. Do not reference any TypeScript source.");
    sections.push("");

    sections.push("---");
    sections.push("## Meta-schema");
    sections.push("");
    sections.push(schema);
    sections.push("");

    sections.push("---");
    sections.push("## Target definition");
    sections.push("");
    sections.push(targetSpec);
    sections.push("");

    sections.push("---");
    sections.push("## Token specs");
    sections.push("");
    for (const token of tokenSpecs) {
        sections.push(`### ${token.name}`);
        sections.push("");
        sections.push(readFile(token.specPath));
        sections.push("");
        if (token.previewPath) {
            sections.push(`### ${token.name} — preview`);
            sections.push("");
            sections.push(readFile(token.previewPath));
            sections.push("");
        }
    }

    if (componentSpecs.length > 0) {
        sections.push("---");
        sections.push("## Component specs to compile");
        sections.push("");
        for (const comp of componentSpecs) {
            sections.push(`### ${comp.name}`);
            sections.push("");
            sections.push(readFile(comp.specPath));
            sections.push("");
            if (comp.testPath) {
                sections.push(`### ${comp.name} — tests`);
                sections.push("");
                sections.push(readFile(comp.testPath));
                sections.push("");
            }
            if (comp.previewPath) {
                sections.push(`### ${comp.name} — preview`);
                sections.push("");
                sections.push(readFile(comp.previewPath));
                sections.push("");
            }
        }
    }

    sections.push("---");
    sections.push("## Instructions");
    sections.push("");
    sections.push("IMPORTANT: Do NOT spawn sub-agents or delegate to the task tool. Do ALL work yourself directly.");
    sections.push("");
    sections.push("1. Read the target definition to understand the framework and paradigm.");
    sections.push("2. Implement each component spec above in the target language/framework.");
    sections.push("3. Implement each test spec as runnable tests in the target's test framework.");
    sections.push("4. Use the token specs for all color/icon/breakpoint references.");
    sections.push("5. Use the preview specs to build per-component demo screens in the demo app.");
    sections.push(`6. Output all files to: \`${relative(SPECS_DIR, join(distDir, target))}/\``);
    sections.push(`   This is the dist directory — keep all generated code here, separate from specs.`);
    sections.push("");

    if (existsSync(DEMO_PATH)) {
        sections.push("---");
        sections.push("## Demo specification");
        sections.push("");
        sections.push(readFile(DEMO_PATH));
        sections.push("");
    }

    sections.push("---");
    sections.push("## Verification (REQUIRED)");
    sections.push("");
    sections.push("After generating ALL files, you MUST:");
    sections.push("");
    sections.push("1. **Run tests**: Execute the target's test command and ensure ALL tests pass.");
    sections.push("   Fix any failures before proceeding.");
    sections.push("2. **Build the demo**: Compile/build the demo CLI and verify it starts without errors.");
    sections.push("   For interpreted targets (Bun), verify the demo file has no syntax/import errors.");
    sections.push("3. **Report**: State the final test count, pass/fail status, and demo build status.");
    sections.push("");

    return sections.join("\n");
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
            for (const d of dirty) {
                const tag = d.reason === "new" ? "NEW" : d.reason.toUpperCase();
                log(`   ${chalk.dim("├─")} ${d.spec.name} ${chalk.dim(`[${tag}]`)}`);
            }
        }

        if (lock) {
            log(`   ${chalk.dim(`└─ last locked: ${lock.updatedAt}`)}`);
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
        return;
    }

    const dirtySpecs = dirty.map((d) => d.spec);
    const prompt = generatePrompt(target, dirtySpecs, specs, distDir);

    // Write prompt to dist directory
    const outDir = join(distDir, target);
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "_compile-prompt.md");
    writeFileSync(outPath, prompt);

    log(`\n${chalk.cyan("●")} Compilation prompt for "${chalk.bold(target)}" ${chalk.dim(`(${dirty.length} dirty specs)`)}:`);
    log(`   ${chalk.dim(`→ ${relative(SPECS_DIR, outPath)}`)}`);
    log("");
    log("Dirty specs included:");
    for (const d of dirty) {
        log(`   ${chalk.dim("├─")} ${d.spec.name} ${chalk.dim(`[${d.reason}]`)}`);
    }
    log("");
    log("Feed this prompt to an LLM agent, then run:");
    log(`   bun scripts/compile.ts lock --target ${target}`);
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
TUIkit spec compiler — detect changes, generate prompts, track state.

Commands:
  status  [--target <name>]                    Show dirty/clean status
  prompt  --target <name> [--component <name>] Generate compilation prompt
  lock    --target <name> [--component <name>] Snapshot spec hashes to lock file
  clean   --target <name>                      Remove lock file + prompt

Options:
  --out <dir>   Output directory for compiled code (default: specs/dist/)

Examples:
  bun scripts/compile.ts status
  bun scripts/compile.ts prompt --target go
  bun scripts/compile.ts prompt --target go --out ./my-tuikit
  bun scripts/compile.ts prompt --target rust --component HintBar
  bun scripts/compile.ts lock --target go
  bun scripts/compile.ts clean --target bun
`);
}

function parseArgs(argv: string[]): { command: string; target?: string; component?: string; out?: string } {
    const command = argv[0] || "status";
    let target: string | undefined;
    let component: string | undefined;
    let out: string | undefined;

    for (let i = 1; i < argv.length; i++) {
        if (argv[i] === "--target" && argv[i + 1]) {
            target = argv[++i];
        } else if (argv[i] === "--component" && argv[i + 1]) {
            component = argv[++i];
        } else if (argv[i] === "--out" && argv[i + 1]) {
            out = argv[++i];
        }
    }

    return { command, target, component, out };
}

const args = parseArgs(process.argv.slice(2));
const distDir = args.out ? join(process.cwd(), args.out) : DEFAULT_DIST_DIR;

switch (args.command) {
    case "status":
        cmdStatus(args.target);
        break;
    case "prompt":
        if (!args.target) {
            log("Error: --target is required for prompt command");
            process.exit(1);
        }
        cmdPrompt(args.target, args.component, distDir);
        break;
    case "lock":
        if (!args.target) {
            log("Error: --target is required for lock command");
            process.exit(1);
        }
        cmdLock(args.target, args.component);
        break;
    case "clean":
        if (!args.target) {
            log("Error: --target is required for clean command");
            process.exit(1);
        }
        cmdClean(args.target, distDir);
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
