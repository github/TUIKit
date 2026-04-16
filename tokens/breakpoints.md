---
kind: token
name: breakpoints
description: Terminal width thresholds for responsive layout.
version: 1

values:
    compact: { max_columns: 79, description: "Narrow terminals — collapse optional content" }
    narrow: { min_columns: 80, max_columns: 119, description: "Standard terminals — default layout" }
    wide: { min_columns: 120, description: "Wide terminals — show additional detail" }
---

# Breakpoint Tokens

Three responsive breakpoints based on terminal column width.

## Design principles

- **Mobile-first is wrong here**: most terminals are 80+ columns. Design for `narrow` first.
- **Compact is the constraint**: things break below 80 columns. Use compact to cut, not rearrange.
- **Wide is a bonus**: extra space shows more, never rearranges layout.

## Implementation guide

1. Define breakpoint constants (the column thresholds)
2. Provide a `getBreakpoint(columns)` function that returns the current breakpoint name
3. Optionally provide reactive hooks/subscriptions for terminal resize events
4. Components that adapt should accept breakpoint as input or detect it internally
