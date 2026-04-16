---
kind: test
component: TextTitle
version: 1
---

# TextTitle Tests

## renders children as bold text

```props
children: "Background Tasks"
```

```expect
Background Tasks
```

```style
- selector: label("Background Tasks")
  bold: true
```

## renders error variant with statusError color

```props
type: "error"
children: "Error"
```

```expect
Error
```

```style
- selector: label("Error")
  bold: true
  color: statusError
```

## uses no explicit color when type is omitted

```props
children: "Title"
```

```style
- selector: label("Title")
  bold: true
  color: null
```
