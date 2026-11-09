import { $, toast } from '../core/dom.js';
import { sid } from '../core/ids.js';
import { scrub } from '../core/text.js';
import { LIM } from '../model/schema.js';
import { newProject, randChar, validate } from '../model/validate.js';
import { APP, call } from './store.js';
import { HIST, commit } from './history.js';
import { saveLocal, scheduleSave } from './persist.js';
import { confirmDialog } from '../ui/layers.js';

/* app/projects.js: opening, creating and removing projects.
 *
 * Opening a project resets history — undo must never reach across two documents — and points the
 * editor at the first page. Everything else here is a real operation on the project list, which is
 * the same list the header menu shows and the same one that is written to storage.
 */

function resetEditor(p) {
  APP.P = p;
  APP.S.cur = p.id;
  APP.pageIdx = 0;
  const first = p.pages[0] && p.pages[0].panels[0];
  APP.sel = first ? { kind: 'panel', pid: first.id } : { kind: 'page' };
  APP.selId = first ? first.id : null;
  APP.workspace = 'board';
  APP.scriptDraft = null;
  APP.scriptDirty = false;
  APP.scriptStatus = '';
  APP.aiNote = '';
  APP.browserSel = null;
  HIST.u = [];
  HIST.r = [];
  HIST.key = '';
  APP.view.fit = true;
  saveLocal();
  call('renderAll');
}

function openProject(id) {
  const p = APP.S.projects.find(x => x.id === id);
  if (!p || (APP.P && APP.P.id === id)) {
    if (p) call('renderAll');
    return;
  }
  resetEditor(p);
}

function addProject(p) { call('closeDestination'); 
  APP.S.projects.unshift(p);
  if (APP.S.projects.length > 40) APP.S.projects.pop();
  resetEditor(p);
  scheduleSave();
}

function createProject() {
  const p = validate({
    title: 'Untitled story',
    cast: [randChar('Ana', 'ana' + Date.now())],
    pages: [{ panels: [{ shot: 'medium', setting: 'plain', who: [] }] }],
  });
  addProject(p);
  toast('New project created.');
}

function duplicateProject() {
  const copy = validate(JSON.parse(JSON.stringify(APP.P)));
  copy.id = sid();
  copy.title = scrub(APP.P.title + ' copy', LIM.title);
  copy.t = Date.now();
  addProject(copy);
  toast('Project duplicated.');
}

async function deleteProject() {
  if (APP.S.projects.length < 2) { toast('Keep at least one project.'); return; }
  const ok = await confirmDialog({
    title: 'Delete this project?',
    sub: `“${APP.P.title}” and its ${APP.P.pages.length} page${APP.P.pages.length === 1 ? '' : 's'} will be removed from this device.`,
    confirm: 'Delete project',
    danger: true,
  });
  if (!ok) return;
  const id = APP.P.id;
  const i = APP.S.projects.findIndex(p => p.id === id);
  APP.S.projects.splice(i, 1);
  if (APP.DB && APP.UID) APP.DB.doc('data/users/' + APP.UID + '/' + id).delete().catch(() => { });
  const next = APP.S.projects[Math.min(i, APP.S.projects.length - 1)];
  resetEditor(next);
  scheduleSave();
  toast('Project deleted.');
}

function importProject() {
  const input = $('#importFile');
  if (!input) return;
  input.value = '';
  input.click();
}

async function handleImportFile(file, statusEl) {
  const setStatus = (msg, bad) => {
    if (!statusEl) return;
    statusEl.className = bad ? 'note note-error' : 'note note-ok';
    statusEl.textContent = msg;
  };
  if (!file) return;
  if (file.size > LIM.json || !/\.json$/i.test(file.name)) {
    setStatus('Choose a .json project file under 2 MB.', true);
    return;
  }
  try {
    const p = validate(await file.text());
    p.id = sid();
    p.t = Date.now();
    APP.S.projects.unshift(p);
    resetEditor(p);
    scheduleSave();
    toast('Imported ' + p.title);
    setStatus('Imported ' + p.title);
  } catch (e) {
    setStatus('That file is not a valid project.', true);
  }
}

export { addProject, createProject, deleteProject, duplicateProject, handleImportFile, importProject, openProject };
