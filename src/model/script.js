import { en, scrub } from '../core/text.js';
import { ENUM } from '../core/enums.js';
import { LIM } from './schema.js';
import { randChar, validate } from './validate.js';

/* model/script.js: generated from the single-file build, code unchanged */
/* eslint-disable no-cond-assign -- deliberate: each line's match result is used immediately */





/* plain text script round trip */
function toScript(P){const nm=id=>(P.cast.find(c=>c.id===id)||{name:'?'}).name;let o=`TITLE: ${P.title}\n`;
 P.pages.forEach((pg,i)=>{o+=`\nPAGE ${pg.layout}\n`;pg.panels.forEach(p=>{o+=`\nPANEL ${p.shot} | ${p.setting} | ${p.tone} | ${p.prop}\n`;
  p.who.forEach((id,k)=>{o+=`@${nm(id)} ${p.expr[k]} ${p.look[k]} ${p.pose[k]}\n`});
  if(p.caption)o+=`CAPTION: ${p.caption}\n`;p.bubbles.forEach(b=>{const n=nm(p.who[b.who]||p.who[0]);o+=`${n}${b.type==='speech'?'':' ('+b.type+')'}: ${b.text}\n`});
  if(p.sfx.text)o+=`SFX: ${p.sfx.text} @${p.sfx.pos}\n`;if(p.note)o+=`NOTE: ${p.note}\n`})});return o}
function parseScript(txt,P){const base=JSON.parse(JSON.stringify(P));const cast=base.cast;const find=n=>cast.find(c=>c.name.toLowerCase()===n.toLowerCase());
 const out={title:base.title,pages:[]};let pg=null,pn=null;const lines=String(txt).slice(0,LIM.json).split(/\r?\n/);
 const ensurePg=l=>{if(!pg){pg={layout:'auto',panels:[]};out.pages.push(pg)}};
 const who=n=>{let c=find(n);if(!c&&cast.length<LIM.cast){c=randChar(scrub(n,LIM.name),n);cast.push(c)}return c};
 for(let raw of lines){const l=raw.trim();if(!l)continue;let m;
  if(m=l.match(/^TITLE:\s*(.*)$/i)){out.title=m[1];continue}
  if(m=l.match(/^PAGE\b\s*(\w*)/i)){pg={layout:en((m[1]||'auto').toLowerCase(),['auto','stack','grid','hero','cinema'],'auto'),panels:[]};out.pages.push(pg);pn=null;continue}
  if(m=l.match(/^PANEL\b\s*(.*)$/i)){ensurePg();const f=m[1].split('|').map(x=>x.trim().toLowerCase());pn={shot:f[0]||'medium',setting:f[1]||'plain',tone:f[2]||'main',prop:f[3]||'none',who:[],expr:[],look:[],pose:[],bubbles:[],sfx:{text:'',pos:'br'},caption:'',note:''};if(pg.panels.length<LIM.panels)pg.panels.push(pn);continue}
  if(!pn)continue;
  if(m=l.match(/^@([^\s]+)\s*(.*)$/)){const c=who(m[1]);if(!c||pn.who.length>=2)continue;const k=pn.who.length;pn.who.push(c.id);m[2].split(/\s+/).forEach(w=>{w=w.toLowerCase();if(ENUM.expr.includes(w))pn.expr[k]=w;else if(ENUM.look.includes(w))pn.look[k]=w;else if(ENUM.pose.includes(w))pn.pose[k]=w});continue}
  if(m=l.match(/^CAPTION:\s*(.*)$/i)){pn.caption=m[1];continue}
  if(m=l.match(/^SFX:\s*(.*?)(?:\s+@(\w+))?$/i)){pn.sfx={text:m[1],pos:(m[2]||'br').toLowerCase()};continue}
  if(m=l.match(/^NOTE:\s*(.*)$/i)){pn.note=m[1];continue}
  if(m=l.match(/^([^:()]{1,30}?)\s*(?:\((\w+)\))?\s*:\s*(.+)$/)){const c=who(m[1].trim());if(!c)continue;if(!pn.who.includes(c.id)&&pn.who.length<2)pn.who.push(c.id);pn.bubbles.push({who:Math.max(0,pn.who.indexOf(c.id)),type:(m[2]||'speech').toLowerCase(),text:m[3]})}}
 base.title=out.title;base.pages=out.pages.filter(p=>p.panels.length);return validate(base)}

export { parseScript, toScript };

