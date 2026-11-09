import fs from 'node:fs';
const DIR='/tmp/lucide/package/icons';
const names = `arrow-left arrow-right arrow-up arrow-down chevron-down chevron-up chevron-left chevron-right
undo-2 redo-2 eye download ellipsis x plus minus search check trash-2 copy
panels-top-left square user-round shapes type message-square image layers settings-2
mouse-pointer-2 hand zoom-in zoom-out maximize sparkles save circle-dot file-text file-json file-code save
cloud cloud-upload cloud-off cloud-alert badge-check circle-check circle-alert loader-circle
panel-left panel-right panel-bottom rows-3 columns-3 grip-vertical grip-horizontal move
align-left align-center align-right palette list folder-open folder file-down cat zap
rectangle-horizontal square-dashed scan panel-top wand-sparkles file-plus circle-x info
triangle-alert book-open pen-line text-cursor square-pen circle-dot history
panel-left-close panel-right-close arrow-right-left rotate-ccw square-stack frames
layout-panel-top message-square-quote captions quote pencil ruler frame`.split(/\s+/).filter(Boolean);
const out=[];
const camel = n => n.replace(/-([a-z0-9])/g, (_,c)=>c.toUpperCase());
const seen = new Set();
for (const n of names){
  const f=`${DIR}/${n}.svg`;
  if(!fs.existsSync(f)){ console.error('missing', n); continue; }
  const svg=fs.readFileSync(f,'utf8');
  const inner=svg.slice(svg.indexOf('>', svg.indexOf('<svg'))+1, svg.lastIndexOf('</svg>'))
    .replace(/\s*\n\s*/g,' ').trim();
  const key=camel(n);
  if(seen.has(key)) continue; seen.add(key);
  out.push(`  ${/^[a-z]/.test(key)?key:`'${key}'`}: '${inner.replace(/'/g,"\\'")}',`);
}
const head=`/* ui/icons.js — Lucide icons, generated from lucide-static v0.469.0 (ISC licence).
 *
 * Every icon in the application comes from here: one library, one 24-unit grid, one stroke
 * weight (1.75, set in base.css). Do not inline a path anywhere else, and do not add an icon
 * that is not in Lucide.
 *
 *   node tools/icons.mjs   regenerates this file from the lucide-static package
 */
const ICON = {
`;
const tail=`};

/* An icon is decoration inside its control: the control carries the name. */
function icon(name, size) {
  const d = ICON[name];
  if (!d) return '';
  const s = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + s + '>' + d + '</svg>';
}

export { ICON, icon };
`;
fs.mkdirSync('/home/user/Gutter-studio/tools',{recursive:true});
fs.writeFileSync('/home/user/Gutter-studio/src/ui/icons.js', head+out.join('\n')+'\n'+tail);
console.log('icons:', out.length);
