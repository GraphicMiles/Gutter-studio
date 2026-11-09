import { HEX } from './util.js';

/* core/text.js: generated from the single-file build, code unchanged */


const scrub=(s,max)=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g,'').replace(/[ \t]+/g,' ').trim().slice(0,max);
const en=(v,list,d)=>list.includes(v)?v:d;
const own=(o,k)=>o&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined;
const cvOr=(v,map,d)=>{v=String(v==null?'':v);return Object.prototype.hasOwnProperty.call(map,v)?v:(HEX.test(v)?v:d)};

const titleCase=s=>String(s==null?'':s).replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
export { cvOr, en, own, scrub, titleCase };

