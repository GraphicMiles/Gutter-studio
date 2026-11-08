import { sid } from '../core/ids.js';

/* app/store.js: generated from the single-file build, code unchanged */


/* The single mutable application state. Everything else is a pure module or reads this. */
const APP={S:{projects:[],cur:null},P:null,selId:null,pageIdx:0,tab:'panel',castSel:null,
 showNums:true,zoom:1,dock:'projects',pane:'board',firstRun:false,
 AI:null,DL:null,DB:null,UID:null,remoteReady:false,aiNote:''};
const TAB=sid();

/* A tiny registry instead of imports, for the few places where a lower module needs an
   action owned by a higher one. Keeps the import graph acyclic: inspector never imports ai.
   Anything registered here must be safe to call before boot finishes (it may be absent). */
const HOOKS={};
const on=(name,fn)=>{HOOKS[name]=fn};
const call=(name,...a)=>{const f=HOOKS[name];return f?f(...a):undefined};

export { APP, HOOKS, TAB, call, on };

