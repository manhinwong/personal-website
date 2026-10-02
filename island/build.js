#!/usr/bin/env node
/* Build the island into one self-contained public/island/index.html.
   Two HARD GATES, nothing is written unless both pass:
     1. the layout validator: a geometrically broken island never ships
     2. the public-surface check: this page is public, so no internal names,
        tools or URLs from the project it was forked from may appear in it */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const outDir = path.join(dir, '..', 'public', 'island');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const run = (file) => process.stdout.write(execFileSync('node', ['--no-warnings', path.join(dir, file)], { encoding: 'utf8' }));

try {
  run('gen-data.mjs');
  run('validate.js');
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  console.error('\n✗ build aborted — fix the problem above before shipping\n');
  process.exit(1);
}

let html = read('dev.html');
const inline = (tag, file, wrap) => {
  if (!html.includes(tag)) throw new Error('build: tag not found in dev.html -> ' + tag);
  html = html.replace(tag, () => wrap(read(file)));
};
inline('<link rel="stylesheet" href="style.css">', 'style.css', (s) => `<style>\n${s}\n</style>`);
inline('<script src="three.min.js"></script>', 'three.min.js', (s) => `<script>\n${s}\n</script>`);
inline('<script src="data.js"></script>', 'data.js', (s) => `<script>\n${s}\n</script>`);
inline('<script src="layout.js"></script>', 'layout.js', (s) => `<script>\n${s}\n</script>`);
inline('<script src="island.js"></script>', 'island.js', (s) => `<script>\n${s}\n</script>`);

/* The canvas is invisible to search engines and screen readers, so the same
   content is also emitted as plain HTML, visually hidden with the standard
   screen-reader-only pattern (not display:none, which crawlers may skip). */
{
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read('data.js') + ';globalThis.__D = { PROJECTS, ARTICLES, APPROACH, SOCIAL, DATA };', ctx);
  const { PROJECTS, ARTICLES, APPROACH, SOCIAL, DATA } = ctx.__D;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const link = (url, text) => `<a href="${esc(url)}">${esc(text)}</a>`;
  const summary = `<main id="seo-summary">
<h1>${esc(DATA.hero.name)}</h1>
<p>${esc(DATA.hero.tagline)}</p>
<p>${DATA.stats.map((s) => esc(`${s.label}: ${s.value}`)).join(' · ')}</p>
<p>${link('/webpage', 'View the classic site')}</p>
<section><h2>About</h2>${DATA.about.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
<section><h2>Projects</h2>${PROJECTS.map((p) => `<article><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p>${p.description ? `<p>${esc(p.description)}</p>` : ''}<p>Built with ${esc(p.tech.join(', '))}.</p><p>${p.links.map((l) => link(l.url, l.label)).join(' · ')}</p></article>`).join('')}</section>
<section><h2>Writing</h2>${ARTICLES.map((a) => `<article><h3>${link(a.url, a.title)}</h3><p>${esc(a.date)}</p><p>${esc(a.preview)}</p></article>`).join('')}</section>
<section><h2>Approach</h2>${APPROACH.map((a) => `<h3>${esc(a.title)}</h3><p>${esc(a.description)}</p>`).join('')}</section>
<section><h2>Contact</h2><p>${esc(DATA.contact.title)} ${link('mailto:' + DATA.contact.email, DATA.contact.email)}</p><p>${SOCIAL.map((s) => link(s.url, s.label)).join(' · ')}</p></section>
</main>`;
  const tag = '<canvas id="game"></canvas>';
  if (!html.includes(tag)) throw new Error('build: canvas tag not found in dev.html');
  html = html.replace(tag, () => summary + '\n' + tag);
}

if (/src="(three\.min|data|layout|island)\.js"|href="style\.css"/.test(html)) {
  console.error('✗ build: something failed to inline — output would not be self-contained');
  process.exit(1);
}

/* the word "llama" alone is fine (the animal stays); these are not. Vendor
   three.js is excluded: its minified hex tables would false-match names. */
const FORBIDDEN = [
  /llamaventures|llama[ -]?(agent|deal|cli|command|island|museum|os)\b|LLAMA_(BODY|EYE)/i,
  /\b(Herman|Ed|Jack|Museum)\b/,
];
const ours = html.replace(read('three.min.js'), '');
for (const re of FORBIDDEN) {
  const hit = ours.match(re);
  if (!hit) continue;
  const at = hit.index;
  console.error(`✗ build: public-surface check failed on "${hit[0]}":\n  …${ours.slice(Math.max(0, at - 60), at + 60).replace(/\s+/g, ' ')}…`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.copyFileSync(path.join(dir, 'music.m4a'), path.join(outDir, 'music.m4a'));
console.log(`✓ built public/island/index.html — ${(html.length / 1024).toFixed(0)} KB, self-contained, public-surface check passed`);
