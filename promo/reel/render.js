/* ============================================================
   render.js — comp.html 을 헤드리스 크롬으로 한 프레임씩 찍는다.

     node promo/reel/render.js --preview 0,2.6,6.2,9.4,13,18.2   # 몇 장만 → out/preview/
     node promo/reel/render.js --frames [--workers 4]            # 1200장  → out/frames/
     node promo/reel/render.js --encode                          # frames + music.wav → promo/showreel.mp4
     node promo/reel/render.js --vertical                        # 가로판 → 1080×1920 세로판 (쇼츠·릴스)

   REEL.seek(t) 가 매번 처음부터 그리므로 크롬 네 대가 나눠 찍어도 같은 그림이 나온다.
   프레임은 저장소 밖(스크래치)에 쌓는다 — 1200장 PNG 를 저장소에 남기지 않는다.
   ffmpeg 도 저장소에 두지 않는다: FFMPEG=경로 로 넘기거나 스크래치의 ffmpeg-static 을 쓴다.
   ============================================================ */
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');                 /* = patient-zero/ */
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes(k);
const OUT = path.resolve(argOf('--out', process.env.REEL_OUT || path.join(process.env.TEMP || '.', 'pz-reel')));
const FPS = 60, DUR = 20, TOTAL = FPS * DUR;
const WORKERS = Math.max(1, +argOf('--workers', 4) | 0);
const LANG = argOf('--lang', 'en') === 'ko' ? 'ko' : 'en';
const SUF = LANG === 'en' ? '' : '-' + LANG;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe'].find(p => p && fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html':'text/html;charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.json':'application/json' };

function serve(port) {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '');
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store' });
        r.end(d); });
    }).listen(port, () => res(s));
  });
}

async function openPage(base, cdpPort, height) {
  const dir = path.join(process.env.TEMP || '.', 'cdp-pzreel-' + cdpPort + '-' + process.pid);
  const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1',
    '--font-render-hinting=none', '--disable-lcd-text', '--enable-font-antialiasing', '--disable-gpu',
    '--remote-debugging-port=' + cdpPort, '--user-data-dir=' + dir, 'about:blank'], { stdio: 'ignore' });
  let page; for (let i = 0; i < 90 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(250);
  }
  if (!page) throw new Error('크롬이 안 뜬다 ' + cdpPort);
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pend = new Map(); const errs = [];
  const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id:i, method:m, params:p })); });
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Page.enable'); await send('Runtime.enable');
  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r?.result?.value;
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${base}/promo/reel/comp.html?t=0&lang=${LANG}&_=${Date.now()}` });
  let st; for (let i = 0; i < 300; i++) {
    st = await ev('window.REEL ? JSON.stringify({ready:REEL.ready,error:REEL.error}) : null');
    if (st && JSON.parse(st).ready) break;
    if (st && JSON.parse(st).error) throw new Error(JSON.parse(st).error);
    await sleep(200);
  }
  if (!st || !JSON.parse(st).ready) throw new Error('합성기가 안 올라왔다 ' + st + ' ' + errs.slice(0, 3).join(' | '));
  const shot = async (t, file) => {
    await ev(`(async()=>{ REEL.seek(${t}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1; })()`);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  };
  /* 첫 캡처는 첫 페인트보다 앞설 수 있다 — 버리는 한 장을 먼저 찍는다 */
  await ev('(async()=>{ REEL.seek(0); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1; })()');
  await send('Page.captureScreenshot', { format: 'png' });
  const close = () => { try { ws.close(); } catch {} try { chrome.kill(); } catch {}
    setTimeout(() => { try { fs.rmSync(dir, { recursive:true, force:true }); } catch {} }, 500); };
  return { shot, close, errs, ev };
}

/* ffmpeg 는 저장소에 두지 않는다 — FFMPEG= 로 넘기거나 스크래치의 ffmpeg-static 을 쓴다 */
function findFF() {
  const ff = process.env.FFMPEG || [
    path.join(OUT, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  ].find(p => fs.existsSync(p));
  if (!ff) throw new Error('ffmpeg 를 못 찾았다 — FFMPEG=경로 로 알려 달라');
  return ff;
}

(async () => {
  const PORT = 9761, base = `http://localhost:${PORT}`;
  const HEIGHT = +argOf('--height', 1080) | 0;
  const HSUF = HEIGHT === 1080 ? '' : '-h' + HEIGHT;

  /* ---- 세로판 (1080×1920) ----
     쇼츠·릴스용. 가로판을 폭에 맞춰 가운데 놓고, 위아래 빈 곳은 같은 화면을 크게 키워
     흐리게 깐다. 새로 찍지 않고 다 구운 영상에서 만들므로 몇 초면 끝난다. */
  if (has('--vertical')) {
    const ff = findFF();
    const src = path.join(ROOT, 'promo', `patient-zero-showreel${SUF}.mp4`);
    if (!fs.existsSync(src)) throw new Error('가로판이 없다 — 먼저 --encode: ' + src);
    /* 가운데 그림은 1080×608. 위아래로 656px 씩 남고, 그 자리는 흐린 같은 그림이 채운다.
       폰에서 글자가 읽혀야 하니 바탕은 어둡게 눌러 둔다. */
    const fc = [
      '[0:v]split=2[bg][fg]',
      '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,' +
        'gblur=sigma=42,eq=brightness=-0.16:saturation=0.65[bgb]',
      '[fg]scale=1080:-2[fgs]',
      '[bgb][fgs]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]',
    ].join(';');
    for (const [file, crf, extra] of [
      [`patient-zero-showreel${SUF}-vertical.mp4`, '19', []],
      [`patient-zero-showreel${SUF}-vertical-web.mp4`, '23', ['-maxrate','10M','-bufsize','20M']],
    ]) {
      const dst = path.join(ROOT, 'promo', file);
      execFileSync(ff, ['-y', '-i', src, '-filter_complex', fc, '-map', '[v]', '-map', '0:a?',
        '-c:v','libx264','-preset','slow','-crf',crf, ...extra, '-pix_fmt','yuv420p','-profile:v','high','-level','4.2',
        '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',
        '-c:a','aac','-b:a','256k', dst], { stdio: ['ignore','ignore','inherit'] });
      console.log('→ ' + path.relative(process.cwd(), dst), (fs.statSync(dst).size / 1048576).toFixed(1) + 'MB');
    }
    return;
  }

  if (has('--encode')) {
    const ff = findFF();
    const music = path.join(OUT, 'music.wav');
    const dstDir = path.join(ROOT, 'promo'); fs.mkdirSync(dstDir, { recursive: true });
    /* 둘을 굽는다 — 마스터(crf 17)와 보내기용(crf 23, 12Mbps 상한) */
    for (const [file, crf, extra] of [
      [`patient-zero-showreel${SUF}${HSUF}.mp4`, '17', []],
      [`patient-zero-showreel${SUF}${HSUF}-web.mp4`, '23', ['-maxrate','12M','-bufsize','24M']],
    ]) {
      const dst = path.join(dstDir, file);
      const args = ['-y', '-framerate', String(FPS), '-i', path.join(OUT, 'frames' + SUF + HSUF, 'f%05d.png')];
      if (fs.existsSync(music)) args.push('-i', music);
      args.push('-c:v','libx264','-preset','slow','-crf',crf, ...extra, '-pix_fmt','yuv420p','-profile:v','high','-level','4.2',
        '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart');
      if (fs.existsSync(music)) args.push('-c:a','aac','-b:a','256k','-shortest');
      args.push(dst);
      execFileSync(ff, args, { stdio: ['ignore','ignore','inherit'] });
      console.log('→ ' + path.relative(process.cwd(), dst), (fs.statSync(dst).size / 1048576).toFixed(1) + 'MB');
    }
    return;
  }

  const server = await serve(PORT);
  try {
    if (has('--preview')) {
      const ts = argOf('--preview', '0').split(',').map(Number);
      const dir = path.join(OUT, 'preview' + SUF); fs.mkdirSync(dir, { recursive: true });
      const pg = await openPage(base, 9771, HEIGHT);
      for (const t of ts) { const f = path.join(dir, `t${t.toFixed(2).replace('.', '_')}.png`); await pg.shot(t, f); console.log('  ' + path.basename(f)); }
      if (pg.errs.length) console.log('페이지 오류', pg.errs.slice(0, 5));
      pg.close();
    } else {
      const dir = path.join(OUT, 'frames' + SUF + HSUF); fs.mkdirSync(dir, { recursive: true });
      const from = +argOf('--from', 0) | 0, to = Math.min(TOTAL, +argOf('--to', TOTAL) | 0);
      const t0 = Date.now(); let done = 0;
      await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
        const pg = await openPage(base, 9781 + w, HEIGHT);
        for (let i = from + w; i < to; i += WORKERS) {
          const f = path.join(dir, `f${String(i).padStart(5, '0')}.png`);
          if (has('--skip-existing') && fs.existsSync(f)) { done++; continue; }
          await pg.shot(i / FPS, f); done++;
          if (done % 60 === 0) console.log(`  ${done}/${to - from}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
        if (pg.errs.length) console.log('페이지 오류', pg.errs.slice(0, 5));
        pg.close();
      }));
      console.log(`→ ${dir}  ${to - from}장  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  } finally { server.close(); }
  await sleep(600); process.exit(0);
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
