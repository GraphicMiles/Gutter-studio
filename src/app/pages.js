import { $, $$ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { pageSvg } from '../page/render.js';
import { APP, call } from './store.js';
import { addPage, deletePage, duplicatePage, goPage, movePage, movePageTo } from './actions.js';
import { togglePanel } from './shell.js';

/* app/pages.js: the page navigator.
 *
 * A filmstrip of real pages — the thumbnail is the page renderer at a smaller size, so it can never
 * drift from what the canvas shows. Selecting a thumbnail opens that page; dragging one moves it,
 * and the drop position is shown before the release so a reorder is never a surprise.
 */

const CACHE = {};        // page id → { sig, src }

function thumbSrc(page, i) {
  const sig = JSON.stringify(page);
  const hit = CACHE[page.id];
  if (hit && hit.sig === sig) return hit.src;
  let src = '';
  try {
    const r = pageSvg(APP.P, i, { uid: 't' + i, nograin: false });
    src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
  } catch (e) { src = ''; }
  CACHE[page.id] = { sig, src };
  return src;
}
function invalidate(pageId) { if (pageId) delete CACHE[pageId]; }

function thumbsHtml() {
  return APP.P.pages.map((pg, i) => {
    const src = thumbSrc(pg, i);
    return `<button type="button" class="thumb" data-page="${i}" aria-current="${i === APP.pageIdx}" aria-label="Page ${i + 1}, ${pg.panels.length} panel${pg.panels.length === 1 ? '' : 's'}">
      <span class="frame"><img class="thumb-img" alt="" src="${src}" draggable="false"></span>
      <span class="thumb-n">${i + 1}</span>
    </button>`;
  }).join('');
}

function renderPages() {
  const root = $('#pages');
  if (!root) return;
  root.innerHTML = `
    <div class="pages-head">
      <h2>Pages</h2>
      <span class="count">${APP.P.pages.length} of 24</span>
      <span class="sp"></span>
      <div class="actions">
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="add" aria-label="Add page" data-tip="Add page">${icon('plus')}</button>
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="dup" aria-label="Duplicate page" data-tip="Duplicate page">${icon('copy')}</button>
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="left" aria-label="Move page earlier" data-tip="Move earlier"${APP.pageIdx === 0 ? ' disabled' : ''}>${icon('arrowLeft')}</button>
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="right" aria-label="Move page later" data-tip="Move later"${APP.pageIdx === APP.P.pages.length - 1 ? ' disabled' : ''}>${icon('arrowRight')}</button>
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="del" aria-label="Delete page" data-tip="Delete page"${APP.P.pages.length < 2 ? ' disabled' : ''}>${icon('trash2')}</button>
        <button type="button" class="iconbtn iconbtn-sm" data-pgact="hide" aria-label="Hide page navigator" data-tip="Hide pages">${icon('chevronDown')}</button>
      </div>
    </div>
    <div class="filmstrip" id="filmstrip" role="group" aria-label="Page thumbnails">
      ${thumbsHtml()}
      <button type="button" class="thumb-add" data-pgact="add" aria-label="Add page" data-tip="Add page">${icon('plus')}</button>
    </div>`;
  const active = $('.thumb[aria-current="true"]', root);
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* a collapsed navigator still has to be restorable: the header keeps its toggle */
function wirePages() {
  const root = $('#pages');
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-pgact]');
    const t = e.target.closest('[data-page]');
    if (t && !root.dataset.dragging) { goPage(+t.dataset.page); return; }
    if (!b) return;
    const act = b.dataset.pgact;
    if (act === 'add') addPage();
    else if (act === 'dup') duplicatePage();
    else if (act === 'del') deletePage();
    else if (act === 'left') movePage(-1);
    else if (act === 'right') movePage(1);
    else if (act === 'hide') togglePanel('pages');
  });

  root.addEventListener('keydown', e => {
    const t = e.target.closest('[data-page]');
    if (!t) return;
    const i = +t.dataset.page;
    if (e.key === 'ArrowRight' && i < APP.P.pages.length - 1) { e.preventDefault(); goPage(i + 1); const n = $(`.thumb[data-page="${i + 1}"]`); if (n) n.focus(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); goPage(i - 1); const n = $(`.thumb[data-page="${i - 1}"]`); if (n) n.focus(); }
  });

  /* drag to reorder: the indicator is drawn before release, so nothing moves unseen */
  let dragFrom = -1, overEl = null;
  root.addEventListener('pointerdown', e => {
    const t = e.target.closest('[data-page]');
    if (!t || e.button !== 0) return;
    dragFrom = +t.dataset.page;
    t.classList.add('dragging');
    root.dataset.dragging = '';
    const move = ev => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const over = el && el.closest && el.closest('.thumb');
      if (overEl && overEl !== over) overEl.classList.remove('drop-before', 'drop-after');
      overEl = over;
      if (over && over !== t) {
        const r = over.getBoundingClientRect();
        const after = ev.clientX > r.left + r.width / 2;
        over.classList.toggle('drop-before', !after);
        over.classList.toggle('drop-after', after);
      }
    };
    const up = ev => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      t.classList.remove('dragging');
      delete root.dataset.dragging;
      if (overEl) {
        const to = +overEl.dataset.page;
        const r = overEl.getBoundingClientRect();
        const after = ev.clientX > r.left + r.width / 2;
        overEl.classList.remove('drop-before', 'drop-after');
        overEl = null;
        if (dragFrom !== to) movePageTo(dragFrom, after ? to + (to > dragFrom ? 0 : 1) : to + (to > dragFrom ? -1 : 0));
      }
      dragFrom = -1;
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });
}

/* the mobile Pages destination */
function pagesSheet() {
  return {
    title: 'Pages',
    snap: 'half',
    html: `<div class="actions">
        <button type="button" class="btn btn-sm btn-primary" data-sheet-pg="add">${icon('plus')}<span>Add page</span></button>
        <button type="button" class="btn btn-sm" data-sheet-pg="dup">${icon('copy')}<span>Duplicate</span></button>
      </div>
      <div class="list" role="list">
        ${APP.P.pages.map((pg, i) => `<div class="row" role="listitem" aria-current="${i === APP.pageIdx}">
          <span class="row-thumb"><img src="${thumbSrc(pg, i)}" alt="" style="width:100%;height:100%;object-fit:contain"></span>
          <button type="button" class="row-text" data-sheet-go="${i}">
            <span class="row-name">Page ${i + 1}</span>
            <span class="row-sub">${pg.panels.length} panel${pg.panels.length === 1 ? '' : 's'} · ${esc(pg.layout)} layout</span>
          </button>
          <span class="actions">
            <button type="button" class="iconbtn iconbtn-sm" data-sheet-move="${i}:${-1}" aria-label="Move page ${i + 1} earlier"${i === 0 ? ' disabled' : ''}>${icon('arrowUp')}</button>
            <button type="button" class="iconbtn iconbtn-sm" data-sheet-move="${i}:${1}" aria-label="Move page ${i + 1} later"${i === APP.P.pages.length - 1 ? ' disabled' : ''}>${icon('arrowDown')}</button>
          </span>
        </div>`).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-danger" data-sheet-pg="del"${APP.P.pages.length < 2 ? ' disabled' : ''}>${icon('trash2')}<span>Delete this page</span></button>`,
    onMount({ body, close }) {
      body.addEventListener('click', e => {
        const go = e.target.closest('[data-sheet-go]');
        if (go) { goPage(+go.dataset.sheetGo); close(); return; }
        const mv = e.target.closest('[data-sheet-move]');
        if (mv) {
          const [i, d] = mv.dataset.sheetMove.split(':').map(Number);
          if (APP.pageIdx !== i) goPage(i);
          movePage(d);
          call('refreshDestination');
          return;
        }
        const act = e.target.closest('[data-sheet-pg]');
        if (act) {
          if (act.dataset.sheetPg === 'add') addPage();
          if (act.dataset.sheetPg === 'dup') duplicatePage();
          if (act.dataset.sheetPg === 'del') deletePage();
          call('refreshDestination');
        }
      });
    },
  };
}

export { invalidate, pagesSheet, renderPages, wirePages };
