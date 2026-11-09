/* app/store.js: the single mutable application state.
 *
 * Everything else in the app is either a pure renderer of this state or a command that changes
 * it. There is no second copy of the truth for mobile: the phone shell and the desktop shell read
 * and write the same project, the same selection and the same history.
 */
const APP = {
  /* persisted project list (localStorage + optional host sync) */
  S: { projects: [], cur: null },
  P: null,

  /* what is selected. One selection model for every surface:
     {kind:'page'} | {kind:'panel',pid} | {kind:'char',pid,i}
     | {kind:'bubble',pid,i} | {kind:'prop',pid} | {kind:'cast',cid} */
  sel: { kind: 'page' },
  /* the selected panel, kept as a plain id too: history and the older model helpers use it */
  selId: null,
  pageIdx: 0,

  /* board or script workspace */
  workspace: 'board',

  /* the active tool and, when a tool needs a target value, what will be placed */
  tool: 'select',
  place: null,          // {kind:'panel'|'character'|'scene'|'prop'|'bubble'|'text', value?}

  /* viewport */
  view: { zoom: 1, fit: true },

  /* desktop layout */
  panels: { browser: true, inspector: true, pages: true, browserW: 240, inspectorW: 300 },
  drawer: null,          // 'browser' | 'inspector' | null, used below 1024px

  /* resource browser */
  browserTab: 'characters',   // characters | scenes | props
  browserQuery: '',
  browserSel: null,           // the asset being inspected in the browser

  /* mobile */
  nav: 'canvas',              // canvas | pages | add | edit | script | more
  sheet: null,                // { tab, snap } — the single bottom sheet
  sheetStack: [],             // never more than one sheet: this holds the tab list only

  /* inspector: which sections the person has open, kept per selection kind */
  openSections: {},

  /* script workspace */
  scriptStatus: '',
  scriptStatusTone: '',

  /* host capabilities + first run */
  AI: null, DL: null, DB: null, UID: null, remoteReady: false,
  aiNote: '',
  firstRun: false,
  busy: null,                 // a short description of the running operation, for the UI
};

/* A tiny registry instead of imports, for the few places where a lower module needs an action
   owned by a higher one. It keeps the import graph acyclic, which the single-file build requires.
   Anything registered here must be safe to call before boot finishes (it may be absent). */
const HOOKS = {};
const on = (name, fn) => { HOOKS[name] = fn; };
const call = (name, ...a) => { const f = HOOKS[name]; return f ? f(...a) : undefined; };

/* Identifies this tab, so synced snapshots can be ignored when they are our own writes. */
const TAB = Math.random().toString(36).slice(2, 10);

export { APP, HOOKS, TAB, call, on };
