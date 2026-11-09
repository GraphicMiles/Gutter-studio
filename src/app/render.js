import { $ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { openMenu } from '../ui/layers.js';
import { APP, call, on } from './store.js';
import { HIST, curPage, setRenderer } from './history.js';
import { renderHeader } from './header.js';
import { renderToolbar } from './toolbar.js';
import { renderRail } from './rail.js';
import { renderBrowser } from './browser.js';
import { fitView, renderCanvas, zoomStep, zoomStep as _zs } from './canvas.js';
import { renderInspector } from './inspector.js';
import { renderPages } from './pages.js';
import { renderScript } from './scriptview.js';
import { isMobile, navHtml } from './shell.js';
import { deletePanel, duplicatePanel, movePanel, selectionKind, selectionPanel, selPanel } from './actions.js';

/* app/render.js: the one place that decides what gets repainted.
 *
 * Everything cheap (header, toolbar, status, quick actions) is a string rebuild. The expensive
 * things — the page and the page thumbnails — are only rebuilt when their inputs changed, which is
 * what the flags at the bottom of this file are about. A keystroke in a text field must never
 * rebuild the whole workspace.
 */

/* ── status strip ─────────────────────────────────────────────────────── */
function renderStatus() {
  const root = $('#status');
  if (!root) return;
  const p = selectionPanel();
  const kind = selectionKind();
  const pg = curPage();
  const idx = p ? pg.panels.findIndex(x => x.id === p.id) + 1 : 0;
  const pct = Math.round((APP.view.zoom || 1) * 100);
  const sel = kind === 'page' ? 'No selection'
    : kind === 'panel' ? `Panel ${idx} of ${pg.panels.length}`
      : kind === 'char' ? 'Character selected'
        : kind === 'bubble' ? 'Bubble selected'
          : kind === 'prop' ? 'Prop selected'
            : 'Character selected';
  root.innerHTML = `
    <span class="sitem">${icon('fileText')}Page ${APP.pageIdx + 1} of ${APP.P.pages.length}</span>
    <span class="sitem">${icon('square')}${esc(sel)}</span>
    <span class="sp"></span>
    <span class="sitem zoomctl">
      <button type="button" data-zoom="out" aria-label="Zoom out" data-tip="Zoom out  Ctrl+−">${icon('minus')}</button>
      <button type="button" class="zoomval" data-zoom="fit" data-tip="Fit page  Ctrl+0" aria-label="Zoom ${pct}%. Fit page">${pct}%</button>
      <button type="button" data-zoom="in" aria-label="Zoom in" data-tip="Zoom in  Ctrl++">${icon('plus')}</button>
      <button type="button" data-zoom="actual" data-tip="Actual size">100%</button>
    </span>`;
}

/* ── mobile contextual quick actions ──────────────────────────────────── */
function renderQuickbar() {
  const root = $('#quickbar');
  if (!root) return;
  if (!isMobile()) { root.innerHTML = ''; return; }

  /* an armed placement takes over the strip: it says what is about to be placed, and how to stop */
  if (APP.place) {
    const what = APP.place.kind === 'cast' ? 'character' : APP.place.kind;
    root.innerHTML = `<span class="qname" data-place-prompt>Tap a panel to place this ${esc(what)}</span>
      <span class="sep"></span>
      <button type="button" class="iconbtn" data-quick="cancel" aria-label="Cancel placing" data-tip="Cancel">${icon('x')}</button>`;
    root.onclick = e => { if (e.target.closest('[data-quick="cancel"]')) call('clearPlacement'); };
    return;
  }

  const kind = selectionKind();
  const p = selectionPanel();
  const label = kind === 'page' ? 'No selection'
    : kind === 'panel' ? 'Panel' : kind === 'char' ? 'Character' : kind === 'bubble' ? 'Bubble' : kind === 'prop' ? 'Prop' : 'Character';
  const acts = [];
  if (kind === 'panel' || kind === 'char' || kind === 'bubble' || kind === 'prop') {
    if (p) {
      acts.push(['bubble', 'messageSquare', 'Add bubble', () => call('addBubble', p)]);
      acts.push(['dup', 'copy', 'Duplicate', () => duplicatePanel(p)]);
      acts.push(['edit', 'penLine', 'Edit', () => call('openDestination', 'edit')]);
      acts.push(['del', 'trash2', 'Delete', () => (kind === 'panel' ? deletePanel(p) : call('openDestination', 'edit'))]);
    }
  } else {
    acts.push(['add', 'plus', 'Add', () => call('openDestination', 'add')]);
    acts.push(['pages', 'layers', 'Pages', () => call('openDestination', 'pages')]);
  }
  root.innerHTML = `<span class="qname">${esc(label)}</span><span class="sep"></span>` +
    acts.map(([id, ic, name, fn]) => `<button type="button" class="iconbtn" data-quick="${id}" aria-label="${name}" data-tip="${name}">${icon(ic)}</button>`).join('');
  root.onclick = e => {
    const b = e.target.closest('[data-quick]');
    if (!b) return;
    const hit = acts.find(a => a[0] === b.dataset.quick);
    if (hit) hit[3]();
  };
}

/* ── nav state ────────────────────────────────────────────────────────── */
function renderNav() {
  const nav = $('#nav');
  if (!nav) return;
  nav.innerHTML = navHtml();
}

/* ── everything ───────────────────────────────────────────────────────── */
function renderChrome() {
  renderHeader();
  renderToolbar();
  renderRail();
  renderBrowser();
  renderInspector();
  renderStatus();
  renderNav();
  renderQuickbar();
}

function renderBoard(opts) {
  if (APP.workspace === 'script') renderScript();
  else renderCanvas(opts);
}

function renderAll(opts) {
  renderChrome();
  renderBoard(opts);
  if (!isMobile()) renderPages();
}

function renderAfterEdit(opts) {
  /* history hands us the options the caller passed to edit() */
  renderHeader();
  renderToolbar();
  renderStatus();
  renderBoard({ turn: !!(opts && opts.turn) });
  if (opts && opts.insp === false) { /* the field being typed in keeps its DOM */ }
  else renderInspector();
  if (!(opts && opts.quiet) && !isMobile()) renderPages();
  renderBrowser();
  renderQuickbar();
}

/* the history module paints through this, so it never has to import the UI */
setRenderer(mode => {
  if (mode === 'all') { renderAll(); return; }
  renderAfterEdit(mode && typeof mode === 'object' ? mode : {});
});

/* ── hooks the rest of the app calls ──────────────────────────────────── */
on('syncChrome', () => {
  renderHeader();
  renderToolbar();
  renderRail();
  renderInspector();
  renderCanvas({ keepScroll: true, turn: false });
  if (APP.workspace === 'script') renderScript();
  renderStatus();
  renderNav();
  renderQuickbar();
  renderBrowser();
});
on('pageChanged', () => { renderBoard({ turn: true }); renderStatus(); if (!isMobile()) renderPages(); });
on('syncZoom', z => {
  const btn = $('#status [data-zoom="fit"]');
  if (btn) {
    btn.textContent = Math.round(z * 100) + '%';
    btn.setAttribute('aria-label', `Zoom ${Math.round(z * 100)} percent. Fit page`);
  }
});
on('fitView', animate => fitView(animate));
on('renderAll', () => renderAll());
on('refreshAll', () => renderAll());
on('refreshPages', () => { if (!isMobile()) renderPages(); });

export { renderAll, renderBoard, renderChrome, renderNav, renderPages, renderQuickbar, renderStatus };
