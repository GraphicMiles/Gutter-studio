import { validate } from '../model/validate.js';
import { APP, TAB } from './store.js';
import { HIST } from './history.js';
import { pushRemote, saveLocal, setSaveState } from './persist.js';

/* app/sync.js: the optional account layer.
 *
 * Nothing here is required for the app to work. If the host provides a database and a user, the
 * projects are mirrored and remote changes are merged by timestamp; if it does not, every call
 * returns quietly and the app stays a local studio. The merge never silently overwrites newer local
 * work, and a project that arrives from the account keeps its identity.
 */

function mergeRemote(snapshot) {
  let changed = false;
  const seen = new Set();
  snapshot.docs.forEach(d => {
    const x = d.data();
    seen.add(d.id);
    if (!x || !x.p || x.by === TAB) return;
    const local = APP.S.projects.find(p => p.id === d.id);
    if (local && (local.t || 0) >= (x.t || 0)) return;
    try {
      const v = validate(x.p);
      v.id = d.id;
      v.t = x.t || Date.now();
      const i = APP.S.projects.findIndex(p => p.id === d.id);
      if (i >= 0) {
        APP.S.projects[i] = v;
        if (APP.P && APP.P.id === d.id) { APP.P = v; HIST.u = []; HIST.r = []; }
      } else {
        APP.S.projects.push(v);
      }
      changed = true;
    } catch (e) { /* an unreadable remote document is skipped, not fatal */ }
  });
  if (!APP.remoteReady || changed) {
    APP.remoteReady = true;
    APP.S.projects.forEach(p => { if (!seen.has(p.id)) pushRemote(p); });
  }
  if (changed) {
    saveLocal();
    if (!APP.S.projects.find(p => p.id === APP.P.id)) APP.P = APP.S.projects[0];
    call_refresh();
  }
  setSaveState('synced', 'Saved to your account');
}

/* render.js registers the repaint; sync never imports the UI */
let call_refresh = () => { };
function setSyncRenderer(fn) { call_refresh = fn; }

async function initCaps() {
  if (!(window.claude && window.claude.use)) return;
  try { APP.AI = await window.claude.use('sample'); } catch (e) { APP.AI = null; }
  try { APP.DL = await window.claude.use('downloads'); } catch (e) { APP.DL = null; }
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    APP.UID = user ? await user.id() : null;
    if (db && APP.UID) {
      APP.DB = db;
      APP.DB.collection('data/users/' + APP.UID).onSnapshot(
        s => { if (s.metadata.fromCache && !APP.remoteReady) return; mergeRemote(s); },
        () => { APP.remoteReady = false; }
      );
    }
  } catch (e) { /* no account, no problem */ }
}

export { initCaps, mergeRemote, setSyncRenderer };
