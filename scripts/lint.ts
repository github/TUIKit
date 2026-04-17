#!/usr/bin/env bun
/**
 * TUIkit spec linter
 *
 * Validates component, token, test, and target specs against the schema.
 * Rule definitions and schemas live in lint-rules.ts — this file is
 * purely execution logic.
 *
 * Usage:
 *   bun run lint                          # lint all specs
 *   bun run lint --component HintBar      # lint one component
 *   bun run lint --fix                    # show suggested fixes
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import chalk from "chalk";
import fg from "fast-glob";
import matter from "gray-matter";
import {
    INFORMAL_WORDS,
    NORMATIVE_SECTIONS,
    REQUIRED_SECTIONS,
    RFC2119_KEYWORDS,
    RULES,
    RULES_BY_ID,
    SchemaByKind,
    type Severity,
} from "./lint-rules.js";

const log = (...args: unknown[]) => console.log(...args);

// ── Paths ──────────────────────────────────────────────────────────────────

const SPECS_DIR = join(dirname(new URL(import.meta.url).pathname), "..");
const COMPONENTS_DIR = join(SPECS_DIR, "components");
const TOKENS_DIR = join(SPECS_DIR, "tokens");
const TARGETS_DIR = join(SPECS_DIR, "targets");

// ── Types ──────────────────────────────────────────────────────────────────

interface Diagnostic {
    file: string;
    severity: Severity;
    rule: string;
    message: string;
    fix?: string;
}

interface ParsedSpec {
    path: string;
    rel: string;
    fm: Record<string, unknown>;
    body: string;
    sections: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ruleSeverity(id: string, fallback: Severity = "error"): Severity {
    return RULES_BY_ID.get(id)?.severity ?? fallback;
}

function ruleFix(id: string): string | undefined {
    return RULES_BY_ID.get(id)?.fix;
}

function diag(file: string, rule: string, message: string, fix?: string): Diagnostic {
    return { file, severity: ruleSeverity(rule), rule, message, fix: fix ?? ruleFix(rule) };
}

// ── Frontmatter parsing ───────────────────────────────────────────────────

function parseFrontmatter(content: string): Record<string, unknown> {
    try {
        return matter(content).data;
    } catch {
        // gray-matter uses strict YAML; some specs have non-YAML-safe type
        // signatures. Fall back to minimal line-by-line parser.
        const start = content.startsWith("---\n");
        const end = start ? content.indexOf("\n---\n", 4) : -1;
        if (!start || end === -1) return {};
        const header = content.slice(4, end);
        const data: Record<string, unknown> = {};
        for (const line of header.split("\n")) {
            const m = line.match(/^([A-Za-z_]\w*):/);
            if (m && !line.startsWith(" ") && !line.startsWith("\t")) {
                const key = m[1];
                const raw = line.slice(line.indexOf(":") + 1).trim();
                if (!raw || raw.startsWith(">") || raw.startsWith("|")) data[key] = {};
                else if (/^\d+$/.test(raw)) data[key] = Number.parseInt(raw, 10);
                else data[key] = raw.replace(/^['"]|['"]$/g, "");
            }
        }
        return data;
    }
}

function parseSpec(path: string): ParsedSpec {
    const content = readFileSync(path, "utf-8");
    const fmBlock = content.match(/^---\n[\s\S]*?\n---\n/);
    const body = fmBlock ? content.slice(fmBlock[0].length) : content;
    return {
        path,
        rel: relative(SPECS_DIR, path),
        fm: parseFrontmatter(content),
        body,
        sections: [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]),
    };
}

// ── Schema validation ─────────────────────────────────────────────────────

function lintFrontmatter(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const { fm, rel } = spec;
    const kind = fm.kind as string | undefined;

    if (!kind) {
        diagnostics.push(diag(rel, "fm-kind", "Missing required field: kind"));
        return;
    }

    const schema = SchemaByKind[kind];
    if (!schema) {
        diagnostics.push(diag(rel, "fm-kind", `Unknown kind: "${kind}"`));
        return;
    }

    const result = schema.safeParse(fm);
    if (!result.success) {
        for (const issue of result.error.issues) {
            const key = issue.path[0] ?? "frontmatter";
            diagnostics.push(diag(rel, `fm-${String(key)}`, `${String(key)}: ${issue.message}`));
        }
    }

    if (kind === "component") {
        if (typeof fm.name === "string" && !/^[A-Z][a-zA-Z0-9]+$/.test(fm.name)) {
            diagnostics.push(diag(rel, "fm-name-case", `name "${fm.name}" SHOULD be PascalCase`));
        }
        if (!fm.props) {
            diagnostics.push(diag(rel, "fm-props", "No props defined"));
        }
        if (fm.tokens && !fm.dependencies) {
            diagnostics.push(diag(rel, "fm-tokens-deps-sync", "Has tokens: but no dependencies:"));
        }
    }
}

// ── Accessibility ──────────────────────────────────────────────────────────

function lintAccessibility(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const { fm, rel } = spec;
    if (fm.kind !== "component") return;

    const interactive = !!fm.states || !!fm.keyboard;
    if (!fm.accessibility) {
        const rule = interactive ? "fm-a11y-interactive" : "fm-a11y-display";
        const msg = interactive
            ? "Interactive component MUST define accessibility section"
            : "Display component SHOULD define accessibility: with at least role";
        diagnostics.push(diag(rel, rule, msg));
    }
}

// ── Body sections (config-driven) ──────────────────────────────────────────

function lintBodySections(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const { fm, rel, sections } = spec;
    const kind = fm.kind as string;

    const req = REQUIRED_SECTIONS[kind];
    if (req) {
        for (const s of req.sections) {
            const found = req.exact
                ? sections.includes(s)
                : sections.some((h) => h.toLowerCase().includes(s.toLowerCase()));
            if (!found) {
                const ruleId = req.exact
                    ? `body-${s.toLowerCase().replace(/ /g, "-")}`
                    : "target-section";
                diagnostics.push(diag(rel, ruleId, `Missing ${req.severity === "error" ? "required" : "recommended"} section: "## ${s}"`));
            }
        }
    }

    if (kind === "component") {
        const interactive = !!fm.states || !!fm.keyboard;
        if (interactive && !sections.some((s) => s.startsWith("Behavior"))) {
            diagnostics.push(diag(rel, "body-behavior", 'Interactive component SHOULD have "## Behavior"'));
        }
    }

    if (kind === "test" && sections.length === 0) {
        diagnostics.push(diag(rel, "test-empty", "Test spec has no test cases (## headings)"));
    }
}

// ── RFC 2119 conformance (config-driven patterns) ──────────────────────────

function lintRFC2119(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    if (spec.fm.kind !== "component") return;
    const { body, rel } = spec;

    for (const name of NORMATIVE_SECTIONS) {
        const re = new RegExp(`^## ${name}\\b.*$`, "m");
        const match = body.match(re);
        if (!match) continue;

        const start = body.indexOf(match[0]) + match[0].length;
        const next = body.slice(start).match(/^## /m);
        const text = body.slice(start, next ? start + (next.index ?? 0) : undefined);

        if (!RFC2119_KEYWORDS.test(text)) {
            diagnostics.push(diag(rel, "rfc2119-missing", `"${name}" has no RFC 2119 keywords (MUST/SHOULD/MAY)`));
        }

        for (const line of text.split("\n").filter((l) => /^\s*[-*]/.test(l))) {
            if (INFORMAL_WORDS.test(line) && !RFC2119_KEYWORDS.test(line)) {
                diagnostics.push(diag(rel, "rfc2119-informal", `"${name}" informal language: "${line.trim().slice(0, 80)}…"`));
            }
        }
    }
}

// ── Cross-reference validation ─────────────────────────────────────────────

function lintCrossReferences(components: ParsedSpec[], tokens: ParsedSpec[], diagnostics: Diagnostic[]): void {
    const knownTokens = new Set<string>();
    for (const spec of tokens) {
        const content = readFileSync(spec.path, "utf-8");
        for (const m of content.matchAll(/^\s{4}(\w+):/gm)) knownTokens.add(m[1]);
        for (const m of content.matchAll(/^\s+(\w+):\s*\{\s*char:/gm)) knownTokens.add(m[1]);
        for (const m of content.matchAll(/^\s+(icon\w+):\s*\w+/gm)) knownTokens.add(m[1]);
    }

    for (const spec of components) {
        const content = readFileSync(spec.path, "utf-8");
        for (const re of [/colors:\s*\[([^\]]*)\]/, /icons:\s*\[([^\]]*)\]/]) {
            const match = content.match(re);
            if (!match?.[1]?.trim()) continue;
            for (const tok of match[1].split(",").map((s) => s.trim()).filter(Boolean)) {
                if (!knownTokens.has(tok)) {
                    diagnostics.push(diag(spec.rel, "xref-token", `Unknown token "${tok}"`));
                }
            }
        }
    }
}

// ── Test component-ref validation ──────────────────────────────────────────

function lintTestRef(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const comp = spec.fm.component;
    if (typeof comp !== "string") return;
    if (!existsSync(join(COMPONENTS_DIR, comp, `${comp}.md`))) {
        diagnostics.push(diag(spec.rel, "fm-component-ref", `References "${comp}" but ${comp}/${comp}.md does not exist`));
    }
}

// ── File naming ────────────────────────────────────────────────────────────

function lintFileNaming(diagnostics: Diagnostic[]): void {
    for (const dir of fg.sync("*/", { cwd: COMPONENTS_DIR, onlyDirectories: true })) {
        const name = dir.replace(/\/$/, "");
        const rel = `components/${name}`;
        if (!/^[A-Z][a-zA-Z0-9]+$/.test(name)) {
            diagnostics.push(diag(rel, "naming-dir", `"${name}" SHOULD be PascalCase`));
        }
        if (!existsSync(join(COMPONENTS_DIR, name, `${name}.md`))) {
            diagnostics.push(diag(rel, "naming-spec", `Missing ${name}.md`));
        }
        if (!existsSync(join(COMPONENTS_DIR, name, `${name}.test.md`))) {
            diagnostics.push(diag(rel, "naming-test", `Missing ${name}.test.md`));
        }
    }
}

// ── Broken links ───────────────────────────────────────────────────────────

function lintBrokenLinks(diagnostics: Diagnostic[]): void {
    const files = fg.sync("**/*.md", { cwd: SPECS_DIR, ignore: ["node_modules/**", "dist/**"], absolute: true });
    const mdLink = /\[[^\]]+\]\(([^)]+)\)/g;

    for (const file of files) {
        const content = readFileSync(file, "utf-8");
        const rel = relative(SPECS_DIR, file);
        let m: RegExpExecArray | null;
        while ((m = mdLink.exec(content)) !== null) {
            const target = m[1].trim();
            if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
            const clean = target.split("#")[0].split("?")[0];
            if (!clean) continue;
            const resolved = target.startsWith("/") ? join(SPECS_DIR, clean.slice(1)) : join(dirname(file), clean);
            if (!existsSync(resolved)) {
                diagnostics.push(diag(rel, "link-broken", `Broken link: '${target}'`));
            }
        }
    }
}

// ── Discovery + orchestration ──────────────────────────────────────────────

function discoverAndLint(componentFilter?: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    lintFileNaming(diagnostics);

    const tokenSpecs: ParsedSpec[] = [];
    for (const f of fg.sync("*.md", { cwd: TOKENS_DIR, absolute: true, ignore: ["*.preview.*"] })) {
        const spec = parseSpec(f);
        tokenSpecs.push(spec);
        lintFrontmatter(spec, diagnostics);
    }

    const componentSpecs: ParsedSpec[] = [];
    const pattern = componentFilter ? `${componentFilter}/${componentFilter}.md` : "*/*.md";
    for (const f of fg.sync(pattern, { cwd: COMPONENTS_DIR, absolute: true, ignore: ["*.test.*", "*.preview.*", "previews.md"] })) {
        const spec = parseSpec(f);
        componentSpecs.push(spec);
        lintFrontmatter(spec, diagnostics);
        lintAccessibility(spec, diagnostics);
        lintBodySections(spec, diagnostics);
        lintRFC2119(spec, diagnostics);
    }

    const testPattern = componentFilter ? `${componentFilter}/${componentFilter}.test.md` : "*/*.test.md";
    for (const f of fg.sync(testPattern, { cwd: COMPONENTS_DIR, absolute: true })) {
        const spec = parseSpec(f);
        lintFrontmatter(spec, diagnostics);
        lintBodySections(spec, diagnostics);
        lintTestRef(spec, diagnostics);
    }

    if (!componentFilter) {
        for (const f of fg.sync("*.md", { cwd: TARGETS_DIR, absolute: true })) {
            const spec = parseSpec(f);
            lintFrontmatter(spec, diagnostics);
            lintBodySections(spec, diagnostics);
        }
    }

    if (!componentFilter) {
        lintCrossReferences(componentSpecs, tokenSpecs, diagnostics);
        lintBrokenLinks(diagnostics);
    }

    return diagnostics;
}

// ── Output ─────────────────────────────────────────────────────────────────

function formatDiagnostics(diagnostics: Diagnostic[], showFix: boolean): void {
    if (diagnostics.length === 0) {
        log(`\n${chalk.green("✓")} All specs valid.\n`);
        return;
    }

    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warn");

    const byFile = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
        const list = byFile.get(d.file) ?? [];
        list.push(d);
        byFile.set(d.file, list);
    }

    log("");
    for (const [file, diags] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        log(`  ${chalk.bold(file)}`);
        for (const d of diags) {
            const icon = d.severity === "error" ? chalk.red("  ✗") : chalk.yellow("  !");
            log(`${icon} ${chalk.dim(`[${d.rule}]`)} ${d.message}`);
            if (showFix && d.fix) {
                log(`    ${chalk.dim(`→ ${d.fix}`)}`);
            }
        }
        log("");
    }

    log(chalk.dim("───────────────────────────────────────"));
    log(`  ${chalk.red(`${errors.length} error(s)`)}, ${chalk.yellow(`${warnings.length} warning(s)`)}`);
    log("");

    if (errors.length > 0) process.exitCode = 1;
}

// ── CLI ────────────────────────────────────────────────────────────────────

function usage(): void {
    log(`\n${chalk.bold("TUIkit spec linter")} — validate specs against the schema.\n`);
    log(`${chalk.dim("Usage:")}`);
    log("  bun run lint                          Lint all specs");
    log("  bun run lint --component HintBar      Lint one component");
    log("  bun run lint --fix                    Show suggested fixes");
    log(`\n${chalk.dim("Rules:")}`);
    for (const r of RULES) {
        const sev = r.severity === "error" ? chalk.red("error") : chalk.yellow("warn ");
        log(`  ${sev} ${chalk.dim(r.id.padEnd(22))} ${r.description}`);
    }
    log("");
}

function parseArgs(argv: string[]): { component?: string; fix: boolean } {
    let component: string | undefined;
    let fix = false;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--component" && argv[i + 1]) component = argv[++i];
        else if (argv[i] === "--fix") fix = true;
        else if (["help", "--help", "-h"].includes(argv[i])) { usage(); process.exit(0); }
    }
    return { component, fix };
}

const args = parseArgs(process.argv.slice(2));
const diagnostics = discoverAndLint(args.component);
formatDiagnostics(diagnostics, args.fix);
