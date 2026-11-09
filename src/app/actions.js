import { sid } from '../core/ids.js';
import { toast } from '../core/dom.js';
import { scrub, en } from '../core/text.js';
import { LIM } from '../model/schema.js';
import { cleanPanel, newProject, randChar, validate } from '../model/validate.js';
import { parseScript } from '../model/script.js';
import { APP, call } from './store.js';
import { curPage, curPanel, edit, findPanel, touch } from './history.js';
import { scheduleSave } from './persist.js';

/* app/actions.js: every command that changes the project.
 *
 * A widget never mutates the model itself: it calls one of these. That keeps one history entry per
 * user action, one place where limits are enforced, and one place to look when something has to
 * be undone. Selection is not history — selecting a panel is not an edit.
 */

/* ── selection ────────────────────────────────────────────────────────── */
function selPage() { APP.sel = { kind: 'page' }; APP.selId = null; call('syncChrome'); }
function selPanel(pid) {
  const p = findPanel(pid);
  if (!p) return;
  APP.sel = { kind: 'panel', pid }; APP.selId = pid;
  APP.pageIdx = Math.max(0, APP.P.pages.findIndex(pg => pg.panels.some(x => x.id === pid)));
  call('syncChrome');
}
function selChar(pid, i) { APP.sel = { kind: 'char', pid, i }; APP.selId = pid; call('syncChrome'); }
function selBubble(pid, i) { APP.sel = { kind: 'bubble', pid, i }; APP.selId = pid; call('syncChrome'); }
function selProp(pid) { APP.sel = { kind: 'prop', pid }; APP.selId = pid; call('syncChrome'); }
function selCast(cid) { APP.sel = { kind: 'cast', cid }; APP.selId = null; call('syncChrome'); }
function selectionPanel() {
  const s = APP.sel;
  if (!s || s.kind === 'page' || s.kind === 'cast') return null;
  return findPanel(s.pid) || null;
}
function selectionKind() { return (APP.sel && APP.sel.kind) || 'page'; }

/* ── panels ───────────────────────────────────────────────────────────── */
function defaultPanel() {
  return cleanPanel({ shot: 'medium', setting: 'plain', who: APP.P.cast[0] ? [APP.P.cast[0].id] : [] }, APP.P);
}
function addPanel() {
  const pg = curPage();
  if (pg.panels.length >= LIM.panels) { toast(`A page holds up to ${LIM.panels} panels.`); return; }
  let nid;
  edit(() => {
    const p = defaultPanel(); nid = p.id;
    pg.panels.push(p);
    APP.sel = { kind: 'panel', pid: nid }; APP.selId = nid;
  }, '', { turn: true });
  toast('Panel added.');
}
function duplicatePanel(p) {
  const target = p || selectionPanel();
  if (!target) return;
  const pg = curPage();
  if (pg.panels.length >= LIM.panels) { toast(`A page holds up to ${LIM.panels} panels.`); return; }
  let nid;
  edit(() => {
    const copy = validate({ cast: APP.P.cast, pages: [{ panels: [JSON.parse(JSON.stringify(target))] }] }).pages[0].panels[0];
    copy.id = nid = sid();
    const i = pg.panels.findIndex(x => x.id === target.id);
    pg.panels.splice(i + 1, 0, copy);
    APP.sel = { kind: 'panel', pid: nid }; APP.selId = nid;
  });
  toast('Panel duplicated.');
}
function deletePanel(p) {
  const target = p || selectionPanel();
  if (!target) return;
  const pg = curPage();
  if (pg.panels.length <= 1) { toast('A page needs at least one panel.'); return; }
  edit(() => {
    const i = pg.panels.findIndex(x => x.id === target.id);
    pg.panels.splice(i, 1);
    const next = pg.panels[Math.min(i, pg.panels.length - 1)];
    APP.sel = { kind: 'panel', pid: next.id }; APP.selId = next.id;
  }, '', { turn: true });
  toast('Panel deleted. Undo restores it.');
}
function movePanel(dir, p) {
  const target = p || selectionPanel();
  if (!target) return;
  const pg = curPage(), i = pg.panels.findIndex(x => x.id === target.id), j = i + dir;
  if (i < 0 || j < 0 || j >= pg.panels.length) return;
  edit(() => { const a = pg.panels; [a[i], a[j]] = [a[j], a[i]]; });
}

/* ── characters in a panel ────────────────────────────────────────────── */
function addCharacterToPanel(p, castId) {
  const target = p || selectionPanel();
  if (!target) return;
  const id = castId || (APP.P.cast.find(c => !target.who.includes(c.id)) || {}).id;
  if (!id) { toast('Every character is already in this panel.'); return; }
  if (target.who.includes(id)) { toast('That character is already in this panel.'); return; }
  if (target.who.length >= 2) { toast('A panel holds two characters.'); return; }
  edit(() => {
    target.who.push(id);
    APP.sel = { kind: 'char', pid: target.id, i: target.who.length - 1 };
    APP.selId = target.id;
  });
}
function removeCharacterFromPanel(p, i) {
  if (!p || p.who[i] == null) return;
  edit(() => {
    p.who.splice(i, 1);
    ['expr', 'look', 'pose'].forEach(k => p[k].splice(i, 1));
    p.bubbles = p.bubbles.filter(b => b.who !== i).map(b => ({ ...b, who: b.who > i ? b.who - 1 : b.who }));
    APP.sel = { kind: 'panel', pid: p.id }; APP.selId = p.id;
  });
}
function swapCharacter(p, i, castId) {
  if (!p) return;
  if (!castId) { removeCharacterFromPanel(p, i); return; }
  edit(() => {
    if (p.who.some((w, k) => w === castId && k !== i)) { toast('That character is already in this panel.'); return; }
    p.who[i] = castId;
  });
}

/* ── dialogue ─────────────────────────────────────────────────────────── */
function addBubble(p, type) {
  const target = p || selectionPanel();
  if (!target) return;
  if (target.bubbles.length >= LIM.bubbles) { toast(`A panel holds up to ${LIM.bubbles} bubbles.`); return; }
  let idx;
  edit(() => {
    target.bubbles.push({ who: 0, type: type || 'speech', text: 'New line' });
    idx = target.bubbles.length - 1;
    APP.sel = { kind: 'bubble', pid: target.id, i: idx };
    APP.selId = target.id;
  });
  call('focusBubbleText', target.id, idx);
}
function removeBubble(p, i) {
  if (!p) return;
  edit(() => {
    p.bubbles.splice(i, 1);
    APP.sel = { kind: 'panel', pid: p.id }; APP.selId = p.id;
  });
}

/* ── cast ─────────────────────────────────────────────────────────────── */
function addCast() {
  if (APP.P.cast.length >= LIM.cast) { toast(`A project holds up to ${LIM.cast} characters.`); return; }
  let cid;
  edit(() => {
    const c = randChar('Character ' + (APP.P.cast.length + 1), String(Date.now()));
    cid = c.id;
    APP.P.cast.push(c);
    APP.sel = { kind: 'cast', cid };
  });
  call('setBrowserTab', 'characters');
  toast('Character added.');
}
function removeCast(cid) {
  if (APP.P.cast.length < 2) { toast('Keep at least one character.'); return; }
  edit(() => {
    APP.P.cast = APP.P.cast.filter(x => x.id !== cid);
    APP.P.pages.forEach(pg => pg.panels.forEach(p => {
      const keep = p.who.map((id, i) => id === cid ? -1 : i).filter(i => i >= 0);
      p.who = keep.map(i => p.who[i]);
      ['expr', 'look', 'pose'].forEach(k => { p[k] = keep.map(i => p[k][i]); });
      p.bubbles = p.bubbles.filter(b => keep.includes(b.who)).map(b => ({ ...b, who: keep.indexOf(b.who) }));
    }));
    APP.sel = { kind: 'page' }; APP.selId = null;
  });
  toast('Character removed with undo available.');
}

/* ── pages ────────────────────────────────────────────────────────────── */
function addPage() {
  if (APP.P.pages.length >= LIM.pages) { toast(`A project holds up to ${LIM.pages} pages.`); return; }
  edit(() => {
    const pg = { id: sid(), layout: 'auto', panels: [defaultPanel()] };
    APP.P.pages.splice(APP.pageIdx + 1, 0, pg);
    APP.pageIdx += 1;
    APP.sel = { kind: 'panel', pid: pg.panels[0].id }; APP.selId = pg.panels[0].id;
  }, '', { turn: true });
  toast('Page added.');
}
function duplicatePage() {
  if (APP.P.pages.length >= LIM.pages) { toast(`A project holds up to ${LIM.pages} pages.`); return; }
  const src = curPage();
  let nid;
  edit(() => {
    const copy = validate({ cast: APP.P.cast, pages: [JSON.parse(JSON.stringify(src))] }).pages[0];
    copy.id = nid = sid();
    copy.panels.forEach(p => { p.id = sid(); });
    APP.P.pages.splice(APP.pageIdx + 1, 0, copy);
    APP.pageIdx += 1;
    APP.sel = { kind: 'page' }; APP.selId = null;
  }, '', { turn: true });
  toast('Page duplicated.');
}
function deletePage() {
  if (APP.P.pages.length <= 1) { toast('A project needs at least one page.'); return; }
  edit(() => {
    APP.P.pages.splice(APP.pageIdx, 1);
    APP.pageIdx = Math.min(APP.pageIdx, APP.P.pages.length - 1);
    APP.sel = { kind: 'page' }; APP.selId = null;
  }, '', { turn: true });
  toast('Page deleted. Undo restores it.');
}
function movePage(dir) {
  const j = APP.pageIdx + dir;
  if (j < 0 || j >= APP.P.pages.length) return;
  edit(() => {
    const a = APP.P.pages;
    [a[APP.pageIdx], a[j]] = [a[j], a[APP.pageIdx]];
    APP.pageIdx = j;
  }, '', { turn: true });
}
function movePageTo(from, to) {
  if (from === to || from < 0 || to < 0 || from >= APP.P.pages.length || to >= APP.P.pages.length) return;
  edit(() => {
    const a = APP.P.pages;
    const [pg] = a.splice(from, 1);
    a.splice(to, 0, pg);
    if (APP.pageIdx === from) APP.pageIdx = to;
    else if (from < APP.pageIdx && to >= APP.pageIdx) APP.pageIdx--;
    else if (from > APP.pageIdx && to <= APP.pageIdx) APP.pageIdx++;
  }, '', { turn: true });
}
function goPage(i) {
  if (i < 0 || i >= APP.P.pages.length || i === APP.pageIdx) return;
  APP.pageIdx = i;
  APP.sel = { kind: 'page' }; APP.selId = null;
  call('syncChrome');
  call('pageChanged');
}

/* ── page layout ──────────────────────────────────────────────────────── */
function setPageLayout(v) {
  const pg = curPage();
  const next = en(v, ['auto', 'stack', 'grid', 'hero'], 'auto');
  if (pg.layout === next) return;
  edit(() => { pg.layout = next; }, 'layout', { quiet: true, turn: true });
}

/* ── tools and placement ──────────────────────────────────────────────── */
function setTool(name) {
  APP.tool = name;
  if (name === 'select' || name === 'pan') APP.place = null;
  if (name === 'panel') APP.place = { kind: 'panel' };
  if (name === 'character') APP.place = { kind: 'character' };
  if (name === 'scene') APP.place = { kind: 'scene' };
  if (name === 'prop') APP.place = { kind: 'prop' };
  if (name === 'bubble') APP.place = { kind: 'bubble', value: 'speech' };
  if (name === 'text') APP.place = { kind: 'text' };
  call('syncChrome');
}
function armPlacement(kind, value) {
  APP.tool = kind === 'character' ? 'character' : kind;
  APP.place = { kind, value };
  call('syncChrome');
  call('announcePlacement');
}
function clearPlacement() {
  APP.place = null;
  if (APP.tool !== 'select' && APP.tool !== 'pan') APP.tool = 'select';
  call('syncChrome');
}
/* Place the armed asset on the panel the person clicked. Every branch is a real model change. */
function applyPlacement(pid) {
  const place = APP.place;
  if (!place) return false;
  const p = findPanel(pid);
  if (!p) return false;
  const pg = APP.P.pages.find(x => x.panels.some(y => y.id === pid));
  if (pg) APP.pageIdx = APP.P.pages.indexOf(pg);

  if (place.kind === 'panel') {
    addPanel();
  } else if (place.kind === 'character') {
    addCharacterToPanel(p, place.value || (APP.browserSel && APP.browserSel.kind === 'character' ? APP.browserSel.id : undefined));
  } else if (place.kind === 'scene') {
    const setting = place.value || (APP.browserSel && APP.browserSel.id) || 'plain';
    edit(() => { p.setting = setting; });
    APP.sel = { kind: 'panel', pid }; APP.selId = pid;
    toast('Scene set to ' + setting.replace(/-/g, ' ') + '.');
  } else if (place.kind === 'prop') {
    const prop = place.value || (APP.browserSel && APP.browserSel.id) || 'none';
    edit(() => { p.prop = prop; });
    APP.sel = { kind: 'prop', pid }; APP.selId = pid;
    toast('Prop set to ' + prop.replace(/-/g, ' ') + '.');
  } else if (place.kind === 'bubble') {
    addBubble(p, place.value || 'speech');
  } else if (place.kind === 'text') {
    APP.sel = { kind: 'panel', pid }; APP.selId = pid;
    /* one placement, then back to selecting: placing is a single deliberate action, not a mode
       that keeps swallowing clicks after the first one */
    APP.place = null; APP.tool = 'select';
    call('syncChrome', 'words');
    call('focusCaption');
    return true;
  }
  APP.place = null;
  if (APP.tool !== 'select' && APP.tool !== 'pan') APP.tool = 'select';
  call('syncChrome');
  return true;
}

/* ── workspace ────────────────────────────────────────────────────────── */
function setWorkspace(name) {
  APP.workspace = name === 'script' ? 'script' : 'board';
  if (APP.workspace === 'script') APP.sel = APP.sel.kind === 'page' ? APP.sel : APP.sel;
  call('syncChrome');
}

/* ── script ───────────────────────────────────────────────────────────── */
function applyScriptText(text) {
  try {
    const next = parseScript(text, APP.P);
    edit(() => {
      APP.P.title = next.title;
      APP.P.cast = next.cast;
      APP.P.pages = next.pages;
      APP.pageIdx = 0;
      const first = APP.P.pages[0].panels[0];
      APP.sel = first ? { kind: 'panel', pid: first.id } : { kind: 'page' };
      APP.selId = first ? first.id : null;
    }, '', { script: false });
    const panels = APP.P.pages.reduce((a, p) => a + p.panels.length, 0);
    APP.scriptStatusTone = 'ok';
    APP.scriptStatus = `Applied: ${APP.P.pages.length} page${APP.P.pages.length > 1 ? 's' : ''}, ${panels} panels.`;
    call('syncChrome');
    toast('Script applied. Undo restores the previous board.');
    return true;
  } catch (e) {
    APP.scriptStatusTone = 'error';
    APP.scriptStatus = 'That script could not be read. Check the page and panel lines, then try again.';
    call('syncChrome');
    return false;
  }
}

/* ── project title ────────────────────────────────────────────────────── */
function setTitle(v) {
  const next = scrub(v, LIM.title) || 'Untitled story';
  if (next === APP.P.title) return;
  edit(() => { APP.P.title = next; }, 'title', { insp: false });
}

/* the project list, kept in one place so every surface changes it the same way */
function openProjectById(id) { call('openProject', id); }
function saveNow() { touch(); scheduleSave(); }

export {
  addBubble, addCast, addCharacterToPanel, addPage, addPanel, applyPlacement, applyScriptText,
  armPlacement, clearPlacement, defaultPanel, deletePage, deletePanel, duplicatePage, duplicatePanel,
  goPage, movePage, movePageTo, movePanel, openProjectById, removeBubble, removeCast,
  removeCharacterFromPanel, saveNow, selBubble, selCast, selChar, selPage, selPanel, selProp,
  selectionKind, selectionPanel, setPageLayout, setTitle, setTool, setWorkspace, swapCharacter,
};
