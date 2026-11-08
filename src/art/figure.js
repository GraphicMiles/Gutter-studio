import { mix, pick, rng } from '../core/util.js';
import { HAIRC, OUTFIT, SKIN } from '../core/palette.js';
import { cres, fixDup, scallop } from '../core/geom.js';
import { catSvg } from './cat.js';

/* art/figure.js: generated from the single-file build, code unchanged */





const HT={curly:100,afro:62,flattop:72,buzz:136,bob:118,long:118,bun:46,braids:120,headwrap:78,hijab:110,bald:135};
const FACE='M98 235C96 175 145 135 210 135C275 135 324 175 322 235C324 300 306 360 262 390C230 412 178 412 148 392C112 362 100 300 98 235Z';
const HAIRP={
 curly:[[[98,262],[92,200],[110,150],[160,112],[215,102],[270,112],[318,150],[332,205],[324,250],[304,198],[256,184],[210,190],[164,184],[122,198],[100,250]],22],
 afro:[[[72,310],[52,230],[70,148],[130,86],[210,64],[290,86],[352,148],[370,230],[350,310],[326,244],[296,186],[210,176],[126,186],[96,244]],34],
 flattop:[[[82,300],[70,126],[112,80],[210,72],[310,80],[352,126],[340,300],[322,236],[300,184],[210,180],[120,184],[98,236]],28],
 bun:[[[98,262],[92,200],[112,152],[160,118],[215,108],[270,118],[318,152],[330,205],[324,250],[304,198],[256,184],[210,190],[164,184],[122,198],[100,250]],20]
};
function figure(ch,o,K,uid){
 const S=`stroke="${K.line}" stroke-width="${K.sw}" stroke-linejoin="round" stroke-linecap="round"`,sw=K.sw;
 const skin=K.c(pick(SKIN,ch.skin,SKIN.salmon)),hairC=K.c(pick(HAIRC,ch.hairColor,HAIRC.black)),outC=K.c(pick(OUTFIT,ch.outfit,OUTFIT.yellow)),hatC=K.c(pick(OUTFIT,ch.hatColor,OUTFIT.red)),pants=K.c(mix(outC,'#1A1B19',.6));
 const sh=K.shOn?K.shadow:null,ex=o.expr||'neutral',rnd=rng(String(ch.id)),u=uid+'f',full=!!o.full,hair=ch.hair;
 const shade=(clip,d)=>sh?`<path d="${d}" fill="${sh}" clip-path="url(#${u}${clip})"/>`:'';
 const TORSO=full?'M40 520C50 478 110 456 160 448L280 448C330 456 390 478 400 520L372 770L68 770Z':'M20 620C24 500 90 462 160 448L280 448C350 462 416 500 420 620Z';
 const NECK='M165 372L165 458C200 484 242 484 275 458L275 372Z';
 let s=`<defs><clipPath id="${u}f"><path d="${FACE}"/></clipPath><clipPath id="${u}n"><path d="${NECK}"/></clipPath><clipPath id="${u}t"><path d="${TORSO}"/></clipPath></defs>`;
 /* back layer */
 if(ch.collar==='hoodie')s+=`<path d="M96 470C70 380 120 326 210 326C300 326 350 380 324 470Z" fill="${mix(outC,'#000000',.18)}" ${S}/>`;
 if(hair==='hijab')s+=`<path d="M64 470C34 260 90 112 210 104C330 112 386 260 356 470Z" fill="${hairC}" ${S}/>`;
 if(hair==='bun'){const r=rnd;s+=scallop([[170,60],[210,36],[250,60],[250,100],[210,112],[170,100]],20,hairC,K,r,true)}
 /* body */
 if(full){const arm=(d,x,y)=>`<path d="${d}" fill="none" stroke="${K.line}" stroke-width="${54+sw*2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${outC}" stroke-width="54" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="28" fill="${skin}" ${S}/>`;
  s+=`<path d="M84 760L356 760L350 1068L236 1068L222 905L218 905L204 1068L90 1068Z" fill="${pants}" ${S}/><ellipse cx="148" cy="1086" rx="70" ry="26" fill="${K.paper}" ${S}/><ellipse cx="292" cy="1086" rx="70" ry="26" fill="${K.paper}" ${S}/>`;
  s+=arm('M64 500C40 580 36 660 44 730',44,752)+(o.pose==='wave'?arm('M376 500C430 440 446 370 436 300',436,276):arm('M376 500C400 580 404 660 396 730',396,752));}
 s+=`<path d="${TORSO}" fill="${outC}" ${S}/>`+shade('t','M290 440L440 440L440 1100L300 1100C330 900 330 600 290 440Z');
 /* neck + collar */
 s+=`<path d="${NECK}" fill="${skin}" ${S}/>`+shade('n','M232 360L320 360L320 500L222 500Z')+`<path d="M170 410C200 446 250 440 272 404C246 424 206 424 170 410Z" fill="${K.line}"/>`;
 const co=ch.collar||'turtleneck';
 if(co==='turtleneck'){s+=`<path d="M126 432C170 466 250 466 294 432L300 488C250 516 170 516 120 488Z" fill="${outC}" ${S}/>`;let r='';for(let i=0;i<9;i++){const t=(i+.5)/9,x=126+168*t+(t-.5)*8,y=432+34*Math.sin(Math.PI*t);r+=`M${x.toFixed(1)} ${(y+7).toFixed(1)}L${(x+(t-.5)*4).toFixed(1)} ${(y+44).toFixed(1)}`}s+=`<path d="${r}" ${S} fill="none" stroke-width="${sw*.7}"/>`+(sh?`<path d="M250 456C270 452 286 444 294 432L300 488C290 494 276 500 262 504Z" fill="${sh}" opacity=".5"/>`:'')}
 else if(co==='shirt'){s+=`<path d="M160 440L214 506L146 500Z" fill="${K.paper}" ${S}/><path d="M280 440L226 506L294 500Z" fill="${K.paper}" ${S}/>`}
 else{s+=`<path d="M150 446C185 496 255 496 290 446Z" fill="${skin}" ${S}/>`;if(co==='hoodie')s+=`<path d="M190 480L184 552M236 480L242 552" ${S} fill="none"/><circle cx="184" cy="556" r="6" fill="${K.paper}" ${S}/><circle cx="242" cy="556" r="6" fill="${K.paper}" ${S}/>`}
 /* ear + face */
 if(hair!=='hijab')s+=`<ellipse cx="326" cy="304" rx="27" ry="40" fill="${skin}" ${S}/><path d="M322 280C338 284 342 318 322 330C330 316 330 296 322 280Z" fill="${sh||skin}" ${S} stroke-width="${sw*.7}"/>`;
 s+=`<path d="${FACE}" fill="${skin}" ${S}/>`+shade('f','M262 120C238 200 286 300 240 430L360 430L360 120Z');
 /* nose */
 const nz=ch.nose||'plane';
 if(nz==='plane')s+=`<path d="M200 258L228 246L254 318L232 328Z" fill="${K.c(K.nose)}" ${S}/><path d="M232 328L254 318L250 352Z" fill="${sh||skin}" ${S}/>`;
 else if(nz==='round')s+=`<ellipse cx="226" cy="316" rx="26" ry="22" fill="${skin}" ${S}/><path d="M236 300C250 310 250 326 236 336" fill="none" ${S} stroke-width="${sw*.7}"/>`;
 else s+=`<path d="M214 280L238 330L212 336" fill="none" ${S}/>`;
 /* eyes */
 const big=ex==='shock'||ex==='scream',r=big?45:40,py=ex==='thinking'&&o.look==='center'?'up':o.look,LK={center:[0,0],left:[-15,0],right:[15,0],up:[0,-15],down:[0,14],camera:[3,3]}[py]||[0,0],pr=big?6:ex==='joy'?9:8,lid={sleepy:.58,deadpan:.4,smug:.3,sad:.18}[ex]||0;
 [[145,0],[275,1]].forEach(([cx,i])=>{const cy=268;
  s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${K.eyeW}"/>`+(sh?cres(cx,cy,r,sh):'')+`<circle cx="${cx+LK[0]}" cy="${cy+LK[1]}" r="${pr}" fill="${K.line}"/>`;
  if(lid)s+=`<clipPath id="${u}e${i}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><g clip-path="url(#${u}e${i})"><rect x="${cx-r}" y="${cy-r}" width="${2*r}" height="${2*r*lid}" fill="${skin}"/><line x1="${cx-r}" x2="${cx+r}" y1="${cy-r+2*r*lid}" y2="${cy-r+2*r*lid}" ${S}/></g>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S}/>`;
  let t='';for(const a of [-125,-90,-55,55,90,125]){const q=a*Math.PI/180;t+=`M${(cx+(r+5)*Math.cos(q)).toFixed(1)} ${(cy+(r+5)*Math.sin(q)).toFixed(1)}L${(cx+(r+15)*Math.cos(q)).toFixed(1)} ${(cy+(r+15)*Math.sin(q)).toFixed(1)}`}
  const o2=i?-1:1;t+=`M${cx-o2*(r+5)} ${cy}L${cx-o2*(r+15)} ${cy}`;
  s+=`<path d="${t}" ${S} fill="none" stroke-width="${sw*.7}"/>`;
  const by=cy-r-24,B={neutral:[0,0],shock:[-12,-12],worry:[6,-6],joy:[-8,-8],angry:[-4,10],deadpan:[5,5],smug:[i?0:-12,i?0:-12],sad:[7,-7],sleepy:[3,1],scream:[-14,-14],thinking:[0,-6]}[ex]||[0,0];
  const ya=by+(i?B[1]:B[0]),yb=by+(i?B[0]:B[1]);
  s+=`<path d="M${cx-28} ${ya}L${cx+28} ${yb}" ${S} stroke-width="${sw*1.3}" fill="none"/>`});
 /* mouth */
 const M={neutral:`<path d="M192 364L240 364" ${S} fill="none"/>`,thinking:`<path d="M196 368Q216 360 238 368" ${S} fill="none"/>`,deadpan:`<path d="M198 366L236 366" ${S} fill="none"/>`,worry:`<path d="M186 372Q198 360 210 372T236 372" ${S} fill="none"/>`,sad:`<path d="M190 374Q216 354 242 374" ${S} fill="none"/>`,smug:`<path d="M192 366Q222 368 246 352" ${S} fill="none"/>`,
  sleepy:`<ellipse cx="216" cy="366" rx="11" ry="7" fill="${K.line}" ${S}/>`,
  shock:`<path d="M186 352Q216 338 246 352L238 384Q216 392 194 384Z" fill="${K.line}" ${S}/><path d="M200 348L200 358M214 345L214 356M228 347L228 358" stroke="${K.eyeW}" stroke-width="7" stroke-linecap="butt"/><path d="M200 384Q216 372 232 384Q216 390 200 384Z" fill="${K.c('#EF5B45')}"/>`,
  scream:`<ellipse cx="216" cy="368" rx="30" ry="26" fill="${K.line}" ${S}/><path d="M190 378Q216 360 242 378Q216 396 190 378Z" fill="${K.c('#EF5B45')}"/>`,
  joy:`<path d="M176 352Q216 408 258 352Z" fill="${K.line}" ${S}/><path d="M186 354L246 354" stroke="${K.eyeW}" stroke-width="8"/><path d="M198 376Q216 366 236 376Q216 390 198 376Z" fill="${K.c('#EF5B45')}"/>`,
  angry:`<path d="M186 366L246 362L242 384L190 386Z" fill="${K.eyeW}" ${S}/><path d="M204 365L204 385M218 364L218 385M232 363L232 384" ${S} stroke-width="${sw*.6}" fill="none"/>`};
 s+=M[ex]||M.neutral;
 /* glasses */
 const g=ch.glasses;
 if(g==='round')s+=`<g fill="${K.paper}" fill-opacity=".18" ${S} stroke-width="${sw*1.2}"><circle cx="145" cy="268" r="${r+12}"/><circle cx="275" cy="268" r="${r+12}"/></g><path d="M${145+r+12} 262Q210 246 ${275-r-12} 262M${275+r+12} 266L334 276" ${S} fill="none" stroke-width="${sw*1.2}"/>`;
 else if(g==='square')s+=`<g fill="${K.paper}" fill-opacity=".18" ${S} stroke-width="${sw*1.2}"><rect x="90" y="222" width="110" height="90" rx="14"/><rect x="220" y="222" width="110" height="90" rx="14"/></g><path d="M200 252L220 252M330 256L338 266" ${S} fill="none" stroke-width="${sw*1.2}"/>`;
 else if(g==='shades')s+=`<g fill="${K.line}" ${S}><rect x="90" y="228" width="112" height="76" rx="26"/><rect x="218" y="228" width="112" height="76" rx="26"/></g><path d="M202 250L218 250" ${S} fill="none"/><path d="M106 248L130 244M236 248L260 244" stroke="${K.paper}" stroke-width="7" stroke-linecap="round" opacity=".7"/>`;
 /* hair front */
 if(HAIRP[hair]){const [P,rr]=HAIRP[hair];s+=scallop(P,rr,hairC,K,rnd,true)}
 else if(hair==='buzz')s+=`<path d="M100 248C96 176 145 138 210 136C275 138 324 176 320 248C300 218 260 208 210 210C160 208 120 218 100 248Z" fill="${hairC}" ${S}/>`;
 else if(hair==='bob')s+=`<path d="M92 340C78 200 120 120 210 118C300 120 342 200 330 340L302 340C302 270 298 238 280 224C240 206 180 206 140 224C122 238 118 270 118 340Z" fill="${hairC}" ${S}/>`;
 else if(hair==='long')s+=`<path d="M88 540C66 300 90 140 210 120C330 140 354 300 332 540L298 540C306 400 300 262 282 226C240 206 180 206 138 226C120 262 114 400 122 540Z" fill="${hairC}" ${S}/>`;
 else if(hair==='braids'){s+=`<path d="M100 248C96 176 145 138 210 136C275 138 324 176 320 248C300 218 260 208 210 210C160 208 120 218 100 248Z" fill="${hairC}" ${S}/><path d="M150 150C140 180 138 200 140 216M190 142C186 170 184 196 184 214M232 142C232 170 234 196 238 214M272 150C280 176 284 198 286 216" fill="none" stroke="${mix(hairC,'#ffffff',.2)}" stroke-width="3"/>`;
  for(const [bx,by,dx] of [[112,270,-14],[96,300,-10],[318,280,12]]){let c='';for(let k=0;k<9;k++){c+=`<ellipse cx="${bx+dx*k*.35}" cy="${by+k*26}" rx="15" ry="15" fill="${hairC}" ${S} stroke-width="${sw*.8}"/>`}s+=c}}
 else if(hair==='headwrap')s+=`<path d="M92 248C66 180 108 92 210 80C312 92 354 180 328 248C302 218 262 206 210 208C158 206 118 218 92 248Z" fill="${hairC}" ${S}/><path d="M104 200C150 150 250 140 316 196M120 168C170 126 252 120 308 164M150 130C190 106 240 104 278 128" fill="none" ${S} stroke-width="${sw*.8}"/><path d="M280 96C318 60 372 70 366 110C346 128 306 124 280 96Z" fill="${hairC}" ${S}/>`;
 else if(hair==='hijab')s+=`<path d="M98 250C96 176 145 140 210 138C275 140 324 176 322 250C320 214 280 196 210 196C140 196 100 214 98 250Z" fill="${hairC}" ${S}/><path d="M98 250C90 330 108 410 150 450L116 486C62 430 56 330 98 250Z" fill="${hairC}" ${S}/><path d="M322 250C330 330 312 410 270 450L304 486C358 430 366 330 322 250Z" fill="${hairC}" ${S}/>`;
 /* hat */
 const ht=ch.hat;
 if(ht==='cap')s+=`<path d="M98 222C96 140 150 104 212 104C275 104 324 140 324 222C290 198 240 190 210 190C170 190 128 198 98 222Z" fill="${hatC}" ${S}/><path d="M204 196C262 190 334 200 358 226C334 236 270 228 204 216Z" fill="${hatC}" ${S}/>`;
 else if(ht==='beanie'){s+=`<path d="M96 222C90 128 150 98 212 98C275 98 332 128 328 222Z" fill="${hatC}" ${S}/><path d="M92 206L332 206L334 240L90 240Z" fill="${mix(hatC,'#000000',.12)}" ${S}/><path d="M120 208V238M150 208V238M180 208V238M210 208V238M240 208V238M270 208V238M300 208V238" ${S} stroke-width="${sw*.6}"/><circle cx="212" cy="92" r="26" fill="${hatC}" ${S}/>`}
 else if(ht==='headband')s+=`<path d="M98 224C140 204 282 204 322 224L322 246C282 228 140 228 98 246Z" fill="${hatC}" ${S}/>`;
 /* hands */
 const hand=(cx,cy,rad)=>`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${skin}" ${S}/>`;
 const sleeve=d=>`<path d="${d}" fill="none" stroke="${K.line}" stroke-width="${72+sw*2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${outC}" stroke-width="72" stroke-linecap="round"/>`;
 const fing=(x,y0,y1,w)=>`<path d="M${x} ${y0}L${x} ${y1}" stroke="${K.line}" stroke-width="${w+sw*2}" stroke-linecap="round"/><path d="M${x} ${y0}L${x} ${y1}" stroke="${skin}" stroke-width="${w}" stroke-linecap="round"/>`;
 if(!full){
  if(o.pose==='chin')s+=sleeve('M20 640C30 560 56 510 76 474')+`<path d="M52 480C34 436 52 384 96 378C134 374 160 396 152 430L148 482Z" fill="${skin}" ${S}/><path d="M72 414L132 408M70 436L134 432M72 458L136 456" ${S} fill="none" stroke-width="${sw*.7}"/>`+fing(104,392,318,34);
  else if(o.pose==='wave')s+=sleeve('M396 640C420 560 424 480 414 410')+hand(414,372,46)+[-30,-10,10,30].map((d,k)=>fing(414+d,340,282+Math.abs(d)*.8,20)).join('');
  else if(o.pose==='handsup')s+=sleeve('M10 640L34 520')+sleeve('M430 640L406 520')+hand(36,456,42)+hand(404,456,42)+[-16,0,16].map(d=>fing(36+d,430,396,16)+fing(404+d,430,396,16)).join('');
  else if(o.pose==='facepalm')s+=sleeve('M30 640C14 540 70 440 118 380')+`<ellipse cx="148" cy="300" rx="64" ry="76" fill="${skin}" ${S}/>`+[-36,-12,12,36].map(d=>fing(148+d,250,196+Math.abs(d)*.5,24)).join('');}
 /* companion cat on head */
 let cat='';
 if(ch.cat==='head'){const mood=({shock:'shock',scream:'shock',angry:'shock',sleepy:'sleepy',smug:'smug'})[ex]||ch.catMood||'calm';cat=`<g transform="translate(210 ${HT[hair]+34}) scale(.95) translate(-150 -225)">${catSvg({fur:ch.catFur,mood},K,u)}</g>`;s+=cat}
 const top=ch.cat==='head'?HT[hair]+34-225*.95+(-6*.95):HT[hair];
 return {svg:fixDup(s),top:Math.min(top,HT[hair]),bottom:full?1112:620,w:full?450:440};
}

export { FACE, HAIRP, HT, figure };

