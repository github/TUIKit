---
kind: preview
component: ScrollBox
version: 1
---

## No scroll (content fits)

```props
children:
  - "  ◎ 001 [INFO ] Server starting on port 3000"
  - "  ✓ 002 [OK   ] Connected to database"
  - "  ◎ 003 [INFO ] Registered 14 API routes"
```

## Scrollable list

```props
children:
  - "  ◎ 001 [INFO ] Server starting on port 3000"
  - "  ◎ 002 [INFO ] Loading configuration from .env"
  - "  ✓ 003 [OK   ] Connected to database"
  - "  ◎ 004 [INFO ] Processing batch job #1284"
  - "  ✓ 005 [OK   ] Batch job completed (42 items)"
  - "  ! 006 [WARN ] Redis not configured"
  - "  ◎ 007 [INFO ] Incoming webhook from GitHub"
  - "  ✖ 008 [ERROR] Build failed: missing dependency"
```

## No scrollbar

```props
showScrollbar: false
children:
  - "Item 0"
  - "Item 1"
  - "Item 2"
  - "Item 3"
  - "Item 4"
  - "Item 5"
```

## Focusable

```props
onFocusLine: callback
children:
  - "❯ 001 [INFO ] First item"
  - "  002 [WARN ] Second item"
  - "  003 [OK   ] Third item"
  - "  004 [INFO ] Fourth item"
```

## Hover + virtualized

```props
virtualized: true
onFocusLine: callback
onHoverLine: callback
children:
  - "❯ 001 [INFO ] Item one"
  - "  002 [INFO ] Item two"
  - "  003 [WARN ] Item three"
  - "  004 [OK   ] Item four"
  - "  005 [INFO ] Item five"
  - "  006 [ERROR] Item six"
```
