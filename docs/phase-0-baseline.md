# Phase 0 — Repository reconnaissance and feature mapping

**Baseline commit:** `3fab95f` (GraphicMiles/Gutter-studio), single commit, zero dependencies.
**Baseline build:** `node build.mjs --check` → **FAILED** at first run
`✗ src/app/menubar.js imports delPanel, dupPanel, movePanel from src/app/inspector.js`.
The checked-in `dist/` was empty and the working tree carried an unfinished earlier UI pass
(`actions.js`, `menu.js`, `sheet.js` untracked, 10 files modified, +1464/−833). There was no test
runner, no lint config and no type checker in the repository, so build + browser verification is the
whole test surface.

## Architecture as found

| Layer | Files | Role |
| --- | --- | --- |
| Build | `build.mjs` | zero-dep bundler: walks imports from `src/app/boot.js`, verifies names, rejects collisions and import cycles, strips ESM, flattens `src/styles/index.css`, `node --check`s the bundle, inlines everything into one HTML file |
| Model | `src/model/{schema,validate,script,prompt}.js` | project schema, `LIM` limits, `validate()`/`newProject()`/`randChar()`, script round-trip, AI prompt builder |
| Core | `src/core/{enums,palette,kit,geom,text,util,ids}.js` | vocabularies, palettes, drawing kit, geometry, type helpers, ids |
| Page | `src/page/{layout,frame,render}.js` | grid solver, figure placement, SVG page renderer |
| Art | `src/art/{figure,cat,scenery,props,bubbles}.js` | characters, cats, settings, props, balloons |
| I/O | `src/io/{raster,zip,pdf,paths}.js` | canvas rasteriser, hand-rolled zip, PDF writer, filenames |
| UI | `src/ui/{icons,layers,sheet,motion}.js` | icon set, layer stack, bottom sheet, motion helpers |
| App | `src/app/*` | store, actions, shell, header, toolbar, rail, browser, canvas, inspector, pages, script, preview, exports, AI, welcome, projects, render, persist, sync, wiring, boot |

Data model: `project {v,id,title,t,brief,style,cast[],pages[]}`, `page {id,layout,panels[]}`,
`panel {id,shot,setting,tone,who[≤2],expr,look,pose,pos,prop,caption,bubbles[≤4],sfx,note}`.
Limits: 6 cast, 24 pages, 9 panels/page, 4 bubbles/panel, 200 chars text, 80 chars title.

## Feature inventory → interface destination

| Existing capability | New location |
| --- | --- |
| New / duplicate / delete / import project, rename, project switcher | header project menu (name button) |
| Save state, retry save | header save chip (saved / saving / failed + Retry) |
| Undo / redo (900 ms coalescing, 80 entries) | header centre, `Ctrl+Z` / `Ctrl+Shift+Z` |
| Zoom in/out/fit/actual, pan, pinch | status strip + `Ctrl±`, `Ctrl+0`, pan tool |
| Selection of page / panel / character / bubble / prop / cast | canvas hits, resource rows, outline rows → contextual inspector |
| Shot, scene, tone, prop, background, position, caption, SFX, note | context toolbar (common) + inspector (all) |
| Character identity, expression, look, pose, appearance (skin, hair, outfit, collar, glasses, hat, nose, cat) | inspector character sections + context toolbar expression/position |
| Two-character panels, swap, remove, randomise look | inspector Characters section + resource browser |
| Bubble type, speaker, text | context toolbar + inspector Words section + canvas double-click |
| Add / duplicate / delete / reorder panels | context toolbar, canvas context menu, `[` `]`, `Ctrl+D`, `Delete` |
| Add / duplicate / delete / reorder / hide pages, page filmstrip | page navigator (desktop strip, mobile Pages sheet) |
| Layout selector, panels-per-page | page context toolbar + inspector |
| Style presets (6), tone/line/paper/pattern/radius/gutter/margin/grain/font | inspector Page style / Project sections |
| Script round-trip (read, edit, apply, reload) | Script workspace (desktop) and Script destination (mobile) |
| AI story generation (brief, format, pages, panels, genre, keep cast, append) | Generate dialog / More → Generate |
| Per-panel AI rewrite | inspector "Rewrite with Claude" |
| Preview (real output only) | header Preview / More → Preview |
| Export PNG, PDF, ZIP, SVG, JSON, Markdown | Export dialog / More → Export |
| First-run templates (comic, manga, webtoon, storyboard) | welcome card on a genuinely empty install |
| localStorage persistence + optional account mirror | `persist.js` / `sync.js` (unchanged behaviour, honest states) |

## Constraints that shaped the work

- One shared `APP` state for desktop and mobile; no second model, no forked renderer.
- No new framework, router, state or persistence library; bundle stays one file, zero dependencies.
- The renderer, artwork, prompt format, export writers and history stay as implemented — only their
  surfaces changed.
- Presentation split: where a control's wording is described ("Not available in this build"), it
  must be true of the capability, not a mock of it.
