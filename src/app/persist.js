import { $ } from '../core/dom.js';
import { esc } from '../core/util.js';
import { validate } from '../model/validate.js';
import { APP, TAB } from './store.js';

/* app/persist.js: generated from the single-file build, code unchanged */





const KEY='gutter.studio.v1';
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(APP.S));return true}catch(e){return false}}
function loadLocal(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&Array.isArray(j.projects)){APP.S.projects=j.projects.slice(0,40).map(p=>{try{const v=validate(p);v.t=Number(p.t)||Date.now();return v}catch(e){return null}}).filter(Boolean);APP.S.cur=j.cur}}catch(e){}}
function setSaved(msg){
 const e=$('#saved');if(!e)return;
 const short=/^Saving/.test(msg)?'Saving':/^Saved/.test(msg)?'Saved':/^Not saved/.test(msg)?'Not saved':'';
 e.innerHTML=`<span class="full">${esc(msg)}</span><span class="short">${esc(short||msg)}</span>`;
 e.title=msg;
 e.dataset.state=/^Saving/.test(msg)?'saving':/^Saved/.test(msg)?'saved':'unsaved'}
let saveTimer=0,chain={};
function scheduleSave(){setSaved('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const ok=saveLocal();pushRemote(APP.P);setSaved(ok?(APP.remoteReady?'Saved to your account':'Saved on this device'):'Not saved. Export JSON to keep it.')},700)}
function pushRemote(p){if(!APP.DB||!APP.UID||!p)return;const id=p.id;chain[id]=(chain[id]||Promise.resolve()).then(()=>APP.DB.doc('data/users/'+APP.UID+'/'+id).set({p:JSON.parse(JSON.stringify(p)),t:p.t,by:TAB})).catch(()=>{APP.remoteReady=false;setSaved('Saved on this device')})}

export { KEY, loadLocal, pushRemote, saveLocal, saveTimer, scheduleSave, setSaved };

