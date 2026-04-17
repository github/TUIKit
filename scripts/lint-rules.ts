/**
 * TUIkit lint rules configuration
 *
 * Central definition of all frontmatter schemas, body section requirements,
 * rule metadata, and validation patterns. The linter imports this config
 * and uses it to drive all checks — no rule definitions live in lint.ts.
 */

import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────

export type Severity = "error" | "warn";
export type SpecKind = "component" | "token" | "test" | "preview" | "target";

export interface RuleDef {
    id: string;
    severity: Severity;
    description: string;
    kinds: SpecKind[] | "*";
    fix?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
    "input",
    "display",
    "navigation",
    "layout",
    "feedback",
] as const;

// ── Frontmatter schemas (one per kind) ─────────────────────────────────────

export const ComponentFM = z.object({
    kind: z.literal("component"),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.number().int().nonnegative(),
    category: z.enum(VALID_CATEGORIES),
    dependencies: z.unknown(),
}).passthrough();

export const TokenFM = z.object({
    kind: z.literal("token"),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.number().int().nonnegative(),
}).passthrough();

export const TestFM = z.object({
    kind: z.literal("test"),
    component: z.string().min(1),
    version: z.number().int().nonnegative(),
}).passthrough();

export const PreviewFM = z.object({
    kind: z.literal("preview"),
    component: z.string().min(1),
    version: z.number().int().nonnegative(),
}).passthrough();

export const TargetFM = z.object({
    kind: z.literal("target"),
    name: z.string().min(1),
    language: z.string().min(1),
    runtime: z.string().min(1),
    framework: z.unknown().refine((v) => v != null, "framework is required"),
}).passthrough();

export const SchemaByKind: Record<string, z.ZodTypeAny> = {
    component: ComponentFM,
    token: TokenFM,
    test: TestFM,
    preview: PreviewFM,
    target: TargetFM,
};

// ── Required body sections ─────────────────────────────────────────────────

export const REQUIRED_SECTIONS: Record<string, { sections: string[]; severity: Severity; exact: boolean }> = {
    component: {
        sections: ["Visual rules", "Rendering example", "Dependencies"],
        severity: "error",
        exact: true,
    },
    target: {
        sections: [
            "Architecture pattern", "Type mapping", "Callback translation",
            "State machine translation", "Token access", "Composition",
            "Test pattern", "Key mapping", "Dependencies", "Demo CLI",
        ],
        severity: "warn",
        exact: false, // fuzzy match (lowercase includes)
    },
};

// ── RFC 2119 patterns ──────────────────────────────────────────────────────

export const RFC2119_KEYWORDS = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\b/;
export const INFORMAL_WORDS = /\b(always|never|should(?!\s+NOT))\b/i;
export const NORMATIVE_SECTIONS = ["Visual rules", "Behavior", "Edge cases"];

// ── Rule registry ──────────────────────────────────────────────────────────

export const RULES: RuleDef[] = [
    // Frontmatter (zod-driven, auto-generated rule IDs like fm-<field>)
    { id: "fm-kind",             severity: "error", description: "kind field is present and valid",                   kinds: "*" },
    { id: "fm-name",             severity: "error", description: "name is present",                                   kinds: ["component", "token", "target"] },
    { id: "fm-name-case",        severity: "warn",  description: "name follows PascalCase convention",                kinds: ["component"] },
    { id: "fm-description",      severity: "error", description: "description is present",                            kinds: ["component", "token"] },
    { id: "fm-version",          severity: "error", description: "version is present and numeric",                    kinds: ["component", "token", "test", "preview"] },
    { id: "fm-category",         severity: "error", description: "category is present and valid",                     kinds: ["component"] },
    { id: "fm-dependencies",     severity: "error", description: "dependencies section is present",                   kinds: ["component"] },
    { id: "fm-props",            severity: "warn",  description: "props section is present",                          kinds: ["component"] },
    { id: "fm-tokens-deps-sync", severity: "warn",  description: "tokens and dependencies are in sync",              kinds: ["component"] },
    { id: "fm-component",        severity: "error", description: "test/preview spec references a component",          kinds: ["test", "preview"] },
    { id: "fm-component-ref",    severity: "error", description: "referenced component spec exists",                  kinds: ["test", "preview"] },
    { id: "fm-language",         severity: "error", description: "target language is specified",                       kinds: ["target"] },
    { id: "fm-runtime",          severity: "error", description: "target runtime is specified",                        kinds: ["target"] },
    { id: "fm-framework",        severity: "error", description: "target framework is specified",                      kinds: ["target"] },

    // Accessibility
    { id: "fm-a11y-interactive", severity: "error", description: "interactive components define accessibility",        kinds: ["component"],
      fix: "Add accessibility: with role, announce.on_mount, and screen_reader_adaptations" },
    { id: "fm-a11y-display",     severity: "warn",  description: "display components should define accessibility",     kinds: ["component"] },

    // Body sections
    { id: "body-visual-rules",   severity: "error", description: '"## Visual rules" section exists',                  kinds: ["component"] },
    { id: "body-rendering-example", severity: "error", description: '"## Rendering example" section exists',          kinds: ["component"] },
    { id: "body-dependencies",   severity: "error", description: '"## Dependencies" section exists',                  kinds: ["component"] },
    { id: "body-behavior",       severity: "warn",  description: "interactive components have behavior section",       kinds: ["component"] },
    { id: "target-section",      severity: "warn",  description: "target spec has recommended body sections",          kinds: ["target"] },
    { id: "test-empty",          severity: "warn",  description: "test spec has at least one test case",               kinds: ["test"] },

    // RFC 2119
    { id: "rfc2119-missing",     severity: "warn",  description: "normative sections use RFC 2119 keywords",           kinds: ["component"],
      fix: "Replace informal language with MUST/SHOULD/MAY" },
    { id: "rfc2119-informal",    severity: "warn",  description: "no informal language in normative sections",         kinds: ["component"],
      fix: "Replace with RFC 2119 keyword" },

    // Cross-references
    { id: "xref-token",          severity: "warn",  description: "token references resolve to known tokens",           kinds: ["component"] },

    // File naming
    { id: "naming-dir",          severity: "warn",  description: "component directory is PascalCase",                  kinds: ["component"] },
    { id: "naming-spec",         severity: "error", description: "{Name}.md exists in component directory",            kinds: ["component"] },
    { id: "naming-test",         severity: "error", description: "{Name}.test.md exists in component directory",       kinds: ["component"] },

    // Links
    { id: "link-broken",         severity: "error", description: "internal markdown links resolve to existing files",  kinds: "*",
      fix: "Fix path or remove link" },
];

// Lookup helper
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]));
