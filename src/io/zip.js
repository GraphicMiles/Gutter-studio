
/* io/zip.js: generated from the single-file build, code unchanged */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function makeZip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;const u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>24&255];
 files.forEach(f=>{const nm=enc.encode(f.name),d=f.data,crc=crc32(d),h=new Uint8Array([0x50,0x4b,3,4,20,0,0,8,0,0,0,0,0x21,0,...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),0,0]);
  parts.push(h,nm,d);cen.push(new Uint8Array([0x50,0x4b,1,2,20,0,20,0,0,8,0,0,0,0,0x21,0,...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off)]),nm);off+=h.length+nm.length+d.length});
 const cl=cen.reduce((a,b)=>a+b.length,0);parts.push(...cen,new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cl),...u32(off),0,0]));return new Blob(parts,{type:'application/zip'})}

export { CRCT, crc32, makeZip };

