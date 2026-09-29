// Smoke test of the real playback path: start screen, score render, click,
// audio-clocked playback. Reports errors and whether film time advances.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const q = process.argv[2] ?? '';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('score rendered')) console.log('[console]', m.text()); });
const t0 = Date.now();
await page.goto(pathToFileURL(join(root, 'held.html')).href + '?w=640&h=360' + q);
await page.waitForFunction(() => window.__state && window.__state().progress >= 1, null, { timeout: 600000 });
console.log(`score ready after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await page.mouse.click(480, 270);
await page.waitForTimeout(4000);
const a = await page.evaluate(() => window.__state());
await page.waitForTimeout(3000);
const b = await page.evaluate(() => window.__state());
console.log('after click:', JSON.stringify(a));
console.log('3 s later :', JSON.stringify(b));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
