import { catSvg } from '../art/cat.js';
import { figure } from '../art/figure.js';

/* page/frame.js: generated from the single-file build, code unchanged */



const SHOTV={'extreme-close':[150,330],close:[40,560],medium:null,full:null,wide:null};
function figFor(ch,o,K,uid){
 if(ch.kind==='cat'){const fur=ch.catFur||'white',m=({shock:'shock',scream:'shock',angry:'shock',sleepy:'sleepy',smug:'smug'})[o.expr]||ch.catMood||'calm';
  return {svg:catSvg({fur,mood:m,perch:false},K,uid+'k'),top:-8,bottom:236,w:300,cx:150,cat:true}}
 const f=figure(ch,o,K,uid);return {...f,cx:215,cat:false}}
function region(f,shot){
 if(f.cat){const v={'extreme-close':[20,190],close:[-8,250],medium:[-30,300],full:[-40,300],wide:[-90,420]}[shot];return {vy:v[0],vh:v[1]}}
 if(shot==='extreme-close')return {vy:150,vh:330};if(shot==='close')return {vy:Math.min(40,f.top-10),vh:600-Math.min(40,f.top-10)+10};
 if(shot==='medium')return {vy:f.top-30,vh:f.bottom-f.top+40};
 if(shot==='full')return {vy:f.top-30,vh:1130-f.top+40};
 {const vh=(1130-f.top+60)*1.4;return {vy:1190-vh,vh}}}

export { SHOTV, figFor, region };

