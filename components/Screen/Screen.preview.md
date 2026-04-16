---
kind: preview
component: Screen
version: 1
---

## Basic

```props
children:
  - "10:21:03 Server starting on port 3000"
  - "10:21:04 Connected to database"
  - "10:21:05 Registered 14 API routes"
```

## With header and footer

```props
header:
  - "Screen — Screen.tsx"
  - "Application Log (3 entries)"
children:
  - "10:21:03 Server starting on port 3000"
  - "10:21:04 Connected to database"
  - "10:21:05 Registered 14 API routes"
footer: "↑↓ scroll · Esc back"
```

## Non-scrollable

```props
scrollable: false
header: "Static Screen"
children:
  - "Line 1"
  - "Line 2"
  - "Line 3"
footer: "Esc back"
```
