import { lum, mix } from './util.js';

/* core/geom.js: generated from the single-file build, code unchanged */


/* geometry helpers */
const inPoly=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
function scallop(P,r,fill,K,rnd,curl){
 const pts=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(d/(r*1.2)));for(let k=0;k<n;k++)pts.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n])}
 const rs=pts.map(()=>r*(0.88+rnd()*.26));
 let s=`<g stroke="${K.line}" stroke-width="${K.sw*2}" fill="${fill}">`+pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${rs[i].toFixed(1)}"/>`).join('')+'</g>';
 s+=`<g fill="${fill}"><polygon points="${P.map(p=>p.join(',')).join(' ')}"/>`+pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${rs[i].toFixed(1)}"/>`).join('')+'</g>';
 if(curl){const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),dk=lum(fill)<70?mix(fill,'#ffffff',.16):mix(fill,'#000000',.28);
  let d='',n=0;for(let t=0;t<260&&n<46;t++){const x=x0+rnd()*(x1-x0),y=y0+rnd()*(y1-y0);if(inPoly(x,y,P)){n++;d+=`M${x.toFixed(0)} ${y.toFixed(0)}q${(4+rnd()*5).toFixed(0)} ${(-9-rnd()*5).toFixed(0)} ${(10+rnd()*4).toFixed(0)} ${(rnd()*4-2).toFixed(0)}`}}
  s+=`<path d="${d}" fill="none" stroke="${dk}" stroke-width="2.6" stroke-linecap="round"/>`}
 return s;
}
/* later attribute wins, so overrides after a shared stroke string work */
function fixDup(svg){return svg.replace(/<[a-zA-Z][^>]*>/g,t=>{const m=[...t.matchAll(/([\w:-]+)="([^"]*)"/g)];if(m.length<2)return t;const seen={};m.forEach(a=>seen[a[1]]=a[2]);if(Object.keys(seen).length===m.length)return t;const name=t.match(/^<[\w:-]+/)[0],self=/\/>$/.test(t);return name+' '+Object.entries(seen).map(([k,v])=>`${k}="${v}"`).join(' ')+(self?'/>':'>')})}

const cres=(cx,cy,r,fill)=>{const a=-60*Math.PI/180,b=60*Math.PI/180,A=[cx+r*Math.cos(a),cy+r*Math.sin(a)],B=[cx+r*Math.cos(b),cy+r*Math.sin(b)];return `<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}A${r} ${r} 0 0 1 ${B[0].toFixed(1)} ${B[1].toFixed(1)}A${(r*1.5).toFixed(1)} ${(r*1.5).toFixed(1)} 0 0 0 ${A[0].toFixed(1)} ${A[1].toFixed(1)}Z" fill="${fill}"/>`};
const smooth=(P,close)=>{let d=`M${P[0][0]} ${P[0][1]}`;for(let i=1;i<P.length-1;i++){const m=[(P[i][0]+P[i+1][0])/2,(P[i][1]+P[i+1][1])/2];d+=`Q${P[i][0]} ${P[i][1]} ${m[0]} ${m[1]}`}d+=`L${P[P.length-1][0]} ${P[P.length-1][1]}`;return d+(close?'Z':'')};

export { cres, fixDup, inPoly, scallop, smooth };

