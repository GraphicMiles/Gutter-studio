import { $, $$ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from './icons.js';

/* ui/layers.js: every temporary surface in the application — popovers, context menus, dialogs.
 *
 * One stack, one dismissal order, one focus rule: the topmost layer takes Escape, returns focus to
 * the control that opened it, and nothing underneath reacts until it closes. Layers never nest
 * more than one level deep; a workflow that needs more becomes a dialog, not a popover inside a
 * popover.
 */

const STACK = [];

const host = () => $('#layers') || document.body;

function pushLayer(close) {
  STACK.push(close);
}
function removeLayer(close) {
  const i = STACK.indexOf(close);
  if (i >= 0) STACK.splice(i, 1);
}
const layerOpen = () => STACK.length > 0;

/* Which input opened the layer decides where focus lands. Opened by a finger or a click, focus goes
   to the layer itself: it must be in the layer so a screen reader reads the menu, but an item must
   not be ringed before the user has chosen anything. Opened by the keyboard, the first item takes
   focus so Arrow keys and Enter work immediately. */
let lastInput = 'pointer';
document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
document.addEventListener('keydown', () => { lastInput = 'key'; }, true);

/* Arrow keys walk the items, Home/End jump to the ends, Enter and Space activate.
   Disabled items are skipped but stay visible, so the menu keeps its shape. */
function menuKeyNav(root) {
  const items = () => $$('.pop-item:not(:disabled)', root);
  return e => {
    const list = items();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  };
}

/* ── menu markup ──────────────────────────────────────────────────────── */
/* items: {label, icon, shortcut, disabled, danger, checked, run} | '-' for a separator */
function menuHtml(items, opts) {
  opts = opts || {};
  const row = (it, i) => {
    if (it === '-') return '<hr>';
    const cls = 'pop-item' + (it.danger ? ' danger' : '');
    const role = opts.role || 'menuitem';
    return `<button type="button" class="${cls}" data-mi="${i}"${role === 'menuitemradio' ? ' role="menuitemradio" aria-checked="' + (it.checked ? 'true' : 'false') + '"' : ' role="menuitem"'}${it.disabled ? ' disabled' : ''}>` +
      (it.icon ? icon(it.icon) : '') +
      `<span>${esc(it.label)}</span>` +
      (it.shortcut ? `<span class="kbd">${esc(it.shortcut)}</span>` : '') +
      `</button>`;
  };
  return items.map(row).join('');
}

function runItem(items, i) {
  const it = items[+i];
  if (!it || it === '-' || it.disabled) return false;
  if (it.run) it.run();
  return true;
}

/* ── popover ──────────────────────────────────────────────────────────── */
function openPopover(cfg) {
  const anchor = cfg.anchor;
  const el = document.createElement('div');
  el.className = 'pop' + (cfg.className ? ' ' + cfg.className : '');
  el.setAttribute('role', cfg.role || 'menu');
  if (cfg.label) el.setAttribute('aria-label', cfg.label);
  el.innerHTML = cfg.html || '';
  host().appendChild(el);

  const restore = document.activeElement, restoreSel = selectorFor(restore);
  let done = false;

  function place() {
    const r = anchor.getBoundingClientRect();
    const pad = 8, vw = innerWidth, vh = innerHeight;
    const w = el.offsetWidth, h = el.offsetHeight;
    let left, top, pos;
    const below = r.bottom + 4, above = r.top - h - 4;
    if (below + h <= vh - pad || above < pad) top = Math.min(below, vh - h - pad);
    else top = Math.max(pad, above);
    pos = top === below ? 'bottom' : 'top';
    if (cfg.align === 'end') left = r.right - w;
    else if (cfg.align === 'center') left = r.left + r.width / 2 - w / 2;
    else left = r.left;
    left = Math.max(pad, Math.min(left, vw - w - pad));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(Math.max(pad, top)) + 'px';
    el.dataset.anchor = pos + '-' + (left + w / 2 > vw / 2 ? 'end' : 'start');
  }
  place();

  function close(refocus) {
    if (done) return;
    done = true;
    el.classList.add('closing');
    const finish = () => {
      el.remove();
      removeLayer(close);
      if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'false');
      /* after the frame that removes the layer: any repaint the close itself causes has settled by then */
    if (refocus !== false) requestAnimationFrame(() => focusBack(restore, restoreSel));
    };
    setTimeout(finish, 100);
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    addEventListener('resize', close);
  }
  function onDown(e) {
    if (el.contains(e.target) || (anchor && anchor.contains(e.target))) return;
    close(false);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') { e.preventDefault(); close(true); }
    else if (STACK[STACK.length - 1] === close) menuKeyNav(el)(e);
  }

  if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
  pushLayer(close);
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  addEventListener('resize', close);

  const first = $$('.pop-item:not(:disabled)', el)[0];
  if (first && cfg.focusFirst !== false) {
    if (lastInput === 'key') first.focus({ preventScroll: true });
    else {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
  }

  close.el = el;
  return close;
}

/* a menu built from items, anchored to a control */
let mobileMenu = null;
function setMobileMenu(fn) { mobileMenu = fn; }

/* A layer remembers where focus came from. The control may be re-rendered while the layer is open
   (the header repaints on every change), so the memory is a selector as well as a node. */
const RESTORE_ATTRS = ['data-act', 'data-ctl', 'data-panel', 'data-dest', 'data-tool', 'data-mi', 'data-tab', 'data-browse', 'data-export'];
function selectorFor(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  for (const a of RESTORE_ATTRS) {
    if (el.hasAttribute(a)) return `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
  }
  return null;
}
function focusBack(node, sel) {
  const el = node && node.isConnected ? node : (sel ? document.querySelector(sel) : null);
  if (el && el.focus) el.focus({ preventScroll: true });
}

function openMenu(anchor, items, cfg) {
  cfg = cfg || {};
  const close = openPopover(Object.assign({
    anchor, items,
    html: menuHtml(items, { role: cfg.role }),
    role: cfg.role,
    align: cfg.align,
    label: cfg.label,
  }, cfg));
  close.el.addEventListener('click', e => {
    const b = e.target.closest('[data-mi]');
    if (!b) return;
    const it = items[+b.dataset.mi];
    if (!it || it.disabled) return;
    close(false);
    /* the action runs after the layer is gone, so a redraw cannot fight the close animation */
    setTimeout(() => { if (it.run) it.run(); }, 0);
  });
  return close;
}

function openContextMenu(x, y, items, label) {
  /* A touch menu is not a mouse menu. The app registers a renderer for small screens here, so this
     module keeps its single job (place a layer, trap focus, close on Escape) and knows nothing
     about the bottom sheet. */
  if (mobileMenu && !mobileMenu.disabled()) return mobileMenu.open(items, label);

  const anchor = { getBoundingClientRect: () => ({ left: x, right: x, top: y, bottom: y, width: 0, height: 0 }) };
  const close = openPopover({ anchor, html: menuHtml(items), align: 'start', label: label || 'Actions' });
  /* keep the menu fully on screen when opened near an edge */
  const el = close.el;
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
  el.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-mi]');
    if (!b) return;
    const it = items[+b.dataset.mi];
    if (!it || it.disabled) return;
    close(false);
    setTimeout(() => { if (it.run) it.run(); }, 0);
  });
  return close;
}

/* ── dialog ───────────────────────────────────────────────────────────── */
/* A dialog is for a decision or a configuration, never for a single property edit.
   It traps Tab, takes Escape when it is dismissible, and hands focus back on close. */
function openDialog(cfg) {
  const restore = document.activeElement, restoreSel = selectorFor(restore);
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const dismissible = cfg.dismissible !== false;
  scrim.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"${cfg.wide ? ' style="width:min(720px,100%)"' : ''}>
    <div class="dialog-head">
      <div style="flex:1;min-width:0">
        <h2 id="dlgTitle">${esc(cfg.title)}</h2>
        ${cfg.sub ? `<p class="dialog-sub">${esc(cfg.sub)}</p>` : ''}
      </div>
      ${dismissible ? `<button type="button" class="iconbtn" data-close aria-label="Close">${icon('x')}</button>` : ''}
    </div>
    <div class="dialog-body"></div>
    <div class="dialog-foot"></div>
  </div>`;
  host().appendChild(scrim);
  const dlg = $('.dialog', scrim);
  const body = $('.dialog-body', scrim);
  const foot = $('.dialog-foot', scrim);

  if (cfg.body) body.innerHTML = cfg.body;
  if (cfg.foot) foot.innerHTML = cfg.foot;
  if (cfg.footHtml === '') foot.remove();

  let done = false;
  function close(refocus) {
    if (done) return;
    done = true;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    removeLayer(close);
    if (cfg.onClose) cfg.onClose();
    /* after the frame that removes the layer: any repaint the close itself causes has settled by then */
    if (refocus !== false) requestAnimationFrame(() => focusBack(restore, restoreSel));
  }
  function onKey(e) {
    /* only the topmost layer reacts, and a closed layer never reacts at all */
    if (done || STACK[STACK.length - 1] !== close) return;
    if (e.key === 'Escape' && dismissible) { e.preventDefault(); e.stopPropagation(); cfg.onDismiss ? cfg.onDismiss(close) : close(true); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]', dlg)
      .filter(n => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  scrim.addEventListener('click', e => {
    if (e.target === scrim && dismissible) (cfg.onDismiss ? cfg.onDismiss(close) : close(true));
  });
  scrim.addEventListener('click', e => { if (e.target.closest('[data-close]')) (cfg.onDismiss ? cfg.onDismiss(close) : close(true)); });
  document.addEventListener('keydown', onKey, true);
  pushLayer(close);

  const api = { close, scrim, dialog: dlg, body, foot };
  if (cfg.onMount) cfg.onMount(api);
  const auto = $('[data-autofocus]', dlg) || $$('button:not(:disabled),input,select,textarea', body)[0] || $('.dialog-foot .btn', dlg);
  if (auto && auto.focus) setTimeout(() => auto.focus({ preventScroll: true }), 30);
  return api;
}

function confirmDialog(cfg) {
  return new Promise(resolve => {
    const api = openDialog({
      title: cfg.title,
      sub: cfg.sub,
      body: cfg.body || '',
      foot: `<button type="button" class="btn" data-no>${esc(cfg.cancel || 'Cancel')}</button><span class="sp"></span><button type="button" class="btn ${cfg.danger ? 'btn-danger-solid' : 'btn-primary'}" data-yes>${esc(cfg.confirm || 'Confirm')}</button>`,
      onMount(a) {
        $('[data-no]', a.foot).onclick = () => { a.close(true); resolve(false); };
        $('[data-yes]', a.foot).onclick = () => { a.close(true); resolve(true); };
      },
      onDismiss: c => { c(true); resolve(false); },
    });
    api.scrim.addEventListener('click', e => { if (e.target === api.scrim) resolve(false); });
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !STACK.length) return;
  if (e.defaultPrevented) return;
  e.preventDefault();
  STACK[STACK.length - 1](true);
}, true);

export { confirmDialog, layerOpen, menuHtml, openContextMenu, openDialog, openMenu, openPopover, pushLayer, removeLayer, setMobileMenu };
