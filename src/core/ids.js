
/* core/ids.js: generated from the single-file build, code unchanged */
const sid=()=>{const a=new Uint8Array(6);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<6;i++)a[i]=Math.random()*256}return [...a].map(v=>'abcdefghijklmnopqrstuvwxyz0123456789'[v%36]).join('')};
const okId=v=>typeof v==='string'&&/^[a-z0-9]{4,12}$/.test(v);

export { okId, sid };

