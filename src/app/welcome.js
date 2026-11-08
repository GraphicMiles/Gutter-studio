import { $, toast } from '../core/dom.js';
import { sid } from '../core/ids.js';
import { validate } from '../model/validate.js';
import { pageSvg } from '../page/render.js';
import { APP, call, on } from './store.js';
import { addProject } from './render.js';

/* app/welcome.js: the first-run state.
 *
 * On a genuinely empty install the app opens on a sample page with no explanation. This puts
 * one compact card above the board: what the studio does, four starting points worth having,
 * and a way to skip it. Each thumbnail is a real page drawn by page/render.js, not a mockup,
 * so what you pick is what you get.
 *
 * It appears only when nothing was saved before, and leaves on the first real interaction.
 */







/* ── the four starting points ────────────────────────────────────────────
   Built with validate(), like any imported file, so nothing here can put a value into the
   drawing code that the sanitiser would not accept from a stranger. */
const page = panels => ({ id: sid(), layout: 'auto', panels });

const TEMPLATES = [
  {
    id: 'comic', name: 'Comic page', blurb: '4 panels, ink and colour',
    make: () => {
      return validate({
        title: 'Wake Up',
        style: { fmt: 'comic' },
        cast: [
          { name: 'Ana', hair: 'curly', hairColor: 'black', skin: 'salmon', outfit: 'yellow', collar: 'turtleneck', cat: 'head', catFur: 'white' },
          { name: 'Milo', kind: 'cat', catFur: 'white' },
        ],
        pages: [
          page([
            { shot: 'wide', setting: 'room', tone: 'main', prop: 'mug', who: ['Ana'], caption: 'Monday, 7:42 AM.' },
            { shot: 'close', setting: 'window', tone: 'main', who: ['Ana'], pose: 'chin', expr: 'thinking', look: 'up', bubbles: [{ type: 'thought', who: 0, text: 'Why is my head so heavy today?' }] },
            { shot: 'extreme-close', setting: 'room', tone: 'alert', who: ['Milo'], expr: 'shock', sfx: { text: 'THUD' } },
            { shot: 'medium', setting: 'room', tone: 'cool', who: ['Ana', 'Milo'], expr: ['deadpan', 'smug'], bubbles: [{ type: 'speech', who: 0, text: 'Please get off.' }, { type: 'speech', who: 1, text: 'No.' }] },
          ]),
        ],
      });
    },
  },
  {
    id: 'manga', name: 'Manga page', blurb: 'Night tones, tall page',
    make: () => {
      return validate({
        title: 'The Long Way Home',
        style: { fmt: 'manga', preset: 'nightbus' },
        cast: [
          { name: 'Ren', hair: 'long', hairColor: 'black', skin: 'golden', outfit: 'blue', collar: 'crew' },
          { name: 'Kiko', kind: 'cat', catFur: 'gray' },
        ],
        pages: [
          page([
            { shot: 'wide', setting: 'street', tone: 'night', who: ['Ren'], caption: 'The last bus left an hour ago.' },
            { shot: 'medium', setting: 'street', tone: 'night', who: ['Ren', 'Kiko'], expr: ['worry', 'smug'], look: ['down', 'left'], prop: 'phone' },
            { shot: 'close', setting: 'street', tone: 'night', who: ['Kiko'], expr: 'smug', bubbles: [{ type: 'whisper', who: 0, text: '…he followed me again.' }] },
          ]),
        ],
      });
    },
  },
  {
    id: 'webtoon', name: 'Webtoon strip', blurb: 'Vertical scroller',
    make: () => {
      return validate({
        title: 'Small Hours',
        style: { fmt: 'webtoon', preset: 'sunset' },
        cast: [{ name: 'Soft', hair: 'bun', hairColor: 'auburn', skin: 'fair', outfit: 'pink', collar: 'hoodie', cat: 'floor', catFur: 'orange' }],
        pages: [
          page([
            { shot: 'wide', setting: 'kitchen', tone: 'warm', who: ['Soft'], prop: 'mug', caption: '2:14 AM.' },
            { shot: 'medium', setting: 'kitchen', tone: 'warm', who: ['Soft'], expr: 'sleepy', pose: 'facepalm', bubbles: [{ type: 'thought', who: 0, text: 'One more page. Then sleep. Promise.' }] },
            { shot: 'close', setting: 'kitchen', tone: 'soft', who: ['Soft'], expr: 'deadpan', sfx: { text: 'tap tap', pos: 'br' } },
          ]),
        ],
      });
    },
  },
  {
    id: 'storyboard', name: 'Storyboard', blurb: 'Notes under every frame',
    make: () => {
      return validate({
        title: 'Scene 12: Rooftop',
        style: { fmt: 'storyboard', preset: 'garden' },
        cast: [{ name: 'Director', hair: 'buzz', skin: 'umber', outfit: 'black', collar: 'crew' }],
        pages: [
          page([
            { shot: 'wide', setting: 'city', tone: 'cool', who: ['Director'], prop: 'balloon', note: 'Establish height. Slow push in, 8s.' },
            { shot: 'medium', setting: 'city', tone: 'cool', who: ['Director'], expr: 'shock', note: 'Wind picks up. Start the score here.' },
            { shot: 'close', setting: 'sky', tone: 'cool', who: ['Director'], expr: 'joy', note: 'Beat: she almost lets go.' },
          ]),
        ],
      });
    },
  },
];

/* ── rendering ─────────────────────────────────────────────────────────── */

let mounted = false;
let returnTo = null;

function card(t) {
  let thumb = '';
  try {
    const project = t.make();
    const r = pageSvg(project, 0, { uid: 'tpl' + t.id, nums: false });
    /* a data URI keeps the thumbnail inert: no focus stops, no ids leaking into the board */
    thumb = `<img class="tpl-prev" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}">`;
  } catch (e) { thumb = '<div class="tpl-prev tpl-prev-fallback" aria-hidden="true"></div>'; }
  return `<button type="button" class="tpl" data-tpl="${t.id}">
    ${thumb}
    <span class="tpl-text"><span class="tpl-name">${t.name}</span><span class="tpl-blurb">${t.blurb}</span></span>
  </button>`;
}

function mountWelcome() {
  if (mounted || !APP.firstRun) return;
  /* A first-run choice is a decision about the whole workspace, so it covers the workspace
     rather than only the board pane: at 1024 the board pane is 509 wide, which forces a phone
     layout inside a laptop window. */
  const host = document.querySelector('.app');
  if (!host) return;
  const el = document.createElement('section');
  el.className = 'welcome';
  el.id = 'welcome';
  el.setAttribute('aria-labelledby', 'welcomeTitle');
  el.innerHTML = `
   <div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">
    <div class="welcome-head">
     <div>
      <h2 id="welcomeTitle">Start with a page</h2>
      <p class="welcome-lead">Gutter Studio draws the art. Pick a format to open beside the sample.</p>
     </div>
     <button type="button" class="btn sm ghost" id="welcomeSkip">Not now</button>
    </div>
    <div class="templates" role="group" aria-label="Starting points">${TEMPLATES.map(card).join('')}</div>
    <p class="welcome-foot">Rather write it? Use the
      <button type="button" class="linkish" id="welcomeScript">script box</button>
     : plain text, one line per panel.</p>
   </div>`;
  host.appendChild(el);

  el.addEventListener('click', e => {
    const t = e.target.closest('[data-tpl]');
    if (t) {
      const tpl = TEMPLATES.find(x => x.id === t.dataset.tpl);
      if (!tpl) return;
      const project = tpl.make();
      addProject(project);        // a new project; it becomes the current one
      hideWelcome();
      toast(`Started “${project.title}”. The sample is still in Projects.`);
      return;
    }
    if (e.target.closest('#welcomeSkip')) { hideWelcome(); return; }
    if (e.target.closest('#welcomeScript')) {
      hideWelcome();
      call('setDock', 'script');
      const box = $('#script');
      if (box) { box.focus(); }
    }
  });

  mounted = true;
  /* A dialog holds focus while it is open: Tab cycles inside it, Escape closes it, and closing
     puts focus back where the person was. Focus starts on the card itself, so no option looks
     pre-selected and no ring is painted around the screen. */
  returnTo = document.activeElement;
  el.tabIndex = -1;
  /* Tab and Shift+Tab cycle inside; Escape is the same as Not now. */
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); hideWelcome(); return; }
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('button:not(:disabled)')].filter(b => b.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
  setTimeout(() => el.focus({ preventScroll: true }), 300);
}

function hideWelcome() {
  const el = $('#welcome');
  const hadFocus = !!(el && el.contains(document.activeElement));
  if (el) el.remove();
  /* Closing a dialog must not drop focus on the floor. Hand it back to where the person was,
     or to the current page tab, which exists at every width (the phone nav does not). */
  if (hadFocus) {
    const shown = e => e && e.offsetParent !== null;
    const back = [returnTo, $('#title'), $('#pages .pg[aria-pressed="true"]'), $('#pMid')]
      .find(e => shown(e) && e !== document.body && typeof e.focus === 'function');
    if (back) back.focus({ preventScroll: true });
  }
  returnTo = null;
  mounted = false;
  APP.firstRun = false;
  stopWatching();
}

/** Keys that are someone moving around the page, not someone using the page. Tab must never
 *  dismiss the card, or a keyboard user can never reach it. */
const PASSIVE = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock', 'OS', 'Dead']);

let handler = null;

/** Hide it the moment the person does anything real, without stealing that interaction. */
function dismissOnFirstUse() {
  if (!mounted || handler) return;
  handler = e => {
    if (!mounted) return;
    if (e.type === 'keydown' && PASSIVE.has(e.key)) return;
    if (e.target.closest && e.target.closest('#welcome')) return;
    hideWelcome();
  };
  document.addEventListener('pointerdown', handler, true);
  document.addEventListener('keydown', handler, true);
}

function stopWatching() {
  if (!handler) return;
  document.removeEventListener('pointerdown', handler, true);
  document.removeEventListener('keydown', handler, true);
  handler = null;
}

on('mountWelcome', () => { mountWelcome(); dismissOnFirstUse(); });
on('hideWelcome', hideWelcome);

export { TEMPLATES, hideWelcome, mountWelcome };

