import { $, toast } from '../core/dom.js';
import { esc } from '../core/util.js';
import { scrub, titleCase } from '../core/text.js';
import { num } from '../core/util.js';
import { ENUM } from '../core/enums.js';
import { kit } from '../core/kit.js';
import { LIM } from '../model/schema.js';
import { FUR, HAIRC, OUTFIT, PRESETS, SKIN } from '../core/palette.js';
import { icon } from '../ui/icons.js';
import { figFor, region } from '../page/frame.js';
import { APP, call } from './store.js';
import { curPage, edit } from './history.js';
import {
  addBubble, addCharacterToPanel, deletePanel, duplicatePanel, movePanel, removeBubble,
  removeCast, removeCharacterFromPanel, selBubble, selChar, selPanel, selectionKind,
  selectionPanel, setTitle, swapCharacter,
} from './actions.js';
import { setPageLayout } from './actions.js';
import { isMobile } from './shell.js';

/* app/inspector.js: the properties panel.
 *
 * It answers one question per selection: what can I change about this thing? A page shows page and
 * style settings, a panel shows its shot and words, a character shows performance and appearance,
 * a bubble shows its type and text. Nothing else is listed — there is no giant form that changes
 * every object at once, and every control writes to the real object through the history layer.
 */

const ACT = [];
const h = fn => { ACT.push(fn); return ACT.length - 1; };
const N = list => list.map(x => [x, titleCase(x)]);

/* ── control builders ─────────────────────────────────────────────────── */
const rowSelect = (label, opts, value, set, key) =>
  `<label class="prow"><span class="plabel">${esc(label)}</span><span class="pctl">
    <select class="input" data-h="${h(e => set(e.value))}" data-fk="${esc(key || label)}" aria-label="${esc(label)}">
      ${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select></span></label>`;

const blockSelect = (label, opts, value, set, key) => {
  ACT.push(e => set(e.value));
  const i = ACT.length - 1;
  return `<div class="field"><label for="bs${i}">${esc(label)}</label>
    <select class="input" id="bs${i}" data-h="${i}" data-fk="${esc(key || label)}">
      ${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select></div>`;
};

const seg = (label, opts, value, set, key) =>
  `<div class="field"><span class="field-label">${esc(label)}</span>
    <div class="seg wide" role="group" aria-label="${esc(label)}" data-fk="${esc(key || label)}">
      ${opts.map(([v, l]) => `<button type="button" data-h="${h(() => set(v))}" aria-pressed="${v === value}">${esc(l)}</button>`).join('')}
    </div></div>`;

const slider = (label, min, max, step, value, set, fmt, key) => {
  const out = fmt ? fmt(value) : String(value);
  return `<div class="slider"><div class="slider-head"><label>${esc(label)}</label><output>${esc(out)}</output></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(label)}"
      data-h="${h(e => { const o = e.parentNode.querySelector('output'); o.textContent = fmt ? fmt(+e.value) : e.value; set(+e.value); })}"
      data-in="1" data-fk="${esc(key || label)}"></div>`;
};

const toggle = (label, value, set, key) =>
  `<label class="toggle"><span>${esc(label)}</span>
    <input type="checkbox" ${value ? 'checked' : ''} data-h="${h(e => set(e.checked))}" data-fk="${esc(key || label)}"></label>`;

const textInput = (label, value, set, o) => {
  o = o || {};
  const id = 'f' + ACT.length + Math.random().toString(36).slice(2, 6);
  ACT.push(e => set(e.value));
  const hi = ACT.length - 1;
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    ${o.area
      ? `<textarea class="input" id="${id}" rows="${o.rows || 3}" maxlength="${o.max || 200}" data-h="${hi}" data-in="1" data-fk="${esc(o.key || label)}" placeholder="${esc(o.placeholder || '')}">${esc(value)}</textarea>`
      : `<input class="input" id="${id}" type="text" maxlength="${o.max || 80}" value="${esc(value)}" data-h="${hi}" data-in="1" data-fk="${esc(o.key || label)}" placeholder="${esc(o.placeholder || '')}">`}
  </div>`;
};

const swatches = (label, map, value, set, key) =>
  `<div class="field"><span class="field-label">${esc(label)}</span>
    <div class="swatches" role="group" aria-label="${esc(label)}" data-fk="${esc(key || label)}">
      ${Object.keys(map).map(k => `<button type="button" class="swatch" style="background:${map[k]}" data-h="${h(() => set(k))}"
        aria-label="${esc(k)}" title="${esc(k)}" aria-pressed="${k === value}"></button>`).join('')}
    </div></div>`;

const colorWell = (label, value, set, key) =>
  `<label class="colorwell"><span>${esc(label)}</span>
    <input type="color" value="${value}" data-h="${h(e => set(e.value))}" data-in="1" data-fk="${esc(key || label)}" aria-label="${esc(label)}"></label>`;

/* ── sections ─────────────────────────────────────────────────────────── */
const sectionOpen = (kind, id, def) => {
  const key = kind + ':' + id;
  const v = APP.openSections[key];
  return v === undefined ? def !== false : v;
};
function section(kind, id, title, body, open) {
  const on = sectionOpen(kind, id, open);
  return `<section class="section">
    <button type="button" class="section-head" data-sec="${kind}:${id}" aria-expanded="${on}">
      ${esc(title)}${icon('chevronDown')}
    </button>
    <div class="section-body"${on ? '' : ' hidden'}>${body}</div>
  </section>`;
}

function monoised(map) {
  const K = kit(APP.P.style);
  const o = {};
  Object.keys(map).forEach(k => { o[k] = K.c(map[k]); });
  return o;
}

/* ── page + style ─────────────────────────────────────────────────────── */
const FMT_OPTS = [['comic', 'Comic page'], ['manga', 'Manga page'], ['webtoon', 'Webtoon strip'], ['square', 'Square post'], ['storyboard', 'Storyboard sheet']];

function pageSections() {
  const P = APP.P, s = P.style, pg = curPage();
  const K = kit(s);
  const setStyle = (fn, key) => edit(() => fn(P.style), key, { insp: false, script: false });
  const setStyleRerender = fn => edit(() => fn(P.style), '', { script: false });

  const page = section('page', 'page', 'Page', `
    ${blockSelect('Format', FMT_OPTS, s.fmt, v => setStyleRerender(q => { q.fmt = v; }), 'format')}
    <p class="section-hint">The format applies to every page in this project.</p>
    ${seg('Panel layout', [['auto', 'Auto'], ['stack', 'Stacked'], ['grid', 'Grid'], ['hero', 'Hero']], pg.layout, v => setPageLayout(v), 'layout')}
    <div class="prow"><span class="plabel">Page</span><span class="plabel">${APP.pageIdx + 1} of ${P.pages.length} · ${pg.panels.length} panel${pg.panels.length === 1 ? '' : 's'}</span></div>
  `, true);

  const style = section('page', 'style', 'Page style', `
    ${blockSelect('Palette', Object.entries(PRESETS).map(([k, v]) => [k, v.name]), s.preset,
    v => setStyleRerender(q => { q.preset = v; q.tones = {}; q.shadow = q.line = q.paper = q.cap = q.sfx = ''; }), 'palette')}
    <div class="colorwells">
      ${['main', 'warm', 'cool', 'night', 'alert', 'soft'].map(k => colorWell(titleCase(k), K.tones[k], v => setStyle(q => { q.tones = Object.assign({}, q.tones); q.tones[k] = v; }, 'tone' + k), 'tone-' + k)).join('')}
    </div>
    <div class="colorwells">
      ${colorWell('Ink', K.line, v => setStyle(q => { q.line = v; }, 'ink'), 'ink')}
      ${colorWell('Paper', K.paper, v => setStyle(q => { q.paper = v; }, 'paper'), 'paper')}
      ${colorWell('Shadow', K.shadow, v => setStyle(q => { q.shadow = v; }, 'shadow'), 'shadow')}
      ${colorWell('Caption', K.cap, v => setStyle(q => { q.cap = v; }, 'cap'), 'cap')}
      ${colorWell('Sound effect', K.sfx, v => setStyle(q => { q.sfx = v; }, 'sfx'), 'sfx')}
    </div>
    ${slider('Line weight', 2, 8, .5, s.sw, v => setStyle(q => { q.sw = v; }, 'sw'), v => v.toFixed(1), 'line weight')}
    ${slider('Gutter', 0, 60, 2, s.gutter, v => setStyle(q => { q.gutter = v; }, 'gut'), null, 'gutter')}
    ${slider('Page margin', 0, 120, 4, s.margin, v => setStyle(q => { q.margin = v; }, 'mar'), null, 'margin')}
    ${slider('Corner radius', 0, 40, 2, s.rad, v => setStyle(q => { q.rad = v; }, 'rad'), null, 'radius')}
    ${slider('Lettering size', .7, 1.4, .05, s.fs, v => setStyle(q => { q.fs = v; }, 'fs'), v => Math.round(v * 100) + '%', 'lettering')}
    ${blockSelect('Bubbles', [['round', 'Round'], ['boxy', 'Boxy']], s.bub, v => setStyleRerender(q => { q.bub = v; }), 'bubbles')}
    ${blockSelect('Panel border', [['clean', 'Clean'], ['none', 'None'], ['jagged', 'Jagged']], s.border, v => setStyleRerender(q => { q.border = v; }), 'border')}
    ${blockSelect('Background pattern', [['none', 'None'], ['dots', 'Halftone dots'], ['stripes', 'Stripes'], ['burst', 'Burst']], s.pattern, v => setStyleRerender(q => { q.pattern = v; }), 'pattern')}
    ${toggle('Offset shadows', s.shadowOn, v => setStyleRerender(q => { q.shadowOn = v; }), 'shadows')}
    ${toggle('Paper grain', s.grain, v => setStyleRerender(q => { q.grain = v; }), 'grain')}
    ${toggle('Capital letters in bubbles', s.caps, v => setStyleRerender(q => { q.caps = v; }), 'caps')}
  `, false);

  const project = section('page', 'project', 'Project', `
    ${textInput('Project name', P.title, v => setTitle(v), { max: LIM.title, key: 'title' })}
    <div class="prow"><span class="plabel">Pages</span><span class="plabel">${P.pages.length} of ${LIM.pages}</span></div>
    <div class="prow"><span class="plabel">Characters</span><span class="plabel">${P.cast.length} of ${LIM.cast}</span></div>
  `, false);

  return page + style + project;
}

/* ── panel ────────────────────────────────────────────────────────────── */
function panelSections(p) {
  const pg = curPage(), idx = pg.panels.findIndex(x => x.id === p.id), K = kit(APP.P.style);
  const set = (fn, key) => edit(() => fn(p), key);
  const bubbles = p.bubbles.length
    ? p.bubbles.map((b, i) => `<div class="field" style="gap:6px;padding:8px;border-radius:8px;background:var(--surface-muted)">
        <div class="prow"><span class="plabel">Bubble ${i + 1}</span>
          <span class="pctl"><button type="button" class="iconbtn iconbtn-sm" data-h="${h(() => { selBubble(p.id, i); })}" aria-label="Edit bubble ${i + 1}" data-tip="Edit this bubble">${icon('penLine')}</button>
          <button type="button" class="iconbtn iconbtn-sm" data-h="${h(() => removeBubble(p, i))}" aria-label="Delete bubble ${i + 1}" data-tip="Delete bubble">${icon('trash2')}</button></span>
        </div>
        <p class="section-hint" style="margin:0">${esc(b.text || 'Empty bubble')}</p>
      </div>`).join('')
    : `<p class="section-hint">No dialogue yet. Add a bubble to give this panel a voice.</p>`;

  const castRows = p.who.map((id, i) => {
    const c = APP.P.cast.find(x => x.id === id);
    return `<button type="button" class="row" data-h="${h(() => selChar(p.id, i))}" aria-label="Edit ${esc(c ? c.name : 'character')}">
      <span class="row-text"><span class="row-name">${esc(c ? c.name : 'Missing character')}</span>
      <span class="row-sub">${esc(p.expr[i] || 'neutral')} · ${esc(p.look[i] || 'center')}${p.pose[i] && p.pose[i] !== 'none' ? ' · ' + esc(p.pose[i]) : ''}</span></span>
      ${icon('chevronRight')}</button>`;
  }).join('');

  const main = section('panel', 'main', `Panel ${idx + 1} of ${pg.panels.length}`, `
    ${seg('Shot', [['extreme-close', 'XCU'], ['close', 'Close'], ['medium', 'Med'], ['full', 'Full'], ['wide', 'Wide']], p.shot, v => set(q => { q.shot = v; }, 'shot'), 'shot')}
    ${blockSelect('Scene', N(ENUM.setting), p.setting, v => set(q => { q.setting = v; }, 'setting'), 'scene')}
    ${blockSelect('Prop', N(ENUM.prop), p.prop, v => set(q => { q.prop = v; }, 'prop'), 'prop')}
    <div class="field"><span class="field-label">Panel background</span>
      <div class="swatches" role="group" aria-label="Panel background">
        ${['main', 'warm', 'cool', 'night', 'alert', 'soft'].map(k => `<button type="button" class="swatch" style="background:${K.tones[k]}"
          data-h="${h(() => set(q => { q.tone = k; }, 'tone'))}" aria-label="${esc(k)}" title="${esc(titleCase(k))}" aria-pressed="${p.tone === k}"></button>`).join('')}
      </div></div>
    ${p.who.length < 2 ? seg('Placement', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], p.pos[0] === 'auto' ? 'center' : p.pos[0], v => set(q => { q.pos = [v]; }, 'pos'), 'placement') : ''}
    <div class="actions">
      <button type="button" class="btn btn-sm" data-h="${h(() => movePanel(-1, p))}"${idx === 0 ? ' disabled' : ''}>${icon('arrowLeft')}<span>Earlier</span></button>
      <button type="button" class="btn btn-sm" data-h="${h(() => movePanel(1, p))}"${idx === pg.panels.length - 1 ? ' disabled' : ''}>${icon('arrowRight')}<span>Later</span></button>
      <button type="button" class="btn btn-sm" data-h="${h(() => duplicatePanel(p))}">${icon('copy')}<span>Duplicate</span></button>
    </div>
    <button type="button" class="btn btn-sm btn-danger" data-h="${h(() => deletePanel(p))}">${icon('trash2')}<span>Delete panel</span></button>
  `, true);

  const cast = section('panel', 'cast', 'Characters', `
    ${castRows || `<p class="section-hint">No characters in this panel. A panel can hold two.</p>`}
    ${p.who.length < 2 ? `<button type="button" class="btn btn-sm" data-h="${h(() => addCharacterToPanel(p))}">${icon('plus')}<span>Add a character</span></button>` : ''}
  `, true);

  const words = section('panel', 'words', 'Words', `
    ${textInput('Caption box', p.caption, v => edit(() => { p.caption = scrub(v, LIM.text); }, 'cap' + p.id, { insp: false }), { area: true, rows: 2, max: LIM.text, key: 'caption' })}
    ${bubbles}
    ${p.bubbles.length < LIM.bubbles ? `<button type="button" class="btn btn-sm" data-h="${h(() => addBubble(p))}">${icon('messageSquare')}<span>Add a speech bubble</span></button>` : ''}
    ${textInput('Sound effect', p.sfx.text, v => edit(() => { p.sfx.text = scrub(v, 24); }, 'sfx' + p.id, { insp: false }), { max: 24, key: 'sfx' })}
    ${blockSelect('Sound effect corner', [['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left'], ['c', 'Centre']], p.sfx.pos, v => set(q => { q.sfx.pos = v; }, 'sfxpos'), 'sfx corner')}
  `, false);

  const note = section('panel', 'note', "Director's note", `
    ${textInput('Note', p.note, v => edit(() => { p.note = scrub(v, LIM.note); }, 'note' + p.id, { insp: false }), { area: true, rows: 2, max: LIM.note, key: 'note', placeholder: 'Shown under the frame on a storyboard sheet' })}
  `, false);

  const ai = section('panel', 'ai', 'Rewrite with Claude', `
    ${textInput('What should change?', APP.aiNote, v => { APP.aiNote = v; }, { max: 200, key: 'ai-note', placeholder: 'Make the reaction bigger, swap the mug for a phone' })}
    <button type="button" class="btn btn-primary btn-sm" data-h="${h(() => call('rewritePanel', p))}"${APP.AI ? '' : ' disabled'}>${icon('sparkles')}<span>Rewrite panel</span></button>
    <p class="section-hint" id="rwStat">${APP.AI ? 'This replaces the panel. Undo brings the old one back.' : 'Claude is not available in this build, so this panel stays as it is.'}</p>
  `, false);

  return main + cast + words + note + ai;
}

/* ── one character inside a panel ─────────────────────────────────────── */
function charSections(p, i) {
  const id = p.who[i], c = APP.P.cast.find(x => x.id === id);
  if (!c) return `<div class="empty">${icon('userRound')}<b>This character is gone.</b><span>Choose another character for the panel.</span></div>`;
  const person = c.kind === 'person';
  const setCast = (fn, key) => edit(() => fn(c), key);

  const identity = section('char', 'id', c.name, `
    ${blockSelect('Character', APP.P.cast.map(x => [x.id, x.name]), id, v => swapCharacter(p, i, v), 'who')}
    ${p.who.length > 1 ? `<p class="section-hint">This panel has two characters, so each one takes half the frame. Position is set by the pair.</p>` : ''}
    <button type="button" class="btn btn-sm btn-danger" data-h="${h(() => removeCharacterFromPanel(p, i))}">${icon('trash2')}<span>Remove from panel</span></button>
  `, true);

  const perf = section('char', 'perf', 'Performance', `
    ${blockSelect('Expression', N(ENUM.expr), p.expr[i], v => edit(() => { p.expr[i] = v; }), 'expression')}
    ${blockSelect('Looking', N(ENUM.look), p.look[i], v => edit(() => { p.look[i] = v; }), 'looking')}
    ${person ? blockSelect('Pose', N(ENUM.pose), p.pose[i], v => edit(() => { p.pose[i] = v; }), 'pose') : ''}
    ${p.who.length === 1 ? seg('Position', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], p.pos[0] === 'auto' ? 'center' : p.pos[0], v => edit(() => { p.pos = [v]; }), 'position') : ''}
  `, true);

  const look = section('char', 'look', 'Appearance', `
    <p class="section-hint">These belong to ${esc(c.name)} in every panel of this project.</p>
    <div class="prev" aria-hidden="true">${portrait(c)}</div>
    ${person ? swatches('Skin', monoised(SKIN), c.skin, v => setCast(q => { q.skin = v; }, 'skin'), 'skin') : ''}
    ${blockSelect('Type', [['person', 'Person'], ['cat', 'Cat']], c.kind, v => setCast(q => { q.kind = v; }, 'kind'), 'type')}
    ${person ? `
      ${blockSelect('Hair', N(ENUM.hair), c.hair, v => setCast(q => { q.hair = v; }, 'hair'), 'hair')}
      ${swatches('Hair colour', monoised(HAIRC), c.hairColor, v => setCast(q => { q.hairColor = v; }, 'hairColour'), 'hair colour')}
      ${swatches('Outfit colour', monoised(OUTFIT), c.outfit, v => setCast(q => { q.outfit = v; }, 'outfit'), 'outfit')}
      ${blockSelect('Collar', N(ENUM.collar), c.collar, v => setCast(q => { q.collar = v; }, 'collar'), 'collar')}
      ${blockSelect('Glasses', N(ENUM.glasses), c.glasses, v => setCast(q => { q.glasses = v; }, 'glasses'), 'glasses')}
      ${blockSelect('Hat', N(ENUM.hat), c.hat, v => setCast(q => { q.hat = v; }, 'hat'), 'hat')}
      ${c.hat !== 'none' ? swatches('Hat colour', monoised(OUTFIT), c.hatColor, v => setCast(q => { q.hatColor = v; }, 'hatColour'), 'hat colour') : ''}
      ${blockSelect('Nose', N(ENUM.nose), c.nose, v => setCast(q => { q.nose = v; }, 'nose'), 'nose')}
      ${blockSelect('Companion', [['none', 'No cat'], ['head', 'Cat on head']], c.cat, v => setCast(q => { q.cat = v; }, 'companion'), 'companion')}
    ` : ''}
    ${(!person || c.cat === 'head') ? swatches('Cat fur', monoised(FUR), c.catFur, v => setCast(q => { q.catFur = v; }, 'catFur'), 'cat fur') : ''}
    ${!person ? blockSelect('Default mood', N(ENUM.mood), c.catMood, v => setCast(q => { q.catMood = v; }, 'mood'), 'mood') : ''}
    <button type="button" class="btn btn-sm" data-h="${h(() => call('randomiseCast', c.id))}">${icon('wandSparkles')}<span>Randomise look</span></button>
  `, false);

  return identity + perf + look;
}

function portrait(c) {
  const K = kit(APP.P.style);
  const f = figFor(c, { expr: 'neutral', look: 'camera', pose: 'none' }, K, 'insp' + c.id);
  const r = region(f, 'close');
  const vw = f.cat ? 340 : 460, vx = f.cx - vw / 2;
  return `<svg viewBox="${vx} ${r.vy} ${vw} ${r.vh}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><rect x="${vx - 80}" y="${r.vy - 80}" width="${vw + 160}" height="${r.vh + 160}" fill="${K.tones.main}"/>${f.svg}</svg>`;
}

/* ── bubble ───────────────────────────────────────────────────────────── */
function bubbleSections(p, i) {
  const b = p.bubbles[i];
  if (!b) return '';
  const set = (fn, key) => edit(() => fn(b), key);
  return section('bubble', 'main', `Bubble ${i + 1}`, `
    ${seg('Type', [['speech', 'Speech'], ['thought', 'Thought'], ['shout', 'Shout'], ['whisper', 'Whisper'], ['caption', 'Caption']], b.type, v => set(q => { q.type = v; }), 'type')}
    ${blockSelect('Speaker', (p.who.length ? p.who : []).map((id, k) => [String(k), (APP.P.cast.find(c => c.id === id) || { name: 'Unnamed' }).name]), String(b.who), v => set(q => { q.who = +v; }), 'speaker')}
    ${textInput('Dialogue', b.text, v => edit(() => { b.text = scrub(v, LIM.text); }, 'bt' + p.id + i, { insp: false }), { area: true, rows: 3, max: LIM.text, key: 'bubble-text', placeholder: 'What is said' })}
    <div class="actions">
      <button type="button" class="btn btn-sm" data-h="${h(() => selPanel(p.id))}">${icon('square')}<span>Back to panel</span></button>
      <button type="button" class="btn btn-sm btn-danger" data-h="${h(() => removeBubble(p, i))}">${icon('trash2')}<span>Delete</span></button>
    </div>
  `, true);
}

/* ── prop ─────────────────────────────────────────────────────────────── */
function propSections(p) {
  const set = (fn, key) => edit(() => fn(p), key);
  return section('prop', 'main', 'Prop', `
    ${blockSelect('Object', N(ENUM.prop), p.prop, v => set(q => { q.prop = v; }, 'prop'), 'prop')}
    ${seg('Side', [['left', 'Left'], ['right', 'Right']], p.pos[0] === 'right' ? 'left' : 'right', v => set(q => { q.pos = [v === 'left' ? 'right' : 'left']; }, 'side'), 'side')}
    <p class="section-hint">A prop sits in the lower corner of the panel, opposite the character.</p>
    <button type="button" class="btn btn-sm btn-danger" data-h="${h(() => { edit(() => { p.prop = 'none'; }); selPanel(p.id); })}">${icon('trash2')}<span>Remove prop</span></button>
  `, true);
}

/* ── cast member (chosen from the resource browser) ───────────────────── */
function castSections(c) {
  const person = c.kind === 'person';
  const setCast = (fn, key) => edit(() => fn(c), key);
  return section('cast', 'id', c.name, `
    ${textInput('Name', c.name, v => edit(() => { c.name = scrub(v, LIM.name) || c.name; }, 'cn' + c.id, { insp: false }), { max: LIM.name, key: 'cast-name' })}
    ${seg('Type', [['person', 'Person'], ['cat', 'Cat']], c.kind, v => setCast(q => { q.kind = v; }, 'kind'), 'type')}
    <div class="prev" aria-hidden="true">${portrait(c)}</div>
  `, true) + section('cast', 'look', 'Appearance', `
    ${person ? swatches('Skin', monoised(SKIN), c.skin, v => setCast(q => { q.skin = v; }, 'skin'), 'skin') : ''}
    ${person ? `
      ${blockSelect('Hair', N(ENUM.hair), c.hair, v => setCast(q => { q.hair = v; }, 'hair'), 'hair')}
      ${swatches('Hair colour', monoised(HAIRC), c.hairColor, v => setCast(q => { q.hairColor = v; }, 'hairColour'), 'hair colour')}
      ${swatches('Outfit colour', monoised(OUTFIT), c.outfit, v => setCast(q => { q.outfit = v; }, 'outfit'), 'outfit')}
      ${blockSelect('Collar', N(ENUM.collar), c.collar, v => setCast(q => { q.collar = v; }, 'collar'), 'collar')}
      ${blockSelect('Glasses', N(ENUM.glasses), c.glasses, v => setCast(q => { q.glasses = v; }, 'glasses'), 'glasses')}
      ${blockSelect('Hat', N(ENUM.hat), c.hat, v => setCast(q => { q.hat = v; }, 'hat'), 'hat')}
      ${c.hat !== 'none' ? swatches('Hat colour', monoised(OUTFIT), c.hatColor, v => setCast(q => { q.hatColor = v; }, 'hatColour'), 'hat colour') : ''}
      ${blockSelect('Companion', [['none', 'No cat'], ['head', 'Cat on head']], c.cat, v => setCast(q => { q.cat = v; }, 'companion'), 'companion')}
    ` : ''}
    ${(!person || c.cat === 'head') ? swatches('Cat fur', monoised(FUR), c.catFur, v => setCast(q => { q.catFur = v; }, 'catFur'), 'cat fur') : ''}
    ${!person ? blockSelect('Default mood', N(ENUM.mood), c.catMood, v => setCast(q => { q.catMood = v; }, 'mood'), 'mood') : ''}
    <div class="actions">
      <button type="button" class="btn btn-sm" data-h="${h(() => call('randomiseCast', c.id))}">${icon('wandSparkles')}<span>Randomise look</span></button>
    </div>
  `, false) + section('cast', 'manage', 'In this project', `
    <button type="button" class="btn btn-sm btn-danger" data-h="${h(() => removeCast(c.id))}">${icon('trash2')}<span>Remove character</span></button>
    <p class="section-hint">Removing a character also removes them from every panel. Undo restores both.</p>
  `, false);
}

/* ── the shell of the panel ───────────────────────────────────────────── */
function buildBody() {
  ACT.length = 0;
  const kind = selectionKind();
  if (kind === 'page') return pageSections();
  if (kind === 'cast') {
    const c = APP.P.cast.find(x => x.id === APP.sel.cid) || APP.P.cast[0];
    return castSections(c);
  }
  const p = selectionPanel();
  if (!p) return pageSections();
  if (kind === 'panel') return panelSections(p);
  if (kind === 'char') return charSections(p, APP.sel.i || 0);
  if (kind === 'bubble') return bubbleSections(p, APP.sel.i || 0);
  if (kind === 'prop') return propSections(p);
  return panelSections(p);
}

/* Bind the controls that were just written. Elements are new on every render, so handlers are
   attached to them directly: no index table to fall out of step when two surfaces (the desktop
   panel and the mobile Edit sheet) show the same selection. */

/* A section opening or closing runs its own height over 320ms, the reference's disclosure timing,
   so the panel below it slides instead of jumping. With reduced motion the height is simply set. */
const calm = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function disclose(body, wasOpen) {
  const anim = body.animate;
  if (calm() || typeof anim !== 'function') { body.hidden = wasOpen; return; }
  const from = wasOpen ? body.scrollHeight : 0;
  const to = wasOpen ? 0 : body.scrollHeight;
  body.hidden = false;
  body.style.overflow = 'hidden';
  const a = body.animate(
    [{ height: from + 'px', opacity: wasOpen ? 1 : 0 }, { height: to + 'px', opacity: wasOpen ? 0 : 1 }],
    { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' }
  );
  const done = () => {
    body.style.overflow = '';
    if (wasOpen) body.hidden = true;
    a.cancel();
  };
  a.addEventListener('finish', done);
  a.addEventListener('cancel', () => { body.style.overflow = ''; });
}
function attachControls(root) {
  const act = ACT.slice();
  root.querySelectorAll('[data-h]').forEach(el => {
    const fn = act[+el.dataset.h];
    if (!fn) return;
    if (el.tagName === 'BUTTON') el.addEventListener('click', () => fn(el));
    else if (el.dataset.in) el.addEventListener('input', () => fn(el));
    else el.addEventListener('change', () => fn(el));
  });
  root.querySelectorAll('[data-sec]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.sec;
      const open = el.getAttribute('aria-expanded') === 'true';
      APP.openSections[key] = !open;
      el.setAttribute('aria-expanded', String(!open));
      const body = el.nextElementSibling;
      if (body) disclose(body, open);
    });
  });
  root.querySelectorAll('[data-insp="close"]').forEach(b => b.addEventListener('click', () => call('togglePanel', 'inspector')));
}

function headerFor() {
  const kind = selectionKind();
  if (kind === 'page') return { name: 'Page', tag: 'page', icon: 'fileText' };
  if (kind === 'cast') {
    const c = APP.P.cast.find(x => x.id === APP.sel.cid);
    return { name: c ? c.name : 'Character', tag: 'character', icon: 'userRound' };
  }
  const p = selectionPanel();
  if (!p) return { name: 'Page', tag: 'page', icon: 'fileText' };
  const idx = curPage().panels.findIndex(x => x.id === p.id) + 1;
  if (kind === 'panel') return { name: `Panel ${idx}`, tag: 'panel', icon: 'square' };
  if (kind === 'char') {
    const c = APP.P.cast.find(x => x.id === p.who[APP.sel.i]);
    return { name: c ? c.name : 'Character', tag: 'character', icon: 'userRound' };
  }
  if (kind === 'bubble') return { name: `Bubble ${(APP.sel.i || 0) + 1}`, tag: 'dialogue', icon: 'messageSquare' };
  if (kind === 'prop') return { name: titleCase(p.prop), tag: 'prop', icon: 'shapes' };
  return { name: 'Panel', tag: 'panel', icon: 'square' };
}

function renderInspector() {
  const root = $('#inspector');
  if (!root) return;
  const active = document.activeElement;
  const fk = active && active.dataset ? active.dataset.fk : null;
  const caret = active && active.selectionStart != null ? active.selectionStart : null;
  const scroller = $('.inspector-body', root);
  const top = scroller ? scroller.scrollTop : 0;

  const head = headerFor();
  const body = buildBody();
  root.innerHTML = `
    <div class="inspector-head">
      <span class="sel-name">${icon(head.icon)}<b style="margin-left:6px">${esc(head.name)}</b></span>
      <span class="actions">
        <span class="kindtag">${esc(head.tag)}</span>
        <button type="button" class="iconbtn iconbtn-sm" data-insp="close" aria-label="Hide properties" data-tip="Hide panel">${icon('panelRightClose')}</button>
      </span>
    </div>
    <div class="inspector-body">${body}</div>`;
  attachControls(root);

  if (fk) {
    const again = $(`[data-fk="${fk}"]`, root);
    if (again && again.focus) {
      again.focus({ preventScroll: true });
      if (caret != null && again.setSelectionRange) { try { again.setSelectionRange(caret, caret); } catch (e) { } }
    }
  }
  const bodyEl = $('.inspector-body', root);
  if (bodyEl) bodyEl.scrollTop = top;
}

/* the phone's Edit destination shows the same controls, in a sheet, for the same selection */
function editSheet() {
  const html = buildBody();
  const head = headerFor();
  return {
    title: head.name,
    snap: 'full',
    html: `<div id="sheetInspector">${html}</div>`,
    onMount({ body }) {
      attachControls(body);
    },
  };
}

/* the canvas and the toolbar say "edit this text": land the caret in the right field */
function focusField(key) {
  const el = $(`[data-fk="${key}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
  if (el.setSelectionRange) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } }
}
function focusCaption() { call('syncChrome'); setTimeout(() => focusField('caption'), 0); }
function focusBubbleText(pid, i) {
  if (!(APP.sel.kind === 'bubble' && APP.sel.pid === pid && APP.sel.i === i)) selBubble(pid, i);
  /* on a phone the same fields live in the Edit sheet: open it, then land in the dialogue box */
  if (isMobile()) {
    call('openDestination', 'edit');
    setTimeout(() => focusField('bubble-text'), 60);
    return;
  }
  setTimeout(() => focusField('bubble-text'), 0);
}

export { buildBody, editSheet, focusBubbleText, focusCaption, renderInspector };
