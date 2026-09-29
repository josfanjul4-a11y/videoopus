// Bundle src/ into the single self-contained deliverable held.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2022',
  minify: process.argv.includes('--minify'),
  legalComments: 'none',
});
const js = res.outputFiles[0].text;
const html = readFileSync(join(root, 'src/index.html'), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
writeFileSync(join(root, 'held.html'), html);

// The film must never touch the network.
const urls = html.match(/https?:\/\/[^\s'"`)]+/g) || [];
const bad = urls.filter((u) => !u.startsWith('http://www.w3.org/'));
if (bad.length) {
  console.error('held.html contains URLs:', bad.slice(0, 5));
  process.exit(1);
}
console.log(`held.html  ${(html.length / 1024).toFixed(1)} KB`);
