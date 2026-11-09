/* core/dom.js: the two DOM helpers everything shares. */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

/* A transient message. It reports an outcome that already happened; it is never used to stand in
   for persistent state such as a failed save, which stays in the header until resolved. */
function toast(message, tone) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.setAttribute('data-tone', tone === 'error' ? 'error' : 'info');
  el.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => { el.textContent = ''; }, 260);
  }, tone === 'error' ? 4200 : 2800);
}

export { $, $$, toast };
