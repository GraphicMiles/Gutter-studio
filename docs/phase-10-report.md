# Phase 10 - Completion report

The interface was erased and rebuilt from scratch against the specification. The renderer, artwork,
model, AI request format, persistence, exports and history were preserved; every surface above them
is new.

## What changed

**Shell.** One frame: `header 48px` → `context toolbar 40px` → `rail 48px` / `resource browser 240px`
(resizable 210–320) / canvas / `inspector 300px` (resizable 270–360) → `page filmstrip 112px`
(collapsible) → `status strip 22px`. Panels collapse independently and the header states which are
shown. The canvas is the only flexible region, so it stays dominant at every width.

**Visual system.** The §2.2 tokens exactly, white-first, one family (Inter + system), 4px spacing,
radii 6/8/10/12. No gradient, no blur, no glass, no emoji, no hand-drawn glyph, no nested cards, no
badge walls. Icons are Lucide only (`tools/icons.mjs` generates `src/ui/icons.js`, 92 icons at the
1.75 stroke the spec asks for), 18–20px in toolbars, 14–16px compact, and every icon-only control
carries an accessible name plus the same word as its tooltip.

**Surfaces.** Selection-aware inspector (page / panel / character / bubble / prop / cast), three-tab
resource browser with search and thumbnails that are the real artwork, page filmstrip with drag
reorder and drop indicators, a script workspace (structure outline beside the plain-text document,
Apply/Reload enabled only when there is something to apply), preview that renders the export SVG,
an export dialog with per-row idle/working/done/failed states, an AI dialog with honest phases
(idle → working with "Panel N of about M…" from the stream → checking → done, one retry with the
reason shown, cancel honoured), and a first-run card only on a genuinely empty install.

**Mobile.** Its own shell, not a shrink: 52px header with safe areas, canvas filling the space,
contextual quick-action strip (which also owns the "Tap a panel to place this character · ✕" state),
five bottom destinations, and one reusable sheet with half/full snaps, drag handle, keyboard-aware
body. Add, Edit and Script are the desktop browser and inspector rendered into that sheet from the
same `APP` state - no forked model, no second renderer. Context menus arrive as the same list in the
sheet, opened by long-press.

**Transients.** One layer stack: dropdowns, popovers, context menus and dialogs all close on Escape
(topmost only), on outside click, flip inside the viewport, trap and restore focus. Save states are
truthful: local write first, account mirror second, a failed write shows "Save failed · Retry" in the
header until it succeeds.

**Bugs fixed during the build rather than worked around**

- Dragging a character captured the pointer on press, which swallowed the click and made a tap on a
  character select the panel instead. Capture now happens only once the pointer has travelled.
- A drag ended with `suppressClick` set, so the very next click anywhere in the canvas was eaten.
  The flag is now consumed by the click it was meant for.
- New bubbles and captions focused fields that no longer exist on a phone; they now open the Edit
  destination and then focus the field.
- Export rows reported the wrong filename (and PNG/SVG/zip collided); each row now reports the file
  it actually wrote.
- The generate dialog skipped its first paint because the module handle was assigned after
  `onMount`; the idle explanation and the disabled Generate button now appear immediately.
- Placement stayed armed after one placement and kept swallowing panel clicks; it now resolves once.
- The script workspace rendered as a small card in the middle of the canvas; it now owns the surface.
- Drawers parked off-screen made the document scroll sideways between 768 and 1023px.
- In a short landscape window, fit-to-window shrank the page to a stamp; below 28% it now fits the
  width and lets the page scroll.

## What was tested

`node build.mjs --check` (name verification, collision and cycle detection, syntax) and
`node build.mjs` (production bundle, 319.9 KB, one file) both pass. There is no test runner in the
repository, so behaviour was verified in Chromium through Playwright at 1× and 2× DPR, against the
built bundle's source tree served locally.

**Six required journeys, automated, 40 assertions, all passing:**

- **A - Basic editing:** page select → character select → expression and pose → drag to reposition →
  add bubble (caret lands in the field) → type dialogue (appears in the SVG) → change bubble type →
  change page → return → edit survived.
- **B - Pages:** add → duplicate → drag-reorder (thumbnails prove the new order) → select the moved
  page → delete → undo restores it.
- **C - Script:** open workspace → change the title and dialogue → Apply reports "Applied: 1 page, 4
  panels." → project title and board both updated → board renders again on return.
- **D - AI:** dialog opens, options present; with no provider the control is disabled and the dialog
  says why. With a stubbed provider: failure → "The connection dropped… Trying once more…" →
  streaming panel counts → validate → success message; Undo restores the previous board.
- **E - Save and export:** edit shows "Saving…" then "Saved on this device"; all six exports produce
  real files (PNG 4.4 MB, SVG 49 KB, PDF 449 KB, zip 4.4 MB, Markdown, JSON). A forced storage
  failure shows "Save failed · Retry" and recovers on Retry.
- **F - Mobile (390×844, touch):** Pages sheet adds a page → Add places a character on a panel →
  Edit changes a property → sheet closes → quickbar adds dialogue → Script sheet opens and returns →
  More → export writes a real file → no horizontal overflow → no page errors.

**Viewports:** 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 360×800, 844×390 (landscape),
320×720 and 1000×600, each checked for horizontal and vertical overflow (none) and photographed.
Keyboard: tool shortcuts, `Ctrl+Z`/`Ctrl+Shift+Z`, `Ctrl+±`, `Ctrl+0`, `[`/`]`, `Delete`, `PageUp/Down`,
arrows inside panels and inside menus, Tab through dialogs, Escape closing the topmost layer with focus
returned to the control that opened it. Touch: tap select, long-press context sheet, pinch zoom,
drag-to-reposition.

## Limitations

- **AI is inert in a plain browser.** Generation and rewrite call the host's `claude.use('sample')`
  integration. Where that does not exist the controls are disabled and say so; both flows were
  verified with a stubbed provider, including failure, retry, streaming progress, validation and undo.
- **No account layer in a plain browser.** Persistence is `localStorage` under `gutter.studio.v1`.
  The optional database mirror and merge are implemented but only run where the host provides one.
- **No test runner, linter or type checker exists in the repository**, and none was added: the spec
  asks not to introduce a large test stack for this. Verification is the browser suite described above.
- **Inter is used when the system has it**; otherwise the stack falls back to the platform UI font.
  No font file is bundled, which keeps the product a single dependency-free HTML file.
- **Export rasterises in the browser**, so very large page counts take proportionally longer; PNG
  output is capped by the existing rasteriser's scale limit.
