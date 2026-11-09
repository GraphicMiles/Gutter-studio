import { $ } from '../core/dom.js';
import { toScript } from '../model/script.js';
import { initTips } from '../ui/motion.js';
import { layerOpen, setMobileMenu } from '../ui/layers.js';
import { APP, call, on } from './store.js';
import { redo, undo, curPage } from './history.js';
import { retrySave } from './persist.js';
import { renderHeader } from './header.js';
import { wireHeader } from './header.js';
import { wireToolbar } from './toolbar.js';
import { wireRail, TOOL_BY_KEY } from './rail.js';
import { wireBrowser } from './browser.js';
import { initCanvas, wireCanvas, fitView, setZoom, zoomStep } from './canvas.js';
import { focusBubbleText, focusCaption } from './inspector.js';
import { wirePages } from './pages.js';
import { contextSheet } from '../ui/sheet.js';
import { wireScript } from './scriptview.js';
import { openPreview } from './preview.js';
import { openExport } from './exports.js';
import { openGenerate, rewritePanel } from './ai.js';
import {
  addBubble, addCharacterToPanel, addPage, addPanel, applyScriptText, armPlacement, clearPlacement,
  deletePanel, duplicatePanel, goPage, movePanel, removeBubble, selChar, selPage, selPanel, setTool,
  setWorkspace,
} from './actions.js';
import {
  addProject, createProject, deleteProject, duplicateProject, handleImportFile, importProject, openProject,
} from './projects.js';
import { closeDestination, initShell, isMobile, setDrawer, togglePanel, openDestination } from './shell.js';
import { randChar } from '../model/validate.js';
import { edit, findPanel } from './history.js';

/* app/wiring.js: the composition point.
 *
 * Two jobs. First, it registers the commands that lower modules and the menus call by name, so the
 * import graph stays acyclic. Second, it owns the global gestures — the keyboard, the file input
 * and the status bar — that belong to the window rather than to one panel.
 */

/* ── commands ─────────────────────────────────────────────────────────── */
function randomiseCast(cid) {
  const c = APP.P.cast.find(x => x.id === cid) || (APP.sel.kind === 'cast' ? APP.P.cast.find(x => x.id === APP.sel.cid) : null);
  if (!c) return;
  edit(() => {
    const fresh = randChar(c.name, String(Math.random()));
    Object.assign(c, fresh, { id: c.id, name: c.name, kind: c.kind });
  });
}
function applyScriptNow() {
  const text = APP.scriptDraft != null ? APP.scriptDraft : toScript(APP.P);
  if (applyScriptText(text)) { APP.scriptDraft = toScript(APP.P); APP.scriptDirty = false; }
}
function reloadScriptNow() {
  APP.scriptDraft = toScript(APP.P);
  APP.scriptDirty = false;
  APP.scriptStatus = 'Reloaded from the board.';
  APP.scriptStatusTone = '';
  call('syncChrome');
}

function registerCommands() {
  on('openProject', openProject);
  on('addProject', addProject);
  on('newProject', createProject);
  on('duplicateProject', duplicateProject);
  on('deleteProject', deleteProject);
  on('importProject', importProject);
  on('retrySave', retrySave);
  on('openPreview', openPreview);
  on('openExport', openExport);
  on('openGenerate', openGenerate);
  on('openScript', () => { setWorkspace('script'); if (isMobile()) closeDestination(); });
  on('rewritePanel', rewritePanel);
  on('addPanel', () => addPanel());
  on('addBubble', p => addBubble(p));
  on('addPage', () => addPage());
  on('addCharacterToPanel', p => addCharacterToPanel(p));
  on('armPlacement', (kind, value) => armPlacement(kind, value));
  on('clearPlacement', clearPlacement);
  on('randomiseCast', randomiseCast);
  on('applyScript', applyScriptNow);
  on('reloadScript', reloadScriptNow);
  on('setBrowserTab', tab => { APP.browserTab = tab; call('syncChrome'); });
  on('focusBubbleText', focusBubbleText);
  on('focusCaption', focusCaption);
  on('selChar', (pid, i) => selChar(pid, i));
  on('selPanel', pid => selPanel(pid));
  on('togglePanel', togglePanel);
  on('closeDrawer', () => setDrawer(null));
  on('syncSaveChip', renderHeader);
  on('setTool', setTool);
  on('openDestination', openDestination);
  on('nextPage', d => goPage(APP.pageIdx + d));
  on('zoomActual', () => setZoom(1, { animate: true }));
  on('deleteBubbleAt', (pid, i) => { const p = findPanel(pid); if (p) removeBubble(p, i); });
}

/* ── the window ───────────────────────────────────────────────────────── */
const isTyping = el => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !['checkbox', 'radio', 'range', 'color', 'button'].includes(el.type);
  return el.isContentEditable;
};

function wireWindow() {
  /* A pointer press lands focus on the control it presses, exactly as a keyboard press would, so a
     dialog or menu opened by mouse gives focus back to the same place when it closes. */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('button');
    if (b && !b.disabled) b.focus({ preventScroll: true });
  }, true);

  /* status bar: zoom controls, rebuilt whenever the status strip is drawn */
  $('#status').addEventListener('click', e => {
    const b = e.target.closest('[data-zoom]');
    if (!b) return;
    const what = b.dataset.zoom;
    if (what === 'in') zoomStep(1);
    else if (what === 'out') zoomStep(-1);
    else if (what === 'fit') fitView(true);
    else if (what === 'actual') call('setZoomActual');
  });

  document.addEventListener('keydown', e => {
    const typing = isTyping(e.target);
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      if (layerOpen()) return;                 // the top layer takes it (ui/layers.js)
      if (APP.place) { clearPlacement(); return; }
      if (APP.sel.kind !== 'page') { selPage(); return; }
      if (APP.drawer) { setDrawer(null); return; }
      return;
    }
    if (typing) return;

    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomStep(1); return; }
    if (mod && e.key === '-') { e.preventDefault(); zoomStep(-1); return; }
    if (mod && e.key === '0') { e.preventDefault(); fitView(true); return; }
    if (mod && e.key.toLowerCase() === 'd') {
      const p = APP.sel.kind === 'panel' || APP.sel.kind === 'char' || APP.sel.kind === 'bubble' || APP.sel.kind === 'prop' ? APP.sel.pid : null;
      if (p) { e.preventDefault(); duplicatePanel(APP.P.pages.flatMap(pg => pg.panels).find(x => x.id === p)); }
      return;
    }
    if (mod) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const s = APP.sel;
      if (s.kind === 'panel') { e.preventDefault(); deletePanel(APP.P.pages.flatMap(pg => pg.panels).find(x => x.id === s.pid)); }
      else if (s.kind === 'bubble') { e.preventDefault(); call('deleteBubbleAt', s.pid, s.i); }
      return;
    }
    if (e.key === '[' || e.key === ']') { e.preventDefault(); movePanel(e.key === ']' ? 1 : -1); return; }
    if (e.key === 'PageDown') { e.preventDefault(); call('nextPage', 1); return; }
    if (e.key === 'PageUp') { e.preventDefault(); call('nextPage', -1); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (APP.sel.kind === 'panel') {
        const pg = curPage(), i = pg.panels.findIndex(p => p.id === APP.sel.pid);
        if (pg.panels[i + 1]) { e.preventDefault(); selPanel(pg.panels[i + 1].id); }
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (APP.sel.kind === 'panel') {
        const pg = curPage(), i = pg.panels.findIndex(p => p.id === APP.sel.pid);
        if (pg.panels[i - 1]) { e.preventDefault(); selPanel(pg.panels[i - 1].id); }
      }
      return;
    }
    const tool = TOOL_BY_KEY[e.key.toLowerCase()];
    if (tool && !e.altKey && !e.shiftKey) { e.preventDefault(); call('setTool', tool); }
  });

  /* the file input lives in the shell so the whole app can trigger one import path */
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'importFile';
  input.accept = '.json,application/json';
  input.hidden = true;
  input.setAttribute('aria-label', 'Import a project file');
  document.body.appendChild(input);
  input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    const status = document.createElement('div');
    handleImportFile(file, status);
  });
}

function wire() {
  registerCommands();
  /* touch context menus are sheets; the layers module asks for one instead of duplicating it */
  setMobileMenu({ disabled: () => !isMobile(), open: (items, label) => { contextSheet(items, label); return { close() { } }; } });
  wireHeader();
  wireToolbar();
  wireRail();
  wireBrowser();
  wireCanvas();
  wirePages();
  wireScript();
  initCanvas();
  initShell();
  wireWindow();
  initTips(document.body);
}

export { randomiseCast, registerCommands, wire, wireWindow };
