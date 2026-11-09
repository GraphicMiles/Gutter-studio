import { $ } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { APP } from './store.js';
import { setTool } from './actions.js';

/* app/rail.js: the tool rail.
 *
 * Each tool is one sentence of behaviour, and every one of them exists in the model:
 *   Select — pick a panel, a character, a bubble or a prop.
 *   Pan    — move the viewport instead of the page.
 *   Panel  — add a panel to the page you are on.
 *   Character, Scene, Prop, Bubble, Caption — arm the tool, then click the panel it goes in.
 *
 * A tool that only looked like a tool would be worse than no tool, so nothing here is decorative.
 */

const TOOLS = [
  ['select', 'Select', 'mousePointer2', 'V'],
  ['pan', 'Pan', 'hand', 'H'],
  '-',
  ['panel', 'Add panel', 'square', 'F'],
  ['character', 'Place character', 'userRound', 'C'],
  ['scene', 'Place scene', 'image', 'I'],
  ['prop', 'Place prop', 'shapes', 'O'],
  ['bubble', 'Add speech bubble', 'messageSquare', 'B'],
  ['text', 'Edit caption', 'type', 'T'],
];

const TOOL_BY_KEY = TOOLS.filter(t => t !== '-').reduce((m, t) => { m[t[3].toLowerCase()] = t[0]; return m; }, {});
const TOOL_LABEL = TOOLS.filter(t => t !== '-').reduce((m, t) => { m[t[0]] = t[1]; return m; }, {});

function renderRail() {
  const root = $('#rail');
  if (!root) return;
  root.innerHTML = TOOLS.map(t => {
    if (t === '-') return '<span class="rail-sep" aria-hidden="true"></span>';
    const [id, label, ic, key] = t;
    return `<button type="button" class="tool" data-tool="${id}" aria-pressed="${APP.tool === id}"
      aria-label="${label}" data-tip="${label}  ${key}"${APP.workspace === 'script' ? ' disabled' : ''}>${icon(ic)}</button>`;
  }).join('');
}

function wireRail() {
  $('#rail').addEventListener('click', e => {
    const b = e.target.closest('[data-tool]');
    if (b && !b.disabled) setTool(b.dataset.tool);
  });
}

export { TOOLS, TOOL_BY_KEY, TOOL_LABEL, renderRail, wireRail };
