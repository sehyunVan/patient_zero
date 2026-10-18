const { chromium } = require('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/playwright');
const assert=require('node:assert/strict');
// 건너뛰기·화면 연타 — 눌러 대도 인트로가 끝나고 전투로 간다(약한 기기에서 그러지 못했다)
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
    // 화면 아무 데나 + 건너뛰기를 섞어 20번
    for(let i=0;i<20;i++){
      const sel = i%3===0 ? '#intro-skip' : '#intro';
      await p.locator(sel).click({timeout:250,force:true}).catch(()=>{});
      await p.waitForTimeout(30);
    }
    await p.waitForFunction(()=>patientZero.snapshot().mode==='playing',{timeout:20000});
    assert.equal(await p.locator('.intro-cut').count(),0,'인트로가 걷힌다');
    assert.match(await p.locator('#tutorial').innerText(),/STEP 1/,'첫 안내가 뜬다');
    // 그림 판을 매번 새로 만들지 않는다 — 탭마다 WebP 를 다시 디코딩하면 약한 기기가 멈춘다
    assert.deepEqual(errs,[]);
    console.log('PASS: 연타 20회에도 인트로→첫 전투, 오류 0 (CPU 4배 느린 상태)');
  } finally { await b.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
