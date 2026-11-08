import { esc } from '../core/util.js';
import { scrub } from '../core/text.js';
import { $ } from '../core/dom.js';
import { ENUM } from '../core/enums.js';
import { kit } from '../core/kit.js';
import { LIM } from '../model/schema.js';
import { APP, call } from './store.js';
import { castName, curPage, curPanel, edit } from './history.js';
import { toast } from '../core/dom.js';
import { sid } from '../core/ids.js';
import { FUR, HAIRC, OUTFIT, PRESETS, SKIN } from '../core/palette.js';
import { randChar, validate } from '../model/validate.js';
import { figFor, region } from '../page/frame.js';
import { motionPlay } from '../ui/motion.js';
import { icon } from '../ui/icons.js';

/* app/inspector.js: generated from the single-file build, code unchanged */















let HS=[];
/* inline icons, so no icon font and no glyph characters stand in for pictures */
const ic=icon;const hid=fn=>{HS.push(fn);return HS.length-1};
const fSel=(label,opts,val,set)=>`<label class="f"><span>${esc(label)}</span><select data-h="${hid(e=>set(e.value))}">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}"${v===val?' selected':''}>${esc(l)}</option>`}).join('')}</select></label>`;
const fSeg=(label,opts,val,set)=>`<div class="f"><span>${esc(label)}</span><div class="seg" role="group" aria-label="${esc(label)}">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<button type="button" aria-pressed="${v===val}" data-h="${hid(()=>set(v))}">${esc(l)}</button>`}).join('')}</div></div>`;
const fTxt=(label,val,set,o)=>{o=o||{};const h=hid(e=>set(e.value));return o.area?`<label class="f"><span>${esc(label)}</span><textarea data-h="${h}" data-in="1" maxlength="${o.max||200}" rows="${o.rows||2}">${esc(val)}</textarea></label>`:`<label class="f"><span>${esc(label)}</span><input type="text" data-h="${h}" data-in="1" maxlength="${o.max||60}" value="${esc(val)}"></label>`};
const fSw=(label,map,val,set,extra)=>{const keys=Object.keys(map);return `<div class="f"><span>${esc(label)}</span><div class="sw" role="group" aria-label="${esc(label)}">${keys.map(k=>`<button type="button" style="background:${map[k]}" aria-label="${esc(k)}" title="${esc(k)}" aria-pressed="${k===val}" data-h="${hid(()=>set(k))}"></button>`).join('')}</div></div>`};
const fTog=(label,val,set)=>`<label class="tog"><span>${esc(label)}</span><input type="checkbox" ${val?'checked':''} data-h="${hid(e=>set(e.checked))}"></label>`;
const fRng=(label,min,max,step,val,set,fmt)=>`<div class="f"><div class="rg"><span class="lbl">${esc(label)}</span><output>${fmt?fmt(val):val}</output><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-h="${hid(e=>{e.parentNode.querySelector('output').textContent=fmt?fmt(+e.value):e.value;set(+e.value)})}" data-in="1" aria-label="${esc(label)}"></div></div>`;
/* the role keys are sentence fragments; the rest of the panel is sentence case */
const COLCAP={sfx:'SFX'};
const fCol=(label,val,set)=>`<label>${esc(COLCAP[label]||label.replace(/^./,c=>c.toUpperCase()))}<input type="color" value="${val}" data-h="${hid(e=>set(e.value))}" data-in="1"></label>`;
const tonesMap=()=>{const K=kit(APP.P.style),o={};for(const k in K.tones)o[k]=K.tones[k];return o};
/* ===== inspector: panel ===== */
const N=a=>a.map(x=>[x,x.replace(/-/g,' ')]);
function inspPanel(){const p=curPanel();if(!p)return `<p class="hint">Select a panel on the board to edit it.</p>`;
 const cast=[['','None'],...APP.P.cast.map(c=>[c.id,c.name])],pg=curPage(),idx=pg.panels.findIndex(x=>x.id===p.id);
 const upd=(fn,key,o)=>edit(()=>fn(p),key,o);
 let h=`<div class="card"><h3>Panel ${idx+1} of ${pg.panels.length}<span><button class="btn sm ghost icon" data-h="${hid(()=>movePanel(-1))}" aria-label="Move panel earlier">${ic('left')}</button><button class="btn sm ghost icon" data-h="${hid(()=>movePanel(1))}" aria-label="Move panel later">${ic('right')}</button></span></h3>
 ${fSeg('Shot',[['extreme-close','XCU'],['close','Close'],['medium','Med'],['full','Full'],['wide','Wide']],p.shot,v=>upd(q=>q.shot=v))}
 <div class="row2">${fSel('Setting',N(ENUM.setting),p.setting,v=>upd(q=>q.setting=v))}${fSel('Prop',N(ENUM.prop),p.prop,v=>upd(q=>q.prop=v))}</div>
 ${fSw('Background colour',tonesMap(),p.tone,v=>upd(q=>q.tone=v))}</div>`;
 for(let i=0;i<2;i++){const id=p.who[i]||'';if(i===1&&!p.who[0])break;
  h+=`<div class="card"><h3>Character ${i+1}</h3>${fSel('Who',cast,id,v=>upd(q=>{const w=q.who.slice();if(v)w[i]=v;else w.splice(i,1);q.who=w.filter(Boolean).filter((x,k,a)=>a.indexOf(x)===k).slice(0,2)}))}`;
  if(id)h+=`<div class="row2">${fSel('Expression',N(ENUM.expr),p.expr[i],v=>upd(q=>q.expr[i]=v))}${fSel('Looking',N(ENUM.look),p.look[i],v=>upd(q=>q.look[i]=v))}</div>${(APP.P.cast.find(c=>c.id===id)||{}).kind==='cat'?'':fSel('Pose',N(ENUM.pose),p.pose[i],v=>upd(q=>q.pose[i]=v))}`;
  h+='</div>'}
 if(p.who.length<2&&p.who.length>0&&APP.P.cast.length>1)h+=`<button class="btn sm" data-h="${hid(()=>upd(q=>{const o=APP.P.cast.find(c=>!q.who.includes(c.id));if(o)q.who.push(o.id)}))}">+ Add second character</button>`;
 if(p.who.length<2&&p.who.length>0)h+=fSeg('Placement',N(ENUM.pos),p.pos[0],v=>upd(q=>q.pos=[v]));
 h+=`<div class="card"><h3>Words</h3>${fTxt('Caption box',p.caption,v=>upd(q=>q.caption=scrub(v,LIM.text),'cap'+p.id,{insp:false}),{area:1,rows:2})}`;
 p.bubbles.forEach((b,i)=>{h+=`<div class="card" style="background:var(--surface)"><h3>Bubble ${i+1}<button class="btn sm ghost dng" data-h="${hid(()=>upd(q=>q.bubbles.splice(i,1)))}" aria-label="Remove bubble ${i+1}">Remove</button></h3><div class="row2">${fSel('Speaker',(p.who.length?p.who:[]).map((id,k)=>[String(k),castName(id)]),String(b.who),v=>upd(q=>q.bubbles[i].who=+v))}${fSel('Style',N(ENUM.bubble),b.type,v=>upd(q=>q.bubbles[i].type=v))}</div>${fTxt('Text',b.text,v=>upd(q=>q.bubbles[i].text=scrub(v,LIM.text),'bt'+p.id+i,{insp:false}),{area:1,rows:2})}</div>`});
 if(p.bubbles.length<LIM.bubbles)h+=`<button class="btn sm" data-h="${hid(()=>upd(q=>q.bubbles.push({who:0,type:'speech',text:'New line'})))}">+ Add bubble</button>`;
 h+=`<div class="row2">${fTxt('Sound effect',p.sfx.text,v=>upd(q=>q.sfx.text=scrub(v,24),'sfx'+p.id,{insp:false}),{max:24})}${fSel('SFX corner',[['br','Bottom right'],['bl','Bottom left'],['tr','Top right'],['tl','Top left'],['c','Centre']],p.sfx.pos,v=>upd(q=>q.sfx.pos=v))}</div></div>`;
 h+=`<div class="card"><h3>Director's note</h3>${fTxt('Note (shown on storyboards)',p.note,v=>upd(q=>q.note=scrub(v,LIM.note),'note'+p.id,{insp:false}),{area:1,rows:2,max:LIM.note})}</div>
 <div class="card"><h3>Rewrite with Claude</h3>${fTxt('What should change?',APP.aiNote,v=>{APP.aiNote=v},{max:200})}<div class="tools"><button class="btn sm pri" id="rwGo" data-h="${hid(()=>call('rewritePanel',p))}"${APP.AI?'':' disabled'}>Rewrite panel</button></div><div class="stat" id="rwStat" role="status">${APP.AI?'':'Claude is not available in this view.'}</div></div>
 <div class="tools"><button class="btn sm" data-h="${hid(()=>dupPanel(p))}">Duplicate</button><button class="btn sm dng" data-h="${hid(()=>delPanel(p))}">Delete panel</button></div>`;
 return h}
function movePanel(d){const pg=curPage(),i=pg.panels.findIndex(p=>p.id===APP.selId),j=i+d;if(j<0||j>=pg.panels.length)return;edit(()=>{const a=pg.panels;[a[i],a[j]]=[a[j],a[i]]})}
function dupPanel(p){const pg=curPage();if(pg.panels.length>=LIM.panels)return toast('A page holds up to '+LIM.panels+' panels.');let nid;edit(()=>{const c=validate({cast:APP.P.cast,pages:[{panels:[JSON.parse(JSON.stringify(p))]}]}).pages[0].panels[0];c.id=nid=sid();const i=pg.panels.findIndex(x=>x.id===p.id);pg.panels.splice(i+1,0,c);APP.selId=nid})}
function delPanel(p){const pg=curPage();if(pg.panels.length<=1)return toast('A page needs at least one panel.');const i=pg.panels.findIndex(x=>x.id===p.id);edit(()=>{pg.panels.splice(i,1);APP.selId=pg.panels[Math.min(i,pg.panels.length-1)].id})}
/* ===== inspector: cast ===== */
function inspCast(){const c=APP.P.cast.find(c=>c.id===APP.castSel)||APP.P.cast[0];APP.castSel=c.id;const up=(fn,key,o)=>edit(()=>fn(c),key,o);
 const person=c.kind==='person',K=kit(APP.P.style),f=figFor(c,{expr:'neutral',look:'camera',pose:'none'},K,'cv'),r=region(f,'close');
 let h=`<div class="castlist" role="group" aria-label="Cast">${APP.P.cast.map(x=>`<button aria-pressed="${x.id===c.id}" data-h="${hid(()=>{APP.castSel=x.id;renderInsp()})}">${esc(x.name)}</button>`).join('')}${APP.P.cast.length<LIM.cast?`<button data-h="${hid(()=>{let nid;edit(()=>{const n=randChar('Character '+(APP.P.cast.length+1));nid=n.id;APP.P.cast.push(n)});APP.castSel=nid;renderInsp()})}">+ New</button>`:''}</div>
 <div class="prev" aria-hidden="true"><svg viewBox="${f.cx-(f.cat?170:230)} ${r.vy} ${f.cat?340:460} ${r.vh}" preserveAspectRatio="xMidYMax meet"><rect x="-500" y="-500" width="2000" height="3000" fill="${K.tones.main}"/>${f.svg}</svg></div>
 ${fTxt('Name',c.name,v=>up(q=>q.name=scrub(v,LIM.name)||q.name,'cn'+c.id,{insp:false}),{max:LIM.name})}
 ${fSeg('Type',[['person','Person'],['cat','Cat']],c.kind,v=>up(q=>q.kind=v))}`;
 if(person)h+=`${fSw('Skin',Object.fromEntries(Object.entries(SKIN).map(([k,v])=>[k,K.c(v)])),c.skin,v=>up(q=>q.skin=v))}
 <div class="row2">${fSel('Hair',N(ENUM.hair),c.hair,v=>up(q=>q.hair=v))}${fSel('Nose',N(ENUM.nose),c.nose,v=>up(q=>q.nose=v))}</div>
 ${fSw('Hair colour',Object.fromEntries(Object.entries(HAIRC).map(([k,v])=>[k,K.c(v)])),c.hairColor,v=>up(q=>q.hairColor=v))}
 ${fSw('Outfit colour',Object.fromEntries(Object.entries(OUTFIT).map(([k,v])=>[k,K.c(v)])),c.outfit,v=>up(q=>q.outfit=v))}
 <div class="row2">${fSel('Collar',N(ENUM.collar),c.collar,v=>up(q=>q.collar=v))}${fSel('Glasses',N(ENUM.glasses),c.glasses,v=>up(q=>q.glasses=v))}</div>
 <div class="row2">${fSel('Hat',N(ENUM.hat),c.hat,v=>up(q=>q.hat=v))}${fSel('Companion',[['none','No cat'],['head','Cat on head']],c.cat,v=>up(q=>q.cat=v))}</div>
 ${c.hat!=='none'?fSw('Hat colour',Object.fromEntries(Object.entries(OUTFIT).map(([k,v])=>[k,K.c(v)])),c.hatColor,v=>up(q=>q.hatColor=v)):''}`;
 if(!person||c.cat==='head')h+=`${fSw('Cat fur',Object.fromEntries(Object.entries(FUR).map(([k,v])=>[k,K.c(v)])),c.catFur,v=>up(q=>q.catFur=v))}${person?'':fSel('Default mood',N(ENUM.mood),c.catMood,v=>up(q=>q.catMood=v))}`;
 h+=`<div class="tools"><button class="btn sm" data-h="${hid(()=>up(q=>{const n=randChar(q.name,String(Math.random()));Object.assign(q,n,{id:q.id,name:q.name})}))}">Randomise look</button><button class="btn sm dng" data-h="${hid(()=>{if(APP.P.cast.length<2)return toast('Keep at least one character.');edit(()=>{APP.P.cast=APP.P.cast.filter(x=>x.id!==c.id);APP.P.pages.forEach(pg=>pg.panels.forEach(p=>{const keep=p.who.map((id,i)=>id===c.id?-1:i).filter(i=>i>=0);p.who=keep.map(i=>p.who[i]);['expr','look','pose'].forEach(k=>p[k]=keep.map(i=>p[k][i]));p.bubbles=p.bubbles.filter(b=>keep.includes(b.who)).map(b=>({...b,who:keep.indexOf(b.who)}))}))});APP.castSel=APP.P.cast[0].id;renderInsp()})}">Remove</button></div>`;
 return h}
/* ===== inspector: style ===== */
function inspStyle(){const s=APP.P.style,K=kit(s),up=(fn,key)=>edit(()=>fn(APP.P.style),key,{insp:false,script:false}),upI=fn=>edit(()=>fn(APP.P.style),'',{script:false});
 return `${fSel('Palette',Object.entries(PRESETS).map(([k,v])=>[k,v.name]),s.preset,v=>upI(q=>{q.preset=v;q.tones={};q.shadow=q.line=q.paper=q.cap=q.sfx=''}))}
 ${fSeg('Format',[['comic','Comic'],['manga','Manga'],['webtoon','Strip'],['square','Square'],['storyboard','Boards']],s.fmt,v=>upI(q=>q.fmt=v))}
 <div class="card"><h3>Colours</h3><div class="colors">${['main','warm','cool','night','alert','soft'].map(k=>fCol(k,K.tones[k],v=>up(q=>{q.tones=Object.assign({},q.tones);q.tones[k]=v},'col'+k))).join('')}
 ${fCol('shadow',K.shadow,v=>up(q=>q.shadow=v,'cshadow'))}${fCol('ink',K.line,v=>up(q=>q.line=v,'cline'))}${fCol('paper',K.paper,v=>up(q=>q.paper=v,'cpaper'))}${fCol('caption',K.cap,v=>up(q=>q.cap=v,'ccap'))}${fCol('sfx',K.sfx,v=>up(q=>q.sfx=v,'csfx'))}</div></div>
 ${fRng('Line weight',2,8,.5,s.sw,v=>up(q=>q.sw=v,'sw'))}${fRng('Gutter',0,60,2,s.gutter,v=>up(q=>q.gutter=v,'gut'))}${fRng('Page margin',0,120,4,s.margin,v=>up(q=>q.margin=v,'mar'))}${fRng('Corner radius',0,40,2,s.rad,v=>up(q=>q.rad=v,'rad'))}${fRng('Lettering size',.7,1.4,.05,s.fs,v=>up(q=>q.fs=v,'fs'),v=>Math.round(v*100)+'%')}
 <div class="row2">${fSel('Bubbles',[['round','Round'],['boxy','Boxy']],s.bub,v=>upI(q=>q.bub=v))}${fSel('Panel border',N(ENUM.border).filter(x=>x[0]!=='jagged'),s.border,v=>upI(q=>q.border=v))}</div>
 ${fSel('Background pattern',[['none','None'],['dots','Halftone dots'],['stripes','Stripes'],['burst','Burst']],s.pattern,v=>upI(q=>q.pattern=v))}
 ${fTog('Offset shadows',s.shadowOn,v=>upI(q=>q.shadowOn=v))}${fTog('Paper grain',s.grain,v=>upI(q=>q.grain=v))}${fTog('Capital letters',s.caps,v=>upI(q=>q.caps=v))}`}
function renderInsp(opts){
 const root=$('#insp');HS=[];
 /* the inspector is long: a redraw must not throw away the reader's place */
 const pane=root.parentElement,y=pane?pane.scrollTop:0,y2=root.scrollTop;
 root.innerHTML=APP.tab==='panel'?inspPanel():APP.tab==='cast'?inspCast():inspStyle();
 if(pane)pane.scrollTop=y;root.scrollTop=y2;
 for(const [id,t] of [['tPanel','panel'],['tCast','cast'],['tStyle','style']]){
  const on=APP.tab===t,b=$('#'+id);
  b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;
  if(on)root.setAttribute('aria-labelledby',id);
 }
 /* only a tab change animates; a value change must not make the panel flicker */
 if(opts&&opts.animate)motionPlay(root,'reveal',230);
}

export { HS, N, delPanel, dupPanel, fCol, fRng, fSeg, fSel, fSw, fTog, fTxt, inspCast, inspPanel, inspStyle, movePanel, renderInsp, tonesMap };

