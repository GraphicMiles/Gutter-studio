import { en, scrub } from '../core/text.js';
import { sid } from '../core/ids.js';
import { $, toast } from '../core/dom.js';
import { LIM } from '../model/schema.js';
import { cleanPanel, newProject, randChar, validate } from '../model/validate.js';
import { parseScript } from '../model/script.js';
import { APP, on } from './store.js';
import { commit, curPage, curPanel, edit, redo, touch, undo } from './history.js';
import { scheduleSave } from './persist.js';
import { addProject, fitSheet, isNarrow, openProject, renderBoard, renderProjects, renderStatus, selectPanel, setPane, syncScript } from './render.js';
import { HS, delPanel, dupPanel, movePanel, renderInsp } from './inspector.js';
import { GEN, drawGenUi, generate, stopGen } from './ai.js';
import { EXP, closeMenu, menuKey, openMenu } from './exports.js';
import { closeMenuBar, menuBarKey, openMenuBar } from './menubar.js';
import { dockKey, setDock } from './dock.js';
import { zoomReset, zoomStep } from './zoom.js';
import { initTips } from '../ui/motion.js';

/* app/wiring.js: every listener in the application, in one place.
 *
 * Rule: this file decides *what a gesture means*. The modules it calls decide what to draw.
 */


















function wire() {
  const addProjectFrom = p => addProject(p);
  /* ── the document title ─────────────────────────────────────────────── */
  const title = $('#title');
  title.addEventListener('input', e => {
    commit('title');
    APP.P.title = scrub(e.target.value, LIM.title) || 'Untitled story';
    touch(); renderProjects(); renderStatus();
  });
  title.addEventListener('change', e => { e.target.value = APP.P.title; });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  $('#undo').onclick = () => undo();
  $('#redo').onclick = () => redo();

  /* ── the export menu (header) ───────────────────────────────────────── */
  $('#exp').onclick = e => { e.stopPropagation(); if ($('#menu').hidden) openMenu(); else closeMenu(false); };
  $('#menu').onclick = async e => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    closeMenu();
    toast('Rendering…');
    try { await EXP[+b.dataset.ex].f(); }
    catch (err) { toast('Export failed. Try a smaller page count.'); }
  };
  $('#menu').addEventListener('keydown', menuKey);
  document.addEventListener('click', e => {
    if (!e.target.closest('#menu,#exp')) closeMenu(false);
    if (!e.target.closest('#mdrop,#mbar')) closeMenuBar(false);
  });

  /* ── the menu bar ───────────────────────────────────────────────────── */
  const mbar = $('#mbar');
  mbar.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    e.stopPropagation();
    if (b.getAttribute('aria-expanded') === 'true') closeMenuBar(true);
    else openMenuBar(b.dataset.m, b);
  });
  /* once a menu is open, hovering a sibling switches to it, like a desktop menu bar */
  mbar.addEventListener('pointerover', e => {
    const b = e.target.closest('[data-m]');
    if (!b || b.getAttribute('aria-expanded') === 'true') return;
    if (document.querySelector('#mbar [aria-expanded="true"]')) openMenuBar(b.dataset.m, b);
  });
  $('#mdrop').addEventListener('keydown', menuBarKey);
  $('#mdrop').addEventListener('click', e => {
    const b = e.target.closest('[data-mi]');
    if (!b) return;
    const it = $('#mdrop')._items[+b.dataset.mi];
    closeMenuBar(false);
    setTimeout(it[1], 0);   /* let the layer close before the action repaints the board */
  });

  /* ── projects ───────────────────────────────────────────────────────── */
  $('#plist').onclick = e => {
    const b = e.target.closest('[data-pid]');
    if (b && b.dataset.pid !== APP.P.id) openProject(b.dataset.pid);
  };
  $('#pNew').onclick = () => {
    const p = validate({ title: 'Untitled story', cast: [randChar('Ana', 'ana' + Date.now())], pages: [] });
    addProjectFrom(p);
  };
  $('#pDup').onclick = () => {
    const c = validate(JSON.parse(JSON.stringify(APP.P)));
    c.id = sid(); c.title = scrub(APP.P.title + ' copy', LIM.title);
    addProjectFrom(c);
  };
  let delArm = 0;
  const delBtn = $('#pDel');
  delBtn.onclick = () => {
    if (!delArm) {
      delArm = 1; delBtn.textContent = 'Confirm delete';
      setTimeout(() => { delArm = 0; delBtn.textContent = 'Delete'; }, 3000);
      return;
    }
    delArm = 0; delBtn.textContent = 'Delete';
    const id = APP.P.id, i = APP.S.projects.findIndex(p => p.id === id);
    APP.S.projects.splice(i, 1);
    if (APP.DB && APP.UID) APP.DB.doc('data/users/' + APP.UID + '/' + id).delete().catch(() => {});
    if (!APP.S.projects.length) APP.S.projects.push(newProject('Untitled story'));
    openProject(APP.S.projects[Math.min(i, APP.S.projects.length - 1)].id);
    toast('Project deleted');
  };
  $('#pImp').onclick = () => $('#file').click();
  $('#file').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const st = $('#pstat'); st.className = 'stat';
    if (f.size > LIM.json || !/\.json$/i.test(f.name)) { st.className = 'stat err'; st.textContent = 'Choose a .json project file under 2 MB.'; return; }
    try {
      const p = validate(await f.text()); p.id = sid();
      addProjectFrom(p);
      st.textContent = 'Imported ' + p.title;
    } catch (err) { st.className = 'stat err'; st.textContent = 'That file is not a valid project.'; }
  };

  /* ── write with Claude ──────────────────────────────────────────────── */
  $('#brief').addEventListener('input', e => { APP.P.brief = scrub(e.target.value, 2000); });
  $('#brief').addEventListener('change', scheduleSave);
  $('#gFmt').onclick = e => { const b = e.target.closest('[data-fmt]'); if (b) { GEN.fmt = b.dataset.fmt; drawGenUi(); } };
  $('#gGenre').onclick = e => { const b = e.target.closest('[data-genre]'); if (b) { GEN.genre = b.dataset.genre; drawGenUi(); } };
  $('#gGo').onclick = () => generate();
  $('#gStop').onclick = () => stopGen();

  /* ── script ─────────────────────────────────────────────────────────── */
  $('#sApply').onclick = () => {
    const st = $('#sstat');
    try {
      const N = parseScript($('#script').value, APP.P);
      edit(() => {
        APP.P.title = N.title; APP.P.cast = N.cast; APP.P.pages = N.pages;
        APP.pageIdx = 0; APP.selId = APP.P.pages[0].panels[0].id; APP.castSel = APP.P.cast[0].id;
      }, '', { script: false });
      $('#title').value = APP.P.title;
      st.className = 'stat';
      st.textContent = `Applied: ${APP.P.pages.length} page${APP.P.pages.length > 1 ? 's' : ''}, ${APP.P.pages.reduce((a, p) => a + p.panels.length, 0)} panels.`;
      renderProjects();
    } catch (e) { st.className = 'stat err'; st.textContent = 'Could not read that script.'; }
  };
  $('#sReset').onclick = () => syncScript();

  /* ── the left dock's tabs ───────────────────────────────────────────── */
  $('#dockTabs').onclick = e => { const b = e.target.closest('[data-dock]'); if (b) setDock(b.dataset.dock); };
  $('#dockTabs').addEventListener('keydown', dockKey);

  /* ── the page strip ─────────────────────────────────────────────────── */
  $('#pages').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pg != null) {
      if (+b.dataset.pg === APP.pageIdx) return;
      APP.pageIdx = +b.dataset.pg; APP.selId = curPage().panels[0].id;
      renderBoard(true); renderInsp();
      return;
    }
    const a = b.dataset.act;
    if (a === 'addpage') {
      if (APP.P.pages.length >= LIM.pages) return toast('Page limit reached.');
      edit(() => {
        APP.P.pages.splice(APP.pageIdx + 1, 0, { id: sid(), layout: 'auto', panels: [cleanPanel({ shot: 'medium', setting: 'plain', who: [APP.P.cast[0].id] }, APP.P)] });
        APP.pageIdx++; APP.selId = curPage().panels[0].id;
      }, '', { turn: true });
    }
    if (a === 'delpage') {
      edit(() => {
        APP.P.pages.splice(APP.pageIdx, 1);
        APP.pageIdx = Math.min(APP.pageIdx, APP.P.pages.length - 1);
        APP.selId = curPage().panels[0].id;
      }, '', { turn: true });
      toast('Page deleted. Undo is available.');
    }
    if (a === 'pgl' && APP.pageIdx > 0) edit(() => { const x = APP.P.pages; [x[APP.pageIdx - 1], x[APP.pageIdx]] = [x[APP.pageIdx], x[APP.pageIdx - 1]]; APP.pageIdx--; }, '', { turn: true });
    if (a === 'pgr' && APP.pageIdx < APP.P.pages.length - 1) edit(() => { const x = APP.P.pages; [x[APP.pageIdx + 1], x[APP.pageIdx]] = [x[APP.pageIdx], x[APP.pageIdx + 1]]; APP.pageIdx++; }, '', { turn: true });
  };
  $('#layout').onchange = e => edit(() => { curPage().layout = en(e.target.value, ['auto', 'stack', 'grid', 'hero'], 'auto'); }, '', { quiet: true, turn: true });
  $('#nums').onchange = e => { APP.showNums = e.target.checked; renderBoard(false); };

  /* ── the tool rail ──────────────────────────────────────────────────── */
  $('#rail').onclick = e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const r = b.dataset.r, p = curPanel();
    if (r === 'page') { const a = $('#pages [data-act=addpage]'); if (a) a.click(); return; }
    if (!p) return toast('Tap a panel on the page first.');
    if (r === 'dup') dupPanel(p);
    else if (r === 'del') delPanel(p);
    else if (r === 'prev') movePanel(-1);
    else if (r === 'next') movePanel(1);
  };

  /* ── the board ──────────────────────────────────────────────────────── */
  $('#sheet').onclick = e => {
    const g = e.target.closest('[data-pid]');
    if (g) { selectPanel(g.dataset.pid); if (isNarrow()) setPane('edit'); }
  };
  const focusPanel = id => {
    const g = document.querySelector('#sheet .pnl-hit[data-pid="' + id + '"]');
    if (g) g.focus({ preventScroll: false });
  };
  $('#sheet').addEventListener('keydown', e => {
    const g = e.target.closest && e.target.closest('.pnl-hit');
    if (!g) return;
    const nodes = [...document.querySelectorAll('#sheet .pnl-hit')];
    const row = +g.dataset.row, col = +g.dataset.col;
    const grid = new Map(); nodes.forEach(n => grid.set(n.dataset.row + ',' + n.dataset.col, n));
    let target = null;
    if (e.key === 'ArrowRight') target = grid.get(row + ',' + (col + 1));
    else if (e.key === 'ArrowLeft') target = grid.get(row + ',' + (col - 1));
    else if (e.key === 'ArrowDown') target = grid.get((row + 1) + ',' + col) || nodes[nodes.indexOf(g) + 1];
    else if (e.key === 'ArrowUp') target = grid.get((row - 1) + ',' + col) || nodes[nodes.indexOf(g) - 1];
    else if (e.key === 'Home') target = nodes[0];
    else if (e.key === 'End') target = nodes[nodes.length - 1];
    if (target) { e.preventDefault(); selectPanel(target.dataset.pid); focusPanel(target.dataset.pid); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPanel(g.dataset.pid);
      if (isNarrow()) setPane('edit');
    }
  });
  $('#selEdit').onclick = () => {
    if (!curPanel()) return toast('Tap a panel on the page first.');
    setPane('edit');
  };

  /* ── the panel list ─────────────────────────────────────────────────── */
  $('#prows').onclick = e => {
    const b = e.target.closest('[data-sel]');
    if (b) selectPanel(b.dataset.sel);
  };

  /* ── the properties ─────────────────────────────────────────────────── */
  const insp = $('#insp');
  insp.addEventListener('click', e => { const el = e.target.closest('[data-h]'); if (el && el.tagName === 'BUTTON') HS[+el.dataset.h](el); });
  insp.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.in && el.dataset.h != null) HS[+el.dataset.h](el); });
  insp.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.h != null && !el.dataset.in && el.tagName !== 'BUTTON') HS[+el.dataset.h](el); });
  const TABS = [['tPanel', 'panel'], ['tCast', 'cast'], ['tStyle', 'style']];
  const pickTab = id => {
    APP.tab = id;
    renderInsp({ animate: true });
    const b = $('#tPanel').parentNode.querySelector('[aria-selected=true]');
    if (b) b.focus();
  };
  TABS.forEach(([i, t]) => { $('#' + i).onclick = () => { if (APP.tab !== t) pickTab(t); }; });
  $('#tPanel').parentNode.addEventListener('keydown', e => {
    const cur = TABS.findIndex(([i]) => document.getElementById(i) === document.activeElement);
    if (cur < 0) return;
    let n = -1;
    if (e.key === 'ArrowRight') n = (cur + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (cur + TABS.length - 1) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault(); pickTab(TABS[n][1]);
  });

  /* ── zoom and the phone sections ────────────────────────────────────── */
  $('#zIn').onclick = () => zoomStep(1);
  $('#zOut').onclick = () => zoomStep(-1);
  $('#zVal').onclick = () => zoomReset();
  [['nCreate', 'create'], ['nBoard', 'board'], ['nEdit', 'edit']].forEach(([i, k]) => { $('#' + i).onclick = () => setPane(k); });

  /* ── keys ───────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range' && t.type !== 'checkbox';
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { closeMenu(true); closeMenuBar(true); }
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
    else if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomStep(1); }
    else if (mod && e.key === '-') { e.preventDefault(); zoomStep(-1); }
    else if (mod && e.key === '0') { e.preventDefault(); zoomReset(); }
    else if (mod && e.key.toLowerCase() === 'd' && !typing) {
      e.preventDefault();
      const p = curPanel();
      if (p) dupPanel(p);
    } else if (!typing && !mod && (e.key === '[' || e.key === ']')) {
      const pg = curPage(), i = pg.panels.findIndex(p => p.id === APP.selId);
      const j = Math.max(0, Math.min(pg.panels.length - 1, i + (e.key === ']' ? 1 : -1)));
      selectPanel(pg.panels[j].id);
    }
  });

  /* the stage is the element that actually changes size, so watch it, not the window */
  if (window.ResizeObserver) new ResizeObserver(() => fitSheet(false)).observe($('#stage'));
  else { let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => renderBoard(false), 120); }); }

  initTips(document.body);
}

/* the menus reach for these without importing them, keeping the graph acyclic */
on('curPanel', curPanel);
on('selectedPanel', () => curPanel());

export { wire };

