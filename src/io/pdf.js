
/* io/pdf.js: generated from the single-file build, code unchanged */
function makePdf(pages){ // pages:[{w,h,jpg:Uint8Array}] one image per page
 const enc=new TextEncoder(),chunks=[],offs=[];let len=0;const push=x=>{const u=typeof x==='string'?enc.encode(x):x;chunks.push(u);len+=u.length};
 const n=pages.length;push('%PDF-1.4\n');const obj=(i,body)=>{offs[i]=len;push(`${i} 0 obj\n`);body();push('\nendobj\n')};
 obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>push(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`));
 pages.forEach((p,i)=>{const b=3+i*3,pw=Math.round(p.w*.75),ph=Math.round(p.h*.75),cs=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  obj(b,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${b+1} 0 R >> >> /Contents ${b+2} 0 R >>`));
  obj(b+1,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`);push(p.jpg);push('\nendstream')});
  obj(b+2,()=>push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`))});
 const xo=len,total=3+n*3;push(`xref\n0 ${total}\n0000000000 65535 f \n`);for(let i=1;i<total;i++)push(String(offs[i]).padStart(10,'0')+' 00000 n \n');
 push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`);return new Blob(chunks,{type:'application/pdf'})}

export { makePdf };

