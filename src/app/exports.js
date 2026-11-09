import { $, toast } from '../core/dom.js';
import { esc } from '../core/util.js';
import { icon } from '../ui/icons.js';
import { openDialog } from '../ui/layers.js';
import { pageSvg, panelAlt } from '../page/render.js';
import { makeZip } from '../io/zip.js';
import { makePdf } from '../io/pdf.js';
import { rasterize } from '../io/raster.js';
import { slug } from '../io/paths.js';
import { APP, call } from './store.js';

/* app/exports.js: what can leave the studio, and in what shape.
 *
 * Six formats, each one already implemented in io/: PNG, SVG and the project file for the page you
 * are on; PDF, PNG zip and the alt-text script for the whole project. The dialog names the scope on
 * every row, so nothing exports more or less than the person expects, and success is only reported
 * once a real file has been produced.
 */

async function saveFile(name, data) {
  if (APP.DL) {
    try {
      await APP.DL.save({ filename: name, data });
      return { ok: true, file: name };
    } catch (e) {
      const c = e && e.code;
      if (c === 'declined') return { ok: false, declined: true, message: 'Save cancelled.' };
      return { ok: false, message: c === 'unavailable' ? 'Saving is not available in this build.' : 'The file could not be saved.' };
    }
  }
  try {
    const u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
    const a = document.createElement('a');
    a.href = u; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    return { ok: true, file: name };
  } catch (e) {
    return { ok: false, message: 'The file could not be saved.' };
  }
}

const pageData = i => {
  const r = pageSvg(APP.P, i, { uid: 'x' });
  return { ...r, sc: Math.min(1.5, 7500 / r.h) };
};
const bytes = async b => new Uint8Array(await b.arrayBuffer());

const FORMATS = [
  {
    id: 'png', label: 'PNG image', scope: 'This page', ext: '.png', icon: 'image',
    run: async () => {
      const r = pageData(APP.pageIdx);
      const file = await rasterize(r.svg, r.w, r.h, r.sc, 'image/png');
      return saveFile(`${slug(APP.P.title)}-p${APP.pageIdx + 1}.png`, file);
    },
  },
  {
    id: 'svg', label: 'SVG vector', scope: 'This page', ext: '.svg', icon: 'shapes',
    run: async () => saveFile(`${slug(APP.P.title)}-p${APP.pageIdx + 1}.svg`,
      '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(APP.P, APP.pageIdx, { uid: 'x' }).svg),
  },
  {
    id: 'pdf', label: 'PDF document', scope: 'All pages', ext: '.pdf', icon: 'fileText',
    run: async () => {
      const pages = [];
      for (let i = 0; i < APP.P.pages.length; i++) {
        const r = pageData(i), sc = Math.min(r.sc, 1.25);
        const jpg = await rasterize(r.svg, r.w, r.h, sc, 'image/jpeg', .9);
        pages.push({ w: Math.round(r.w * sc), h: Math.round(r.h * sc), jpg: await bytes(jpg) });
      }
      return saveFile(slug(APP.P.title) + '.pdf', makePdf(pages));
    },
  },
  {
    id: 'zip', label: 'PNG images in a zip', scope: 'All pages', ext: '.zip', icon: 'layers',
    run: async () => {
      const files = [];
      for (let i = 0; i < APP.P.pages.length; i++) {
        const r = pageData(i);
        files.push({ name: `page-${String(i + 1).padStart(2, '0')}.png`, data: await bytes(await rasterize(r.svg, r.w, r.h, r.sc, 'image/png')) });
      }
      return saveFile(slug(APP.P.title) + '.zip', makeZip(files));
    },
  },
  {
    id: 'md', label: 'Script with alt text', scope: 'Whole project', ext: '.md', icon: 'fileCode',
    run: async () => {
      let md = `# ${APP.P.title}\n\n`;
      APP.P.pages.forEach((pg, i) => {
        md += `## Page ${i + 1}\n\n`;
        pg.panels.forEach((p, k) => {
          md += `**Panel ${k + 1}.** ${panelAlt(p, APP.P)}\n\n` + (p.note ? `> ${p.note}\n\n` : '');
        });
      });
      return saveFile(slug(APP.P.title) + '-script.md', md);
    },
  },
  {
    id: 'json', label: 'Project file', scope: 'Whole project', ext: '.json', icon: 'fileJson',
    run: async () => saveFile(slug(APP.P.title) + '.gutter.json', JSON.stringify(APP.P, null, 1)),
  },
];

const state = {};   // id → { status, message }

function rowsHtml() {
  return FORMATS.map(f => {
    const s = state[f.id] || {};
    const busy = s.status === 'working';
    const status = s.status === 'done' ? `<span class="note note-ok">${icon('circleCheck')}Saved as ${esc(s.file)}</span>`
      : s.status === 'error' ? `<span class="note note-error">${icon('circleAlert')}${esc(s.message || 'Export failed.')}</span>`
        : s.status === 'working' ? `<span class="note">${icon('loaderCircle')}Exporting…</span>` : '';
    return `<div class="row" style="align-items:flex-start;padding:8px 6px">
      <span class="row-thumb" style="width:32px;height:32px;background:var(--surface-muted);color:var(--text-secondary)">${icon(f.icon)}</span>
      <span class="row-text">
        <span class="row-name">${esc(f.label)}</span>
        <span class="row-sub">${esc(f.scope)} · ${esc(f.ext)}</span>
        ${status ? `<span style="margin-top:4px">${status}</span>` : ''}
      </span>
      <button type="button" class="btn btn-sm" data-export="${f.id}"${busy ? ' disabled' : ''}>${busy ? 'Working…' : 'Export'}</button>
    </div>`;
  }).join('');
}

let dialog = null;

async function runExport(id) {
  const f = FORMATS.find(x => x.id === id);
  if (!f) return;
  const anyRunning = Object.values(state).some(s => s.status === 'working');
  if (anyRunning) return;
  state[id] = { status: 'working' };
  paintExports2();
  try {
    const res = await f.run();
    if (res && res.ok) {
      /* the row reports the name the file was actually written under */
      state[id] = { status: 'done', file: (res && res.file) || slug(APP.P.title) + f.ext };
      toast(f.label + ' exported.');
    } else if (res && res.declined) {
      state[id] = { status: 'idle' };
    } else {
      state[id] = { status: 'error', message: (res && res.message) || 'Export failed.' };
    }
  } catch (e) {
    state[id] = { status: 'error', message: 'Export failed. Try a smaller page count.' };
  }
  paintExports2();
}

function paintExports2() {
  if (!dialog) return;
  const body = $('[data-export-body]', dialog.dialog);
  if (body) body.innerHTML = rowsHtml();
}

function openExport() {
  if (dialog) return;
  const api = openDialog({
    title: 'Export',
    sub: 'Every format is produced on this device. Nothing is uploaded.',
    body: `<div data-export-body>${rowsHtml()}</div>`,
    foot: `<span class="section-hint" style="margin:0">${APP.P.pages.length} page${APP.P.pages.length === 1 ? '' : 's'} · ${esc(APP.P.title)}</span><span class="sp"></span><button type="button" class="btn" data-close>Done</button>`,
    onMount(a) {
      a.body.addEventListener('click', e => {
        const b = e.target.closest('[data-export]');
        if (b && !b.disabled) runExport(b.dataset.export);
      });
      $('[data-close]', a.foot).addEventListener('click', () => api.close(true));
    },
    onDismiss(close) { close(true); },
    /* the module keeps one dialog at a time; it lets go of it however the dialog is closed */
    onClose() { dialog = null; },
  });
  dialog = api;
}

/* the phone reaches export through More */
function moreSheet() {
  return {
    title: 'More',
    snap: 'half',
    html: `<div class="list">
        <button type="button" class="row" data-more="preview"><span class="row-thumb">${icon('eye')}</span>
          <span class="row-text"><span class="row-name">Preview</span><span class="row-sub">See the pages as a reader does</span></span></button>
        <button type="button" class="row" data-more="export"><span class="row-thumb">${icon('download')}</span>
          <span class="row-text"><span class="row-name">Export</span><span class="row-sub">PNG, SVG, PDF, zip, script, project file</span></span></button>
        <button type="button" class="row" data-more="generate"><span class="row-thumb">${icon('sparkles')}</span>
          <span class="row-text"><span class="row-name">Generate a story</span><span class="row-sub">From a written brief</span></span></button>
        <button type="button" class="row" data-more="pages"><span class="row-thumb">${icon('filePlus')}</span>
          <span class="row-text"><span class="row-name">Import a project file</span><span class="row-sub">Replace the current project with a .json file</span></span></button>
      </div>
      <div class="field"><span class="field-label">This project</span>
        <p class="section-hint" style="margin:0">${esc(APP.P.title)} · ${APP.P.pages.length} page${APP.P.pages.length === 1 ? '' : 's'} · ${APP.P.cast.length} character${APP.P.cast.length === 1 ? '' : 's'}</p>
      </div>`,
    onMount({ close }) {
      $('.msheet-body').addEventListener('click', e => {
        const b = e.target.closest('[data-more]');
        if (!b) return;
        const what = b.dataset.more;
        close();
        if (what === 'preview') call('openPreview');
        else if (what === 'export') call('openExport');
        else if (what === 'generate') call('openGenerate');
        else if (what === 'pages') call('importProject');
      });
    },
  };
}

export { FORMATS, moreSheet, openExport, saveFile };
