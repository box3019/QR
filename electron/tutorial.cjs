// Locates the bundled tutorial video for a language. The renderer only gets what the manifest lists, from inside `root`.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let helpers;
async function lib() { return helpers || (helpers = await import('../src/video/manifest.mjs')); }

function inside(root, rel) {
  const p = path.resolve(root, rel);
  return p.startsWith(path.resolve(root) + path.sep) ? p : null;
}

/** -> { lang, src, vtt, duration, chapters, title, dir } | null (no video for this language / files missing). */
async function loadTutorialVideo(root, lang) {
  try {
    const { pickVideo, validateEntry } = await lib();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const v = pickVideo(manifest, lang);
    if (!v || validateEntry(v).length) return null;
    const file = inside(root, v.file), cap = inside(root, v.captions);
    if (!file || !cap || !fs.existsSync(file) || !fs.existsSync(cap)) return null;
    return { lang, src: pathToFileURL(file).href, vtt: fs.readFileSync(cap, 'utf8'), duration: v.duration, chapters: v.chapters, title: v.title || '', dir: v.dir || (lang === 'he' ? 'rtl' : 'ltr') };
  } catch { return null; }
}

module.exports = { loadTutorialVideo };