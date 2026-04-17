---
kind: preview
component: TimelineItem
version: 1
---

## Loading

```props
variant: "loading"
title: "Grep"
description: '"pattern" in *.ts'
```

## Success

```props
variant: "success"
title: "Grep"
description: '"pattern" in *.ts'
subItems:
  - "5 files found"
```

## Error

```props
variant: "error"
title: "Bash"
description: "npm run build"
subItems:
  - "Exit code 1"
```

## Warning

```props
variant: "warning"
title: "Bash"
description: "rm -rf /"
subItems:
  - "Rejected by you."
```

## Info

```props
variant: "info"
title: "Compacted"
description: "Removed 42 messages"
```

## Muted

```props
variant: "muted"
title: "Read"
description: "src/index.ts"
subItems:
  - "24 lines"
```

## With multiple sub-items

```props
variant: "success"
title: "Edit"
description: "src/auth.ts"
subItems:
  - "Added JWT validation"
  - "Removed deprecated handler"
  - "+12 -8 lines"
```
