import { FONT_X } from '../core/palette.js';
import { esc, rng } from '../core/util.js';
import { kit } from '../core/kit.js';
import { fixDup } from '../core/geom.js';
import { setting } from '../art/scenery.js';
import { propSvg } from '../art/props.js';
import { bubbleSvg, wrap } from '../art/bubbles.js';
import { figFor, region } from './frame.js';
import { PAGE_W, boardRects } from './layout.js';

/* page/render.js: generated from the single-file build, code unchanged */









function panelAlt(p,P){const nm=i=>{const c=P.cast.find(x=>x.id===p.who[i]);return c?c.name:'Someone'};
 const who=p.who.map((id,i)=>nm(i)+(p.expr[i]&&p.expr[i]!=='neutral'?' ('+p.expr[i]+')':'')).join(' and ');
 return `${p.shot} shot, ${p.setting} setting${who?'. '+who:''}${p.bubbles.length?'. '+p.bubbles.map(b=>nm(Math.max(0,b.who))+' says: '+b.text).join(' / '):''}${p.sfx.text?'. SFX: '+p.sfx.text:''}`}
function panelSvg(p,P,K,w,h,uid){
 const rnd=rng(p.id+'s'),ids=p.who.slice(0,2);let g=`<clipPath id="${uid}clip"><rect width="${w}" height="${h}" rx="${K.rad}"/></clipPath><g clip-path="url(#${uid}clip)">`+setting(p,w,h,K,uid,rnd);
 const n=ids.length,anchors=[];
 ids.forEach((id,i)=>{const ch=P.cast.find(c=>c.id===id);if(!ch)return;const o={expr:p.expr[i]||'neutral',look:p.look[i]||'center',pose:p.pose[i]||'none',full:p.shot==='full'||p.shot==='wide'};
  const f=figFor(ch,o,K,uid+i),r=region(f,p.shot),slotW=w/n;
  let s=Math.min(h/r.vh,slotW/(f.w*(n>1?.95:p.shot==='extreme-close'?.7:.88)));if(p.shot==='extreme-close'&&n===1)s=Math.max(s,h/r.vh);
  let cx=n>1?slotW*(i+.5):w*({left:.34,center:.5,right:.66,auto:.5}[p.pos[0]]||.5);
  if(n===1&&p.shot==='wide')cx=w*({left:.3,right:.7}[p.pos[0]]||.5);
  const bot=r.vy+r.vh,tx=cx-f.cx*s,ty=h-bot*s+(f.cat&&p.shot==='full'?0:0);
  g+=`<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(4)})">${f.svg}</g>`;
  anchors[i]={x:cx,y:Math.max(h*.18,ty+(f.top+(f.cat?0:Math.min(0,f.top)))*s+(f.cat?0:140*s))}});
 if(p.prop!=='none')g+=propSvg(p.prop,w,h,K,p.pos[0]==='right'?'left':'right');
 /* bubbles */
 const fsz=Math.max(11,Math.min(30,Math.min(w,h*1.15)*.056*K.fs)),lh=fsz*1.22,cw=fsz*.68,maxc=Math.max(10,Math.floor(Math.min(w*.52,340*K.fs)/cw));let y0=Math.max(10,h*.035);
 const caps=P.style.caps!==false,items=[];if(p.caption)items.push({type:'caption',text:p.caption,who:-1});p.bubbles.forEach(b=>items.push(b));
 items.forEach((b,i)=>{const T=caps?b.text.toUpperCase():b.text,ls=wrap(T,b.type==='caption'?Math.floor(w*.8/cw):maxc),lw=Math.max(...ls.map(l=>l.length));let bw=Math.min(w-16,lw*cw+fsz*1.7),bh=ls.length*lh+fsz*1.05;if(b.type==='thought'||b.type==='shout'){bw=Math.min(w-16,bw*1.22);bh*=1.32}
  const a=anchors[Math.max(0,Math.min(n-1,b.who<0?0:b.who))]||{x:w/2,y:h*.6};let x=b.type==='caption'?8:Math.max(8,Math.min(w-bw-8,a.x-bw*.35+(i%2?bw*.22:0)));
  if(y0+bh>h*.75)y0=Math.max(6,h*.75-bh);
  g+=bubbleSvg(b,x,y0,bw,bh,a.x,Math.max(y0+bh+18,Math.min(h-20,a.y-6)),K,ls,fsz,lh);y0+=bh+fsz*.5});
 if(p.sfx.text){const t=(K.sfx),len=p.sfx.text.length,fs=Math.min(h*.24,w*.8/(Math.max(3,len)*.62)),tw=len*fs*.64,pos=p.sfx.pos,x=Math.max(tw/2+12,Math.min(w-tw/2-12,{br:w*.74,bl:w*.26,tr:w*.74,tl:w*.26,c:w*.5}[pos])),y={br:h*.9,bl:h*.9,tr:h*.28,tl:h*.28,c:h*.55}[pos];
  g+=`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(-8)" font-family="${FONT_X}" font-size="${fs.toFixed(0)}" text-anchor="middle" font-weight="900"><text x="${(fs*.05).toFixed(1)}" y="${(fs*.06).toFixed(1)}" fill="${K.line}" stroke="${K.line}" stroke-width="${fs*.16}" stroke-linejoin="round">${esc(p.sfx.text.toUpperCase())}</text><text fill="${t}" stroke="${K.line}" stroke-width="${fs*.06}" paint-order="stroke" stroke-linejoin="round">${esc(p.sfx.text.toUpperCase())}</text></g>`}
 g+='</g>';
 if(K.border!=='none')g+=`<rect width="${w}" height="${h}" rx="${K.rad}" fill="none" stroke="${K.line}" stroke-width="${K.sw*1.25}"/>`;
 return g;
}

function pageSvg(P,pi,opt){
 opt=opt||{};const K=kit(P.style),page=P.pages[pi],fmt=P.style.fmt,[pw,ph0]=PAGE_W[fmt]||PAGE_W.comic,B=boardRects(P,page,pw,ph0),ph=B.h,uid=(opt.uid||'p')+pi;
 let s=`<rect width="${pw}" height="${ph}" fill="${K.paper}"/>`;
 B.rects.forEach((r,i)=>{const p=page.panels[i];if(!p)return;
  const label=`Panel ${i+1}. ${esc(panelAlt(p,P))}`;
  const ui=!!opt.ui;
  /* grid coordinates, so arrow keys can walk the page the way it is drawn */
  const ys=[...new Set(B.rects.map(q=>Math.round(q.y)))].sort((a,b)=>a-b);
  const row=ys.indexOf(Math.round(r.y)), col=B.rects.filter(q=>Math.abs(q.y-r.y)<1).indexOf(r);
  if(ui){
   /* the drawing (and all its lettering) is decorative to assistive tech; a transparent
      overlay on top is the real control, so its name can describe the panel without the
      visible SFX and captions contradicting it */
   s+=`<g data-pid="${p.id}" transform="translate(${r.x.toFixed(1)} ${r.y.toFixed(1)})"><g aria-hidden="true">${panelSvg(p,P,K,r.w,r.h,uid+'q'+i)}`;
  }else{
   s+=`<g data-pid="${p.id}" transform="translate(${r.x.toFixed(1)} ${r.y.toFixed(1)})" role="img" aria-label="${label}">${panelSvg(p,P,K,r.w,r.h,uid+'q'+i)}`;
  }
  /* selection: a solid ring sitting outside the artwork, so it never fights the linework */
  if(opt.sel===p.id)s+=`<rect class="selring" x="-6" y="-6" width="${r.w+12}" height="${r.h+12}" rx="4" fill="none" stroke="#FF3B7A" stroke-width="5"/>`;
  if(opt.nums)s+=`<g><circle cx="26" cy="26" r="17" fill="${K.line}"/><text x="26" y="32" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="700" fill="#fff">${i+1}</text></g>`;
  /* close the decorative layer, then place the control beside it */
  if(ui)s+=`</g><rect class="pnl-hit" data-pid="${p.id}" data-row="${row}" data-col="${col}" role="button" tabindex="0" aria-pressed="${opt.sel===p.id}" aria-label="${label}" width="${r.w}" height="${r.h}" fill="transparent"/>`;
  s+='</g>';
  if(fmt==='storyboard'){const ty=r.y+r.h+22,nmOf=i=>{const c=P.cast.find(c=>c.id===p.who[i]);return c?c.name:'?'},extra=[p.note,p.bubbles.map(b=>nmOf(b.who)+': '+b.text).join(' / ')].filter(Boolean).join('  ·  '),L=[`${p.shot.toUpperCase()} · ${p.setting}`].concat(extra?wrap(extra,Math.floor(r.w/8)).slice(0,3):[]);
   s+=`<text font-family="Helvetica,Arial,sans-serif" font-size="15" fill="${K.line}" font-weight="700"><tspan x="${r.x}" y="${ty}">${i+1}. ${esc(L[0])}</tspan>${L.slice(1).map((l,k)=>`<tspan x="${r.x}" y="${ty+22*(k+1)}" font-weight="400">${esc(l)}</tspan>`).join('')}</text>`}});
 if(fmt==='storyboard')s+=`<text x="${K.mar}" y="${K.mar+24}" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="800" fill="${K.line}">${esc(P.title)}</text><text x="${pw-K.mar}" y="${K.mar+24}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="16" fill="${K.line}">Sheet ${pi+1} of ${P.pages.length}</text>`;
 else if(fmt!=='webtoon')s+=`<text x="${pw/2}" y="${ph-Math.max(10,K.mar*.35)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="16" fill="${K.line}">${pi+1}</text>`;
 if(K.grain&&!opt.nograin)s+=`<filter id="${uid}gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18"/></filter><rect width="${pw}" height="${ph}" filter="url(#${uid}gr)" opacity=".16" style="pointer-events:none"/>`;
 s=fixDup(s);return {w:pw,h:ph,body:s,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${ph}" width="${pw}" height="${ph}">${s}</svg>`};
}

export { pageSvg, panelAlt, panelSvg };

