---
kind: component
name: QrCode
description: >
    Renders a QR code as compact Unicode block characters in the terminal.
version: 2
category: display

tokens:
    colors: []
    icons: []

props:
    data:
        type: string
        required: true
        description: >
            The data (URL, text, etc.) to encode as a QR code.

dependencies:
    tokens: []
    components: []

accessibility:
    role: img
    properties:
        aria-label: "QR code for {data}"
    announce:
        on_mount: "QR code linking to {data}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: "Render the data URL as plain text instead of the QR grid"
---

# QrCode

Encodes arbitrary string data into a QR code and renders it using Unicode
half-block characters. Each text row represents two QR module rows, roughly
halving the vertical footprint compared to a full-block approach. The result
is a compact, scannable code that works in any terminal with Unicode support.

## Visual rules

- MUST use the terminal's default foreground color (no semantic color tokens)
- Dark modules MUST be rendered with block characters; light modules MUST be spaces
- A quiet zone of 1 module MUST surround the QR grid (required by QR spec for scanners)
- A centered placeholder region SHOULD be reserved in the middle of the code for
  embedding a mascot or logo art when the QR size is large enough

## Encoding approach

The component uses **Unicode half-block characters** to pack two vertical
QR module rows into a single terminal row:

| Top module | Bottom module | Character        |
| ---------- | ------------- | ---------------- |
| dark       | dark          | `█` (full block) |
| dark       | light         | `▀` (upper half) |
| light      | dark          | `▄` (lower half) |
| light      | light         | ` ` (space)      |

This 2:1 vertical compression makes QR codes practical for terminal display.

## Rendering example

Given `data: "https://example.com"`:

```
 ▄▄▄▄▄▄▄ ▄  ▄ ▄▄▄▄▄▄▄
 █ ▄▄▄ █ █▄▀  █ ▄▄▄ █
 █ ███ █ ▀▄▀▄ █ ███ █
 █▄▄▄▄▄█ ▄▀▄▀ █▄▄▄▄▄█
  ▄▄ ▄▄▄▄▀▄▀▄▄ ▄ ▄▄
 ▄▄█▀▀▄▄  ▀█▀▄██▄▄▀▀
 ▄▄▄▄▄▄▄ ▀▀▄▄▀█▄█ ▄
 █ ▄▄▄ █ █▄▀ ▄  ▀█▀
 █ ███ █ ▄▀▀▀▄█▀▄██
 █▄▄▄▄▄█ █ ▀▀  ▀▄▀▀
```

(Exact output depends on the QR encoder — this is illustrative.)

## Error correction

The QR code is generated with **High (H)** error correction level. This allows
up to ~30% of the code to be damaged or obscured (e.g. by the center mascot
placeholder) while remaining scannable.

## Center placeholder

A rectangular region in the center of the QR grid is cleared (rendered as spaces)
to accommodate an embedded mascot or logo graphic. The placeholder:

- Is sized to fit within the QR data area (max 10 columns × 8 rows of modules)
- Is vertically aligned to text-row boundaries (even row start)
- Only embeds art when the placeholder is large enough to contain it
- Works because the High error correction level compensates for the cleared modules

## Edge cases

- Very short data produces a small QR version — the placeholder MAY not fit and
  MUST be omitted in that case
- The quiet zone MUST be present regardless of data length
- Data MUST be encoded as-is — the component MUST NOT perform URL validation or normalization

## Dependencies

This component has no token or component dependencies. It uses the terminal's
default foreground color.
