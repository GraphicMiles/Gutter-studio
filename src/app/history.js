import { validate } from '../model/validate.js';
import { APP } from './store.js';
import { scheduleSave } from './persist.js';

/* app/history.js: generated from the single-file build, code unchanged */




const HIST={u:[],r:[],key:'',t:0};
function snap(){return JSON.stringify(APP.P)}
function commit(key){ // call BEFORE mutating
 const now=Date.now();if(!(key&&key===HIST.key&&now-HIST.t<900)){HIST.u.push(snap());if(HIST.u.length>80)HIST.u.shift();HIST.r=[]}HIST.key=key||'';HIST.t=now}
function restore(json){const keepSel=APP.selId;const old=APP.P;APP.P=validate(JSON.parse(json));APP.P.id=old.id;const i=APP.S.projects.findIndex(p=>p.id===old.id);if(i>=0)APP.S.projects[i]=APP.P;APP.pageIdx=Math.min(APP.pageIdx,APP.P.pages.length-1);
 if(!findPanel(keepSel)){APP.selId=null;APP.sel={kind:'page'}}
 else if(APP.sel&&APP.sel.kind!=='page'&&APP.sel.kind!=='cast'){
   const p=findPanel(APP.sel.pid);
   if(!p){APP.sel={kind:'page'};APP.selId=null}
   else if(APP.sel.kind==='bubble'&&(APP.sel.i>=p.bubbles.length)){APP.sel={kind:'panel',pid:p.id};APP.selId=p.id}
   else if(APP.sel.kind==='char'&&(APP.sel.i>=p.who.length)){APP.sel={kind:'panel',pid:p.id};APP.selId=p.id}
 }
 scheduleSave()}
function undo(){if(!HIST.u.length)return;HIST.r.push(snap());restore(HIST.u.pop());HIST.key='';paint('all')}
function redo(){if(!HIST.r.length)return;HIST.u.push(snap());restore(HIST.r.pop());HIST.key='';paint('all')}
function touch(){APP.P.t=Date.now();scheduleSave()}
/* edit: mutate project with history. opts.insp re-renders inspector; opts.script refresh script */
let paint=()=>{};
/** render.js registers what to redraw after a mutation, so history never imports the UI */
const setRenderer=fn=>{paint=fn};
function edit(fn,key,opts){opts=opts||{};commit(key);fn(APP.P);touch();paint(opts)}
const findPanel=id=>{for(const pg of APP.P.pages){const p=pg.panels.find(p=>p.id===id);if(p)return p}return null};
const curPage=()=>APP.P.pages[Math.min(APP.pageIdx,APP.P.pages.length-1)];
const curPanel=()=>{const p=APP.selId&&findPanel(APP.selId);return p||null};
const castName=id=>{const c=APP.P.cast.find(c=>c.id===id);return c?c.name:'Unnamed'};

export { HIST, castName, commit, curPage, curPanel, edit, findPanel, paint, redo, restore, setRenderer, snap, touch, undo };

