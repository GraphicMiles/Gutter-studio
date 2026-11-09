import { $ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { titleCase } from '../core/text.js';
import { ENUM } from '../core/enums.js';
import { icon } from '../ui/icons.js';
import { APP, call } from './store.js';
import { curPage, edit } from './history.js';
import {
  addBubble, addCharacterToPanel, addPage, addPanel, clearPlacement, deletePanel, duplicatePanel,
  movePanel, removeCharacterFromPanel, selectionKind, selectionPanel, setPageLayout, setWorkspace,
} from './actions.js';

/* app/toolbar.js: the context toolbar, directly under the header.
 *
 * It is not a second navigation bar. The left end always holds the workspace switch, so that one
 * control never moves; everything after it changes with the active tool and the current
 * selection, and shows only what that tool or object can actually do.
 */

const tbSeg = (label, opts, value, ctl) =>
  `<div class="seg" role="group" aria-label="${esc(label)}">${opts.map(([v, l]) =>
    `<button type="button" data-ctl="${ctl}" data-value="${esc(v)}" aria-pressed="${v === value}">${esc(l)}</button>`).join('')}</div>`;

const tbSelect = (label, opts, value, ctl) =>
  `<label class="grp"><span class="lbl">${esc(label)}</span>
    <select class="input" data-ctl="${ctl}" aria-label="${esc(label)}" style="height:26px;width:auto;min-width:96px;font-size:12px">
      ${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select></label>`;

const tbBtn = (ctl, label, ic, extra) =>
  `<button type="button" class="btn ${extra || ''}" data-ctl="${ctl}">${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;

function workspaceGroup() {
  return `<div class="seg" role="group" aria-label="Workspace">
    <button type="button" data-ctl="workspace" data-value="board" aria-pressed="${APP.workspace === 'board'}">${icon('panelsTopLeft')}Board</button>
    <button type="button" data-ctl="workspace" data-value="script" aria-pressed="${APP.workspace === 'script'}">${icon('fileText')}Script</button>
  </div><span class="sep"></span>`;
}

/* What the armed tool will do, stated plainly, with a way out. */
function placementGroup() {
  const p = APP.place;
  if (!p) return '';
  const kind = p.kind;
  let name = kind;
  if (kind === 'character') {
    const id = p.value || (APP.browserSel && APP.browserSel.kind === 'character' ? APP.browserSel.id : null);
    const c = APP.P.cast.find(x => x.id === id) || APP.P.cast[0];
    name = 'character' + (c ? ': ' + c.name : '');
  } else if (kind === 'scene' || kind === 'prop') {
    name = kind + (p.value ? ': ' + titleCase(p.value) : '');
  } else if (kind === 'bubble') {
    name = 'speech bubble';
  } else if (kind === 'text') {
    name = 'caption';
  }
  const target = kind === 'panel' ? 'Click the page to add a panel' : 'Click a panel to place it';
  return `<div class="grp" style="gap:6px;padding:0 8px 0 6px;height:26px;border-radius:8px;background:var(--surface-well);box-shadow:inset 0 0 0 1px var(--card-border);color:var(--text-primary)">
    ${icon('move', 14)}<span class="lbl" style="color:inherit;font-weight:500">${esc(target)}: ${esc(name)}</span>
    <button type="button" class="iconbtn iconbtn-sm" data-ctl="cancel-place" aria-label="Cancel placement" style="color:inherit">${icon('x')}</button>
  </div><span class="sep"></span>`;
}

function toolGroup() {
  /* a tool's own options stay visible while it is armed: the type of bubble is chosen before
     the bubble exists, so it belongs to the tool, not to the selection */
  if (APP.place && (APP.place.kind !== 'text' && APP.place.kind !== 'bubble')) return '';
  switch (APP.tool) {
    case 'bubble':
      return `<div class="grp">${tbSeg('Bubble type', ENUM.bubble.map(b => [b, titleCase(b)]), (APP.place && APP.place.value) || 'speech', 'bubtype')}</div><span class="sep"></span>`;
    case 'character':
      return `<div class="grp"><span class="lbl">Place character</span>${APP.P.cast.map(c =>
        `<button type="button" class="btn btn-sm" data-ctl="pick-cast" data-value="${c.id}">${esc(c.name)}</button>`).join('')}</div><span class="sep"></span>`;
    default:
      return '';
  }
}

function selectionGroup() {
  const kind = selectionKind();
  const p = selectionPanel();
  if (kind === 'page') {
    const pg = curPage();
    return `<div class="grp">
        ${tbBtn('add-panel', 'Add panel', 'plus')}
        ${tbBtn('add-page', 'Add page', 'filePlus')}
      </div><span class="sep"></span>
      <div class="grp"><span class="lbl">Layout</span>${tbSeg('Page layout', [['auto', 'Auto'], ['stack', 'Stacked'], ['grid', 'Grid'], ['hero', 'Hero']], pg.layout, 'layout')}</div>`;
  }
  if (!p) return '';
  if (kind === 'panel') {
    return `<div class="grp">
        ${tbBtn('add-char', 'Character', 'userRound')}
        ${tbBtn('add-bubble', 'Bubble', 'messageSquare')}
      </div><span class="sep"></span>
      <div class="grp">
        <button type="button" class="iconbtn" data-ctl="panel-left" aria-label="Move panel earlier" data-tip="Move earlier  ["${p === curPage().panels[0] ? ' disabled' : ''}>${icon('arrowLeft')}</button>
        <button type="button" class="iconbtn" data-ctl="panel-right" aria-label="Move panel later" data-tip="Move later  ]"${p === curPage().panels[curPage().panels.length - 1] ? ' disabled' : ''}>${icon('arrowRight')}</button>
        <button type="button" class="iconbtn" data-ctl="dup-panel" aria-label="Duplicate panel" data-tip="Duplicate panel  Ctrl+D">${icon('copy')}</button>
        <button type="button" class="iconbtn" data-ctl="del-panel" aria-label="Delete panel" data-tip="Delete panel">${icon('trash2')}</button>
      </div><span class="sep"></span>
      <div class="grp">${tbSeg('Shot', [['extreme-close', 'XCU'], ['close', 'Close'], ['medium', 'Med'], ['full', 'Full'], ['wide', 'Wide']], p.shot, 'shot')}</div>`;
  }
  if (kind === 'char') {
    const i = APP.sel.i;
    return `<div class="grp">${tbSelect('Expression', ENUM.expr.map(x => [x, titleCase(x)]), p.expr[i], 'expr')}</div>
      <span class="sep"></span>
      <div class="grp">${tbSeg('Position', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], p.pos[0] === 'auto' ? 'center' : p.pos[0], 'pos')}</div>
      <span class="sep"></span>
      <div class="grp"><button type="button" class="iconbtn" data-ctl="del-char" aria-label="Remove character from panel" data-tip="Remove from panel">${icon('trash2')}</button></div>`;
  }
  if (kind === 'bubble') {
    const i = APP.sel.i, b = p.bubbles[i];
    if (!b) return '';
    return `<div class="grp">${tbSeg('Bubble type', ENUM.bubble.map(x => [x, titleCase(x)]), b.type, 'bubbletype')}</div>
      <span class="sep"></span>
      <div class="grp">${tbSelect('Speaker', (p.who.length ? p.who : []).map((id, k) => [String(k), (APP.P.cast.find(c => c.id === id) || { name: 'Unnamed' }).name]), String(b.who), 'speaker')}</div>
      <span class="sep"></span>
      <div class="grp"><button type="button" class="iconbtn" data-ctl="del-bubble" aria-label="Delete bubble" data-tip="Delete bubble">${icon('trash2')}</button></div>`;
  }
  if (kind === 'prop') {
    return `<div class="grp">${tbSelect('Prop', ENUM.prop.map(x => [x, titleCase(x)]), p.prop, 'prop')}</div>
      <span class="sep"></span>
      <div class="grp">${tbSelect('Side', [['left', 'Left'], ['right', 'Right']], p.pos[0] === 'right' ? 'left' : 'right', 'propside')}</div>
      <span class="sep"></span>
      <div class="grp"><button type="button" class="iconbtn" data-ctl="del-prop" aria-label="Remove prop" data-tip="Remove prop">${icon('trash2')}</button></div>`;
  }
  if (kind === 'cast') {
    const c = APP.P.cast.find(x => x.id === APP.sel.cid);
    return `<div class="grp"><span class="lbl">${esc(c ? c.name : 'Character')}</span>
        <span class="kindtag">${icon(c && c.kind === 'cat' ? 'cat' : 'userRound')}${esc(c ? c.kind === 'cat' ? 'Cat' : 'Person' : '')}</span></div>
      <span class="sep"></span>
      <div class="grp">${tbBtn('cast-random', 'Randomise', 'wandSparkles')}</div>`;
  }
  return '';
}

/* the script document owns its own Apply and Reload, right under the text being edited */
function scriptGroup() {
  return `<div class="grp"><span class="lbl">Plain text — one PAGE line, then a PANEL line per panel. A name followed by a colon is dialogue.</span></div>`;
}

function renderToolbar() {
  const root = $('#ctxbar');
  if (!root) return;
  const focus = document.activeElement, activeCtl = focus && focus.dataset ? focus.dataset.ctl : null;
  const parts = [workspaceGroup()];
  if (APP.workspace === 'script') parts.push(scriptGroup());
  else parts.push(placementGroup(), toolGroup(), selectionGroup());
  root.innerHTML = parts.join('') + '<span class="sp"></span>';
  if (activeCtl) {
    const again = root.querySelector(`[data-ctl="${activeCtl}"]`);
    if (again) again.focus({ preventScroll: true });
  }
}

/* one handler for every control the toolbar can draw */
function wireToolbar() {
  const root = $('#ctxbar');
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ctl]');
    if (!b || b.disabled) return;
    const ctl = b.dataset.ctl, val = b.dataset.value;
    const p = selectionPanel(), kind = selectionKind();
    switch (ctl) {
      case 'workspace': setWorkspace(val); break;
      case 'cancel-place': clearPlacement(); break;
      case 'layout': setPageLayout(val); break;
      case 'add-panel': addPanel(); break;
      case 'add-page': addPage(); break;
      case 'add-char': addCharacterToPanel(p); break;
      case 'add-bubble': addBubble(p); break;
      case 'panel-left': movePanel(-1, p); break;
      case 'panel-right': movePanel(1, p); break;
      case 'dup-panel': duplicatePanel(p); break;
      case 'del-panel': deletePanel(p); break;
      case 'shot': edit(() => { p.shot = val; }); break;
      case 'expr': edit(() => { p.expr[APP.sel.i] = val; }); break;
      case 'pos': edit(() => { p.pos = [val]; }); break;
      case 'del-char': removeCharacterFromPanel(p, APP.sel.i); break;
      case 'bubbletype': edit(() => { p.bubbles[APP.sel.i].type = val; }); break;
      case 'speaker': edit(() => { p.bubbles[APP.sel.i].who = +val; }); break;
      case 'del-bubble': edit(() => { p.bubbles.splice(APP.sel.i, 1); APP.sel = { kind: 'panel', pid: p.id }; APP.selId = p.id; }); break;
      case 'prop': edit(() => { p.prop = val; }); break;
      case 'propside': edit(() => { p.pos = [val === 'left' ? 'right' : 'left']; }); break;
      case 'del-prop': edit(() => { p.prop = 'none'; APP.sel = { kind: 'panel', pid: p.id }; }); break;
      case 'pick-cast': call('armPlacement', 'character', val); break;
      case 'bubtype': call('armPlacement', 'bubble', val); break;
      case 'cast-random': call('randomiseCast'); break;
      case 'script-apply': call('applyScript'); break;
      case 'script-reload': call('reloadScript'); break;
      default: break;
    }
  });
  root.addEventListener('change', e => {
    const s = e.target.closest('select[data-ctl]');
    if (!s) return;
    const ctl = s.dataset.ctl, val = s.value;
    const p = selectionPanel();
    if (!p) return;
    if (ctl === 'expr') edit(() => { p.expr[APP.sel.i] = val; });
    else if (ctl === 'speaker') edit(() => { p.bubbles[APP.sel.i].who = +val; });
    else if (ctl === 'prop') edit(() => { p.prop = val; });
    else if (ctl === 'propside') edit(() => { p.pos = [val === 'left' ? 'right' : 'left']; });
  });
}

export { renderToolbar, wireToolbar };
