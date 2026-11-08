import { $ } from '../core/dom.js';
import { newProject } from '../model/validate.js';
import { APP, call } from './store.js';
import { loadLocal, setSaved } from './persist.js';
import { openProject } from './render.js';
import { drawGenUi } from './ai.js';
import { initCaps } from './sync.js';
import { wire } from './wiring.js';
import { setDock } from './dock.js';
import './welcome.js';   // registers its own actions with the store

/* app/boot.js: start-up, in one place. */











/* One theme, so the workspace always looks like the tool it is. */
document.documentElement.style.colorScheme = 'dark';

loadLocal();

/* A genuinely empty install (nothing in storage) gets the first-run card. Decided here,
   before the sample project exists, so it can never reappear on a normal launch. */
if (!APP.S.projects.length) APP.firstRun = true;
if (!APP.S.projects.length) APP.S.projects.push(newProject('Heavy Head'));

wire();
drawGenUi();
setDock('projects', { quiet: true, silent: true });
openProject(APP.S.projects.find(p => p.id === APP.S.cur) ? APP.S.cur : APP.S.projects[0].id);
setSaved('Saved on this device');
if (!$('#brief').value) $('#brief').value = APP.P.brief || '';
initCaps();
call('mountWelcome');

export { };
