#!/usr/bin/env bun
/**
 * TUIkit spec linter
 *
 * Validates component, token, and test specs against the schema.
 * Checks frontmatter structure, naming conventions, RFC 2119 usage,
 * dependencies, accessibility, and cross-references.
 *
 * Usage:
 *   bun lint.ts                          # lint all specs
 *   bun lint.ts --component HintBar      # lint one component
 *   bun lint.ts --fix                    # show suggested fixes
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

// biome-ignore lint/suspicious/noConsole: CLI tool — stdout is the interface
const log = (...args: unknown[]) => console.log(...args);

// ── Paths ──────────────────────────────────────────────────────────────────

const SPECS_DIR = dirname(new URL(import.meta.url).pathname);
const TOKENS_DIR = join(SPECS_DIR, "tokens");
const COMPONENTS_DIR = join(SPECS_DIR, "components");
const TARGETS_DIR = join(SPECS_DIR, "targets");

// ── Types ──────────────────────────────────────────────────────────────────

type Severity = "error" | "warn";

interface Diagnostic {
    file: string;
    severity: Severity;
    rule: string;
    message: string;
    fix?: string;
}

interface ParsedSpec {
    path: string;
    relativePath: string;
    frontmatter: Record<string, unknown>;
    body: string;
    bodySections: string[];
}

// ── Parsing ────────────────────────────────────────────────────────────────

function readFile(path: string): string {
    return readFileSync(path, "utf-8");
}

function parseFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result: Record<string, unknown> = {};
    const lines = yaml.split("\n");
    let currentKey = "";

    for (const line of lines) {
        // Top-level key
        const topMatch = line.match(/^(\w[\w_-]*)\s*:/);
        if (topMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
            currentKey = topMatch[1];
            const value = line.slice(line.indexOf(":") + 1).trim();
            if (value && !value.startsWith(">") && !value.startsWith("|")) {
                // Try to parse simple values
                if (value === "true") result[currentKey] = true;
                else if (value === "false") result[currentKey] = false;
                else if (/^\d+$/.test(value)) result[currentKey] = Number.parseInt(value, 10);
                else if (value.startsWith("[")) result[currentKey] = value;
                else result[currentKey] = value;
            } else {
                result[currentKey] = {};
            }
        } else if (currentKey && (line.startsWith("    ") || line.startsWith("\t"))) {
            // Nested content — mark as object if not already
            if (typeof result[currentKey] !== "object") {
                result[currentKey] = {};
            }
        }
    }

    return result;
}

function parseSpec(path: string): ParsedSpec {
    const content = readFile(path);
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    const body = fmMatch ? content.slice(fmMatch[0].length) : content;
    const bodySections = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

    return {
        path,
        relativePath: relative(SPECS_DIR, path),
        frontmatter: parseFrontmatter(content),
        body,
        bodySections,
    };
}

// ── Validation rules ───────────────────────────────────────────────────────

const VALID_CATEGORIES = ["input", "display", "navigation", "layout", "feedback"];
const RFC2119_KEYWORDS = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\b/;
const INFORMAL_WORDS = /\b(always|never|should(?!\s+NOT))\b/i;

function lintComponentSpec(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const fm = spec.frontmatter;
    const file = spec.relativePath;

    // ── Required frontmatter fields ────────────────────────────────────

    if (!fm.kind) {
        diagnostics.push({ file, severity: "error", rule: "fm-kind", message: "Missing required field: kind" });
    } else if (fm.kind !== "component") {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-kind",
            message: `kind MUST be "component", got "${fm.kind}"`,
        });
    }

    if (!fm.name) {
        diagnostics.push({ file, severity: "error", rule: "fm-name", message: "Missing required field: name" });
    } else if (typeof fm.name === "string" && !/^[A-Z][a-zA-Z0-9]+$/.test(fm.name)) {
        diagnostics.push({
            file,
            severity: "warn",
            rule: "fm-name-case",
            message: `name "${fm.name}" SHOULD be PascalCase`,
        });
    }

    if (!fm.description) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-description",
            message: "Missing required field: description",
        });
    }

    if (fm.version === undefined) {
        diagnostics.push({ file, severity: "error", rule: "fm-version", message: "Missing required field: version" });
    } else if (typeof fm.version !== "number") {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-version-type",
            message: `version MUST be a number, got "${typeof fm.version}"`,
        });
    }

    if (!fm.category) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-category",
            message: "Missing required field: category",
        });
    } else if (typeof fm.category === "string" && !VALID_CATEGORIES.includes(fm.category)) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-category-value",
            message: `category "${fm.category}" MUST be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
    }

    // ── Dependencies (required in schema v2) ───────────────────────────

    if (!fm.dependencies) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-dependencies",
            message: "Missing required field: dependencies",
            fix: "Add dependencies: section listing tokens and components used",
        });
    }

    // ── Tokens cross-reference ─────────────────────────────────────────

    if (fm.tokens && fm.dependencies) {
        // Both exist — we could validate they match, but the YAML parsing
        // is too shallow here. Just check both sections are present.
    } else if (fm.tokens && !fm.dependencies) {
        diagnostics.push({
            file,
            severity: "warn",
            rule: "fm-tokens-deps-sync",
            message: "Has tokens: but no dependencies: — dependencies MUST list the same tokens",
        });
    }

    // ── Props validation ───────────────────────────────────────────────

    if (!fm.props) {
        diagnostics.push({ file, severity: "warn", rule: "fm-props", message: "No props defined" });
    }

    // ── Accessibility (required for interactive, recommended for all) ──

    const hasStates = !!fm.states;
    const hasKeyboard = !!fm.keyboard;

    if (!fm.accessibility) {
        if (hasStates || hasKeyboard) {
            diagnostics.push({
                file,
                severity: "error",
                rule: "fm-a11y-interactive",
                message: "Interactive component (has states/keyboard) MUST define accessibility section",
                fix: "Add accessibility: with role, announce.on_mount, and screen_reader_adaptations",
            });
        } else {
            diagnostics.push({
                file,
                severity: "warn",
                rule: "fm-a11y-display",
                message: "Display component SHOULD define accessibility: with at least role",
            });
        }
    }

    // ── Body sections ──────────────────────────────────────────────────

    const sections = spec.bodySections;

    if (!sections.includes("Visual rules")) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "body-visual-rules",
            message: 'Missing required body section: "## Visual rules"',
        });
    }

    if (!sections.includes("Rendering example")) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "body-rendering",
            message: 'Missing required body section: "## Rendering example"',
        });
    }

    if (!sections.includes("Dependencies")) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "body-dependencies",
            message: 'Missing required body section: "## Dependencies"',
            fix: "Add a ## Dependencies table matching the frontmatter dependencies section",
        });
    }

    if ((hasStates || hasKeyboard) && !sections.some((s) => s === "Behavior" || s.startsWith("Behavior"))) {
        diagnostics.push({
            file,
            severity: "warn",
            rule: "body-behavior",
            message: 'Interactive component SHOULD have a "## Behavior" section',
        });
    }

    // ── RFC 2119 conformance ───────────────────────────────────────────

    lintRFC2119(spec, diagnostics);
}

function lintTokenSpec(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const fm = spec.frontmatter;
    const file = spec.relativePath;

    if (!fm.kind || fm.kind !== "token") {
        diagnostics.push({ file, severity: "error", rule: "fm-kind", message: 'kind MUST be "token"' });
    }

    if (!fm.name) {
        diagnostics.push({ file, severity: "error", rule: "fm-name", message: "Missing required field: name" });
    }

    if (!fm.description) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-description",
            message: "Missing required field: description",
        });
    }

    if (fm.version === undefined) {
        diagnostics.push({ file, severity: "error", rule: "fm-version", message: "Missing required field: version" });
    }
}

function lintTestSpec(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const fm = spec.frontmatter;
    const file = spec.relativePath;

    if (!fm.kind || fm.kind !== "test") {
        diagnostics.push({ file, severity: "error", rule: "fm-kind", message: 'kind MUST be "test"' });
    }

    if (!fm.component) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-component",
            message: "Missing required field: component",
        });
    } else if (typeof fm.component === "string") {
        // Verify the referenced component spec exists
        const componentDir = join(COMPONENTS_DIR, fm.component);
        const componentSpec = join(componentDir, `${fm.component}.md`);
        if (!existsSync(componentSpec)) {
            diagnostics.push({
                file,
                severity: "error",
                rule: "fm-component-ref",
                message: `References component "${fm.component}" but ${fm.component}/${fm.component}.md does not exist`,
            });
        }
    }

    if (fm.version === undefined) {
        diagnostics.push({ file, severity: "error", rule: "fm-version", message: "Missing required field: version" });
    }

    // Check test has at least one ## heading (test case)
    if (spec.bodySections.length === 0) {
        diagnostics.push({
            file,
            severity: "warn",
            rule: "test-empty",
            message: "Test spec has no test cases (## headings)",
        });
    }
}

function lintTargetSpec(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const fm = spec.frontmatter;
    const file = spec.relativePath;

    if (!fm.kind || fm.kind !== "target") {
        diagnostics.push({ file, severity: "error", rule: "fm-kind", message: 'kind MUST be "target"' });
    }

    for (const field of ["name", "language", "runtime"]) {
        if (!fm[field]) {
            diagnostics.push({
                file,
                severity: "error",
                rule: `fm-${field}`,
                message: `Missing required field: ${field}`,
            });
        }
    }

    if (!fm.framework) {
        diagnostics.push({
            file,
            severity: "error",
            rule: "fm-framework",
            message: "Missing required field: framework",
        });
    }

    // Check required body sections
    const requiredSections = [
        "Architecture pattern",
        "Type mapping",
        "Callback translation",
        "State machine translation",
        "Token access",
        "Composition",
        "Test pattern",
        "Key mapping",
        "Dependencies",
        "Demo CLI",
    ];

    for (const section of requiredSections) {
        if (!spec.bodySections.some((s) => s.toLowerCase().includes(section.toLowerCase()))) {
            diagnostics.push({
                file,
                severity: "warn",
                rule: "target-section",
                message: `Missing recommended body section: "${section}"`,
            });
        }
    }
}

// ── RFC 2119 linting ───────────────────────────────────────────────────────

function lintRFC2119(spec: ParsedSpec, diagnostics: Diagnostic[]): void {
    const file = spec.relativePath;
    const body = spec.body;

    // Find sections that MUST use RFC 2119 keywords
    const normativeSections = ["Visual rules", "Behavior", "Edge cases"];

    for (const sectionName of normativeSections) {
        const sectionRegex = new RegExp(`^## ${sectionName}\\b.*$`, "m");
        const sectionMatch = body.match(sectionRegex);
        if (!sectionMatch) continue;

        const sectionStart = body.indexOf(sectionMatch[0]) + sectionMatch[0].length;
        const nextSection = body.slice(sectionStart).match(/^## /m);
        const sectionEnd = nextSection ? sectionStart + (nextSection.index ?? 0) : body.length;
        const sectionText = body.slice(sectionStart, sectionEnd);

        // Check for RFC 2119 keywords
        const hasRFC2119 = RFC2119_KEYWORDS.test(sectionText);

        if (!hasRFC2119) {
            diagnostics.push({
                file,
                severity: "warn",
                rule: "rfc2119-missing",
                message: `Section "${sectionName}" has no RFC 2119 keywords (MUST/SHOULD/MAY)`,
                fix: 'Replace informal language ("always", "should", "never") with MUST/SHOULD/MAY',
            });
        }

        // Check for informal language that should be replaced
        const bulletLines = sectionText.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"));
        for (const line of bulletLines) {
            if (INFORMAL_WORDS.test(line) && !RFC2119_KEYWORDS.test(line)) {
                diagnostics.push({
                    file,
                    severity: "warn",
                    rule: "rfc2119-informal",
                    message: `"${sectionName}" contains informal language: "${line.trim().slice(0, 80)}..."`,
                    fix: "Replace with RFC 2119 keyword (MUST/SHOULD/MAY)",
                });
            }
        }
    }
}

// ── Cross-spec validation ──────────────────────────────────────────────────

function lintCrossReferences(componentSpecs: ParsedSpec[], tokenSpecs: ParsedSpec[], diagnostics: Diagnostic[]): void {
    // Collect all known token names from token specs
    const knownTokens = new Set<string>();
    for (const spec of tokenSpecs) {
        const content = readFile(spec.path);
        // Extract token names from frontmatter (top-level keys under tokens: or groups:)
        const tokenBlock = content.match(/^tokens:\n([\s\S]*?)(?=\n\w|\n---|Z)/m);
        if (tokenBlock) {
            const tokenNames = [...tokenBlock[1].matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
            for (const name of tokenNames) knownTokens.add(name);
        }
        const groupBlock = content.match(/^groups:\n([\s\S]*?)(?=\n[a-z]|\n---|Z)/m);
        if (groupBlock) {
            // Icon glyph names (SCREAMING_CASE) under glyphs:
            const glyphs = [...groupBlock[1].matchAll(/^\s+(\w+):\s*\{\s*char:/gm)].map((m) => m[1]);
            for (const g of glyphs) knownTokens.add(g);
            // Semantic aliases (camelCase) under semantic_aliases:
            const aliasLines = [...groupBlock[1].matchAll(/^\s+(icon\w+):\s*\w+/gm)].map((m) => m[1]);
            for (const a of aliasLines) knownTokens.add(a);
        }
    }

    // Collect all component names (for future dependency validation)
    const _knownComponents = new Set(componentSpecs.map((s) => s.frontmatter.name as string).filter(Boolean));

    // Validate each component's token references
    for (const spec of componentSpecs) {
        const content = readFile(spec.path);
        const file = spec.relativePath;

        // Extract color tokens from tokens.colors: [...]
        const colorMatch = content.match(/colors:\s*\[([^\]]*)\]/);
        if (colorMatch && colorMatch[1].trim()) {
            const colors = colorMatch[1].split(",").map((s) => s.trim());
            for (const color of colors) {
                if (color && !knownTokens.has(color)) {
                    diagnostics.push({
                        file,
                        severity: "warn",
                        rule: "xref-token",
                        message: `References unknown color token "${color}"`,
                    });
                }
            }
        }

        // Extract icon tokens from tokens.icons: [...]
        const iconMatch = content.match(/icons:\s*\[([^\]]*)\]/);
        if (iconMatch && iconMatch[1].trim()) {
            const icons = iconMatch[1].split(",").map((s) => s.trim());
            for (const icon of icons) {
                if (icon && !knownTokens.has(icon)) {
                    diagnostics.push({
                        file,
                        severity: "warn",
                        rule: "xref-token",
                        message: `References unknown icon token "${icon}"`,
                    });
                }
            }
        }
    }
}

// ── File naming validation ─────────────────────────────────────────────────

function lintFileNaming(diagnostics: Diagnostic[]): void {
    if (!existsSync(COMPONENTS_DIR)) return;

    for (const dir of readdirSync(COMPONENTS_DIR)) {
        const dirPath = join(COMPONENTS_DIR, dir);
        if (!statSync(dirPath).isDirectory()) continue;

        const relDir = relative(SPECS_DIR, dirPath);

        // Directory name should be PascalCase
        if (!/^[A-Z][a-zA-Z0-9]+$/.test(dir)) {
            diagnostics.push({
                file: relDir,
                severity: "warn",
                rule: "naming-dir",
                message: `Component directory "${dir}" SHOULD be PascalCase`,
            });
        }

        // Must have {Name}.md
        const specFile = join(dirPath, `${dir}.md`);
        if (!existsSync(specFile)) {
            diagnostics.push({
                file: relDir,
                severity: "error",
                rule: "naming-spec",
                message: `Missing spec file: ${dir}.md`,
            });
        }

        // Must have {Name}.test.md
        const testFile = join(dirPath, `${dir}.test.md`);
        if (!existsSync(testFile)) {
            diagnostics.push({
                file: relDir,
                severity: "error",
                rule: "naming-test",
                message: `Missing test file: ${dir}.test.md`,
            });
        }
    }
}

// ── Discovery + orchestration ──────────────────────────────────────────────

function discoverAndLint(componentFilter?: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Lint file naming
    lintFileNaming(diagnostics);

    // Discover and lint token specs
    const tokenSpecs: ParsedSpec[] = [];
    if (existsSync(TOKENS_DIR)) {
        for (const file of readdirSync(TOKENS_DIR).filter((f) => f.endsWith(".md") && !f.includes(".preview."))) {
            const spec = parseSpec(join(TOKENS_DIR, file));
            tokenSpecs.push(spec);
            lintTokenSpec(spec, diagnostics);
        }
    }

    // Discover and lint component specs + test specs
    const componentSpecs: ParsedSpec[] = [];
    if (existsSync(COMPONENTS_DIR)) {
        for (const dir of readdirSync(COMPONENTS_DIR)) {
            if (componentFilter && dir !== componentFilter) continue;

            const dirPath = join(COMPONENTS_DIR, dir);
            if (!statSync(dirPath).isDirectory()) continue;

            const specPath = join(dirPath, `${dir}.md`);
            if (existsSync(specPath)) {
                const spec = parseSpec(specPath);
                componentSpecs.push(spec);
                lintComponentSpec(spec, diagnostics);
            }

            const testPath = join(dirPath, `${dir}.test.md`);
            if (existsSync(testPath)) {
                const spec = parseSpec(testPath);
                lintTestSpec(spec, diagnostics);
            }
        }
    }

    // Discover and lint target specs
    if (existsSync(TARGETS_DIR) && !componentFilter) {
        for (const file of readdirSync(TARGETS_DIR).filter((f) => f.endsWith(".md"))) {
            const spec = parseSpec(join(TARGETS_DIR, file));
            lintTargetSpec(spec, diagnostics);
        }
    }

    // Cross-spec validation
    if (!componentFilter) {
        lintCrossReferences(componentSpecs, tokenSpecs, diagnostics);
    }

    return diagnostics;
}

// ── Output ─────────────────────────────────────────────────────────────────

function formatDiagnostics(diagnostics: Diagnostic[], showFix: boolean): void {
    if (diagnostics.length === 0) {
        log("\n✅ All specs valid.\n");
        return;
    }

    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warn");

    // Group by file
    const byFile = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
        const list = byFile.get(d.file) ?? [];
        list.push(d);
        byFile.set(d.file, list);
    }

    log("");
    for (const [file, diags] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        log(`📄 ${file}`);
        for (const d of diags) {
            const icon = d.severity === "error" ? "  ✖" : "  ⚠";
            log(`${icon} [${d.rule}] ${d.message}`);
            if (showFix && d.fix) {
                log(`    💡 ${d.fix}`);
            }
        }
        log("");
    }

    log("───────────────────────────────────────");
    log(`  ${errors.length} error(s), ${warnings.length} warning(s)`);
    log("");

    if (errors.length > 0) {
        process.exitCode = 1;
    }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function usage(): void {
    log(`
TUIkit spec linter — validate specs against the schema.

Usage:
  bun lint.ts                          Lint all specs
  bun lint.ts --component HintBar      Lint one component
  bun lint.ts --fix                    Show suggested fixes

Rules checked:
  fm-kind              kind field is present and valid
  fm-name              name is present and PascalCase
  fm-name-case         name follows PascalCase convention
  fm-description       description is present
  fm-version           version is present and numeric
  fm-version-type      version is a number
  fm-category          category is present and valid
  fm-category-value    category is one of the allowed values
  fm-dependencies      dependencies section is present (required v2)
  fm-props             props section is present
  fm-a11y-interactive  interactive components have accessibility
  fm-a11y-display      display components should have accessibility
  fm-component         test spec references a component
  fm-component-ref     referenced component exists
  fm-framework         target spec has framework defined
  body-visual-rules    "## Visual rules" section exists
  body-rendering       "## Rendering example" section exists
  body-dependencies    "## Dependencies" section exists
  body-behavior        interactive components have behavior section
  rfc2119-missing      normative sections use RFC 2119 keywords
  rfc2119-informal     informal language in normative sections
  xref-token           token references resolve to known tokens
  naming-dir           component directory is PascalCase
  naming-spec          {Name}.md exists in component directory
  naming-test          {Name}.test.md exists in component directory
  target-section       target spec has recommended body sections
  test-empty           test spec has at least one test case
`);
}

function parseArgs(argv: string[]): { component?: string; fix: boolean } {
    let component: string | undefined;
    let fix = false;

    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--component" && argv[i + 1]) {
            component = argv[++i];
        } else if (argv[i] === "--fix") {
            fix = true;
        } else if (argv[i] === "help" || argv[i] === "--help" || argv[i] === "-h") {
            usage();
            process.exit(0);
        }
    }

    return { component, fix };
}

const args = parseArgs(process.argv.slice(2));
const diagnostics = discoverAndLint(args.component);
formatDiagnostics(diagnostics, args.fix);
