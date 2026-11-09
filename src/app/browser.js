import { $ } from '../core/dom.js';
import { esc, rng } from '../core/util.js';
import { titleCase } from '../core/text.js';
import { kit } from '../core/kit.js';
import { FUR, HAIRC, OUTFIT, SKIN } from '../core/palette.js';
import { ENUM } from '../core/enums.js';
import { icon } from '../ui/icons.js';
import { setting } from '../art/scenery.js';
import { propSvg } from '../art/props.js';
import { figFor, region } from '../page/frame.js';
import { APP, call } from './store.js';
import { addCast, armPlacement, selCast, selectionPanel } from './actions.js';
import { isSheetOpen } from '../ui/sheet.js';
import { isMobile } from './shell.js';

/* app/browser.js: the resource browser.
 *
 * Three real collections, each shown as what it is: a character is a face, a scene is a room, a
 * prop is an object. Selecting a row inspects it; the row's own action arms placement, and placing
 * happens when a panel is clicked. Nothing is inserted by a single browse click, and placement is
 * always cancellable from the context toolbar.
 */

const TABS = [
  ['characters', 'Characters', 'userRound'],
  ['scenes', 'Scenes', 'image'],
  ['props', 'Props', 'shapes'],
];

/* ── previews, drawn by the same renderer as the page ─────────────────── */
function portraitSvg(ch, uid) {
  const K = kit(APP.P.style);
  const f = figFor(ch, { expr: 'neutral', look: 'camera', pose: 'none' }, K, uid);
  const r = region(f, 'close');
  const vx = f.cx - (f.cat ? 170 : 230), vw = f.cat ? 340 : 460;
  return `<svg viewBox="${vx} ${r.vy} ${vw} ${r.vh}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><rect x="${vx - 60}" y="${r.vy - 60}" width="${vw + 120}" height="${r.vh + 120}" fill="${K.tones.main}"/>${f.svg}</svg>`;
}
function sceneSvg(name, uid) {
  const K = kit(APP.P.style);
  const p = { setting: name, tone: 'main' };
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${setting(p, 160, 100, K, uid, rng(name))}</svg>`;
}
function propSvgBox(name, uid) {
  const K = kit(APP.P.style);
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect width="160" height="100" fill="${K.tones.soft}"/>${propSvg(name, 160, 100, K, 'left')}</svg>`;
}

/* ── rows ─────────────────────────────────────────────────────────────── */
function characterRows(query) {
  const q = query.trim().toLowerCase();
  const list = APP.P.cast.filter(c => !q || c.name.toLowerCase().includes(q) || c.kind.includes(q));
  if (!list.length) return `<div class="empty">${icon('search')}<b>No characters match “${esc(query)}”.</b><span>Clear the search to see the whole cast.</span></div>`;
  return `<div class="list" role="list">` + list.map((c, i) => {
    const sel = APP.sel.kind === 'cast' && APP.sel.cid === c.id;
    const sub = c.kind === 'cat' ? 'Cat' : titleCase(c.hair) + (c.cat === 'head' ? ', cat on head' : '');
    return `<div class="row" role="listitem" aria-selected="${sel}">
      <span class="row-thumb">${portraitSvg(c, 'bw' + i + c.id)}</span>
      <button type="button" class="row-text" data-pick-cast="${c.id}" aria-current="${sel}">
        <span class="row-name">${esc(c.name)}</span>
        <span class="row-sub">${esc(sub)}</span>
      </button>
      <button type="button" class="iconbtn iconbtn-sm row-act" data-place-cast="${c.id}"
        aria-label="Place ${esc(c.name)} on a panel" data-tip="Place on a panel">${icon('plus')}</button>
    </div>`;
  }).join('') + `</div>`;
}

function sceneRows(query) {
  const q = query.trim().toLowerCase();
  const list = ENUM.setting.filter(s => !q || s.includes(q));
  if (!list.length) return `<div class="empty">${icon('search')}<b>No scenes match “${esc(query)}”.</b><span>Try a broader word, such as “room” or “street”.</span></div>`;
  return `<div class="list" role="list">` + list.map((s, i) => `<div class="row" role="listitem">
      <span class="row-thumb">${sceneSvg(s, 'bs' + i + s)}</span>
      <button type="button" class="row-text" data-place-scene="${s}">
        <span class="row-name">${esc(titleCase(s))}</span>
        <span class="row-sub">Background</span>
      </button>
      <button type="button" class="iconbtn iconbtn-sm row-act" data-place-scene="${s}"
        aria-label="Set ${esc(titleCase(s))} as a panel scene" data-tip="Place on a panel">${icon('plus')}</button>
    </div>`).join('') + `</div>`;
}

function propRows(query) {
  const q = query.trim().toLowerCase();
  const list = ENUM.prop.filter(p => p !== 'none').filter(p => !q || p.includes(q));
  if (!list.length) return `<div class="empty">${icon('search')}<b>No props match “${esc(query)}”.</b><span>Try “mug”, “phone” or “plant”.</span></div>`;
  return `<div class="list" role="list">` + list.map((p, i) => `<div class="row" role="listitem">
      <span class="row-thumb">${propSvgBox(p, 'bp' + i + p)}</span>
      <button type="button" class="row-text" data-place-prop="${p}">
        <span class="row-name">${esc(titleCase(p))}</span>
        <span class="row-sub">Prop</span>
      </button>
      <button type="button" class="iconbtn iconbtn-sm row-act" data-place-prop="${p}"
        aria-label="Place ${esc(titleCase(p))} on a panel" data-tip="Place on a panel">${icon('plus')}</button>
    </div>`).join('') + `</div>`;
}

function listFor(tab, query) {
  if (tab === 'scenes') return sceneRows(query || '');
  if (tab === 'props') return propRows(query || '');
  return characterRows(query || '');
}

/* ── the panel ────────────────────────────────────────────────────────── */
function renderBrowser() {
  const root = $('#browser');
  if (!root) return;
  const tab = APP.browserTab;
  const searching = APP.searchOpen;
  const root2 = root;
  root2.innerHTML = `
    <div class="browser-head">
      <div class="browser-title">
        <h2>Resources</h2>
        <div class="actions">
          <button type="button" class="iconbtn iconbtn-sm" data-browse="search" aria-label="Search resources" aria-pressed="${searching}" data-tip="Search">${icon('search')}</button>
          <button type="button" class="iconbtn iconbtn-sm" data-browse="close" aria-label="Hide resources" data-tip="Hide panel">${icon('panelLeftClose')}</button>
        </div>
      </div>
      <div class="seg wide" role="tablist" aria-label="Resource categories">
        ${TABS.map(([id, label, ic]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" aria-label="${label}">${icon(ic)}<span>${label}</span></button>`).join('')}
      </div>
      ${searching ? `<div class="search">${icon('search')}<input class="input" type="search" id="browseSearch" placeholder="Search ${tab}" value="${esc(APP.browserQuery)}" aria-label="Search ${tab}"></div>` : ''}
    </div>
    <div class="browser-body" id="browserBody">${listFor(tab, APP.browserQuery)}</div>
    <div class="browser-foot">${footFor(tab)}</div>`;

  if (searching) {
    const input = $('#browseSearch');
    if (input) {
      input.addEventListener('input', () => { APP.browserQuery = input.value; $('#browserBody').innerHTML = listFor(APP.browserTab, input.value); });
      input.addEventListener('keydown', e => { if (e.key === 'Escape') { APP.searchOpen = false; renderBrowser(); } });
    }
  }
}

function footFor(tab) {
  if (tab === 'characters') {
    const p = selectionPanel();
    return `<div class="actions">
      <button type="button" class="btn btn-sm" data-browse="new-cast">${icon('plus')}<span>New character</span></button>
      <span class="sp"></span>
      <span class="lbl" style="font-size:11px;color:var(--text-tertiary)">${APP.P.cast.length}/6</span>
    </div>`;
  }
  const p = selectionPanel();
  return `<p class="section-hint" style="margin:0">Pick one, then click a panel on the page to place it.${p ? '' : ' Select a panel first.'}</p>`;
}

function wireBrowser() {
  const root = $('#browser');
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { APP.browserTab = t.dataset.tab; APP.browserQuery = ''; call('syncChrome'); return; }
    const b = e.target.closest('[data-browse]');
    if (b) {
      const act = b.dataset.browse;
      if (act === 'search') { APP.searchOpen = !APP.searchOpen; renderBrowser(); const i = $('#browseSearch'); if (i) i.focus(); }
      else if (act === 'close') call('togglePanel', 'browser');
      else if (act === 'new-cast') addCast();
      return;
    }
    const pick = e.target.closest('[data-pick-cast]');
    if (pick) { selCast(pick.dataset.pickCast); return; }
    const cast = e.target.closest('[data-place-cast]');
    if (cast && isMobile() && isSheetOpen()) closeSheet();
    if (cast) { armPlacement('character', cast.dataset.placeCast); return; }
    const scene = e.target.closest('[data-place-scene]');
    if (scene) { armPlacement('scene', scene.dataset.placeScene); call('closeDrawer'); return; }
    const prop = e.target.closest('[data-place-prop]');
    if (prop) { armPlacement('prop', prop.dataset.placeProp); call('closeDrawer'); return; }
  });
}

/* the mobile Add destination: the same three collections, in the same order */
function addSheet() {
  const tab = APP.browserTab;
  return {
    title: 'Add to a panel',
    snap: 'half',
    html: `<div class="seg wide" role="tablist" aria-label="What to add">
        ${TABS.map(([id, label, ic]) => `<button type="button" role="tab" data-addtab="${id}" aria-selected="${tab === id}">${icon(ic)}<span>${label}</span></button>`).join('')}
      </div>
      <p class="section-hint">Choose something, then tap the panel it belongs in. Cancel any time from the bar above the page.</p>
      <div id="addList">${listFor(tab, '')}</div>`,
    onMount({ body, close }) {
      body.addEventListener('click', e => {
        const t = e.target.closest('[data-addtab]');
        if (t) {
          APP.browserTab = t.dataset.addtab;
          const cfg = addSheet();
          body.innerHTML = cfg.html;
          return;
        }
        const cast = e.target.closest('[data-pick-cast]');
        if (cast) { selCast(cast.dataset.pickCast); close(); call('openDestination', 'edit'); return; }
        const place = e.target.closest('[data-place-cast],[data-place-scene],[data-place-prop]');
        if (place) {
          if (place.dataset.placeCast) armPlacement('character', place.dataset.placeCast);
          else if (place.dataset.placeScene) armPlacement('scene', place.dataset.placeScene);
          else armPlacement('prop', place.dataset.placeProp);
          close();
        }
      });
    },
  };
}

export { addSheet, listFor, renderBrowser, wireBrowser };
