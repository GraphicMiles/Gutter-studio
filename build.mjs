#!/usr/bin/env node
/**
 * build.mjs — bundles the ES-module source in src/ into one self-contained HTML file.
 *
 * No dependencies. It resolves the import graph from src/app/boot.js, orders modules
 * topologically, strips the import/export syntax, flattens src/styles, and inlines both
 * into index.html.
 *
 * It refuses to build if two modules declare the same top-level name (which would be a
 * silent collision once flattened) or if the import graph has a cycle.
 *
 *   node build.mjs            → dist/gutter-studio.html
 *   node build.mjs --check    → syntax/lint pass only, writes nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const ENTRY = path.join(SRC, 'app/boot.js');
const OUT = path.join(ROOT, 'dist/gutter-studio.html');
const CHECK_ONLY = process.argv.includes('--check');

const read = p => fs.readFileSync(p, 'utf8');
const fail = msg => { console.error('✗ ' + msg); process.exit(1); };

/* ---------- 1. resolve the module graph ---------- */
/* matches `import x from 'y'`, `import {a} from 'y'` and side-effect `import 'y'`,
   with an optional trailing line comment */
const IMPORT_RE = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm;

function resolveImports(file) {
  const src = read(file);
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith('.')) fail(`bare import "${spec}" in ${rel(file)} — this project has no dependencies`);
    out.push(path.resolve(path.dirname(file), spec));
  }
  return out;
}
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

const order = [];
const state = new Map(); // file -> 'visiting' | 'done'
function visit(file, trail) {
  if (state.get(file) === 'done') return;
  if (state.get(file) === 'visiting') fail('import cycle: ' + [...trail, file].map(rel).join(' → '));
  state.set(file, 'visiting');
  for (const dep of resolveImports(file)) {
    if (!fs.existsSync(dep)) fail(`missing module ${rel(dep)} imported by ${rel(file)}`);
    visit(dep, [...trail, file]);
  }
  state.set(file, 'done');
  order.push(file);
}
visit(ENTRY, []);

/* ---------- 1b. every import must name an export that exists ----------
   The dev server loads these files as real modules, so a bad import is a runtime error there
   while the flattened bundle would never notice. Catch it at build time instead. */
const EXPORT_RE = /export\s*\{([^}]*)\}/g;
const exportsOf = new Map();
for (const file of order) {
  const names = new Set();
  for (const m of read(file).matchAll(EXPORT_RE)) {
    for (const n of m[1].split(',')) if (n.trim()) names.add(n.trim().split(/\s+as\s+/).pop());
  }
  exportsOf.set(file, names);
}
for (const file of order) {
  const src = read(file);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = path.resolve(path.dirname(file), m[2]);
    const wanted = m[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const missing = wanted.filter(n => !exportsOf.get(target)?.has(n));
    if (missing.length) fail(`${rel(file)} imports ${missing.join(', ')} from ${rel(target)}, which does not export it`);
  }
}

/* ---------- 2. flatten, checking for name collisions ---------- */
const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const declared = new Map();
const chunks = [];

for (const file of order) {
  const src = read(file);
  for (const m of src.matchAll(DECL_RE)) {
    const name = m[1];
    if (declared.has(name)) {
      fail(`"${name}" is declared in both ${rel(declared.get(name))} and ${rel(file)} — rename one before flattening`);
    }
    declared.set(name, file);
  }
  /* `export { a as b }` creates a NEW top-level binding in a real module graph. After flattening it
     would simply vanish, so any alias is materialised here as `const b = a;`. Missing this once made
     every mobile sheet button silently dead in the built file while the dev server still worked. */
  const aliases = [];
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().split(/\s+as\s+/);
      if (bits.length !== 2) continue;
      const [local, exported] = bits.map(x => x.trim());
      if (!local || !exported || local === exported) continue;
      aliases.push(`const ${exported} = ${local};`);
    }
  }
  const body = src
    .replace(IMPORT_RE, '')
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/^\s*\n+/, '');
  /* at the END of the chunk: a source-order `const` alias in front of its target hits the temporal
     dead zone and takes the whole app down when the file is opened directly */
  const aliasBlock = aliases.length ? '\n' + aliases.join('\n') : '';
  chunks.push(`/* ── ${rel(file).replace('src/', '')} ── */\n${body.trim()}${aliasBlock}`);
}

const js = `(function () {\n'use strict';\n${chunks.join('\n\n')}\n})();`;

/* ---------- 3. flatten the stylesheet ---------- */
function flattenCss(file, seen = new Set()) {
  if (seen.has(file)) return '';
  seen.add(file);
  return read(file).replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (_, spec) => {
    const p = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(p)) fail(`missing stylesheet ${rel(p)}`);
    return flattenCss(p, seen);
  });
}
const css = flattenCss(path.join(SRC, 'styles/index.css')).trim();

/* ---------- 4. syntax check the bundle ---------- */
const tmp = path.join(ROOT, '.build-check.js');
fs.writeFileSync(tmp, js);
try {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
} catch (e) {
  fs.rmSync(tmp, { force: true });
  fail('bundle does not parse:\n' + (e.stderr?.toString() || e.message));
}
fs.rmSync(tmp, { force: true });

/* ---------- 5. inline into the shell ---------- */
const shell = read(path.join(ROOT, 'index.html'));
const CSS_HOOK = /<link rel="stylesheet" href="\.\/src\/styles\/index\.css">/;
const JS_HOOK = /<script type="module" src="\.\/src\/app\/boot\.js"><\/script>/;
if (!CSS_HOOK.test(shell) || !JS_HOOK.test(shell)) fail('index.html lost its build hooks (styles link / module script)');

const html = shell
  .replace(CSS_HOOK, () => `<style>\n${css}\n</style>`)
  .replace(JS_HOOK, () => `<script>\n${js}\n</script>`);

if (CHECK_ONLY) {
  console.log(`✓ ${order.length} modules, ${declared.size} top-level names, no collisions, bundle parses`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log(`✓ built dist/gutter-studio.html — ${kb(Buffer.byteLength(html))} (js ${kb(Buffer.byteLength(js))}, css ${kb(Buffer.byteLength(css))})`);
  console.log(`  ${order.length} modules, ${declared.size} top-level names`);
}
