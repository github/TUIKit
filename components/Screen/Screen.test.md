---
kind: test
component: Screen
version: 1
---

# Screen Tests

## renders children

```props
children: "Content"
```

```expect
Content
```

## renders header and footer in order

```props
header: "HEADER_MARKER"
children: "CONTENT_MARKER"
footer: "FOOTER_MARKER"
```

```expect
HEADER_MARKER
CONTENT_MARKER
FOOTER_MARKER
```

## omits header when not provided

```props
children: "CONTENT_MARKER"
footer: "FOOTER_MARKER"
```

```expect
CONTENT_MARKER
FOOTER_MARKER
```

## scrollable=false renders children directly

```props
scrollable: false
children: "Custom scroll content"
```

```expect
Custom scroll content
```

## escape calls onClose when provided

```props
onClose: callback
children: "Content"
```

```input
escape
```

```state
after: closed
callback_fired: onClose
```

## escape is safe when onClose is omitted

```props
children: "Content"
```

```input
escape
```

```expect
Content
```

## textSelection=false does not forward selection region

```props
textSelection: false
children: "Selectable text"
```

```state
selection_forwarded: false
```

## changing children identity clears stale selection

```props
children_before: ["Tab A row 1", "Tab A row 2"]
children_after: ["Tab B row 1", "Tab B row 2"]
```

```state
selection_before_change: present
selection_after_change: cleared
```
