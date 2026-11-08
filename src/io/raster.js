
/* io/raster.js: generated from the single-file build, code unchanged */
const svgUrl=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
function rasterize(svg,w,h,scale,type,q){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{try{const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const x=c.getContext('2d');if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(new Error('encode')),type||'image/png',q||.92)}catch(e){rej(e)}};img.onerror=()=>rej(new Error('render'));img.src=svgUrl(svg)})}

export { rasterize, svgUrl };

