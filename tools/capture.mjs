// Render stills from held.html in headless Chromium (SwiftShader WebGL2).
//
//   node tools/capture.mjs --q "spike=paint" --t 0,4,8 --w 1920 --h 1080 --out review/raw/paint
//   node tools/capture.mjs --t 0:136:4 --w 640 --h 360 --out review/raw/pass1/s   (range start:end:step)
//   node tools/capture.mjs --burst 35.5:36.5 --fps 60 --w 640 --h 360 --out review/raw/burst/birth
//
// Each frame is rendered by window.__renderAt(t) inside the page, so render(t)
// is exercised exactly as the film calls it.
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, [])
);
const w = parseInt(args.w ?? '960', 10), h = parseInt(args.h ?? '540', 10);
const out = resolve(root, args.out ?? 'review/raw/frame');
mkdirSync(dirname(out), { recursive: true });

let times = [];
if (args.burst) {
  const [a, b] = String(args.burst).split(':').map(Number);
  const fps = parseFloat(args.fps ?? '60');
  for (let t = a; t <= b + 1e-9; t += 1 / fps) times.push(+t.toFixed(5));
} else {
  for (const part of String(args.t ?? '0').split(',')) {
    if (part.includes(':')) {
      const [a, b, s] = part.split(':').map(Number);
      for (let t = a; t <= b + 1e-9; t += s) times.push(+t.toFixed(4));
    } else times.push(parseFloat(part));
  }
}

const q = `freeze&w=${w}&h=${h}${args.q ? '&' + args.q : ''}`;
const url = pathToFileURL(join(root, 'held.html')).href + '?' + q;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Math.min(w, 1920), height: Math.min(h, 1080) } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const tLoad = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000 });
const err = await page.evaluate(() => window.__error);
if (err) {
  console.error('page error:', err);
  console.error(logs.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log(`loaded in ${((Date.now() - tLoad) / 1000).toFixed(1)} s`);
let i = 0;
for (const t of times) {
  const t0 = Date.now();
  const data = await page.evaluate((tt) => window.__renderAt(tt), t);
  const name = args.burst ? `${out}_${String(i).padStart(4, '0')}.png` : `${out}_${t.toFixed(2).padStart(7, '0')}.png`;
  writeFileSync(name, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`${name}  t=${t}  ${((Date.now() - t0) / 1000).toFixed(2)} s`);
  i++;
}
if (logs.length) console.log(logs.slice(0, 40).join('\n'));
await browser.close();
