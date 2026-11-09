import { $ } from '../core/dom.js';
import { sid } from '../core/ids.js';
import { esc } from '../core/util.js';
import { validate } from '../model/validate.js';
import { pageSvg } from '../page/render.js';
import { icon } from '../ui/icons.js';
import { openDialog } from '../ui/layers.js';
import { APP, call } from './store.js';

/* app/welcome.js: the first run.
 *
 * Shown only when nothing was ever saved on this device. Four starting points, each a real page
 * built through validate() and drawn by the same renderer as the board — the thumbnail is the
 * project you get. It closes for good after the first choice, and never returns.
 */

const page = panels => ({ id: sid(), layout: 'auto', panels });

const TEMPLATES = [
  {
    id: 'comic', name: 'Comic page', blurb: 'Four panels, ink and colour',
    make: () => validate({
      title: 'Wake Up',
      style: { fmt: 'comic' },
      cast: [
        { name: 'Ana', hair: 'curly', hairColor: 'black', skin: 'salmon', outfit: 'yellow', collar: 'turtleneck', cat: 'head', catFur: 'white' },
        { name: 'Milo', kind: 'cat', catFur: 'white' },
      ],
      pages: [page([
        { shot: 'wide', setting: 'room', tone: 'main', prop: 'mug', who: ['Ana'], caption: 'Monday, 7:42 AM.' },
        { shot: 'close', setting: 'window', tone: 'main', who: ['Ana'], pose: 'chin', expr: 'thinking', look: 'up', bubbles: [{ type: 'thought', who: 0, text: 'Why is my head so heavy today?' }] },
        { shot: 'extreme-close', setting: 'room', tone: 'alert', who: ['Milo'], expr: 'shock', sfx: { text: 'THUD' } },
        { shot: 'medium', setting: 'room', tone: 'cool', who: ['Ana', 'Milo'], expr: ['deadpan', 'smug'], bubbles: [{ type: 'speech', who: 0, text: 'Please get off.' }, { type: 'speech', who: 1, text: 'No.' }] },
      ])],
    }),
  },
  {
    id: 'manga', name: 'Manga page', blurb: 'Night tones, tall page',
    make: () => validate({
      title: 'The Long Way Home',
      style: { fmt: 'manga', preset: 'nightbus' },
      cast: [
        { name: 'Ren', hair: 'long', hairColor: 'black', skin: 'golden', outfit: 'blue', collar: 'crew' },
        { name: 'Kiko', kind: 'cat', catFur: 'gray' },
      ],
      pages: [page([
        { shot: 'wide', setting: 'street', tone: 'night', who: ['Ren'], caption: 'The last bus left an hour ago.' },
        { shot: 'medium', setting: 'street', tone: 'night', who: ['Ren', 'Kiko'], expr: ['worry', 'smug'], look: ['down', 'left'], prop: 'phone' },
        { shot: 'close', setting: 'street', tone: 'night', who: ['Kiko'], expr: 'smug', bubbles: [{ type: 'whisper', who: 0, text: '…he followed me again.' }] },
      ])],
    }),
  },
  {
    id: 'webtoon', name: 'Webtoon strip', blurb: 'Vertical scroller',
    make: () => validate({
      title: 'Small Hours',
      style: { fmt: 'webtoon', preset: 'sunset' },
      cast: [{ name: 'Soft', hair: 'bun', hairColor: 'auburn', skin: 'fair', outfit: 'pink', collar: 'hoodie', cat: 'floor', catFur: 'orange' }],
      pages: [page([
        { shot: 'wide', setting: 'kitchen', tone: 'warm', who: ['Soft'], prop: 'mug', caption: '2:14 AM.' },
        { shot: 'medium', setting: 'kitchen', tone: 'warm', who: ['Soft'], expr: 'sleepy', pose: 'facepalm', bubbles: [{ type: 'thought', who: 0, text: 'One more page. Then sleep. Promise.' }] },
        { shot: 'close', setting: 'kitchen', tone: 'soft', who: ['Soft'], expr: 'deadpan', sfx: { text: 'tap tap', pos: 'br' } },
      ])],
    }),
  },
  {
    id: 'storyboard', name: 'Storyboard', blurb: 'Notes under every frame',
    make: () => validate({
      title: 'Scene 12: Rooftop',
      style: { fmt: 'storyboard', preset: 'garden' },
      cast: [{ name: 'Director', hair: 'buzz', skin: 'umber', outfit: 'black', collar: 'crew' }],
      pages: [page([
        { shot: 'wide', setting: 'city', tone: 'cool', who: ['Director'], prop: 'balloon', note: 'Establish height. Slow push in, 8s.' },
        { shot: 'medium', setting: 'city', tone: 'cool', who: ['Director'], expr: 'shock', note: 'Wind picks up. Start the score here.' },
        { shot: 'close', setting: 'sky', tone: 'cool', who: ['Director'], expr: 'joy', note: 'Beat: she almost lets go.' },
      ])],
    }),
  },
];

function thumbFor(t, i) {
  try {
    const project = t.make();
    const r = pageSvg(project, 0, { uid: 'tpl' + i, nograin: false });
    return `<img class="tpl-img" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}">`;
  } catch (e) {
    return '<div class="tpl-img"></div>';
  }
}

function mountWelcome() {
  if (!APP.firstRun) return;
  const api = openDialog({
    title: 'Start with a page',
    sub: 'Gutter Studio draws the art. Pick a starting point, or close this and work from the sample project.',
    wide: true,
    body: `<div class="tpl-grid">
        ${TEMPLATES.map((t, i) => `<button type="button" class="tpl" data-tpl="${t.id}">
          ${thumbFor(t, i)}
          <span class="tpl-name">${esc(t.name)}</span>
          <span class="tpl-sub">${esc(t.blurb)}</span>
        </button>`).join('')}
      </div>
      <div class="note">${icon('info')}<span>Each one opens as a new project. The sample stays in the project menu, and everything is editable.</span></div>`,
    foot: `<span class="sp"></span><button type="button" class="btn" data-skip>Not now</button>`,
    onMount(a) {
      a.body.addEventListener('click', e => {
        const b = e.target.closest('[data-tpl]');
        if (!b) return;
        const t = TEMPLATES.find(x => x.id === b.dataset.tpl);
        if (!t) return;
        const project = t.make();
        call('addProject', project);
        finish();
      });
      $('[data-skip]', a.foot).addEventListener('click', () => finish());
    },
    onDismiss(close) { close(true); finish(); },
  });
  function finish() {
    APP.firstRun = false;
    api.close(true);
  }
}

export { TEMPLATES, mountWelcome };
