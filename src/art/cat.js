import { pick } from '../core/util.js';
import { FUR } from '../core/palette.js';
import { cres, fixDup } from '../core/geom.js';

/* art/cat.js: generated from the single-file build, code unchanged */




function catSvg(a,K,uid){ // a:{fur,mood,seed}
 const S=`stroke="${K.line}" stroke-width="${K.sw}" stroke-linejoin="round" stroke-linecap="round"`,fc=K.c(pick(FUR,a.fur,FUR.white)),sd=K.shOn?K.shadow:fc,ey=K.c('#F7E31B'),gr=K.c('#8FD43C'),pk=K.c('#F27AA9'),mood=a.mood||'calm',u=uid+'c';
 const BODY='M28 222C16 150 66 100 150 100C236 100 286 150 272 222Z',HEAD='M60 96C52 40 98 18 150 18C202 18 248 40 240 96C234 138 196 156 150 156C104 156 66 138 60 96Z';
 let s=`<defs><clipPath id="${u}b"><path d="${BODY}"/></clipPath><clipPath id="${u}h"><path d="${HEAD}"/></clipPath></defs>`;
 s+=`<path d="M240 205C292 205 306 150 282 98" fill="none" stroke="${K.line}" stroke-width="${34+K.sw*2}" stroke-linecap="round"/><path d="M240 205C292 205 306 150 282 98" fill="none" stroke="${fc}" stroke-width="34" stroke-linecap="round"/>`;
 s+=`<path d="${BODY}" fill="${fc}" ${S}/><path d="M205 90L300 90L300 230L228 230C252 190 242 140 205 90Z" fill="${sd}" clip-path="url(#${u}b)"/>`;
 s+=`<path d="M68 56L74 -6L122 24Z" fill="${fc}" ${S}/><path d="M232 56L226 -6L178 24Z" fill="${fc}" ${S}/><path d="M80 44L83 12L106 28Z" fill="${pk}"/><path d="M220 44L217 12L194 28Z" fill="${pk}"/>`;
 s+=`<path d="${HEAD}" fill="${fc}" ${S}/><path d="M200 10L260 10L260 170L214 170C246 130 240 70 200 10Z" fill="${sd}" clip-path="url(#${u}h)"/>`;
 if(a.perch!==false)s+=`<ellipse cx="88" cy="212" rx="26" ry="20" fill="${fc}" ${S}/><ellipse cx="142" cy="214" rx="26" ry="20" fill="${fc}" ${S}/><path d="M80 224v-9M92 224v-9M134 226v-9M146 226v-9" ${S} fill="none" stroke-width="${K.sw*.7}"/>`;
 for(const cx of [110,190]){const r=mood==='shock'?33:30;s+=`<circle cx="${cx}" cy="84" r="${r}" fill="${ey}"/>${cres(cx,84,r,gr)}`;
  if(mood==='shock')s+=`<ellipse cx="${cx}" cy="86" rx="6" ry="8" fill="${K.line}"/>`;else s+=`<ellipse cx="${cx}" cy="86" rx="6" ry="15" fill="${K.line}"/>`;
  if(mood==='sleepy'||mood==='smug'){const L=mood==='sleepy'?.62:.36;s+=`<clipPath id="${u}e${cx}"><circle cx="${cx}" cy="84" r="${r}"/></clipPath><g clip-path="url(#${u}e${cx})"><rect x="${cx-r}" y="${84-r}" width="${2*r}" height="${2*r*L}" fill="${fc}"/><line x1="${cx-r}" x2="${cx+r}" y1="${84-r+2*r*L}" y2="${84-r+2*r*L}" ${S}/></g>`}
  s+=`<circle cx="${cx}" cy="84" r="${r}" fill="none" ${S}/>`}
 s+=`<path d="M142 108L158 108L150 118Z" fill="${pk}" ${S}/>`;
 if(mood==='shock')s+=`<path d="M128 126Q150 118 172 126Q170 146 150 148Q130 146 128 126Z" fill="${K.line}" ${S}/><path d="M136 138C138 166 170 168 164 140Z" fill="${K.c('#EF4B6A')}" ${S}/>`;
 else if(mood==='smug')s+=`<path d="M150 118V124M150 124C140 134 128 130 124 122M150 124C162 130 176 124 180 114" fill="none" ${S}/>`;
 else s+=`<path d="M150 118V125M150 125C142 133 132 131 128 125M150 125C158 133 168 131 172 125" fill="none" ${S}/>`;
 s+=`<path d="M96 112L36 102M96 120L40 124M98 128L50 146M204 112L264 102M204 120L260 124M202 128L250 146" fill="none" stroke="${K.line}" stroke-width="${Math.max(1.6,K.sw*.5)}" stroke-linecap="round"/>`;
 return fixDup(s);
}

export { catSvg };

