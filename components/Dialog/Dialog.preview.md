---
kind: preview
component: Dialog
version: 1
---

## Basic

```props
title: "Notice"
children: "This is a simple dialog."
```

## With subtitle

```props
title: "Confirm Delete"
subtitle: "This action cannot be undone"
children: "Are you sure?"
```

## Fixed width

```props
title: "Narrow Dialog"
width: 40
children: "Content constrained to 40 columns."
```

## Border title

```props
title: "Session Info"
titlePlacement: "border"
children: "Model: GPT-4 · Tokens: 1,234"
```

## Full variant

```props
title: "Permissions"
titlePlacement: "border"
subtitle: "Required for this workspace"
children: "Allow access to this folder?"
```
