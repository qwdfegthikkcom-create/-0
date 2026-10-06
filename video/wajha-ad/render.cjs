// يصوّر scenes.html إطاراً إطاراً (30 بالثانية) إلى مجلد frames/.
// node render.cjs                 -> كل الإطارات
// node render.cjs test 0.5 3 ...  -> إطارات تجربة بأوقات محددة إلى test/
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const DUR = 55.42, FPS = 30;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const pg = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await pg.goto('file://' + path.join(__dirname, 'scenes.html'));
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
  const [mode, ...ts] = process.argv.slice(2);
  const out = path.join(__dirname, mode === 'test' ? 'test' : 'frames'); fs.mkdirSync(out, { recursive: true });
  const times = mode === 'test' ? ts.map(Number) : Array.from({ length: Math.round(DUR * FPS) }, (_, i) => i / FPS);
  for (const [i, t] of times.entries()) {
    await pg.evaluate(t => setT(t), t);
    const name = mode === 'test' ? `t${t.toFixed(2)}.jpg` : `f${String(i).padStart(5, '0')}.jpg`;
    await pg.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 94 });
  }
  await b.close();
})();
