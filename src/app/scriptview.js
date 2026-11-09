import { $ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { toScript } from '../model/script.js';
import { icon } from '../ui/icons.js';
import { APP, call } from './store.js';
import { goPage, applyScriptText, selPanel, setWorkspace } from './actions.js';

/* app/scriptview.js: the script workspace.
 *
 * The script is plain text in the project's own format, so it stays readable, diff-able and
 * portable. The left column is the structure the text describes — page by page, panel by panel —
 * and clicking a line takes you to that panel on the board. Editing here changes nothing until
 * Apply, which is what makes "reload from the board" a safe thing to offer.
 */

function ensureDraft() {
  if (APP.scriptDraft == null) APP.scriptDraft = toScript(APP.P);
}

function outlineHtml() {
  return APP.P.pages.map((pg, i) => `
    <li>
      <button type="button" class="row" data-go-page="${i}" aria-current="${i === APP.pageIdx}">
        <span class="row-text"><span class="row-name">Page ${i + 1}</span>
        <span class="row-sub">${pg.panels.length} panel${pg.panels.length === 1 ? '' : 's'} · ${esc(pg.layout)}</span></span>
      </button>
      <ul style="padding-left:8px">
        ${pg.panels.map((p, k) => {
          const line = (p.bubbles[0] && p.bubbles[0].text) || p.caption || p.sfx.text || p.setting;
          return `<li><button type="button" class="row" data-go-panel="${p.id}" aria-current="${p.id === APP.sel.pid}" style="min-height:32px">
            <span class="row-text"><span class="row-name" style="font-weight:400">${k + 1}. ${esc(line).slice(0, 42)}</span></span>
          </button></li>`;
        }).join('')}
      </ul>
    </li>`).join('');
}

function renderScript() {
  const wrap = $('#sheetwrap');
  if (!wrap) return;
  ensureDraft();
  const dirty = APP.scriptDirty;
  wrap.innerHTML = `<div class="scriptwrap">
    <aside class="scriptoutline" aria-label="Story structure">
      <h2 class="scripthead">Structure</h2>
      <ul style="display:flex;flex-direction:column;gap:2px">${outlineHtml()}</ul>
    </aside>
    <div class="scriptdoc">
      <div class="scriptdoc-head">
        <h2 class="scripthead">Script</h2>
        <span class="sp"></span>
        <span class="kindtag">${dirty ? 'Unapplied changes' : 'Matches the board'}</span>
      </div>
      <textarea id="scriptText" class="scriptarea" spellcheck="false" aria-label="Script" wrap="off">${esc(APP.scriptDraft)}</textarea>
      <div class="scriptdoc-foot">
        <span class="note ${APP.scriptStatusTone === 'error' ? 'note-error' : APP.scriptStatusTone === 'ok' ? 'note-ok' : ''}" id="scriptStatus" aria-live="polite">${esc(APP.scriptStatus || '')}</span>
        <span class="sp"></span>
        <button type="button" class="btn btn-sm" data-script="reload"${dirty ? '' : ' disabled'} data-tip="Discard edits and read the board again">${icon('rotateCcw')}<span>Reload from board</span></button>
        <button type="button" class="btn btn-sm btn-primary" data-script="apply"${dirty ? '' : ' disabled'}>${icon('check')}<span>Apply script</span></button>
      </div>
    </div>
  </div>`;
}

function wireScript() {
  const host = $('#stage');
  host.addEventListener('input', e => {
    if (e.target.id !== 'scriptText') return;
    APP.scriptDraft = e.target.value;
    APP.scriptDirty = APP.scriptDraft !== toScript(APP.P);
    const tag = $('.scriptdoc-head .kindtag');
    if (tag) tag.textContent = APP.scriptDirty ? 'Unapplied changes' : 'Matches the board';
    const apply = $('[data-script="apply"]'), reload = $('[data-script="reload"]');
    if (apply) apply.disabled = !APP.scriptDirty;
    if (reload) reload.disabled = !APP.scriptDirty;
  });
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-script]');
    if (b) {
      if (b.dataset.script === 'apply') {
        applyScriptText(APP.scriptDraft);
        APP.scriptDirty = false;
        APP.scriptDraft = toScript(APP.P);
        call('syncChrome');
      } else {
        APP.scriptDraft = toScript(APP.P);
        APP.scriptDirty = false;
        APP.scriptStatus = 'Reloaded from the board.';
        APP.scriptStatusTone = '';
        call('syncChrome');
      }
      return;
    }
    const pg = e.target.closest('[data-go-page]');
    if (pg) { setWorkspace('board'); goPage(+pg.dataset.goPage); return; }
    const pn = e.target.closest('[data-go-panel]');
    if (pn) { setWorkspace('board'); selPanel(pn.dataset.goPanel); }
  });
}

/* the mobile Script destination */
function scriptSheet() {
  ensureDraft();
  return {
    title: 'Script',
    snap: 'full',
    html: `<p class="section-hint">One PAGE line, then a PANEL line per panel. @Name sets who is in the panel; a name followed by a colon is dialogue.</p>
      <textarea id="scriptSheetText" class="scriptarea" spellcheck="false" style="min-height:46vh" aria-label="Script">${esc(APP.scriptDraft)}</textarea>
      <span class="note ${APP.scriptStatusTone === 'error' ? 'note-error' : APP.scriptStatusTone === 'ok' ? 'note-ok' : ''}">${esc(APP.scriptStatus || '')}</span>
      <div class="actions">
        <button type="button" class="btn btn-sm" data-sheet-script="reload">${icon('rotateCcw')}<span>Reload</span></button>
        <button type="button" class="btn btn-sm btn-primary" data-sheet-script="apply">${icon('check')}<span>Apply script</span></button>
      </div>`,
    onMount({ body, close }) {
      const ta = $('#scriptSheetText', body);
      if (ta) ta.addEventListener('input', () => { APP.scriptDraft = ta.value; APP.scriptDirty = true; });
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-sheet-script]');
        if (!b) return;
        if (b.dataset.sheetScript === 'apply') { applyScriptText(APP.scriptDraft); APP.scriptDirty = false; APP.scriptDraft = toScript(APP.P); close(); }
        else { APP.scriptDraft = toScript(APP.P); APP.scriptDirty = false; APP.scriptStatus = 'Reloaded from the board.'; APP.scriptStatusTone = ''; close(); }
      });
    },
  };
}

export { renderScript, scriptSheet, wireScript };
