import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function ensureDirective(policy, name, tokens) {
  const pattern = new RegExp(`(?:^|;\\s*)${name}\\s+([^;]*)`, 'i');
  const match = policy.match(pattern);
  if (!match) return `${policy.replace(/;?\s*$/, '')}; ${name} ${tokens.join(' ')}`;
  const current = match[1].trim().split(/\s+/);
  const missing = tokens.filter((token) => !current.includes(token));
  if (!missing.length) return policy;
  return policy.replace(pattern, (full) => `${full.trim()} ${missing.join(' ')}`);
}

function relax(policy) {
  let next = policy;
  next = ensureDirective(next, 'script-src', ["'self'"]);
  next = ensureDirective(next, 'connect-src', ["'self'"]);
  next = ensureDirective(next, 'img-src', ['https:', 'blob:']);
  return next;
}

const dryRun = process.argv.includes('--dry-run');
const policyPattern = /(<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*\bcontent=")([^"]*)(")/gi;
let changed = 0;
let missed = 0;
for (const file of walk(root)) {
  const html = fs.readFileSync(file, 'utf8');
  if (/content-security-policy/i.test(html) && !policyPattern.test(html)) missed += 1;
  policyPattern.lastIndex = 0;
  let touched = false;
  const updated = html.replace(policyPattern, (full, start, policy, end) => {
    const next = relax(policy);
    if (next === policy) return full;
    touched = true;
    return `${start}${next}${end}`;
  });
  if (!touched) continue;
  if (!dryRun) fs.writeFileSync(file, updated);
  changed += 1;
}
console.log(`updated ${changed} html files, unmatched policies ${missed}`);
