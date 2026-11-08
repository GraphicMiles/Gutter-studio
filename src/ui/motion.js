
/* ui/motion.js: the animation layer.
 *
 * One place decides how things move, so nothing drifts into its own timing. Everything here
 * degrades to an instant state change when the person asks for reduced motion.
 */

const REDUCED = () => {
  try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; }
};

/* Run a one-shot animation class and clean it up, so it can be replayed. */
const timers = new WeakMap();
function motionPlay(el, cls, ms) {
  if (!el || REDUCED()) return;
  clearTimeout(timers.get(el));
  el.classList.remove(cls);
  void el.offsetWidth;           /* force a reflow so the animation restarts */
  el.classList.add(cls);
  timers.set(el, setTimeout(() => el.classList.remove(cls), ms + 40));
}

/* Animate something out before hiding it. Falls through instantly under reduced motion. */
function motionClose(el, cls, ms, done) {
  if (!el) { done && done(); return; }
  if (REDUCED()) { done && done(); return; }
  el.classList.remove('open');
  el.classList.add(cls);
  let finished = false;
  const finish = () => { if (finished) return; finished = true; el.classList.remove(cls); done && done(); };
  el.addEventListener('animationend', finish, { once: true });
  setTimeout(finish, ms + 60);
}

/* A small rAF tween for values CSS cannot do well (the zoom readout and sheet width). */
function motionTween(from, to, ms, onFrame, done) {
  if (REDUCED() || from === to) { onFrame(to); done && done(); return; }
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const t = Math.min(1, (now - t0) / ms);
    onFrame(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step); else done && done();
  };
  requestAnimationFrame(step);
}

/* ── tooltips ─────────────────────────────────────────────────────────────
   One floating element for the whole app. Positioned next to its trigger, so a scrolling
   dock can never clip it, and it fades instead of appearing. */
let tipEl = null, tipTimer = 0;
function initTips(root) {
  if (tipEl) return;
  tipEl = document.createElement('div');
  tipEl.id = 'tip';
  tipEl.hidden = true;
  document.body.appendChild(tipEl);

  const show = el => {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tipEl.textContent = text;
    tipEl.hidden = false;
    tipEl.setAttribute('role', 'tooltip');
    tipEl.classList.add('on');
    const r = el.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    /* to the right of the rail, or under the control if there is no room */
    let left = r.right + 8, top = r.top + r.height / 2 - t.height / 2;
    if (left + t.width > innerWidth - 6) { left = Math.max(6, r.left - t.width - 8); }
    top = Math.max(6, Math.min(innerHeight - t.height - 6, top));
    tipEl.style.left = Math.round(left) + 'px';
    tipEl.style.top = Math.round(top) + 'px';
  };
  const hide = () => {
    tipEl.classList.remove('on');
    tipEl.hidden = true;
    tipEl.removeAttribute('role');
    tipEl.textContent = '';
  };

  root.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => show(el), 420);   /* long enough to never flash while working */
  });
  root.addEventListener('pointerout', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) return;
    clearTimeout(tipTimer);
    hide();
  });
  root.addEventListener('focusin', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el);
  });
  root.addEventListener('focusout', hide);
  addEventListener('scroll', hide, true);
  addEventListener('pointerdown', hide, true);
}

export { REDUCED, initTips, motionClose, motionPlay, motionTween };

