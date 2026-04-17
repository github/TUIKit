---
kind: test
component: QrCode
version: 1
---

# QrCode Tests

## renders a QR code for a URL

```props
data: "https://github.com"
```

```expect
(output is a multi-line block of █ ▀ ▄ and space characters)
```

## output contains only block characters and spaces

```props
data: "hello"
```

```expect
(every character in the output is one of: █ ▀ ▄ or space)
```

## output has consistent line width

```props
data: "test"
```

```expect
(all lines have equal character width)
```

---

# Half-block encoding tests

These verify the cell-rendering logic that maps two vertical QR modules
to a single terminal character.

## both dark modules produce full block

```renderCell
top: true
bottom: true
expect: "█"
```

## top dark, bottom light produces upper half block

```renderCell
top: true
bottom: false
expect: "▀"
```

## top light, bottom dark produces lower half block

```renderCell
top: false
bottom: true
expect: "▄"
```

## both light modules produce space

```renderCell
top: false
bottom: false
expect: " "
```

---

# Placeholder bounds tests

These verify the center placeholder region calculation.

## placeholder is centered in the QR grid

```placeholderBounds
size: 25
margin: 1
expect:
  colStart: centered within size
  rowStart: centered within size
  width: ≤ 10
  height: ≤ 8
  rowStart_parity: matches margin parity
```

## placeholder respects maximum dimensions

```placeholderBounds
size: 40
margin: 1
expect:
  width: 10
  height: 8
```

## small QR sizes shrink the placeholder

```placeholderBounds
size: 6
margin: 1
expect:
  width: 6
  height: 6
```

## rowStart aligns to margin parity for text-row boundaries

```placeholderBounds
size: 25
margin: 1
expect:
  rowStart_parity: odd
```

```placeholderBounds
size: 25
margin: 2
expect:
  rowStart_parity: even
```

---

# Quiet zone tests

## output includes 1-module quiet zone margin

```props
data: "test"
```

```expect
(first row and first column of each line contain quiet zone spacing)
```

---

# Error correction tests

## uses High error correction level

```props
data: "https://github.com"
```

```expect
(QR is generated with error correction level H, tolerating ~30% obscured modules)
```
