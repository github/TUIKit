---
kind: component
name: TextSpinner
description: Animated spinner icon with optional shimmer-gradient text label.
version: 2
category: feedback

tokens:
    colors: [textSecondary]
    icons: [CIRCLE_FILLED, SPINNER_FILLED, SPINNER_RING, SPINNER_CIRCLE]

props:
    text:
        type: string
        required: false
        description: >
            Optional label displayed alongside the spinner. When present, the text
            receives a shimmer gradient wave animation that sweeps across its characters.

    icon:
        type: boolean
        required: false
        default: true
        description: >
            Whether to show the animated spinner icon. When false, only the shimmer
            text label is rendered.

    variant:
        type: TextSpinnerVariant
        required: false
        default: "default"
        description: >
            Color variant controlling the gradient ramp used for both the spinner icon
            and the shimmer text. Each variant maps to a different chromatic ramp.

    loop:
        type: number | false
        required: false
        description: >
            Controls shimmer repetition. undefined (default) loops infinitely,
            false runs a single cycle then stops, a positive number runs exactly
            N cycles then stops. Zero cycles means the animation never starts.

    onAnimationEnd:
        type: callback() → void
        required: false
        description: >
            Called when a finite shimmer loop completes. Only fires when loop is
            false or a number. Not called for infinite loops.

types:
    TextSpinnerVariant:
        description: Predefined color pairings for the shimmer gradient effect.
        values: ["default", "brand", "info", "selected", "placeholder"]
        semantics:
            default: Neutral gray ramp
            brand: Primary brand chromatic ramp
            info: Informational blue chromatic ramp
            selected: Selection/focus chromatic ramp
            placeholder: Dimmer neutral ramp (lower contrast than default)

animation:
    spinner:
        frames: [CIRCLE_FILLED, SPINNER_FILLED, SPINNER_RING, SPINNER_CIRCLE]
        pattern: bounce
        description: >
            Frames play in a bounce pattern: ●→◉→◎→○→◎→◉→●→…
            The spinner advances at 1/3 the tick rate of the shimmer wave
            (SPINNER_TICK_DIVISOR = 3), creating a slower pulsing effect relative
            to the text animation.
        disable_when: [screen_reader]

    shimmer:
        description: >
            A gradient wave sweeps left-to-right across the text. The wave head
            is the brightest color from the variant gradient; trailing characters
            fade through decreasing intensities (comet-tail effect). After the
            wave exits the text, a pause occurs before the next cycle.
        gradient_length: 8
        pattern: sweep-left-to-right with pause
        timing:
            normal: { interval_ms: 100, pause_ms: 1000 }
            alt_screen: { interval_ms: 30, pause_ms: 300 }
        disable_when: [screen_reader]

accessibility:
    role: status
    properties:
        aria-label: "Loading indicator"
        aria-live: polite
    announce:
        on_mount: "Loading"
        on_change: "{text}"
    screen_reader_adaptations:
        - when: screen reader detected
          change: >
              Animation is completely disabled. Text is rendered in the variant's
              rest color as static text. The spinner icon shows the first frame
              (CIRCLE_FILLED) in rest color.
        - when: screen reader detected
          change: >
              If loop is finite, onAnimationEnd fires immediately (animation is
              considered instantly complete).

dependencies:
    tokens:
        - name: textSecondary
          kind: color
          usage: "Fallback text color"
          required: false
        - name: CIRCLE_FILLED
          kind: icon
          usage: "Spinner frame glyph (●)"
          required: true
        - name: SPINNER_FILLED
          kind: icon
          usage: "Spinner frame glyph (◉)"
          required: true
        - name: SPINNER_RING
          kind: icon
          usage: "Spinner frame glyph (◎)"
          required: true
        - name: SPINNER_CIRCLE
          kind: icon
          usage: "Spinner frame glyph (○)"
          required: true
    components: []
    dependents: []
---

# TextSpinner

An animated spinner with optional shimmer text label. The spinner icon bounces
through frame glyphs while its color pulses through the variant gradient. When
text is provided, a gradient wave sweeps across each character creating a
comet-tail shimmer effect.

## Visual rules

- The spinner icon is `aria-hidden` (decorative) — it MUST NOT be announced
- Each variant MUST define a **rest color** and an **8-color gradient** array
- At rest (animation done or paused), all text and the icon MUST use the rest color
- During animation, the wave head MUST use the brightest gradient color (index 0)
  and trailing characters MUST fade through the gradient (indices 1–7)
- The spinner icon color MUST pulse through the same gradient at 1/3 speed
- A space MUST separate the spinner icon from the label text
- When `icon` is false and no `text` is provided, the component MUST render nothing
- When `icon` is true and no `text` is provided, the spinner icon MUST be followed by a single space

## Rendering modes

Three rendering modes based on prop combinations:

| icon  | text    | Result                                |
| ----- | ------- | ------------------------------------- |
| true  | present | Spinner icon + space + shimmer text   |
| true  | absent  | Spinner icon + space (icon-only mode) |
| false | present | Shimmer text only (no icon)           |

## Rendering example

Given `text="Loading…"`, `variant="default"`, at mid-animation:

```
● Loading…
^ ^^^^^^^^
|  shimmer gradient wave (comet-tail fading left)
spinner icon (bouncing through ●◉◎○ frames)
```

At rest (animation complete):

```
● Loading…
```

All characters in the variant's rest color.

## Animation behavior

### Shimmer wave

The shimmer treats each character as a position. The wave head advances one
position per tick. Characters behind the head receive decreasing gradient
colors (distance 0 = brightest, distance 7 = dimmest). Characters outside
the gradient window use the rest color.

After the wave exits the text (head > textLength + gradientLength), a pause
period occurs before the next cycle begins.

### Spinner icon bounce

The spinner icon frames cycle in a bounce pattern through `[●, ◉, ◎, ○]`:
forward then reverse, creating smooth pulsing. The frame advances every
3 ticks (SPINNER_TICK_DIVISOR), making it visually slower than the shimmer.

### Timing presets

- **Normal mode**: 100ms interval, 1000ms pause between cycles
- **Alt-screen mode**: 30ms interval, 300ms pause (faster for immersive UIs)

### Loop control

- `loop` omitted: infinite animation
- `loop={false}`: single cycle, then static at rest color; fires `onAnimationEnd`
- `loop={N}`: exactly N cycles, then static; fires `onAnimationEnd`
- `loop={0}`: no animation ever starts; fires `onAnimationEnd` immediately

## Edge cases

- **Text changes**: animation MUST reset to tick 0 and cycle 0 when `text` prop changes
- **Screen reader detected**: animation MUST NOT start; text MUST be static in rest color;
  finite loops MUST fire `onAnimationEnd` immediately
- **Empty text with icon=false**: MUST render nothing (returns null)

## Dependencies

| Dependency       | Kind  | Usage                   | Required |
| ---------------- | ----- | ----------------------- | -------- |
| `textSecondary`  | color | Fallback text color     | No       |
| `CIRCLE_FILLED`  | icon  | Spinner frame glyph (●) | Yes      |
| `SPINNER_FILLED` | icon  | Spinner frame glyph (◉) | Yes      |
| `SPINNER_RING`   | icon  | Spinner frame glyph (◎) | Yes      |
| `SPINNER_CIRCLE` | icon  | Spinner frame glyph (○) | Yes      |
