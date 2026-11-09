# Motion and interaction study: `ultramock.io/editor`

The reference was measured, not imitated by eye. Playwright loaded the live editor at 1512×950,
then read three things: every transition and animation declaration in the page's stylesheets
(`/home/user/ultra/motion-css.txt`, 1664 matching rules), the computed transition/animation state of
every element (`/home/user/ultra/motion-static.json`, 49 distinct declarations), and the live
animation objects during real interactions — `document.getAnimations()`, keyframes, timings and
easings included (`/home/user/ultra/motion-hover.json`). Hover, press and keyboard focus were
sampled element by element.

What follows is what the reference actually does, what the studio now does, and where the two
deliberately differ.

---

## 1. What the reference does

### Hover
Nothing moves. Controls change **fill** (one neutral step), **border** (one step darker) or **ink**
(black/68 → black). Primary actions brighten with `filter: brightness(1.04)` instead of lifting.
Quiet tabs and icon buttons take a `rgba(0,0,0,.05)` wash and one hairline of `rgba(0,0,0,.06)`.
Durations: 100ms for small swaps, 150ms for colour, border and shadow.

The only hover that adds depth is a small ghost button, which changes to its *open* state — the
shadow change makes it look like it lifted, but it is the same 150ms state swap.

### Press
```
.Button:active:not(:disabled){transform:translateY(1px);transition-duration:70ms}
.skeuo_key:active{transform:translateY(1px);transition-duration:70ms;box-shadow:inset 0 2px 4px …}
```
One pixel, and the shadow collapses to an inset while held. The release rides back on the control's
normal 180ms `cubic-bezier(.22,1,.36,1)`. The same 70ms figure appears on every skeuomorphic button,
key and modal control in the product: it is a rule, not a one-off.

### Layers — popovers, menus, export panel
```
@keyframes pop-enter     { from{opacity:0;transform:translateY(-4px) scale(.97)} to{…none} }
@keyframes pop-child     { from{opacity:0;transform:translateY(6px)} to{…none} }
.pop-enter    { transform-origin:100% 0; animation:.2s cubic-bezier(.16,1,.3,1) pop-enter }
.pop-enter >* { animation:.22s cubic-bezier(.16,1,.3,1) both pop-child }
  child 1 → 30ms   child 2 → 65ms   child 3 → 100ms   child 4 → 135ms
  child 5 → 170ms  child 6 → 205ms  child 7+ → 235ms
```
The frame arrives in 200ms; its *contents* arrive after it, one 35ms beat apart, six steps deep, and
then stop staggering so a long menu never crawls. `transform-origin` is pinned to the corner the
layer grows from, so a popover under a top-right button expands from its top-right corner. Nothing
scales beyond .97 — the movement is a settle, not a zoom.

### Dialog
Panel in over 200ms `cubic-bezier(.215,.61,.355,1)` from `translateY(6px) scale(.97)`; scrim fades
over the same 200ms on the material curve. The export-progress modal uses `0.2s` for the backdrop
and the same 6px/`.97` panel entry, then a 1.1s choreography on completion (glow pulse, then the
panel leaves upward at `translateY(-10px)`).

### Tooltip
```
@keyframes tooltipIn{from{opacity:0;filter:blur(4px);transform:translateY(4px) scale(.96)} to{…}}
.tooltip{animation:.15s cubic-bezier(.23,1,.32,1) tooltipIn}
```
150ms, and it de-blurs as it arrives.

### Disclosure
Sections and FAQ rows open by animating height over `0.32s cubic-bezier(.16,1,.3,1)`, using
`interpolate-size: allow-keywords` and `::details-content` transitions where supported.

### Progress
`width`/`transform` over `350ms linear` (progress bar), `150ms linear` (a per-item progress), because
it is reporting real work and must not lie about timing.

### Focus
Every focusable control in the reference uses a **1–1.5px orange outline** (`#fd631f`), offset 2–3px:
`.Button:focus-visible{outline:#fd631f solid 1.5px;outline-offset:3px}`. This is the one part of the
reference's state language the studio does not take (see §3).

### Reduced motion
The reference respects it every time, and broadly:
```
@media (prefers-reduced-motion:reduce){
  *,::after,::before{transition-duration:.01ms!important;animation-duration:.01ms!important;
    animation-iteration-count:1!important}
  …and per-component: animation:none, transform:none
}
```

### Ambient motion
The reference also ships a layer of decorative loops: a rotating conic "beam" around an empty source
slot (4s), a marquee (31s), a drag hint (±2px, 2.4s), a recording dot flash (1.05s), an animated
playhead and beachball in its marketing previews. None of these are in the editor workspace's own
working surface.

---

## 2. What the studio now does

Everything below is in `src/styles/motion.css`; the tokens are in `tokens.css`.

| Interaction | Reference | Studio | Where |
| --- | --- | --- | --- |
| hover | fill/border/ink, 100–150ms, no movement | same: fill one step, border one step, ink; 150ms linear; **no translate** | `.btn`, `.iconbtn`, `.row`, `.pop-item`, `.seg button`, `.nav button` |
| press | `translateY(1px)`, 70ms, shadow → inset | `translateY(1px)`, `--t-press:70ms`; fill drops one step | every pressable control |
| release | 180ms `cubic-bezier(.22,1,.36,1)` | same curve via `--e-move`, 180ms | all controls |
| popover enter | 200ms / `.16,1,.3,1` / `translateY(-4px) scale(.97)`, origin at the anchor corner | identical, including `transform-origin` per anchor side | `layer-in` / `layer-in-up` |
| popover children | 220ms, 35ms stagger, capped at 6 | identical (30/65/100/135/170/205ms) | `layer-child` |
| dialog | 200ms `cubic-bezier(.215,.61,.355,1)` from `translateY(6px) scale(.97)`; scrim 200ms | identical | `dialog-in`, `scrim-in` |
| tooltip | 150ms `cubic-bezier(.23,1,.32,1)`, `translateY(4px) scale(.96)` | same timing and movement | `#tip` |
| disclosure | 320ms height, `.16,1,.3,1` | same: `Element.animate` on height in `app/inspector.js`, with the real `hidden` restore on finish | `disclose()` |
| toast | in from below, then hold | 200ms `translate(-50%,8px)` → 0 | `toast-in` |
| page change | reveal | 220ms `opacity + translateY(4px)` | `.sheet.pagein` |
| sheets/drawers | arrive from their edge | 220ms, 8–14px travel + fade (not a full-height slide that would move the canvas) | `.msheet`, `.drawer-l/r` |
| progress | 350ms linear | 350ms linear | `.progress-fill` |
| reduced motion | everything to 0.01ms | every animation `none`, every transition `1ms`, every press translate dropped, toast placed directly | `@media (prefers-reduced-motion: reduce)` |

Interaction states are complete by construction: hover, focus-visible, active, selected
(`aria-pressed` / `aria-selected` / `aria-checked` / `aria-current`), disabled (45% opacity, default
cursor), busy (a spinner that only exists while work is running), error (ink + words, never colour
alone).

## 3. Where the studio deliberately differs, and why

1. **Focus is an ink rule, not an orange outline.** The reference draws a 1.5px `#fd631f` outline on
   every focused control. The user's instruction is that no orange outline appears anywhere, and the
   anti-slop rules ask for focus to be visible without decoration. The studio uses a 2px rule in
   ink (`--focus`), 2px outside the box on open surfaces and drawn inwards inside scroll containers
   so it can never be clipped. Field focus is the field's own border turning to ink.
2. **No gradients, glass, glows or bevel highlights.** The reference's controls are skeuomorphic:
   top-lit gradients, inset shines, `backdrop-filter`, and an animated conic "beam". Those are
   named in the anti-slop rules as forbidden (gradients, glassmorphism, decorative glow, unnecessary
   blur, borders as a default crutch). The studio keeps the reference's *geometry* — slab sizes,
   radii ladder, control heights, type scale — and expresses the same physicality with four flat
   surface steps instead. No `backdrop-filter` is used anywhere.
3. **No ambient loops.** A rotate/marquee/flash loop communicates nothing about the user's task and
   costs frames while an artwork canvas is being panned. The workspace has no looping animation at
   rest; the only infinite animations are the spinner and progress pulse, which exist because work is
   actually happening, and `motioncheck.py` asserts the idle set is empty.
4. **The accent is not a state colour.** In the reference orange appears on hover borders, focus
   outlines, slider fills and keyframe buttons. Here it is reserved for the primary action, a switch
   that is on, the progress fill and status dots — so "orange" always means "this does something" or
   "this is on", never "you hovered".
5. **Menus exit faster than they enter** (70ms, no child stagger) so dismissal never waits on
   decoration. The reference simply unmounts.
6. **Sheets move less.** The reference's mobile panels arrive from the edge. A full-height slide
   under a canvas the user is reading is more motion than the change requires, so sheets travel 14px
   and fade.

## 3b. Fixes after first device testing

Two defects were found by opening the delivered single file on a phone, and both are now covered by
tests:

1. **Every mobile sheet button was dead in the built file.** The bundler flattens ES modules into one
   scope; `src/ui/sheet.js` ends with `export { … isOpen as isSheetOpen … }`, and the flattening step
   simply deleted that line, so `isSheetOpen` did not exist at run time. The dev server (real modules)
   never showed it. `build.mjs` now materialises every alias as `const isSheetOpen = isOpen;` at the end
   of that module's chunk, and `bundle-smoke.py` runs the shipped `file://` build on a phone to assert
   the bottom destinations and the overflow menu actually work.
2. **The overflow menu opened with its first item already ringed.** The layer focused its first item
   regardless of what opened it, so the ink focus rule drew a box around "Generate a story…" the
   moment a finger raised. Focus now lands on the layer itself for pointer/touch input, and on the
   first item only for keyboard input.
3. **All drop shadows removed** at the user's instruction: menus, dialogs, sheets, toasts, tooltips and
   the page sheet are now flat surfaces separated by fill and hairline.

## 4. Verification

`python3 /home/user/motioncheck.py` drives the built app and asserts the measured behaviour:

```
PASS press moves the primary action 1px down        [matrix(1,0,0,1,0,0.95)]
PASS press lands in 70ms                            [0.07s]
PASS hover is a fill change, not movement           [none]
PASS popover enters over 200ms                      [200]
PASS popover eases cubic-bezier(.16,1,.3,1)
PASS popover starts translateY(-4px) scale(.97)
PASS menu items follow at 220ms                     [5 children]
PASS menu items are staggered by 35ms               [[30,65,100,135,170]]
PASS dialog enters over 200ms                       [200]
PASS dialog uses the .215,.61,.355,1 curve
PASS dialog starts translateY(6px) scale(.97)
PASS scrim fades over the same beat                 [200]
PASS tooltip transition is 150ms
PASS section disclosure animates height over 320ms
PASS disclosure eases cubic-bezier(.16,1,.3,1)
PASS collapsed section is really hidden and short   [hidden, 0px]
PASS no looping animation runs while idle           [[]]
PASS no page errors
PASS reduced motion plays no enter animation        [[]]
PASS reduced motion drops the press translate       [none]

TOTAL 20 PASS 0 FAIL
```

Companion checks, all re-run after the change: `python3 journeys.py` → **40/40 PASS**;
`python3 sweep.py` → 10 viewports, `errs []`; `python3 bundle-smoke.py` → **16/16 PASS** on the
delivered `file://` build (phone boot, overflow menu, all five bottom destinations, project menu,
export dialog, no console errors on either shell); `python3 auditstyle.py` → 0 violations across 30
states, checking for both accent outlines/rings/borders and any non-inset drop shadow. The orange-outline audit
(`python3 /home/user/urltest_outline.py` and `urltest_outline2.py`) walks every element in the
default state, through a 40-stop keyboard focus sweep, across hover on 12 control types, and inside
the menu, the export dialog, the welcome dialog, the script workspace, the preview, the phone shell
and both phone sheets — matching computed `outline-color`, `box-shadow`, `background` and every
`border-*-color` against the accent values. **0 hits in every state.**
