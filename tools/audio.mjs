// Render the score offline in Chromium and write WAV files (mix and stems).
//   node tools/audio.mjs [--score test|film] [--out review/audio/test]
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const score = arg('score', 'test');
const out = resolve(root, arg('out', `review/audio/${score}`));
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(pathToFileURL(join(root, 'held.html')).href + '?audio');
await page.waitForFunction(() => window.__ready || window.__error);
const chunks = arg('chunks', null);
const info = await page.evaluate(([s, c]) => window.__renderAudio(s, c ? parseInt(c, 10) : null), [score, chunks]);
console.log(JSON.stringify(info));
function wav(chs, sr) {
  const n = chs[0].length, nc = chs.length;
  const buf = Buffer.alloc(44 + n * nc * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 4, 28); buf.writeUInt16LE(nc * 4, 32); buf.writeUInt16LE(32, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nc * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) buf.writeFloatLE(chs[c][i], 44 + (i * nc + c) * 4);
  return buf;
}
async function fetchCh(key) {
  const len = info.length, step = 1 << 20;
  const outArr = new Float32Array(len);
  for (let s = 0; s < len; s += step) {
    const b64 = await page.evaluate(([k, st, l]) => window.__audioChunk(k, st, l), [key, s, Math.min(step, len - s)]);
    const b = Buffer.from(b64, 'base64');
    outArr.set(new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), s);
  }
  return outArr;
}
const L = await fetchCh('L'), R = await fetchCh('R');
writeFileSync(out + '_mix.wav', wav([L, R], info.sr));
writeFileSync(out + '_music.wav', wav([await fetchCh('mL'), await fetchCh('mR')], info.sr));
writeFileSync(out + '_sfx.wav', wav([await fetchCh('xL'), await fetchCh('xR')], info.sr));
writeFileSync(out + '_info.json', JSON.stringify(info, null, 1));
console.log('wrote', out + '_{mix,music,sfx}.wav');
await browser.close();
