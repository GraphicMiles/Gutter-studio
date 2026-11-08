import { esc } from '../core/util.js';
import { $, toast } from '../core/dom.js';
import { pageSvg, panelAlt } from '../page/render.js';
import { makeZip } from '../io/zip.js';
import { makePdf } from '../io/pdf.js';
import { rasterize } from '../io/raster.js';
import { slug } from '../io/paths.js';
import { APP, on } from './store.js';
import { motionClose, motionPlay } from '../ui/motion.js';

/* app/exports.js: generated from the single-file build, code unchanged */










async function saveFile(name,data){
 if(APP.DL){try{await APP.DL.save({filename:name,data});toast('Saved '+name)}catch(e){const c=e&&e.code;if(c!=='declined')toast(c==='unavailable'?'Saving is not available here.':'Could not save the file.')}return}
 try{const u=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}catch(e){toast('Could not save the file.')}}
const pageData=i=>{const r=pageSvg(APP.P,i,{uid:'x'});const sc=Math.min(1.5,7500/r.h);return {...r,sc}};
const bytes=async b=>new Uint8Array(await b.arrayBuffer());
const EXP=[
 {l:'This page as PNG',s:'.png',f:async()=>{const r=pageData(APP.pageIdx);await saveFile(`${slug(APP.P.title)}-p${APP.pageIdx+1}.png`,await rasterize(r.svg,r.w,r.h,r.sc,'image/png'))}},
 {l:'All pages as PDF',s:'.pdf',f:async()=>{const pg=[];for(let i=0;i<APP.P.pages.length;i++){const r=pageData(i),b=await rasterize(r.svg,r.w,r.h,Math.min(r.sc,1.25),'image/jpeg',.9);pg.push({w:Math.round(r.w*Math.min(r.sc,1.25)),h:Math.round(r.h*Math.min(r.sc,1.25)),jpg:await bytes(b)})}await saveFile(slug(APP.P.title)+'.pdf',makePdf(pg))}},
 {l:'All pages as PNG zip',s:'.zip',f:async()=>{const fs=[];for(let i=0;i<APP.P.pages.length;i++){const r=pageData(i);fs.push({name:`page-${String(i+1).padStart(2,'0')}.png`,data:await bytes(await rasterize(r.svg,r.w,r.h,r.sc,'image/png'))})}await saveFile(slug(APP.P.title)+'.zip',makeZip(fs))}},
 {l:'This page as SVG',s:'.svg',f:async()=>{await saveFile(`${slug(APP.P.title)}-p${APP.pageIdx+1}.svg`,'<?xml version="1.0" encoding="UTF-8"?>\n'+pageSvg(APP.P,APP.pageIdx,{uid:'x'}).svg)}},
 {l:'Script with alt text',s:'.md',f:async()=>{let m=`# ${APP.P.title}\n\n`;APP.P.pages.forEach((pg,i)=>{m+=`## Page ${i+1}\n\n`;pg.panels.forEach((p,k)=>{m+=`**Panel ${k+1}.** ${panelAlt(p,APP.P)}\n\n`+(p.note?`> ${p.note}\n\n`:'')})});await saveFile(slug(APP.P.title)+'-script.md',m)}},
 {l:'Project file',s:'.json',f:async()=>{await saveFile(slug(APP.P.title)+'.gutter.json',JSON.stringify(APP.P,null,1))}}];
const menuItems=()=>[...$('#menu').querySelectorAll('[role=menuitem]')];
function openMenu(){
 const m=$('#menu'),btn=$('#exp');
 m.innerHTML=EXP.map((e,i)=>`<button type="button" role="menuitem" data-ex="${i}" tabindex="-1">${esc(e.l)}<small>${e.s}</small></button>`).join('');
 m.hidden=false;
 /* anchored to the button that opened it: it grows out of that corner, not the screen edge */
 m.style.transformOrigin=btn&&btn.offsetLeft>innerWidth/2?'top right':'top left';
 motionPlay(m,'open',200);
 $('#exp').setAttribute('aria-expanded','true');
 const first=menuItems()[0];if(first)first.focus();
}
function closeMenu(refocus){
 const m=$('#menu');if(m.hidden)return;
 const inside=m.contains(document.activeElement);
 const done=()=>{m.hidden=true;m.classList.remove('closing','open')};
 if(m.classList.contains('open')){m.classList.remove('open');motionClose(m,'closing',130,done)}else done();
 $('#exp').setAttribute('aria-expanded','false');
 if(refocus!==false&&(inside||refocus))$('#exp').focus();
}
on('openMenu',()=>openMenu());
on('closeMenu',r=>closeMenu(r));
/* roving focus inside the menu */
function menuKey(e){const items=menuItems();if(!items.length)return;const i=items.indexOf(document.activeElement);
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=i<0?0:(i+(e.key==='ArrowDown'?1:items.length-1))%items.length;items[n].focus()}
 else if(e.key==='Home'){e.preventDefault();items[0].focus()}
 else if(e.key==='End'){e.preventDefault();items[items.length-1].focus()}
 else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu(true)}
 else if(e.key==='Tab'){closeMenu(true)}}

export { EXP, bytes, closeMenu, menuKey, menuItems, openMenu, pageData, saveFile };

