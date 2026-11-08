
/* core/util.js: generated from the single-file build, code unchanged */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d,lo,hi)=>{v=Number(v);if(!isFinite(v))v=d;return Math.min(hi,Math.max(lo,v))};
const HEX=/^#[0-9a-fA-F]{6}$/;const col=(c,d)=>HEX.test(String(c))?String(c):d;
function rng(seed){let h=1779033703^seed.length;for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=h<<13|h>>>19}let a=h>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=a=>'#'+a.map(v=>Math.round(Math.min(255,Math.max(0,v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*t))};
const lum=c=>{const [r,g,b]=rgb(c);return .299*r+.587*g+.114*b};

const pick=(T,v,d)=>T[v]||col(v,d);

export { HEX, col, esc, hex, lum, mix, num, pick, rgb, rng };

