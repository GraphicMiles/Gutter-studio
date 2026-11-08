import { esc } from '../core/util.js';
import { FONT_L } from '../core/palette.js';

/* art/bubbles.js: generated from the single-file build, code unchanged */



/* text wrap */
function wrap(t,max){const out=[];for(const para of String(t).split('\n')){let line='';for(const wd of para.split(/\s+/)){if(!wd)continue;if((line+' '+wd).trim().length>max&&line){out.push(line);line=wd}else line=(line+' '+wd).trim()}out.push(line)}return out.length?out:['']}
function bubbleSvg(b,x,y,bw,bh,tipX,tipY,K,lines,fs,lh){
 const S=`stroke="${K.line}" stroke-width="${K.sw*.8}" stroke-linejoin="round"`,tcol=K.line,rx=K.bub==='boxy'?6:Math.min(bh/2,34);let g='';
 const txt=(cx,cy0,col)=>`<text text-anchor="middle" font-family="${FONT_L}" font-size="${fs}" font-weight="700" fill="${col||tcol}">`+lines.map((l,i)=>`<tspan x="${cx}" y="${(cy0+i*lh).toFixed(1)}">${esc(l)}</tspan>`).join('')+'</text>';
 const cx=x+bw/2,ty=y+(bh-lines.length*lh)/2+fs*.85;
 if(b.type==='caption'){return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${K.cap}" stroke="${K.line}" stroke-width="${K.sw*.8}"/>${txt(cx,ty)}`}
 const tipAt=Math.min(x+bw-bh*.45,Math.max(x+bh*.45,tipX)),tail=`M${tipAt-14} ${y+bh-2}L${tipX} ${tipY}L${tipAt+10} ${y+bh-2}Z`;
 if(b.type==='thought'){g+=`<g fill="${K.paper}" ${S}><ellipse cx="${cx}" cy="${y+bh/2}" rx="${bw/2}" ry="${bh/2}"/>`;for(let i=0;i<14;i++){const a=i/14*Math.PI*2;g+=`<circle cx="${(cx+Math.cos(a)*bw*.47).toFixed(1)}" cy="${(y+bh/2+Math.sin(a)*bh*.47).toFixed(1)}" r="${(Math.min(bw,bh)*.16).toFixed(1)}"/>`}g+=`</g><ellipse cx="${cx}" cy="${y+bh/2}" rx="${bw/2-2}" ry="${bh/2-2}" fill="${K.paper}"/>`;
  for(let i=0;i<3;i++){const t=(i+1)/4;g+=`<circle cx="${(tipAt+(tipX-tipAt)*t).toFixed(1)}" cy="${(y+bh+6+(tipY-y-bh-6)*t).toFixed(1)}" r="${(10-i*2.6).toFixed(1)}" fill="${K.paper}" ${S}/>`}}
 else if(b.type==='shout'){const n=18,P=[];for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2,r=i%2?.86:1.12;P.push([(cx+Math.cos(a)*bw*.55*r).toFixed(1),(y+bh/2+Math.sin(a)*bh*.62*r).toFixed(1)].join(','))}
  g+=`<polygon points="${P.join(' ')}" fill="${K.paper}" ${S} stroke-width="${K.sw}"/>`}
 else{const dash=b.type==='whisper'?` stroke-dasharray="9 7"`:'';g+=`<path d="${tail}" fill="${K.paper}" ${S}/><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${rx}" fill="${K.paper}" ${S}${dash}/><path d="M${tipAt-12} ${y+bh-K.sw*.4}L${tipAt+8} ${y+bh-K.sw*.4}" stroke="${K.paper}" stroke-width="${K.sw*1.3}"/>`}
 return g+txt(cx,ty);
}

export { bubbleSvg, wrap };

