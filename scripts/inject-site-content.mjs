import fs from 'fs';
import path from 'path';

const root = process.cwd();
const skip = new Set(['node_modules', '.git', 'data']);
const tag = '<script src="/public/site-content.js" defer></script>';
let updated = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) inject(full);
  }
}

function inject(file) {
  if (path.basename(file) === 'content.html') return;
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('/public/site-content.js')) return;
  const next = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${tag}\n</body>`) : `${html}\n${tag}\n`;
  fs.writeFileSync(file, next);
  updated += 1;
}

walk(root);
console.log(`injected ${updated}`);
