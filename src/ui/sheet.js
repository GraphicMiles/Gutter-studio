import { $, $$ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from './icons.js';
import { pushLayer, removeLayer } from './layers.js';

/* ui/sheet.js: the one bottom sheet the phone uses.
 *
 * Three positions and nothing in between: closed, half (52% of the usable height) and full (90%).
 * The handle follows the finger; on release it snaps to the nearer position, and a decisive drag
 * down closes it. Content scrolls inside the body, so a drag that starts on the body scrolls the
 * body and a drag that starts on the handle moves the sheet — the gesture is decided by where it
 * begins, never guessed from the direction.
 */

const HALF = 0.52;
const FULL = 0.9;

let hostEl = null, sheetEl = null, bodyEl = null, scrimEl = null, opts = null;

const isOpen = () => !!sheetEl;

function heightFor(snap) {
  const avail = innerHeight;
  return Math.round(avail * (snap === 'full' ? FULL : HALF));
}

function applySnap(snap, animate) {
  if (!sheetEl) return;
  sheetEl.dataset.snap = snap;
  sheetEl.style.transition = animate === false ? 'none' : '';
  sheetEl.style.height = snap === 'full' ? '90%' : '52%';
  opts.snap = snap;
  const grab = $('.msheet-grab', sheetEl);
  if (grab) grab.setAttribute('aria-valuenow', snap === 'full' ? '90' : '52');
}

function openSheet(cfg) {
  if (sheetEl) { paintSheet(cfg); return sheetEl; }
  opts = { snap: cfg.snap === 'full' ? 'full' : 'half', title: cfg.title || '', onClose: cfg.onClose };

  hostEl = document.createElement('div');
  hostEl.className = 'msheet-host';
  hostEl.innerHTML = `<div class="msheet-scrim"></div>
    <div class="msheet" role="dialog" aria-modal="false" aria-label="${esc(cfg.title || 'Panel')}" data-snap="${opts.snap}">
      <div class="msheet-head">
        <div class="msheet-grab" role="slider" tabindex="0" aria-label="Resize panel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${opts.snap === 'full' ? 90 : 52}"></div>
        <div class="msheet-titlebar">
          <h2 class="msheet-title"></h2>
          <button type="button" class="iconbtn" data-sheet-expand aria-label="Expand panel">${icon('chevronUp')}</button>
          <button type="button" class="iconbtn" data-sheet-close aria-label="Close panel">${icon('x')}</button>
        </div>
      </div>
      <div class="msheet-body"></div>
    </div>`;
  ($('#layers') || document.body).appendChild(hostEl);
  sheetEl = $('.msheet', hostEl);
  bodyEl = $('.msheet-body', hostEl);
  scrimEl = $('.msheet-scrim', hostEl);
  sheetEl.style.height = heightFor(opts.snap) + 'px';

  requestAnimationFrame(() => scrimEl.classList.add('on'));
  paintSheet(cfg);
  pushLayer(closeSheet);

  scrimEl.addEventListener('click', () => closeSheet());
  $('[data-sheet-close]', hostEl).addEventListener('click', () => closeSheet());
  $('[data-sheet-expand]', hostEl).addEventListener('click', () => {
    applySnap(opts.snap === 'full' ? 'half' : 'full');
    $('[data-sheet-expand]', hostEl).innerHTML = icon(opts.snap === 'full' ? 'chevronDown' : 'chevronUp');
    $('[data-sheet-expand]', hostEl).setAttribute('aria-label', opts.snap === 'full' ? 'Reduce panel' : 'Expand panel');
  });
  /* keyboard equivalent for the drag handle */
  $('.msheet-grab', hostEl).addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); applySnap('full'); }
    if (e.key === 'ArrowDown') { e.preventDefault(); applySnap('half'); }
  });

  drag($('.msheet-head', hostEl));
  addEventListener('resize', onResize);
  return sheetEl;
}

function paintSheet(cfg) {
  if (!sheetEl) return;
  opts.title = cfg.title || opts.title;
  $('.msheet-title', sheetEl).textContent = opts.title;
  if (cfg.html != null) bodyEl.innerHTML = cfg.html;
  if (cfg.onMount) cfg.onMount({ body: bodyEl, sheet: sheetEl, close: closeSheet, setSnap: applySnap });
  if (cfg.snap) applySnap(cfg.snap);
}

function closeSheet(refocus) {
  if (!sheetEl) return;
  const el = sheetEl, h = hostEl, o = opts;
  sheetEl = null; bodyEl = null; opts = null;
  removeEventListener('resize', onResize);
  h.style.pointerEvents = 'none';
  el.style.height = '0px';
  scrimEl.classList.remove('on');
  setTimeout(() => h.remove(), 280);
  removeLayer(closeSheet);
  if (o && o.onClose) o.onClose(refocus);
}

function onResize() {
  if (!sheetEl || !opts) return;
  sheetEl.style.height = heightFor(opts.snap) + 'px';
}

/* the handle: a drag that starts here moves the sheet, and only this */
function drag(handle) {
  let startY = 0, startH = 0, dragging = false;
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    startY = e.clientY;
    startH = sheetEl.getBoundingClientRect().height;
    handle.setPointerCapture(e.pointerId);
    sheetEl.style.transition = 'none';
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const h = Math.max(80, Math.min(innerHeight * .94, startH + (startY - e.clientY)));
    sheetEl.style.height = h + 'px';
    scrimEl.style.opacity = String(Math.min(1, h / (innerHeight * HALF)));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheetEl.style.transition = '';
    scrimEl.style.opacity = '';
    const h = sheetEl.getBoundingClientRect().height;
    if (h < innerHeight * .3) { closeSheet(); return; }
    applySnap(h > innerHeight * .7 ? 'full' : 'half');
    const b = $('[data-sheet-expand]', hostEl);
    if (b) {
      b.innerHTML = icon(opts.snap === 'full' ? 'chevronDown' : 'chevronUp');
      b.setAttribute('aria-label', opts.snap === 'full' ? 'Reduce panel' : 'Expand panel');
    }
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

/* The touch version of a context menu: the same items, as finger-sized rows in the one sheet. */
function contextSheet(items, label) {
  openSheet({
    title: label || 'Actions',
    snap: 'half',
    html: `<div class="list">${items.map((it, i) => it === '-' ? '<div class="list-sep"></div>'
      : `<button type="button" class="row" data-cm="${i}"${it.disabled ? ' disabled' : ''}>
           <span class="row-thumb">${it.icon ? icon(it.icon) : ''}</span>
           <span class="row-text"><span class="row-name">${esc(it.label || '')}</span></span>
         </button>`).join('')}</div>`,
    onMount({ body }) {
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-cm]');
        if (!b) return;
        const it = items[+b.dataset.cm];
        if (!it || it.disabled) return;
        closeSheet();
        setTimeout(() => { if (it.run) it.run(); }, 0);
      });
    },
  });
}

export { closeSheet, contextSheet, isOpen as isSheetOpen, openSheet };
