import { newProject } from '../model/validate.js';
import { APP, call } from './store.js';
import { loadLocal, setSaveState } from './persist.js';
import { addProject, openProject } from './projects.js';
import { initCaps, setSyncRenderer } from './sync.js';
import { renderAll } from './render.js';
import { renderHeader } from './header.js';
import { wire } from './wiring.js';
import { pagesSheet } from './pages.js';
import { addSheet } from './browser.js';
import { editSheet } from './inspector.js';
import { scriptSheet } from './scriptview.js';
import { moreSheet } from './exports.js';
import { mountWelcome } from './welcome.js';

/* app/boot.js: start-up, in one place.
 *
 * The order is the dependency order: load what was saved, decide whether this is a first run, wire
 * the frame, then open a project — because opening a project is what paints the workspace.
 */

document.documentElement.style.colorScheme = 'light';

loadLocal();

/* A genuinely empty install gets the first-run card. Decided here, before the sample project
   exists, so it can never reappear on a normal launch. */
if (!APP.S.projects.length) {
  APP.firstRun = true;
  APP.S.projects.push(newProject('Heavy Head'));
}

/* the one place the mobile destinations are assembled: each module owns its own sheet */
APP.sheetHooks = {
  pages: pagesSheet,
  add: addSheet,
  edit: editSheet,
  script: scriptSheet,
  more: moreSheet,
};

setSyncRenderer(() => renderAll());
wire();
setSaveState('saved', 'Saved on this device');

const startId = APP.S.projects.find(p => p.id === APP.S.cur) ? APP.S.cur : APP.S.projects[0].id;
openProject(startId);
renderHeader();

initCaps().then(() => {
  call('syncChrome');
});

if (APP.firstRun) mountWelcome();
