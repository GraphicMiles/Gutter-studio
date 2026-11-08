import { esc } from '../core/util.js';
import { $ } from '../core/dom.js';
import { pageSvg } from '../page/render.js';
import { toScript } from '../model/script.js';
import { APP, on } from './store.js';
import { HIST, curPage, setRenderer } from './history.js';
import { saveLocal, scheduleSave } from './persist.js';
import { renderInsp } from './inspector.js';
import { motionPlay, motionTween } from '../ui/motion.js';
import { icon } from '../ui/icons.js';

/* app/render.js: everything that writes to the screen.
 *
 * The board is the only expensive redraw, so it is the only thing with a debounce; the docks,
 * the status bar and the panel list are cheap strings. Reveals are opt-in: a keystroke must not
 * animate, a page turn must.
 */











const PANES = { create: 'pLeft', board: 'pMid', edit: 'pRight' };
const PANE_ORDER = ['create', 'board', 'edit'];

/* project id → {page, panel}: coming back should feel like coming back */
const MEMO = {};
function openProject(id) {
  const prev = APP.P ? APP.P.id : null;
  if (prev && prev !== id) MEMO[prev] = { page: APP.pageIdx, panel: APP.selId };
  const p = APP.S.projects.find(p => p.id === id) || APP.S.projects[0];
  APP.P = p; APP.S.cur = p.id; HIST.u = []; HIST.r = []; HIST.key = '';
  const m = MEMO[p.id];
  APP.pageIdx = m && p.pages[m.page] ? m.page : 0;
  const pg = p.pages[APP.pageIdx];
  APP.selId = (m && pg.panels.some(x => x.id === m.panel)) ? m.panel : pg.panels[0].id;
  APP.castSel = p.cast[0].id;
  saveLocal();
  renderAll();
  syncScript();
}
function addProject(p) {
  APP.S.projects.unshift(p);
  if (APP.S.projects.length > 40) APP.S.projects.pop();
  openProject(p.id);
  scheduleSave();
}

/* ── the head: title, history, document name ──────────────────────────── */
function renderHead() {
  const t = $('#title');
  if (document.activeElement !== t) t.value = APP.P.title;
  $('#undo').disabled = !HIST.u.length;
  $('#redo').disabled = !HIST.r.length;
  const name = APP.P.title || 'Untitled story';
  document.title = name + ': Gutter Studio';
  const h = $('#docTitle');
  if (h) h.textContent = name;
}

/* ── the left dock ────────────────────────────────────────────────────── */
function renderProjects() {
  $('#plist').innerHTML = APP.S.projects.map(p =>
    `<div class="pitem${p.id === APP.P.id ? ' on' : ''}"><button class="name" data-pid="${p.id}" aria-current="${p.id === APP.P.id}">${esc(p.title)}</button><small>${p.pages.length}p</small></div>`
  ).join('');
  /* A list of one leaves the dock empty. This reports the open project from its own data:
     format, page and panel counts, and cast, so the pane says something useful. */
  const meta = $('#pmeta');
  if (!meta) return;
  const P = APP.P;
  const panels = P.pages.reduce((a, pg) => a + pg.panels.length, 0);
  const fmt = P.style.fmt.charAt(0).toUpperCase() + P.style.fmt.slice(1);
  meta.innerHTML = `<h2>This project</h2>
    <dl>
      <div><dt>Format</dt><dd>${esc(fmt)}</dd></div>
      <div><dt>Pages</dt><dd>${P.pages.length}</dd></div>
      <div><dt>Panels</dt><dd>${panels}</dd></div>
      <div><dt>Cast</dt><dd>${P.cast.length}</dd></div>
    </dl>`;
}

/* ── the page strip ───────────────────────────────────────────────────── */
function renderPages() {
  const n = APP.P.pages.length;
  $('#pages').innerHTML =
    APP.P.pages.map((_, i) => `<button class="pg" data-pg="${i}" aria-pressed="${i === APP.pageIdx}" aria-label="Page ${i + 1}">${i + 1}</button>`).join('') +
    `<button class="btn sm icon" data-act="addpage" aria-label="Add page" data-tip="Add page">${icon('plus')}</button>` +
    (n > 1 ? `<button class="btn sm ghost icon" data-act="pgl" aria-label="Move page earlier" data-tip="Move page earlier">${icon('left')}</button><button class="btn sm ghost icon" data-act="pgr" aria-label="Move page later" data-tip="Move page later">${icon('right')}</button><button class="btn sm ghost dng" data-act="delpage" aria-label="Delete page">Del</button>` : '');
  const lay = $('#layout');
  lay.value = curPage().layout;
  lay.disabled = APP.P.style.fmt === 'webtoon' || APP.P.style.fmt === 'storyboard';
}

/* ── the panel list under the properties ──────────────────────────────── */
function renderRows() {
  const pg = curPage();
  $('#prows').innerHTML = pg.panels.map((p, i) => {
    const line = (p.bubbles[0] && p.bubbles[0].text) || p.caption || p.sfx.text || p.setting;
    return `<button type="button" class="row" data-sel="${p.id}" aria-pressed="${p.id === APP.selId}"><b>${i + 1}</b><span>${esc(line)}</span><small>${esc(p.shot)}</small></button>`;
  }).join('');
}

/* ── the status bar ───────────────────────────────────────────────────── */
const FMT_LABEL = { comic: 'Comic', manga: 'Manga', webtoon: 'Webtoon', square: 'Square', storyboard: 'Boards' };
function renderStatus() {
  const pg = curPage();
  const i = pg.panels.findIndex(p => p.id === APP.selId);
  const sbP = $('#sbPage'), sbN = $('#sbPanel'), sbF = $('#sbFmt');
  if (sbP) sbP.textContent = `Page ${APP.pageIdx + 1} / ${APP.P.pages.length}`;
  if (sbN) sbN.textContent = i < 0 ? '' : `Panel ${i + 1} / ${pg.panels.length}`;
  if (sbF) sbF.textContent = `${FMT_LABEL[APP.P.style.fmt] || 'Comic'}, ${pg.panels.length} panels`;
  const sel = $('#selTxt');
  if (sel) sel.textContent = i < 0 ? 'No panel selected' : `Panel ${i + 1} of ${pg.panels.length}`;
}

/* ── the board ────────────────────────────────────────────────────────── */
let boardTimer = 0, lastPage = -1, lastProj = null, lastSel = null, lastDims = null;

/* Fit the sheet to the space it actually has, then apply the person's zoom on top.
   Runs after every render and whenever the stage itself changes size. */
function fitSheet(animate) {
  const sh = $('#sheet'), st = $('#stage');
  if (!sh || !st || !lastDims) return;
  const aw = st.clientWidth, ah = st.clientHeight;
  if (!aw) return;
  const pad = 44;
  const fitW = Math.min(aw - pad, lastDims.w);
  let w = fitW;
  if (APP.P.style.fmt !== 'webtoon') {
    /* Fitting the whole page is the right default, but on a short screen (a phone in landscape)
       it shrinks the art to a stamp. Below half the width fit, fit the width and let the page
       scroll instead: readable beats entirely visible. */
    const fitH = (ah - pad) * lastDims.w / lastDims.h;
    if (fitH >= fitW * 0.55) w = Math.min(fitW, fitH);
  }
  w = Math.max(180, Math.floor(w)) * (APP.zoom || 1);
  if (animate && !(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) {
    const from = parseFloat(sh.style.width) || w;
    motionTween(from, Math.round(w), 240, v => { sh.style.width = Math.round(v) + 'px'; });
  } else {
    sh.style.width = Math.round(w) + 'px';
  }
  const z = $('#zVal');
  if (z) {
    const pct = Math.round((APP.zoom || 1) * 100) + '%';
    if (z.dataset.pct !== pct) {
      z.dataset.pct = pct;
      z.textContent = pct;
      z.setAttribute('aria-label', `Zoom ${pct}. Reset to fit`);
      z.title = `Zoom ${pct}: click to fit the page`;
      motionPlay(z, 'bump', 170);
    }
  }
}

function renderBoard(animate) {
  renderPages();
  const hadFocus = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('pnl-hit');
  const png = pageSvg(APP.P, APP.pageIdx, { sel: APP.selId, nums: APP.showNums, uid: 'b', ui: true });
  const sh = $('#sheet');
  sh.innerHTML = png.svg;
  lastDims = { w: png.w, h: png.h };

  /* turn the page only when the page (or the project) changed: never on a keystroke */
  const moved = APP.pageIdx !== lastPage || APP.P.id !== lastProj;
  const picked = APP.selId !== lastSel;
  lastPage = APP.pageIdx; lastProj = APP.P.id; lastSel = APP.selId;
  if (moved && animate !== false) motionPlay(sh, 'turn', 340);
  else if (picked) motionPlay(sh, 'sel-new', 200);

  if (hadFocus) {
    const again = sh.querySelector('.pnl-hit[data-pid="' + APP.selId + '"]');
    if (again) again.focus({ preventScroll: true });
  }
  renderRows();
  renderStatus();
  fitSheet(animate === true);
}

function renderAll() {
  renderHead(); renderProjects(); renderBoard(false); renderInsp(); syncScript(); renderStatus();
}
function syncScript(soft) {
  const t = $('#script');
  if (soft && document.activeElement === t) return;
  t.value = toScript(APP.P);
  const s = $('#sstat'); if (s) s.textContent = '';
}

/* ── pane and selection ───────────────────────────────────────────────── */
let lastPane = null;
function setPane(n, opts) {
  const id = PANES[n];
  if (!id) return;
  const from = lastPane ? PANE_ORDER.indexOf(lastPane) : PANE_ORDER.indexOf('board');
  const to = PANE_ORDER.indexOf(n);
  ['pLeft', 'pMid', 'pRight'].forEach(pid => {
    const el = $('#' + pid);
    const on = pid === id;
    const was = el.classList.contains('show');
    el.classList.toggle('show', on);
    if (on && !was && !(opts && opts.quiet)) {
      motionPlay(el, to > from ? 'slide-r' : to < from ? 'slide-l' : 'slide-b', 280);
    }
  });
  [['nCreate', 'create'], ['nBoard', 'board'], ['nEdit', 'edit']].forEach(([i, k]) => {
    const b = $('#' + i); if (b) b.setAttribute('aria-pressed', String(k === n));
  });
  lastPane = n;
  APP.pane = n;
  if (n === 'board') renderBoard(false);
}
const isNarrow = () => matchMedia('(max-width:860px)').matches;

function selectPanel(id, opts) {
  if (!id) return;
  APP.selId = id;
  APP.tab = 'panel';
  renderBoard(true);
  renderInsp(opts);
}

/* history never imports the UI: it calls this painter after every mutation. */
setRenderer(mode => {
  if (mode === 'all') { renderAll(); return; }
  const opts = (mode && typeof mode === 'object') ? mode : {};
  renderBoard(!!opts.turn);
  renderHead();
  if (opts.insp !== false && !opts.quiet) renderInsp();
  if (opts.script !== false) syncScript(true);
});

/* published so modules below render can refresh the project list without importing it */
on('renderProjects', renderProjects);
on('renderBoard', () => renderBoard(true));
on('renderHead', renderHead);
on('renderRows', renderRows);

export { addProject, boardTimer, fitSheet, isNarrow, openProject, renderAll, renderBoard, renderHead, renderPages, renderProjects, renderStatus, selectPanel, setPane, syncScript };

