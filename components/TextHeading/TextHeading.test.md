---
kind: test
component: TextHeading
version: 1
---

# TextHeading Tests

## renders children as bold text

```props
children: "Background Subagents"
```

```expect
Background Subagents
```

```style
- selector: label("Background Subagents")
  bold: true
  color: textSecondary
```

## renders error variant

```props
type: "error"
children: "Something went wrong"
```

```expect
Something went wrong
```

```style
- selector: label("Something went wrong")
  bold: true
  color: statusError
```

## defaults to textSecondary when type is omitted

```props
children: "Section Title"
```

```style
- selector: label("Section Title")
  bold: true
  color: textSecondary
```
