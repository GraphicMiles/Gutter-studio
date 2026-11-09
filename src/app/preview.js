import { $ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { pageSvg } from '../page/render.js';
import { APP } from './store.js';
import { goPage } from './actions.js';

/* app/preview.js: the page as a reader sees it.
 *
 * No selection, no handles, no panel numbers — the same SVG that export produces, at reading size.
 * Leaving preview restores the editor exactly where it was: it opens on the current page and never
 * changes the stored page index unless the reader navigates, which they can undo by leaving.
 */

let overlay = null, cursor = 0, restoreScroll = 0, pageWidth = 0;

/* reading width: as large as the page's own units allow without upscaling past 1:1, and never
   wider than the window */
function fitPage() {
  if (!overlay) return;
  const stage = $('.preview-stage', overlay), holder = $('.preview-page', overlay);
  const svg = $('svg', holder);
  if (!stage || !svg) return;
  const vb = svg.viewBox.baseVal;
  const avail = stage.clientWidth - 40;
  const scale = Math.min(1, avail / vb.width);
  holder.style.width = Math.round(vb.width * scale) + 'px';
}

function paintPreview() {
  if (!overlay) return;
  const r = pageSvg(APP.P, cursor, { uid: 'pv' });
  $('.preview-page', overlay).innerHTML = r.svg;
  const label = $('.pcount', overlay);
  if (label) label.textContent = `${cursor + 1} / ${APP.P.pages.length}`;
  const prev = $('[data-pv="prev"]', overlay), next = $('[data-pv="next"]', overlay);
  if (prev) prev.disabled = cursor === 0;
  if (next) next.disabled = cursor === APP.P.pages.length - 1;
  fitPage();
}

function step(dir) {
  const next = Math.max(0, Math.min(APP.P.pages.length - 1, cursor + dir));
  if (next === cursor) return;
  cursor = next;
  paintPreview();
}

function closePreview() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  removeEventListener('keydown', onKey, true);
  removeEventListener('resize', fitPage);
  goPage(cursor);
}

function onKey(e) {
  if (!overlay) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePreview(); }
  else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
}

function openPreview() {
  if (overlay) return;
  cursor = APP.pageIdx;
  overlay = document.createElement('div');
  overlay.className = 'preview';
  overlay.innerHTML = `
    <div class="preview-bar">
      <span class="ptitle">${esc(APP.P.title)}</span>
      <span class="sp"></span>
      <button type="button" class="iconbtn" data-pv="prev" aria-label="Previous page" data-tip="Previous page">${icon('chevronLeft')}</button>
      <span class="pcount zoomval" style="font-size:12px;color:var(--text-secondary)"></span>
      <button type="button" class="iconbtn" data-pv="next" aria-label="Next page" data-tip="Next page">${icon('chevronRight')}</button>
      <span class="sep" style="width:1px;height:20px;background:var(--separator);margin:0 4px"></span>
      <button type="button" class="btn btn-sm" data-pv="close">${icon('x')}<span>Close preview</span></button>
    </div>
    <div class="preview-stage"><div class="preview-page"></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    const b = e.target.closest('[data-pv]');
    if (!b) return;
    if (b.dataset.pv === 'prev') step(-1);
    if (b.dataset.pv === 'next') step(1);
    if (b.dataset.pv === 'close') closePreview();
  });
  addEventListener('keydown', onKey, true);
  addEventListener('resize', fitPage);
  paintPreview();
  const close = $('[data-pv="close"]', overlay);
  if (close) close.focus();
}

export { closePreview, openPreview };
