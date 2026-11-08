
/* core/dom.js: generated from the single-file build, code unchanged */
const $=s=>document.querySelector(s);
function toast(t){const e=$('#toast');if(!e)return;
 e.textContent=t;e.hidden=false;
 /* next frame, so the transition has a state to leave from */
 requestAnimationFrame(()=>e.classList.add('on'));
 clearTimeout(toast.t);
 toast.t=setTimeout(()=>{e.classList.remove('on');setTimeout(()=>{e.hidden=true},220)},2600)}

export { $, toast };

