import { $, toast } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { openContextMenu } from '../ui/layers.js';
import { pageSvg } from '../page/render.js';
import { APP, call } from './store.js';
import { curPage, edit } from './history.js';
import {
  addBubble, applyPlacement, clearPlacement, deletePanel, duplicatePanel, movePanel,
  selBubble, selChar, selPage, selPanel, selProp, selectionKind, selectionPanel,
} from './actions.js';

/* app/canvas.js: the work surface.
 *
 * The page is drawn by page/render.js; this module only decides where it sits, how big it is, and
 * what a pointer on it means. Everything selectable is a real object in the model — the hit targets
 * come from the renderer, so what you can click is exactly what was drawn.
 *
 * Zoom is a true scale: 100% means one page unit is one CSS pixel. Fit is a mode, not a number, so
 * the page keeps fitting when a panel is opened or the window changes size.
 */

const MIN_Z = 0.05, MAX_Z = 4;
const PAD = 24;

const pageSize = () => {
  const svg = $('#sheet svg');
  if (!svg) return null;
  const vb = svg.viewBox.baseVal;
  return { w: vb.width, h: vb.height };
};

function fitScale() {
  const stage = $('#stage'), size = pageSize();
  if (!stage || !size) return 1;
  const aw = stage.clientWidth - PAD * 2, ah = stage.clientHeight - PAD * 2;
  if (aw <= 0) return 1;
  const byW = aw / size.w;
  /* A webtoon strip is meant to be read by scrolling, so it fits the width and runs long. */
  if (APP.P.style.fmt === 'webtoon') return Math.min(byW, 1.5);
  const byH = ah / size.h;
  /* Whole page when it stays legible; below that, fit the width and let the page scroll rather
     than shrink the artwork into a stamp. */
  const whole = Math.min(byW, byH);
  if (whole < 0.28 && byW > whole) return byW;
  return whole;
}

function applyScale(animate) {
  const size = pageSize(), sheet = $('#sheet');
  if (!size || !sheet) return;
  /* Fit is whatever the space allows — a short landscape window gets a small page rather than a
     cropped one. Only manual zoom is held inside the usable range. */
  const scale = APP.view.fit ? fitScale() : APP.view.zoom;
  const next = APP.view.fit
    ? Math.min(MAX_Z, scale)
    : Math.max(MIN_Z, Math.min(MAX_Z, scale));
  APP.view.zoom = next;
  sheet.style.transition = animate ? '' : 'none';
  sheet.style.width = Math.round(size.w * next) + 'px';
  if (!animate) requestAnimationFrame(() => { sheet.style.transition = ''; });
  call('syncZoom', next);
}

function fitView(animate) {
  APP.view.fit = true;
  applyScale(animate !== false);
}

function setZoom(z, opts) {
  APP.view.fit = false;
  APP.view.zoom = Math.max(MIN_Z, Math.min(MAX_Z, z));
  applyScale(!!(opts && opts.animate));
}

function zoomStep(dir) {
  const base = APP.view.zoom || 1;
  const steps = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4];
  const next = dir > 0
    ? steps.find(s => s > base + 0.001) || MAX_Z
    : [...steps].reverse().find(s => s < base - 0.001) || MIN_Z;
  setZoom(next, { animate: true });
}

/* ── rendering ────────────────────────────────────────────────────────── */
let lastKey = '';

function renderCanvas(opts) {
  opts = opts || {};
  const wrap = $('#sheetwrap');
  const stage = $('#stage');
  if (!wrap || !stage) return;

  if (!APP.P || !APP.P.pages.length) {
    wrap.innerHTML = `<div class="stage-empty">${icon('panelsTopLeft')}
      <p>This project has no pages yet.</p>
      <button type="button" class="btn btn-primary" data-canvas-act="add-page">Add a page</button></div>`;
    return;
  }
  if (APP.workspace === 'script') { wrap.innerHTML = ''; stage.classList.add('is-script'); return; }
  stage.classList.remove('is-script');

  const page = curPage();
  if (!page) return;
  const key = APP.P.id + ':' + APP.pageIdx;
  const pageChanged = key !== lastKey;
  lastKey = key;

  const r = pageSvg(APP.P, APP.pageIdx, { sel: APP.sel, nums: false, uid: 'c', ui: true });
  const meta = `${APP.pageIdx + 1} / ${APP.P.pages.length} · ${page.panels.length} panel${page.panels.length === 1 ? '' : 's'}`;

  const scrollTop = stage.scrollTop, scrollLeft = stage.scrollLeft;
  wrap.innerHTML = `<div class="sheet${pageChanged && opts.turn !== false ? ' pagein' : ''}" id="sheet">${r.svg}</div>
    <div class="sheetmeta">${esc(meta)}</div>`;

  applyScale(false);
  if (opts.keepScroll) { stage.scrollTop = scrollTop; stage.scrollLeft = scrollLeft; }
  stage.dataset.tool = APP.place ? 'place' : APP.tool === 'pan' ? 'pan' : 'select';
  stage.setAttribute('aria-label', `Page ${APP.pageIdx + 1} of ${APP.P.pages.length}, ${page.panels.length} panels. Use Tab to reach a panel, arrow keys to move between panels.`);
}

/* only the selection changes: repaint the overlay without touching the scroll position */
function repaintSelection() {
  renderCanvas({ keepScroll: true, turn: false });
}

/* ── pointer ──────────────────────────────────────────────────────────── */
function hitInfo(el) {
  if (!el) return null;
  const h = el.dataset.hit;
  if (!h) return null;
  return { kind: h, pid: el.dataset.pid, i: el.dataset.i != null ? +el.dataset.i : null };
}

function selectFromHit(hit) {
  if (!hit) return;
  if (hit.kind === 'panel') selPanel(hit.pid);
  else if (hit.kind === 'char') selChar(hit.pid, hit.i || 0);
  else if (hit.kind === 'bubble') selBubble(hit.pid, hit.i || 0);
  else if (hit.kind === 'prop') selProp(hit.pid);
  else if (hit.kind === 'caption') { selPanel(hit.pid); call('focusCaption'); }
  else if (hit.kind === 'sfx') selPanel(hit.pid);
  else selPanel(hit.pid);
}

function contextItems(hit) {
  const p = hit ? (selectionPanel() || null) : null;
  const items = [];
  if (hit && hit.kind !== 'page') {
    items.push({ label: 'Select panel', icon: 'square', run: () => selPanel(hit.pid) });
    items.push({ label: 'Add character', icon: 'userRound', run: () => call('addCharacterToPanel') });
    items.push({ label: 'Add speech bubble', icon: 'messageSquare', run: () => call('addBubble') });
    items.push('-');
    items.push({ label: 'Move panel earlier', icon: 'arrowLeft', shortcut: '[', disabled: !p || p === curPage().panels[0], run: () => movePanel(-1) });
    items.push({ label: 'Move panel later', icon: 'arrowRight', shortcut: ']', disabled: !p || p === curPage().panels[curPage().panels.length - 1], run: () => movePanel(1) });
    items.push({ label: 'Duplicate panel', icon: 'copy', shortcut: 'Ctrl+D', run: () => duplicatePanel() });
    items.push('-');
    items.push({ label: 'Delete panel', icon: 'trash2', danger: true, run: () => deletePanel() });
  } else {
    items.push({ label: 'Add panel', icon: 'plus', run: () => call('addPanel') });
    items.push({ label: 'Add page', icon: 'filePlus', run: () => call('addPage') });
    items.push('-');
    items.push({ label: 'Fit to window', icon: 'maximize', shortcut: 'Ctrl+0', run: () => fitView(true) });
  }
  return items;
}

/* a guide line shows where a dragged character will land */
function showGuide(x) {
  const sheet = $('#sheet');
  if (!sheet) return;
  let guide = $('.drag-guide', sheet);
  if (!guide) {
    guide = document.createElement('div');
    guide.className = 'drag-guide';
    guide.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;background:var(--text-primary);opacity:.85;pointer-events:none;z-index:5';
    sheet.style.position = 'relative';
    sheet.appendChild(guide);
  }
  const r = sheet.getBoundingClientRect();
  guide.style.left = Math.round(x - r.left) + 'px';
  guide.style.display = 'block';
}
function hideGuide() {
  const g = $('.drag-guide');
  if (g) g.remove();
}

function wireCanvas() {
  const stage = $('#stage');

  /* ── click: selection, or placement ─────────────────────────────────── */
  stage.addEventListener('click', e => {
    if (stage.dataset.suppressClick === '1') { stage.dataset.suppressClick = '0'; return; }
    const act = e.target.closest('[data-canvas-act]');
    if (act) { if (act.dataset.canvasAct === 'add-page') call('addPage'); return; }
    const hitEl = e.target.closest('[data-hit]');
    const hit = hitInfo(hitEl);
    if (APP.place) {
      const pid = hit ? hit.pid : (curPage().panels[0] || {}).id;
      if (pid) {
        applyPlacement(pid);
        if (APP.place && APP.place.kind !== 'panel') { /* keep the tool armed for repeated placement */ }
      }
      return;
    }
    if (hit) selectFromHit(hit);
    else if (e.target.closest('#sheet')) selPage();
  });

  stage.addEventListener('contextmenu', e => {
    if (!e.target.closest('#sheet')) return;
    e.preventDefault();
    const hit = hitInfo(e.target.closest('[data-hit]'));
    if (hit) selectFromHit(hit);
    openContextMenu(e.clientX, e.clientY, contextItems(hit), 'Canvas actions');
  });

  /* ── keyboard on the page ───────────────────────────────────────────── */
  stage.addEventListener('keydown', e => {
    const cur = e.target.closest && e.target.closest('[data-hit]');
    if (!cur) return;
    const all = [...stage.querySelectorAll('[data-hit="panel"]')];
    const i = all.indexOf(cur);
    const go = n => {
      if (!n) return;
      e.preventDefault();
      selPanel(n.dataset.pid);
      const again = stage.querySelector(`[data-hit="panel"][data-pid="${n.dataset.pid}"]`);
      if (again) again.focus({ preventScroll: false });
    };
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(all[Math.min(all.length - 1, i + 1)] || all[0]);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(all[Math.max(0, i - 1)] || all[all.length - 1]);
    else if (e.key === 'Home') go(all[0]);
    else if (e.key === 'End') go(all[all.length - 1]);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFromHit(hitInfo(cur)); }
  });

  /* ── pointer: pan, drag a character, pinch ──────────────────────────── */
  const pointers = new Map();
  let mode = null;               // 'pan' | 'chardrag' | 'pinch'
  let start = null;
  let longPress = null;          // pending touch-hold on a page object

  stage.addEventListener('pointerdown', e => {
    if (e.button === 1 || (e.button === 0 && APP.tool === 'pan') || (e.button === 0 && e.altKey)) {
      mode = 'pan';
      start = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      stage.classList.add('panning');
      stage.setPointerCapture(e.pointerId);
      return;
    }
    if (e.pointerType === 'touch') {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        mode = 'pinch';
        start = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: APP.view.zoom };
        return;
      }
    }
    const hitEl = e.target.closest && e.target.closest('[data-hit]');
    const hit = hitInfo(hitEl);

    /* a finger held still on a panel is the touch equivalent of a right click */
    if (e.pointerType === 'touch' && hitEl && !APP.place) {
      longPress = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        timer: setTimeout(() => {
          longPress = null;
          stage.dataset.suppressClick = '1';
          selectFromHit(hit);
          openContextMenu(e.clientX, e.clientY, contextItems(hit), 'Canvas actions');
          if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { } }
        }, 480),
      };
    }

    if (!hit || hit.kind !== 'char' || APP.place) return;
    const p = selectionPanel();
    if (!p || p.who.length > 1) return;   // two-character panels have no free position to drag
    const sheet = $('#sheet');
    if (!sheet) return;
    const r = sheet.getBoundingClientRect();
    /* A press on a character may become a drag, but it is not one yet: the guide and the move only
       happen once the pointer has actually travelled. A plain click still selects. */
    mode = 'chardrag';
    start = { x: e.clientX, x0: e.clientX, sheetLeft: r.left, width: r.width, pid: hit.pid, moved: false, id: e.pointerId, captured: false };
  });

  stage.addEventListener('pointermove', e => {
    if (longPress && longPress.id === e.pointerId
      && Math.hypot(e.clientX - longPress.x, e.clientY - longPress.y) > 8) {
      clearTimeout(longPress.timer);
      longPress = null;
    }
    if (mode === 'pan' && start) {
      stage.scrollLeft = start.sl - (e.clientX - start.x);
      stage.scrollTop = start.st - (e.clientY - start.y);
      return;
    }
    if (mode === 'pinch' && pointers.size === 2) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (start && start.dist > 0) setZoom(start.zoom * (dist / start.dist));
      return;
    }
    if (mode === 'chardrag' && start) {
      if (!start.moved && Math.abs(e.clientX - start.x0) > 4) {
        start.moved = true;
        /* capture only once it is a drag: capturing on the press would steal the click from the
           object underneath and make a plain tap select the panel instead of the character */
        try { stage.setPointerCapture(start.id); start.captured = true; } catch (err) { }
      }
      if (start.moved) showGuide(e.clientX);
    }
  });

  const finish = e => {
    if (longPress) { clearTimeout(longPress.timer); longPress = null; }
    if (e && e.pointerType === 'touch') pointers.delete(e.pointerId);
    if (mode === 'pan') { mode = null; start = null; stage.classList.remove('panning'); }
    else if (mode === 'pinch') { mode = null; start = null; }
    else if (mode === 'chardrag' && start) {
      const wasDrag = start.moved;
      const rel = (e.clientX - start.sheetLeft) / Math.max(1, start.width);
      const pos = rel < 0.38 ? 'left' : rel > 0.62 ? 'right' : 'center';
      const p = selectionPanel();
      hideGuide();
      if (start.captured) { try { stage.releasePointerCapture(start.id); } catch (err) { } }
      mode = null; start = null;
      if (!wasDrag) return;                       /* a tap, not a drag: the click still selects */
      stage.dataset.suppressClick = '1';
      if (p && p.pos[0] !== pos) {
        edit(() => { p.pos = [pos]; }, 'pos' + p.id);
        toast('Character moved ' + (pos === 'center' ? 'to the centre' : 'to the ' + pos) + '.');
      }
    }
  };
  stage.addEventListener('pointerup', finish);
  stage.addEventListener('pointercancel', finish);

  /* ── wheel: modified wheel zooms, plain wheel scrolls ───────────────── */
  stage.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomStep(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  /* ── double click: go straight to the text ──────────────────────────── */
  stage.addEventListener('dblclick', e => {
    const hit = hitInfo(e.target.closest && e.target.closest('[data-hit]'));
    if (!hit) return;
    if (hit.kind === 'bubble') { selBubble(hit.pid, hit.i || 0); call('focusBubbleText', hit.pid, hit.i || 0); }
    else if (hit.kind === 'caption') { selPanel(hit.pid); call('focusCaption'); }
  });
}

/* the viewport watches its own box: a panel opening or closing must refit immediately */
function initCanvas() {
  const stage = $('#stage');
  if (window.ResizeObserver) new ResizeObserver(() => applyScale(false)).observe(stage);
  else addEventListener('resize', () => applyScale(false));
}

export { applyScale, fitView, initCanvas, pageSize, repaintSelection, renderCanvas, setZoom, wireCanvas, zoomStep };
