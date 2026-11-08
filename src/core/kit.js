import { col, hex, lum, num } from './util.js';
import { PRESETS } from './palette.js';
import { ENUM } from './enums.js';

/* core/kit.js: generated from the single-file build, code unchanged */




/* style kit context from project style */
function kit(style){
 const p=PRESETS[style.preset]||PRESETS.garden,s=style||{};
 const tones={};for(const k in p.tones)tones[k]=col(s.tones&&s.tones[k],p.tones[k]);
 const K={mono:!!p.mono,tones,line:col(s.line,p.line),shadow:col(s.shadow,p.shadow),paper:col(s.paper,p.paper),cap:col(s.cap,p.cap),sfx:col(s.sfx,p.sfx),
  sw:num(s.sw,4,2,8),shOn:s.shadowOn!==false,rad:num(s.rad,0,0,40),gut:num(s.gutter,22,0,60),mar:num(s.margin,40,0,120),grain:s.grain!==false,fs:num(s.fs,1,.7,1.4),
  bub:s.bub==='boxy'?'boxy':'round',border:ENUM.border.includes(s.border)?s.border:'clean',pattern:ENUM.pattern.includes(s.pattern)?s.pattern:'none',eyeW:'#F7F7F2',nose:'#EF5B45'};
 K.c=c=>{if(!K.mono)return c;const l=Math.round(lum(c));return hex([l,l,l])};
 return K;
}

export { kit };

