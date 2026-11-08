import { HEX, num, rng } from '../core/util.js';
import { cvOr, en, scrub } from '../core/text.js';
import { okId, sid } from '../core/ids.js';
import { FUR, HAIRC, OUTFIT, PRESETS, SKIN } from '../core/palette.js';
import { ENUM } from '../core/enums.js';
import { LIM } from './schema.js';

/* model/validate.js: generated from the single-file build, code unchanged */







function cleanChar(c,i){c=c&&typeof c==='object'?c:{};
 const kind=en(c.kind,ENUM.kind,'person');
 return {id:okId(c.id)?c.id:sid(),name:scrub(c.name,LIM.name)||('Character '+(i+1)),kind,
  skin:cvOr(c.skin,SKIN,'salmon'),hair:en(c.hair,ENUM.hair,'curly'),hairColor:cvOr(c.hairColor,HAIRC,'black'),outfit:cvOr(c.outfit,OUTFIT,'yellow'),
  collar:en(c.collar,ENUM.collar,'turtleneck'),glasses:en(c.glasses,ENUM.glasses,'none'),hat:en(c.hat,ENUM.hat,'none'),hatColor:cvOr(c.hatColor,OUTFIT,'red'),
  nose:en(c.nose,ENUM.nose,'plane'),cat:en(c.cat,['none','head'],'none'),catFur:cvOr(c.catFur,FUR,'white'),catMood:en(c.catMood,ENUM.mood,'calm')}}
function cleanPanel(p,P){p=p&&typeof p==='object'?p:{};const ids=P.cast.map(c=>c.id),byName=n=>{n=String(n||'').toLowerCase();const c=P.cast.find(c=>c.name.toLowerCase()===n);return c?c.id:null};
 const whoRaw=Array.isArray(p.who)?p.who:[],who=[];for(const w of whoRaw.slice(0,2)){const id=ids.includes(w)?w:byName(w);if(id&&!who.includes(id))who.push(id)}
 const arr=(v,list,d)=>[0,1].map(i=>en(Array.isArray(v)?v[i]:(i===0?v:undefined),list,d));
 const bubbles=(Array.isArray(p.bubbles)?p.bubbles:[]).slice(0,LIM.bubbles).map(b=>{b=b&&typeof b==='object'?b:{};let w=Number(b.who);if(!Number.isInteger(w))w=who.indexOf(ids.includes(b.who)?b.who:byName(b.who));return {who:Math.max(0,Math.min(1,w<0?0:w)),type:en(b.type,ENUM.bubble,'speech'),text:scrub(b.text,LIM.text)}}).filter(b=>b.text);
 const sf=p.sfx&&typeof p.sfx==='object'?p.sfx:{};
 return {id:okId(p.id)?p.id:sid(),shot:en(p.shot,ENUM.shot,'medium'),setting:en(p.setting,ENUM.setting,'plain'),tone:en(p.tone,ENUM.tone,'main'),who,
  expr:arr(p.expr,ENUM.expr,'neutral'),look:arr(p.look,ENUM.look,'center'),pose:arr(p.pose,ENUM.pose,'none'),pos:[en(Array.isArray(p.pos)?p.pos[0]:p.pos,ENUM.pos,'auto')],
  prop:en(p.prop,ENUM.prop,'none'),caption:scrub(p.caption,LIM.text),bubbles,sfx:{text:scrub(sf.text,24),pos:en(sf.pos,ENUM.sfxPos,'br')},note:scrub(p.note,LIM.note)}}
function cleanStyle(s){s=s&&typeof s==='object'?s:{};const pr=en(s.preset,Object.keys(PRESETS),'garden'),t={};
 if(s.tones&&typeof s.tones==='object')for(const k of Object.keys(PRESETS.garden.tones))if(HEX.test(s.tones[k]))t[k]=s.tones[k];
 return {preset:pr,fmt:en(s.fmt,ENUM.fmt,'comic'),tones:t,shadow:HEX.test(s.shadow)?s.shadow:'',line:HEX.test(s.line)?s.line:'',paper:HEX.test(s.paper)?s.paper:'',cap:HEX.test(s.cap)?s.cap:'',sfx:HEX.test(s.sfx)?s.sfx:'',
  sw:num(s.sw,4,2,8),shadowOn:s.shadowOn!==false,rad:num(s.rad,0,0,40),gutter:num(s.gutter,22,0,60),margin:num(s.margin,40,0,120),grain:s.grain!==false,fs:num(s.fs,1,.7,1.4),
  bub:s.bub==='boxy'?'boxy':'round',border:en(s.border,ENUM.border,'clean'),pattern:en(s.pattern,ENUM.pattern,'none'),caps:s.caps!==false}}
function validate(raw){
 if(typeof raw==='string'){if(raw.length>LIM.json)throw new Error('File is too large.');try{raw=JSON.parse(raw)}catch(e){raw={}}}
 raw=raw&&typeof raw==='object'?raw:{};const P={v:1,id:okId(raw.id)?raw.id:sid(),title:scrub(raw.title,LIM.title)||'Untitled story',t:Date.now(),brief:scrub(raw.brief,2000),style:cleanStyle(raw.style),cast:[],pages:[]};
 (Array.isArray(raw.cast)?raw.cast:[]).slice(0,LIM.cast).forEach((c,i)=>P.cast.push(cleanChar(c,i)));
 if(!P.cast.length)P.cast.push(cleanChar({name:'Ana',hair:'curly',cat:'head'},0));
 const seen=new Set();P.cast.forEach(c=>{if(seen.has(c.id))c.id=sid();seen.add(c.id)});
 (Array.isArray(raw.pages)?raw.pages:[]).slice(0,LIM.pages).forEach(pg=>{pg=pg&&typeof pg==='object'?pg:{};const ps=(Array.isArray(pg.panels)?pg.panels:[]).slice(0,LIM.panels).map(p=>cleanPanel(p,P));if(ps.length)P.pages.push({id:okId(pg.id)?pg.id:sid(),layout:en(pg.layout,['auto','stack','grid','hero','cinema'],'auto'),panels:ps})});
 if(!P.pages.length)P.pages.push({id:sid(),layout:'auto',panels:[cleanPanel({shot:'close',setting:'room',who:[P.cast[0].id],expr:'neutral'},P)]});
 const ids=new Set();P.pages.forEach(pg=>pg.panels.forEach(p=>{if(ids.has(p.id))p.id=sid();ids.add(p.id)}));
 return P}
function randChar(name,seed){const r=rng(seed||String(Math.random())),a=l=>l[Math.floor(r()*l.length)];
 return cleanChar({name,kind:'person',skin:a(Object.keys(SKIN)),hair:a(ENUM.hair),hairColor:a(['black','black','brown','auburn','blond','blue','pink','purple','green']),outfit:a(Object.keys(OUTFIT)),collar:a(ENUM.collar),glasses:r()<.4?a(['round','square','shades']):'none',hat:r()<.2?a(['cap','beanie','headband']):'none',hatColor:a(Object.keys(OUTFIT)),nose:a(ENUM.nose),cat:r()<.25?'head':'none',catFur:a(Object.keys(FUR))},0)}
function newProject(title){return validate({title:title||'Untitled story',cast:[{name:'Ana',hair:'curly',hairColor:'black',skin:'salmon',outfit:'yellow',collar:'turtleneck',cat:'head',catFur:'white'},{name:'Milo',kind:'cat',catFur:'white'}],
 pages:[{panels:[{shot:'wide',setting:'room',who:['Ana'],pos:'left',expr:'neutral',caption:'Monday, 7:42 AM.',prop:'mug'},{shot:'close',setting:'window',who:['Ana'],expr:'thinking',look:'up',pose:'chin',bubbles:[{who:0,type:'thought',text:'Why is my head so heavy today?'}]},{shot:'extreme-close',setting:'plain',tone:'warm',who:['Milo'],expr:'shock',bubbles:[{who:0,type:'shout',text:'MRROW?!'}],sfx:{text:'Thud',pos:'bl'}},{shot:'medium',setting:'kitchen',tone:'cool',who:['Ana','Milo'],expr:['deadpan','smug'],look:['camera','camera'],bubbles:[{who:0,text:'Please get off.'},{who:1,text:'No.'}]}]}]})}

export { cleanChar, cleanPanel, cleanStyle, newProject, randChar, validate };

