import { $, $$ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { openMenu } from '../ui/layers.js';
import { APP, call } from './store.js';
import { HIST, redo, undo } from './history.js';
import { togglePanel, isDrawerMode } from './shell.js';

/* app/header.js: the top of the window.
 *
 * Only global, frequent actions live here: which project is open and whether it is saved, undo and
 * redo, which panels are showing, preview, export, and one overflow menu. Everything specific to a
 * page, a panel or a scene belongs to the context toolbar, the inspector or the canvas.
 */

const SAVE_TEXT = {
  saved: 'Saved on this device',
  synced: 'Saved to your account',
  saving: 'Saving…',
  unsaved: 'Unsaved changes',
  error: 'Save failed',
};

function saveChip() {
  const s = APP.saveState || { state: 'saved', text: '' };
  const iconName = s.state === 'error' ? 'cloudAlert'
    : s.state === 'saving' ? 'cloudUpload'
      : s.state === 'unsaved' ? 'cloud' : s.state === 'synced' ? 'badgeCheck' : 'save';
  const label = s.state === 'error' ? 'Save failed'
    : s.text || SAVE_TEXT[s.state] || 'Saved';
  return `${icon(iconName)}<span class="savetext">${esc(label)}</span>` +
    (s.state === 'error' ? `<button type="button" data-retry>Retry</button>` : '');
}

function projectMenu(anchor) {
  const items = APP.S.projects.map(p => ({
    label: p.title || 'Untitled story',
    icon: p.id === APP.P.id ? 'check' : 'fileText',
    checked: p.id === APP.P.id,
    run: () => call('openProject', p.id),
  }));
  const list = [
    ...items,
    '-',
    { label: 'New project', icon: 'filePlus', run: () => call('newProject') },
    { label: 'Duplicate project', icon: 'copy', run: () => call('duplicateProject') },
    { label: 'Import project file…', icon: 'folderOpen', run: () => call('importProject') },
  ];
  openMenu(anchor, list, { label: 'Projects', align: 'start' });
}

function moreMenu(anchor) {
  openMenu(anchor, [
    { label: 'Generate a story…', icon: 'sparkles', run: () => call('openGenerate') },
    { label: 'Script workspace', icon: 'fileText', run: () => call('openScript') },
    '-',
    { label: 'Preview', icon: 'eye', run: () => call('openPreview') },
    { label: 'Export…', icon: 'download', run: () => call('openExport') },
    '-',
    { label: 'Import project file…', icon: 'folderOpen', run: () => call('importProject') },
    { label: 'Delete this project…', icon: 'trash2', danger: true, run: () => call('deleteProject') },
  ], { label: 'More actions', align: 'end' });
}

function renderHeader() {
  const name = $('#projName');
  if (name) {
    name.textContent = APP.P ? APP.P.title || 'Untitled story' : 'Gutter Studio';
    const btn = $('#projBtn');
    if (btn) btn.setAttribute('aria-label', 'Project menu. Current project: ' + (APP.P ? APP.P.title : ''));
  }
  const chip = $('#saveState');
  if (chip && chip.innerHTML !== saveChip()) chip.innerHTML = saveChip();

  const hist = $('#histActions');
  hist.innerHTML =
    `<button type="button" class="iconbtn" data-act="undo" aria-label="Undo" data-tip="Undo  Ctrl+Z"${HIST.u.length ? '' : ' disabled'}>${icon('undo2')}</button>
     <button type="button" class="iconbtn" data-act="redo" aria-label="Redo" data-tip="Redo  Ctrl+Shift+Z"${HIST.r.length ? '' : ' disabled'}>${icon('redo2')}</button>`;

  /* One set of toggles for two layouts: above 1024 the panels sit beside the canvas, below it
     they slide over it. The button means the same thing either way — show or hide this panel. */
  const drawer = isDrawerMode();
  const pressedOf = (k) => drawer ? APP.drawer === k : k === 'pages' ? APP.panels.pages : APP.panels[k];
  const shown = (k) => pressedOf(k) ? 'shown' : 'hidden';
  $('#viewActions').innerHTML =
    `<button type="button" class="iconbtn iconbtn-drawer" data-panel="browser" data-pane="browser" aria-pressed="${pressedOf('browser')}" aria-label="Resource browser" data-tip="Resources  ${shown('browser')}">${icon('panelLeft')}</button>
     <button type="button" class="iconbtn iconbtn-drawer" data-panel="inspector" data-pane="inspector" aria-pressed="${pressedOf('inspector')}" aria-label="Properties panel" data-tip="Properties  ${shown('inspector')}">${icon('panelRight')}</button>
     <button type="button" class="iconbtn" data-panel="pages" aria-pressed="${APP.panels.pages}" aria-label="Page navigator" data-tip="Pages  ${shown('pages')}">${icon('panelBottom')}</button>`;

  const main = $('#mainActions');
  main.innerHTML =
    `<button type="button" class="btn btn-quiet hide-mobile" data-act="preview">${icon('eye')}<span>Preview</span></button>
     <button type="button" class="btn btn-primary" data-act="export">${icon('download')}<span class="hide-mobile">Export</span></button>
     <button type="button" class="iconbtn" data-act="more" aria-label="More actions" aria-haspopup="menu" aria-expanded="false" data-tip="More">${icon('ellipsis')}</button>`;
}

function wireHeader() {
  const proj = $('#projBtn');
  proj.addEventListener('click', () => projectMenu(proj));

  $('#histActions').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'undo') undo();
    if (b.dataset.act === 'redo') redo();
  });

  $('#viewActions').addEventListener('click', e => {
    const b = e.target.closest('[data-panel]');
    if (b) togglePanel(b.dataset.panel);
  });

  $('#mainActions').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'preview') call('openPreview');
    if (b.dataset.act === 'export') call('openExport');
    if (b.dataset.act === 'more') moreMenu(b);
  });

  $('#saveState').addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) call('retrySave');
  });

  $('#projName').addEventListener('dblclick', () => call('openProject'));
}

export { projectMenu, renderHeader, moreMenu, wireHeader };
