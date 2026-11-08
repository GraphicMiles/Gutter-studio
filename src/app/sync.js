import { validate } from '../model/validate.js';
import { APP, TAB } from './store.js';
import { HIST } from './history.js';
import { pushRemote, saveLocal, setSaved } from './persist.js';
import { renderAll } from './render.js';
import { renderInsp } from './inspector.js';
import { drawGenUi } from './ai.js';

/* app/sync.js: generated from the single-file build, code unchanged */








function mergeRemote(snap){let changed=false;const seen=new Set();
 snap.docs.forEach(d=>{const x=d.data();seen.add(d.id);if(!x||!x.p||x.by===TAB)return;const loc=APP.S.projects.find(p=>p.id===d.id);if(loc&&(loc.t||0)>=(x.t||0))return;
  try{const v=validate(x.p);v.id=d.id;v.t=x.t||Date.now();const i=APP.S.projects.findIndex(p=>p.id===d.id);if(i>=0){APP.S.projects[i]=v;if(APP.P.id===d.id){APP.P=v;HIST.u=[];HIST.r=[]}}else APP.S.projects.push(v);changed=true}catch(e){}});
 if(!APP.remoteReady||changed){APP.remoteReady=true;APP.S.projects.forEach(p=>{if(!seen.has(p.id))pushRemote(p)})}
 if(changed){saveLocal();if(!APP.S.projects.find(p=>p.id===APP.P.id))APP.P=APP.S.projects[0];renderAll()}setSaved('Saved to your account')}
async function initCaps(){
 if(!(window.claude&&claude.use))return;
 try{APP.AI=await claude.use('sample')}catch(e){APP.AI=null}drawGenUi();if(APP.tab==='panel')renderInsp();
 try{APP.DL=await claude.use('downloads')}catch(e){APP.DL=null}
 try{const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);APP.UID=user?await user.id():null;if(db&&APP.UID){APP.DB=db;APP.DB.collection('data/users/'+APP.UID).onSnapshot(s=>{if(s.metadata.fromCache&&!APP.remoteReady)return;mergeRemote(s)},()=>{APP.remoteReady=false})}}catch(e){}}

export { initCaps, mergeRemote };

