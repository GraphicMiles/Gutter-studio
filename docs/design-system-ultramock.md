# Design system: Ultramock → Gutter Studio

The reference is `https://www.ultramock.io/editor`. It was measured in a real browser (Chromium,
1512×950 at 2× device pixel ratio) rather than eyeballed: computed styles, box rectangles, radius
histograms and type dumps were read off the live page. The captures and raw measurements live in
`/home/user/ultra/` (`measure2.json`, `vars.json`, `g-tokens.json`, `e-01-full.png`…).

Three files carry the system:

- `src/styles/tokens.css` — the values, named for what they do in this product.
- `src/styles/skin.css` — the surface language: how slabs, controls and floating layers are built
  out of those values. Imported after `components.css`.
- `src/styles/motion.css` — the interaction and transition system, measured from the same reference.
  Documented in `docs/motion-study.md`.

Surfaces are flat. The reference's geometry, type scale, radii ladder and control heights are kept;
its gradients, glass, glows, inset highlights and bevels are not used, per the anti-slop rules. Four
background steps do the work those effects were doing: window ground → chrome slab → card → white
well, with one hairline where two equal steps meet.

Nothing in the renderer, the artwork, the data model, the AI request format, the persistence layer
or the export paths was touched. This document is about surfaces, type and state only.

---

## 1. What the reference actually is

Ultramock's editor is a soft, light-grey page with **chrome that floats on it**. There is no window
frame, no 1px app border, no flat toolbar: the top bar, the right properties rail and the bottom
media bar are separate rounded slabs, each with a hairline edge, an inset white highlight along the
top and exactly one soft drop shadow. The page gradient shows between and around them.

Inside a slab, the same two-material logic repeats at a smaller scale:

- **wells** sink — inputs, slider tracks, segmented grooves (inset shadow, no border)
- **chips** catch light — buttons, pills, the selected segment (top-lit gradient + 1px edge + drop)

One accent, an orange (`#fd631f`), and it is rationed: primary action, slider fill, progress, the
one "on" state. Everything else is neutral grey on grey. Type is Geist, in four sizes.

## 2. Reference values → product tokens

| Reference (measured) | Value | Product token | Where it lands |
| --- | --- | --- | --- |
| page ground | `radial-gradient(120% 80% at 50% 0%, #f7f7f8, #ececee 55%, #e4e4e7)` | `--app-bg:#e9e9ea` (one flat step, no gradient) | `body`, the gap between slabs |
| appbar slab | `#f3f3f4`, border `rgba(0,0,0,.06)`, `inset 0 1px 0 #fff`, `0 12px 32px -20px rgba(0,0,0,.12)`, r28, `x14 y14 h40` | `--surface:#f4f4f5`, `--frame-border`, `--frame-inset:14px`, `--frame-gap:10px`, `--r-7:28px` | `.appbar`, `.ctxbar` (r20), `.rail`, `.browser`, `.canvas`, `.pages`, `.status` |
| section card | `#fbfbfb`, border `rgba(0,0,0,.055)`, r24, pad `0 10px` | `--surface-card:#fafafa`, `--card-border`, `--r-6` | inspector rows, outline/doc panels, floating layers |
| well | `#fff` + inset highlight + 3-step shadow | `--surface-well:#ffffff` + `--card-border` hairline | `.input`, `.seg` selected cell, chosen tool, page sheet, thumbnails |
| groove | `rgba(0,0,0,.05)` + inset shadow | `--surface-muted:#eeeef0` / `--surface-sunken:#e2e2e4` (flat steps) | `.seg` track, slider tracks, toggle track, canvas recess |
| chip | `linear-gradient(180deg,#fff,#f7f7f8)` + shine + drop | one flat step: `--surface-muted` idle → `--surface-well` engaged | `.btn`, `.iconbtn`, `.tool`, `.row` |
| primary action | `#fd631f`, white label, hover `#ff8a4c` | `--accent`, `--accent-hot`, `--accent-strong-press` | Export, Apply script, quickbar primary |
| switch on / progress | accent fill, glow | `--accent` flat, no glow | `.toggle input:checked`, `.progress-fill` |
| ink | `#09090b` / `rgba(0,0,0,.68)` / `rgba(0,0,0,.38)` | `--text-primary` / `--text-secondary` / `--text-tertiary` | all text |
| divider | `rgba(0,0,0,.06)`, strong `.12` | `--separator`, `--separator-strong` | hairlines inside slabs |
| tag | `rgba(0,0,0,.045)` + `inset 0 0 0 1px rgba(0,0,0,.06)` | `--surface-muted` + ink label | `.kindtag`, `PANEL`, `1 OF 4` |
| title | Geist 17 / 600 / −0.17px | `--fs-title` | project name, section titles |
| control text | Geist 13 / 500 | `--fs-label` | buttons, fields, rows |
| secondary text | Geist 11.5 / 400 | `--fs-desc` | descriptions, row sublabels |
| section label | Geist 10 / 500 / +0.4px, uppercase | `--fs-section`, `--track-label` | `SHOT`, `SCENE`, `PROP`, `PAGES`, `PANEL 1 OF 4` |
| radii | 8, 10, 14, 16, 20, 24, 28, 32, 999 | `--r-1 … --r-7`, `--r-pill` | ladder below |
| appbar geometry | `h40`, pad `0 6px`, r28 | `--h-header:44px` (44 gives 32px controls a comfortable slab), `--frame-inset:14px`, `--frame-gap:10px` | `.app`, `.appbar` |
| right rail | `312px`, sections r24, pad `0 6px 6px` | `--w-inspector:308px` | `.inspector` |
| slider row | `h38`, radius `14px 0 0 14px` | `.slider` height 38, radius `--r-3` | inspector sliders |

Radii ladder, as used: `8` micro-tags · `10` inner rows · `14` fields, chips, buttons · `16` panel
wells · `20` ctxbar · `24` cards, panels, page sheet · `28` appbar, nav pill, media bar · `32`
picker tiles · `999` pills only (`.pill`, toggle knob, swatch).

## 3. Structure mapping

| Ultramock editor | Gutter Studio |
| --- | --- |
| floating top capsule: menu, logo, sign-in, Templates → progress, Upgrade, **Export**, undo/redo, help/present | `.appbar`: mark, project menu + name, save state → undo/redo, view switches, Preview, **Export**, overflow |
| second row of workspace tabs | `.ctxbar`: Board / Script, then the contextual controls for the current selection, all on a r20 slab |
| left tool rail | `.rail`: 44px column of chip buttons; active tool marked with an accent underline inside the chip |
| centre canvas, recessed | `.canvas` r24, page sheet r24 floating on a groove, page meta under it, zoom in the status line |
| right properties rail: collapsible sections with uppercase labels, slider rows with numeric fields, PRO tags | `.inspector` r24, sections as `--surface-card` cards, `.row` controls, `.kindtag` where the reference uses a PRO/meta tag |
| bottom media transport bar | `.pages` strip r24 with thumbnails and its own icon row |
| Export popover: segmented scope, select, toggles, one orange primary | `.dialog` / export sheet: same anatomy — seg + select + toggles + orange primary, r20 slab, `--sh-dialog` |
| device/template picker cards r32 | welcome tiles r32 |

## 4. Control states, as built

State is fill and ink. No state in this product is drawn as an orange outline, ring or glow.

- **Button (`.btn`)** — hairline + white fill at rest; hover drops the fill one step; active drops it
  another and moves 1px down for 70ms; `.btn-primary` is flat accent with a white label.
- **Icon button (`.iconbtn`, `.tool`)** — 28–34px target; engaged (`aria-pressed`/`aria-expanded`)
  is a white cell with an ink hairline. The chosen rail tool also carries a 2px ink rule under its
  glyph, so the rail reads at a glance without a colour cue.
- **Segmented (`.seg`)** — one recess (`--surface-muted`) with a single white cell for the current
  value, separated by its hairline rather than by borders between cells.
- **Field (`.input`, `.select`)** — white, one hairline; focus turns that hairline to ink and adds an
  inner ink rule. No halo.
- **Toggle** — a recess with a white knob; when on, the track is accent. The knob may overshoot on
  the spring curve (`cubic-bezier(.34,1.56,.64,1)`, 220ms) because it is landing in a detent.
- **Slider** — recess track, white thumb that scales to 1.12 on hover and .96 on press (120ms),
  numeric field to the right, as the reference pairs them.
- **Swatch** — flat tile; the chosen one is ringed in ink, at a radius that clears its neighbours.
- **Menu / popover (`.pop`)** — floating card r16, `--sh-menu`, entering over 200ms from
  `translateY(-4px) scale(.97)` at its anchor corner; items arrive 35ms apart. A checked item is
  500 weight with a 6px ink dot instead of a tick glyph. Keyboard focus is an inward ink rule.
- **Dialog** — `--surface-card` slab r24, `--sh-dialog`, scrim is ink at 34% with no blur; on a phone
  it becomes a full-height sheet keeping the top radii only.
- **Toast / tooltip** — a dark ink pill (`--text-primary`) with white text; tips are for pointers only
  and never carry state the interface does not also show in text.
- **Focus, everywhere** — a 2px ink rule, 2px outside the box; drawn inwards inside scroll containers
  so it is never clipped; inverted to white on the dark ink surfaces. A layer opened by a touch or a
  click puts focus on the layer itself (so a screen reader reads it) without ringing any item; opened
  by the keyboard, the first item takes focus so Arrow keys and Enter work immediately.
- **No shadows at all.** Nothing in the product casts one: `--sh-*` are all `none`, and a layer that
  floats above content separates by a fill step plus a stronger hairline (`--layer-border`).

## 5. Layout logic

The window is a stack of slabs on one ground colour, with a fixed 14px inset and 10px gutters:

```
.app  padding 14, gap 10, ground = --page-ground
├── .appbar            slab r28, h44
├── .ctxbar            slab r20, h40, scrolls horizontally instead of overflowing
└── .work  (grid)      gap 10
    ├── .rail          slab r20, 44 wide
    ├── .browser       slab r24 (docked ≥1024, drawer 768–1023)
    ├── .canvas        slab r24, stage recessed one step, page sheet on --surface-well
    └── .inspector     slab r24, --w-inspector, resizable at ≥1024
├── .pages             slab r24 filmstrip
└── .status            slab r20 status line
```

Below 768px the same slabs are reused with 10px insets and an 8px gutter; `.nav` becomes an r24 pill
with five 48px destinations labelled in the 9.5/500 uppercase micro-type, the current destination a
white cell inside it. `.quickbar` is a matching floating pill. No second
mobile layout exists: the drawer, sheet and nav are the docked panels re-mounted by the shell.

## 6. What was deliberately *not* copied

- **Gradients, glass, glows and bevels.** The reference builds every control from top-lit gradients,
  inset white shines, `backdrop-filter` and one animated conic "beam"; `data-um-skin="glass"` blurs
  and saturates the slabs. None of it is used here: gradients, glass, decorative glow, unnecessary
  blur and default border styling are forbidden by the anti-slop rules, and a blurred slab behind a
  moving art canvas costs frames. The geometry, the radii, the type scale and the control heights are
  kept; separation is expressed as four flat surface steps plus one soft shadow on layers that
  genuinely float above content (menus, dialogs, sheets).
- **The orange focus outline.** Every control in the reference draws a 1.5px `#fd631f` outline on
  `:focus-visible`, and orange also appears on hover borders and slider fills. Here focus is an ink
  rule and the accent is reserved for primary action, a switch that is on, progress and status dots.
  See `docs/motion-study.md` §3.
- **The dark theme.** Every reference token has a dark pair, but this product ships one theme, and
  inventing a second one would be a claim the build cannot back. All colour lives in tokens, so a
  dark set is a token file away, not a rewrite.
- **The 32px picker tiles on first paint.** Our welcome keeps r32 tiles, but the sample project is
  restored on load, so the picker is one click away rather than the landing state.
- **The timecode transport bar.** Our bottom bar is the page filmstrip (the thing this product
  actually steps through) in the same floating-slab form; a scrubber would have been a control
  without a meaning.

## 7. Verification

- `node build.mjs` → single file, zero dependencies; `node build.mjs --check` → no duplicate
  top-level names, no cycles, bundle parses.
- `python3 journeys.py` → 40/40 across the desktop, tablet and phone shells.
- `python3 motioncheck.py` → 20/20 asserting the reference's timings, curves, staggers, disclosure
  and reduced-motion behaviour (see `docs/motion-study.md`).
- Orange-outline audit: every element in every state (default, 40-stop keyboard focus sweep, hover on
  12 control types, menu, export dialog, welcome dialog, script workspace, preview, phone shell and
  both phone sheets) is checked against the accent values in computed `outline-color`, `box-shadow`,
  `background` and every `border-*-color` → 0 hits.
- `python3 sweep.py` → 10 viewports (1440×900, 1280×800, 1024×768, 1000×600, 768×1024, 430×932,
  390×844, 360×800, 844×390, 320×720): no horizontal overflow, no page errors.
- Screenshots: `/home/user/shots/final-desktop.png`, `final-tablet.png`, `final-mobile.png`.
