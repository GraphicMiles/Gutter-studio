import { kit } from '../core/kit.js';

/* page/layout.js: generated from the single-file build, code unchanged */


const ROWS={1:[[1]],2:[[1],[1]],3:[[1],[1,1]],4:[[1,1],[1,1]],5:[[1,1],[1],[1,1]],6:[[1,1],[1,1],[1,1]],7:[[1],[1,1],[1,1],[1,1]],8:[[1,1],[1,1],[1,1],[1,1]],9:[[1,1,1],[1,1,1],[1,1,1]]};
function rowsFor(n,layout){
 let rows;
 if(layout==='stack')rows=Array.from({length:n},()=>[1]);
 else if(layout==='grid'){rows=[];for(let i=0;i<n;i+=2)rows.push(n-i>1?[1,1]:[1])}
 else if(layout==='hero'){rows=[[1]];for(let i=1;i<n;i+=2)rows.push(n-i>1?[1,1]:[1])}
 else if(layout==='cinema'){rows=Array.from({length:n},()=>[1])}
 else rows=(ROWS[n]||ROWS[9]).map(r=>r.slice());
 return rows}
function boardRects(P,page,pw,ph){
 const K=kit(P.style),n=page.panels.length,fmt=P.style.fmt,g=K.gut,m=K.mar;
 let rows=rowsFor(n,page.layout),rects=[],idx=0;
 if(fmt==='storyboard'){const cols=n<=2?n:n<=4?2:3,rws=Math.ceil(n/cols),capH=130,cw=(pw-m*2-g*(cols-1))/cols,ch=cw*9/16,top=m+70;
  for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols);rects.push({x:m+c*(cw+g),y:top+r*(ch+capH+g*.6),w:cw,h:ch,cap:capH})}
  return {rects,h:Math.max(ph,top+rws*(ch+capH+g*.6)+m*.6)}}
 if(fmt==='webtoon'){const w=pw-m*2,hs={'extreme-close':.7,close:.95,medium:1.1,full:1.5,wide:.85};let y=m;
  page.panels.forEach(p=>{const h=Math.round(w*(hs[p.shot]||1));rects.push({x:m,y,w,h});y+=h+g*2.2});return {rects,h:y-g*2.2+m}}
 const aw=pw-m*2,ah=ph-m*2-(fmt==='square'?0:36),rh=rows.map((r,i)=>(page.layout==='hero'&&i===0)?1.7:(page.layout==='cinema'?1:1));
 const tot=rh.reduce((a,b)=>a+b,0),usable=ah-g*(rows.length-1);let y=m;
 rows.forEach((r,ri)=>{const hh=usable*rh[ri]/tot,cnt=r.length,ww=(aw-g*(cnt-1))/cnt;const row=[];for(let c=0;c<cnt&&idx<n;c++,idx++)row.push({x:m+c*(ww+g),y,w:ww,h:hh});if(fmt==='manga')row.reverse().forEach((q,k)=>{q.x=m+k*(ww+g)});rects.push(...(fmt==='manga'?row.slice().sort((a,b)=>b.x-a.x):row));y+=hh+g});
 return {rects,h:ph}}
const PAGE_W={comic:[1000,1400],manga:[1000,1450],webtoon:[900,1200],square:[1080,1080],storyboard:[1600,900]};

export { PAGE_W, ROWS, boardRects, rowsFor };

