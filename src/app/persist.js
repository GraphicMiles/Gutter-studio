import { validate } from '../model/validate.js';
import { APP, TAB, call } from './store.js';

/* app/persist.js: where the work goes.
 *
 * The project list is written to this device first, always, and that is what the save indicator
 * reports. If the host provides an account, the same snapshot is pushed afterwards; a failed push
 * never loses the local write and never claims a cloud save. Edits are batched: a drag or a burst
 * of typing produces one write, not one per pointer move.
 */

const KEY = 'gutter.studio.v1';

let saveTimer = 0;
const chain = {};

function setSaveState(state, text) {
  APP.saveState = { state, text: text || '' };
  call('syncSaveChip');
}

function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(APP.S));
    return true;
  } catch (e) {
    return false;
  }
}

function loadLocal() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j && Array.isArray(j.projects)) {
      APP.S.projects = j.projects.slice(0, 40).map(p => {
        try {
          const v = validate(p);
          v.t = Number(p.t) || Date.now();
          return v;
        } catch (e) { return null; }
      }).filter(Boolean);
      APP.S.cur = j.cur;
    }
  } catch (e) { /* a corrupt store is not a crash: the app starts with the sample project */ }
}

function pushRemote(p) {
  if (!APP.DB || !APP.UID || !p) return;
  const id = p.id;
  chain[id] = (chain[id] || Promise.resolve())
    .then(() => APP.DB.doc('data/users/' + APP.UID + '/' + id).set({
      p: JSON.parse(JSON.stringify(p)), t: p.t, by: TAB,
    }))
    .catch(() => {
      APP.remoteReady = false;
      setSaveState('saved', 'Saved on this device');
    });
}

function scheduleSave() {
  setSaveState('saving', 'Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = saveLocal();
    if (!ok) {
      setSaveState('error', 'Save failed');
      return;
    }
    pushRemote(APP.P);
    setSaveState(APP.remoteReady ? 'synced' : 'saved', APP.remoteReady ? 'Saved to your account' : 'Saved on this device');
  }, 500);
}

function retrySave() {
  const ok = saveLocal();
  if (!ok) {
    setSaveState('error', 'Save failed');
    return;
  }
  pushRemote(APP.P);
  setSaveState(APP.remoteReady ? 'synced' : 'saved', APP.remoteReady ? 'Saved to your account' : 'Saved on this device');
}

/* the older call sites speak in sentences; map them onto the four real states */
function setSaved(msg) {
  if (/^Saving/.test(msg)) setSaveState('saving', msg);
  else if (/^Not saved/.test(msg)) setSaveState('error', 'Save failed');
  else if (/account/.test(msg)) setSaveState('synced', msg);
  else setSaveState('saved', msg);
}

export { KEY, loadLocal, pushRemote, retrySave, saveLocal, scheduleSave, setSaveState, setSaved };
