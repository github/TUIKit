---
kind: test
component: TextSpinner
version: 1
---

# TextSpinner rendering tests

## renders icon-only by default

```props
{}
```

```expect
●
```

## renders icon with text label

```props
text: "Loading"
```

```expect
● Loading
```

## renders text only when icon is false

```props
text: "Please wait"
icon: false
```

```expect
Please wait
```

## renders nothing when icon is false and no text

```props
icon: false
```

```expect

```

## icon followed by space when no text

```props
icon: true
```

```expect
●
```

---

# Variant tests

## default variant uses neutral colors

```props
text: "Working"
variant: "default"
```

```style
- selector: label("Working")
  color: variant-rest(default)
```

## brand variant uses brand ramp

```props
text: "Working"
variant: "brand"
```

```style
- selector: label("Working")
  color: variant-rest(brand)
```

## info variant uses info ramp

```props
text: "Working"
variant: "info"
```

```style
- selector: label("Working")
  color: variant-rest(info)
```

## selected variant uses selected ramp

```props
text: "Working"
variant: "selected"
```

```style
- selector: label("Working")
  color: variant-rest(selected)
```

## placeholder variant uses dimmer neutral ramp

```props
text: "Working"
variant: "placeholder"
```

```style
- selector: label("Working")
  color: variant-rest(placeholder)
```

---

# Animation behavior tests

## spinner icon bounces through frames

The spinner icon cycles in a bounce pattern: ●→◉→◎→○→◎→◉→●…
Each frame change occurs every SPINNER_TICK_DIVISOR (3) ticks.

```props
text: "Test"
```

```animation
target: spinner-icon
frame_sequence: ["●", "◉", "◎", "○", "◎", "◉", "●"]
pattern: bounce
tick_divisor: 3
```

## shimmer wave sweeps left to right

The gradient wave head starts at position 0 and advances one position per tick.
Characters behind the head show fading gradient colors (comet-tail).
Characters ahead of the head show the rest color.

```props
text: "AB"
variant: "default"
```

```animation
target: shimmer
total_positions: 10
description: >
  textLength(2) + gradientLength(8) = 10 total positions.
  Wave head advances from 0 to 9, then a pause period occurs.
```

## shimmer pauses between cycles

```props
text: "Hi"
variant: "default"
```

```animation
target: shimmer
pause:
  normal_ms: 1000
  alt_screen_ms: 300
description: >
  After the wave exits the text (head > totalPositions),
  rest color is shown for the pause duration before the next cycle.
```

## animation runs faster in alt-screen mode

```props
text: "Fast"
```

```animation
timing:
  normal: { interval_ms: 100, pause_ms: 1000 }
  alt_screen: { interval_ms: 30, pause_ms: 300 }
```

---

# Loop control tests

## infinite loop by default (loop omitted)

```props
text: "Forever"
```

```animation
loop: infinite
description: Animation cycles indefinitely; onAnimationEnd never fires.
```

## single cycle when loop is false

```props
text: "Once"
loop: false
onAnimationEnd: callback
```

```animation
loop: 1
fires_onAnimationEnd: true
description: >
  Runs exactly one cycle, then stops at rest color.
  onAnimationEnd fires after the first cycle completes.
```

## exact N cycles when loop is a number

```props
text: "Thrice"
loop: 3
onAnimationEnd: callback
```

```animation
loop: 3
fires_onAnimationEnd: true
description: >
  Runs exactly 3 cycles, then stops at rest color.
  onAnimationEnd fires after the third cycle completes.
```

## zero cycles — animation never starts

```props
text: "Static"
loop: 0
onAnimationEnd: callback
```

```animation
loop: 0
fires_onAnimationEnd: true
description: >
  Animation never starts. Text is immediately rendered in rest color.
  onAnimationEnd fires immediately on mount.
```

---

# Text change behavior

## animation resets when text changes

```props
text: "First"
```

```animation
description: Animation is running at some tick > 0.
```

```props
text: "Second"
```

```animation
tick: 0
cycle: 0
description: >
  When text prop changes, tick resets to 0, cycle count resets to 0,
  and the animation starts fresh from the beginning.
```

---

# Accessibility tests

## screen reader: animation disabled, text static

```props
text: "Loading data"
```

```accessibility
screen_reader: true
announce: "Loading data"
animation: disabled
description: >
  When a screen reader is detected, no animation runs. Text is rendered
  in the variant rest color as static content.
```

## screen reader: spinner shows first frame at rest

```props
icon: true
```

```accessibility
screen_reader: true
spinner_frame: "●"
spinner_color: rest
description: >
  Spinner icon shows CIRCLE_FILLED (first frame) in rest color.
  Icon is aria-hidden and not announced.
```

## screen reader: finite loop fires onAnimationEnd immediately

```props
text: "Quick"
loop: false
onAnimationEnd: callback
```

```accessibility
screen_reader: true
fires_onAnimationEnd: true
timing: immediate
description: >
  When screen reader is detected and loop is finite,
  onAnimationEnd fires immediately (no animation occurs).
```

## spinner icon is aria-hidden

```props
text: "Working"
icon: true
```

```accessibility
- selector: spinner-icon
  aria-hidden: true
  description: >
    The spinner icon glyph is always aria-hidden="true" since it is
    purely decorative. Only the text label carries semantic content.
```

---

# Style assertions

## spinner icon receives gradient color during animation

```props
text: "Test"
variant: "default"
```

```style
- selector: spinner-icon
  color: variant-gradient(default)
  description: >
    During animation, the spinner icon color pulses through
    the variant's gradient array at 1/3 the shimmer tick rate.
```

## text characters receive wave gradient colors

```props
text: "Hello"
variant: "default"
```

```style
- selector: label("H")
  color: variant-gradient(default)
  description: >
    Characters at and near the wave head receive gradient colors.
    The head position gets the brightest color (gradient[0]),
    trailing characters fade through gradient[1..7].
- selector: label("o")
  color: variant-rest(default)
  description: >
    Characters far from the wave head (outside gradient window)
    use the rest color.
```

## at rest all text uses rest color

```props
text: "Done"
variant: "brand"
loop: false
```

```style
- selector: label("Done")
  color: variant-rest(brand)
  description: >
    After animation completes, all characters use the variant rest color.
- selector: spinner-icon
  color: variant-rest(brand)
  description: >
    Spinner icon also returns to rest color and shows first frame (●).
```
