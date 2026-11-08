import { mix } from '../core/util.js';

/* art/scenery.js: generated from the single-file build, code unchanged */


function pattern(K,w,h,uid,color){
 if(K.pattern==='none')return '';const id=uid+'pt';let s='';
 if(K.pattern==='dots')s=`<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="13" cy="13" r="4.5" fill="${color}"/></pattern><rect width="${w}" height="${h}" fill="url(#${id})" opacity=".35"/>`;
 else if(K.pattern==='stripes')s=`<pattern id="${id}" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="14" height="34" fill="${color}"/></pattern><rect width="${w}" height="${h}" fill="url(#${id})" opacity=".18"/>`;
 else{let d='';const cx=w*.5,cy=h*.4,R=Math.hypot(w,h);for(let i=0;i<28;i++){const a=i/28*Math.PI*2,b=a+.1;d+=`M${cx} ${cy}L${(cx+R*Math.cos(a)).toFixed(0)} ${(cy+R*Math.sin(a)).toFixed(0)}L${(cx+R*Math.cos(b)).toFixed(0)} ${(cy+R*Math.sin(b)).toFixed(0)}Z`}s=`<path d="${d}" fill="${color}" opacity=".22"/>`}
 return s;
}
function setting(p,w,h,K,uid,rnd){
 const T=K.tones,tone=K.c(T[p.tone]||T.main),dk=mix(tone,'#000000',.22),lt=mix(tone,'#ffffff',.5),S=`stroke="${K.line}" stroke-width="${K.sw}" stroke-linejoin="round"`,paper=K.paper;
 const warm=K.c(T.warm),cool=K.c(T.cool),soft=K.c(T.soft),night=K.c(T.night);
 let s=`<rect width="${w}" height="${h}" fill="${tone}"/>`;const set=p.setting,fl=h*.78;
 if(set==='plain')s+=pattern(K,w,h,uid,dk);
 else if(set==='room'){s+=`<rect y="${fl}" width="${w}" height="${h-fl}" fill="${dk}" ${S}/><rect x="${w*.62}" y="${h*.12}" width="${w*.26}" height="${h*.3}" fill="${cool}" ${S}/><path d="M${w*.62} ${h*.27}H${w*.88}M${w*.75} ${h*.12}V${h*.42}" ${S} fill="none"/><rect x="${w*.08}" y="${h*.16}" width="${w*.2}" height="${h*.2}" fill="${warm}" ${S}/><circle cx="${w*.18}" cy="${h*.26}" r="${h*.05}" fill="${soft}" ${S}/>`}
 else if(set==='window'){s+=`<rect x="${w*.14}" y="${h*.1}" width="${w*.72}" height="${h*.6}" fill="${cool}" ${S}/><path d="M${w*.5} ${h*.1}V${h*.7}M${w*.14} ${h*.4}H${w*.86}" ${S} fill="none"/><path d="M${w*.14} ${h*.1}Q${w*.08} ${h*.4} ${w*.1} ${h*.8}L${w*.22} ${h*.8}Q${w*.2} ${h*.4} ${w*.26} ${h*.1}Z" fill="${soft}" ${S}/><circle cx="${w*.7}" cy="${h*.24}" r="${h*.07}" fill="${warm}" ${S}/><rect y="${fl}" width="${w}" height="${h-fl}" fill="${dk}" ${S}/>`}
 else if(set==='street'||set==='city'){const far=set==='city';let x=-10;s=`<rect width="${w}" height="${h}" fill="${far?night:cool}"/>`;if(far)for(let i=0;i<18;i++)s+=`<circle cx="${rnd()*w}" cy="${rnd()*h*.4}" r="${1+rnd()*2}" fill="${paper}"/>`;
  while(x<w){const bw=w*(.12+rnd()*.14),bh=h*(far?.25+rnd()*.45:.3+rnd()*.3),c=[tone,dk,soft,warm][Math.floor(rnd()*4)];s+=`<rect x="${x}" y="${fl-bh}" width="${bw}" height="${bh}" fill="${c}" ${S}/>`;const cols=Math.max(1,Math.floor(bw/38)),rows=Math.floor(bh/52);for(let r=0;r<rows;r++)for(let q=0;q<cols;q++)s+=`<rect x="${x+14+q*38}" y="${fl-bh+14+r*52}" width="20" height="28" fill="${rnd()>.45?warm:paper}" opacity=".85"/>`;x+=bw+4}
  s+=`<rect y="${fl}" width="${w}" height="${h-fl}" fill="${far?mix(night,'#000000',.2):dk}" ${S}/><path d="M0 ${fl+(h-fl)*.5}H${w}" stroke="${paper}" stroke-width="${K.sw}" stroke-dasharray="40 30" fill="none"/>`}
 else if(set==='kitchen'){let t='';for(let x=0;x<w;x+=70)t+=`M${x} 0V${h*.6}`;for(let y=0;y<h*.6;y+=70)t+=`M0 ${y}H${w}`;s+=`<path d="${t}" stroke="${lt}" stroke-width="2" fill="none"/><rect y="${h*.62}" width="${w}" height="${h*.38}" fill="${dk}" ${S}/><rect x="${w*.05}" y="${h*.1}" width="${w*.3}" height="${h*.26}" fill="${warm}" ${S}/><rect x="${w*.4}" y="${h*.1}" width="${w*.3}" height="${h*.26}" fill="${warm}" ${S}/><circle cx="${w*.3}" cy="${h*.23}" r="6" fill="${K.line}"/><circle cx="${w*.45}" cy="${h*.23}" r="6" fill="${K.line}"/>`}
 else if(set==='classroom'){s+=`<rect x="${w*.1}" y="${h*.08}" width="${w*.8}" height="${h*.42}" fill="${mix(night,tone,.2)}" ${S} stroke-width="${K.sw*2}"/><path d="M${w*.18} ${h*.2}Q${w*.3} ${h*.12} ${w*.42} ${h*.22}T${w*.62} ${h*.22}" stroke="${paper}" stroke-width="5" fill="none" stroke-linecap="round"/><rect y="${fl}" width="${w}" height="${h-fl}" fill="${dk}" ${S}/>`}
 else if(set==='sky'){s=`<rect width="${w}" height="${h}" fill="${cool}"/>`;for(let i=0;i<4;i++){const cx=w*(.1+i*.28+rnd()*.1),cy=h*(.12+rnd()*.5),r=h*.07;s+=`<g fill="${paper}" ${S}><circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx+r*1.1}" cy="${cy-r*.3}" r="${r*1.2}"/><circle cx="${cx+r*2.2}" cy="${cy}" r="${r*.9}"/></g><rect x="${cx-r*1.2}" y="${cy+r*.2}" width="${r*4.6}" height="${r*.9}" fill="${paper}"/>`}}
 else if(set==='beach'){s=`<rect width="${w}" height="${h}" fill="${cool}"/><circle cx="${w*.78}" cy="${h*.2}" r="${h*.09}" fill="${warm}" ${S}/><rect y="${h*.5}" width="${w}" height="${h*.2}" fill="${mix(cool,'#000000',.2)}" ${S}/><path d="M0 ${h*.58}Q${w*.1} ${h*.54} ${w*.2} ${h*.58}T${w*.4} ${h*.58}T${w*.6} ${h*.58}T${w*.8} ${h*.58}T${w} ${h*.58}" stroke="${paper}" stroke-width="4" fill="none"/><rect y="${h*.7}" width="${w}" height="${h*.3}" fill="${warm}" ${S}/>`}
 else if(set==='forest'){s=`<rect width="${w}" height="${h}" fill="${mix(tone,'#ffffff',.25)}"/>`;for(let i=0;i<7;i++){const x=w*(i/6)+rnd()*30-15,th=h*(.55+rnd()*.3),c=[dk,tone,mix(tone,'#000000',.38)][i%3];s+=`<rect x="${x-14}" y="${h-th}" width="28" height="${th}" fill="${K.c('#6B4226')}" ${S}/><circle cx="${x}" cy="${h-th}" r="${h*.13}" fill="${c}" ${S}/><circle cx="${x-h*.09}" cy="${h-th+h*.06}" r="${h*.09}" fill="${c}" ${S}/><circle cx="${x+h*.09}" cy="${h-th+h*.06}" r="${h*.09}" fill="${c}" ${S}/>`}s+=`<rect y="${fl+h*.1}" width="${w}" height="${h}" fill="${dk}" ${S}/>`}
 else if(set==='space'){s=`<rect width="${w}" height="${h}" fill="${night}"/>`;for(let i=0;i<40;i++)s+=`<circle cx="${rnd()*w}" cy="${rnd()*h}" r="${.8+rnd()*2.4}" fill="${paper}"/>`;s+=`<circle cx="${w*.8}" cy="${h*.3}" r="${h*.16}" fill="${soft}" ${S}/><ellipse cx="${w*.8}" cy="${h*.3}" rx="${h*.26}" ry="${h*.05}" fill="none" ${S} stroke-width="${K.sw*1.4}" transform="rotate(-18 ${w*.8} ${h*.3})"/>`}
 return s;
}

export { pattern, setting };

