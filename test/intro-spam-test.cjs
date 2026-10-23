const { chromium } = require('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/playwright');
const assert=require('node:assert/strict');
/* 건너뛰기·화면 연타 — 눌러 대도 인트로가 끝나고 전투로 간다(약한 기기에서 그러지 못했다).
   재는 것은 둘이다: ① 끝까지 간다 ② 그 사이 **본 흐름이 멈춰 있지 않다**.
   ②가 이 시험의 핵심이다 — 갤럭시 A12 에서 연타가 3초씩 화면을 얼렸고(2026-10-18),
   범인은 컷마다 innerHTML 을 갈아 1280px WebP 를 다시 디코딩한 것이었다.

   눌림은 locator.click 이 아니라 dispatchEvent 로 보낸다. click 은 보내기 전에
   보이는지·가려졌는지를 재는데, CPU 를 네 배 느리게 한 상태에서는 그 측정이 250ms 를 넘겨
   **눌림 자체가 안 가고** 시험이 거짓으로 실패했다(2026-10-23). 연타는 전달돼야 연타다. */
(async()=>{
  const b=await chromium.launch();
  try{
    const p=await b.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});     // 약한 기기 흉내
    await p.addInitScript(()=>{window.FORCE_INTRO=true;});
    await p.goto(process.env.TEST_URL||'http://127.0.0.1:4177');
    await p.waitForFunction(()=>window.patientZero?.snapshot().assetsReady,{timeout:60000});
    await p.evaluate(()=>{try{localStorage.removeItem('patient-zero-intro-seen');localStorage.removeItem('patient-zero-tour-seen')}catch{}});
    await p.click('#start');
    await p.waitForSelector('.intro-cut',{timeout:20000});

    // 화면이 멈춘 시간을 잰다 — 프레임 사이 간격의 최댓값
    await p.evaluate(()=>{
      window.__stall=0; let t=performance.now();
      (function tick(){ const n=performance.now(); window.__stall=Math.max(window.__stall,n-t); t=n; requestAnimationFrame(tick); })();
    });

    // 연타 20번 — 건너뛰기와 화면을 섞어 30ms 간격으로
    for(let i=0;i<20;i++){
      const sel = i%3===0 ? '#intro-skip' : '#intro';
      if (await p.locator(sel).count()) await p.locator(sel).dispatchEvent('click').catch(()=>{});
      await p.waitForTimeout(30);
    }
    // 연타가 묶여 컷이 남았다면 사람 속도로 마무리한다(GAP 260ms 를 넘겨 누른다)
    for (let t=0; t<8 && await p.evaluate(()=>patientZero.snapshot().mode)!=='playing'; t++) {
      const sel = await p.locator('#intro-skip').count() ? '#intro-skip' : '#intro';
      await p.locator(sel).dispatchEvent('click').catch(()=>{});
      await p.waitForTimeout(320);
    }

    await p.waitForFunction(()=>patientZero.snapshot().mode==='playing',{timeout:20000});
    assert.equal(await p.locator('.intro-cut').count(),0,'인트로가 걷힌다');
    assert.match(await p.locator('#tutorial').innerText(),/STEP 1/,'첫 안내가 뜬다');
    // 그림 판을 매번 새로 만들지 않는다 — 탭마다 WebP 를 다시 디코딩하면 약한 기기가 멈춘다
    const stall = await p.evaluate(()=>Math.round(window.__stall));
    assert.ok(stall < 1200, `연타 중 화면이 ${stall}ms 멈췄다 — 컷을 갈 때 판을 다시 짓고 있다`);
    assert.deepEqual(errs,[]);
    console.log(`PASS: 연타 20회에도 인트로→첫 전투, 오류 0, 최대 멈춤 ${stall}ms (CPU 4배 느린 상태)`);
  } finally { await b.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
