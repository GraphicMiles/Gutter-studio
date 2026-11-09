import { $, $$ } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { closeSheet, isSheetOpen, openSheet } from '../ui/sheet.js';
import { APP, call, on } from './store.js';

/* app/shell.js: the frame around the work.
 *
 * Desktop keeps four regions and lets the person close any of them; the canvas takes whatever is
 * left. Below 1024px the two side panels become drawers over the canvas rather than squeezing it.
 * Below 768px the desktop frame is replaced entirely by the mobile shell: header, canvas, quick
 * actions and five destinations — each destination is a sheet, and there is only ever one sheet.
 */

const mqMobile = () => matchMedia('(max-width:767px)');
const mqDrawer = () => matchMedia('(max-width:1023px)');

const isMobile = () => mqMobile().matches;
const isDrawerMode = () => mqDrawer().matches;

const DESTINATIONS = [
  ['pages', 'Pages', 'layers'],
  ['add', 'Add', 'plus'],
  ['edit', 'Edit', 'penLine'],
  ['script', 'Script', 'fileText'],
  ['more', 'More', 'ellipsis'],
];

/* ── panel visibility and width ───────────────────────────────────────── */
function applyLayout() {
  const browser = $('#browser'), inspector = $('#inspector'), pages = $('#pages');
  const drawer = isDrawerMode() && !isMobile();

  if (browser) {
    if (drawer) browser.hidden = false;
    else browser.hidden = !APP.panels.browser;
    browser.classList.toggle('open', drawer && APP.drawer === 'browser');
  }
  if (inspector) {
    if (drawer) inspector.hidden = false;
    else inspector.hidden = !APP.panels.inspector;
    inspector.classList.toggle('open', drawer && APP.drawer === 'inspector');
  }
  if (pages) {
    pages.hidden = isMobile() ? true : !APP.panels.pages;
    pages.style.height = APP.panels.pages ? 'var(--h-pages)' : '';
  }
  document.documentElement.style.setProperty('--w-browser', APP.panels.browserW + 'px');
  document.documentElement.style.setProperty('--w-inspector', APP.panels.inspectorW + 'px');

  /* a scrim under an open drawer, so tapping the canvas closes it */
  let scrim = $('.drawer-scrim');
  if (drawer && APP.drawer) {
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'drawer-scrim';
      scrim.addEventListener('click', () => setDrawer(null));
      $('#work').appendChild(scrim);
    }
  } else if (scrim) scrim.remove();

  call('fitView', false);
}

function setDrawer(name) {
  APP.drawer = APP.drawer === name ? null : name;
  applyLayout();
  call('syncChrome');
}

function togglePanel(name) {
  if (isDrawerMode() && name !== 'pages') { setDrawer(name); return; }
  if (name === 'pages') APP.panels.pages = !APP.panels.pages;
  else APP.panels[name] = !APP.panels[name];
  savePanels();
  applyLayout();
  call('syncChrome');
}

/* Panel geometry is a preference, not project data: it lives with the other local settings. */
const PANELS_KEY = 'gutter.studio.layout.v1';
function savePanels() {
  try { localStorage.setItem(PANELS_KEY, JSON.stringify({ p: APP.panels })); } catch (e) { }
}
function loadPanels() {
  try {
    const j = JSON.parse(localStorage.getItem(PANELS_KEY));
    if (j && j.p) {
      ['browser', 'inspector', 'pages'].forEach(k => { if (typeof j.p[k] === 'boolean') APP.panels[k] = j.p[k]; });
      if (j.p.browserW) APP.panels.browserW = Math.max(210, Math.min(340, j.p.browserW));
      if (j.p.inspectorW) APP.panels.inspectorW = Math.max(270, Math.min(380, j.p.inspectorW));
    }
  } catch (e) { }
}

/* ── grips: drag a panel edge, double-click to restore the default ────── */
function initGrips() {
  $$('.grip').forEach(grip => {
    const which = grip.dataset.grip;               // 'browser' | 'inspector'
    let startX = 0, startW = 0, dragging = false;
    const widthNow = () => which === 'browser' ? APP.panels.browserW : APP.panels.inspectorW;
    grip.addEventListener('pointerdown', e => {
      dragging = true;
      startX = e.clientX; startW = widthNow();
      grip.classList.add('dragging');
      grip.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
    });
    grip.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const next = which === 'browser'
        ? Math.max(210, Math.min(340, startW + dx))
        : Math.max(270, Math.min(380, startW - dx));
      if (which === 'browser') APP.panels.browserW = next; else APP.panels.inspectorW = next;
      document.documentElement.style.setProperty(which === 'browser' ? '--w-browser' : '--w-inspector', next + 'px');
      call('fitView', false);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      grip.classList.remove('dragging');
      document.body.style.userSelect = '';
      savePanels();
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('dblclick', () => {
      if (which === 'browser') APP.panels.browserW = 240; else APP.panels.inspectorW = 300;
      applyLayout();
      savePanels();
    });
    /* keyboard resizing: the grip is a real separator control */
    grip.addEventListener('keydown', e => {
      const step = e.shiftKey ? 24 : 8;
      let d = 0;
      if (e.key === 'ArrowLeft') d = which === 'browser' ? -step : step;
      if (e.key === 'ArrowRight') d = which === 'browser' ? step : -step;
      if (!d) return;
      e.preventDefault();
      if (which === 'browser') APP.panels.browserW = Math.max(210, Math.min(340, APP.panels.browserW + d));
      else APP.panels.inspectorW = Math.max(270, Math.min(380, APP.panels.inspectorW + d));
      applyLayout();
      savePanels();
    });
  });
}

/* ── mobile destinations ──────────────────────────────────────────────── */
function navHtml() {
  return DESTINATIONS.map(([id, label, ic]) =>
    `<button type="button" data-dest="${id}" aria-pressed="${APP.sheet && APP.sheet.tab === id ? 'true' : 'false'}">
      ${icon(ic)}<span>${label}</span>
    </button>`).join('');
}

/* A destination is a sheet whose content the owning module provides through a hook.
   No module is allowed to open a second sheet: a different destination replaces the content. */
function openDestination(tab) {
  const provider = APP.sheetHooks && APP.sheetHooks[tab];
  if (!provider) return;
  if (isSheetOpen() && APP.sheet && APP.sheet.tab === tab) { closeDestination(); return; }
  APP.sheet = { tab, snap: tab === 'edit' || tab === 'script' ? 'full' : 'half' };
  const cfg = provider();
  const sheetEl = openSheet({
    title: cfg.title,
    snap: APP.sheet.snap,
    html: cfg.html,
    onMount: cfg.onMount,
    onClose: () => {
      APP.sheet = null;
      call('syncChrome');
    },
  });
  call('syncChrome');
  return sheetEl;
}

function closeDestination() {
  closeSheet();
  APP.sheet = null;
  call('syncChrome');
}

/* the sheet content asks to be repainted after an edit */
function refreshDestination() {
  if (!isSheetOpen() || !APP.sheet) return;
  const provider = APP.sheetHooks && APP.sheetHooks[APP.sheet.tab];
  if (!provider) return;
  const cfg = provider();
  openSheet({ title: cfg.title, html: cfg.html, onMount: cfg.onMount });
  call('syncChrome');
}

function initShell() {
  loadPanels();
  initGrips();
  const nav = $('#nav');
  if (nav) {
    nav.innerHTML = navHtml();
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-dest]');
      if (b) openDestination(b.dataset.dest);
    });
  }
  const apply = () => {
    applyLayout();
    /* leaving the mobile shell must not leave a sheet floating over the desktop */
    if (!isMobile() && isSheetOpen()) closeDestination();
    if (!isDrawerMode() && APP.drawer) { APP.drawer = null; }
    call('syncChrome');
  };
  mqMobile().addEventListener('change', apply);
  mqDrawer().addEventListener('change', apply);
  applyLayout();
}

on('setDrawer', setDrawer);
on('openDestination', openDestination);
on('closeDestination', closeDestination);
on('refreshDestination', refreshDestination);

export {
  DESTINATIONS, applyLayout, closeDestination, initShell, isDrawerMode, isMobile,
  navHtml, openDestination, refreshDestination, setDrawer, togglePanel,
};
