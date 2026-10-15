/* Presentation only: recruitment awards are committed before this sequence starts. */
window.RecruitReveal = (() => {
  let dispose = () => {};
  function stop() { dispose(); dispose = () => {}; }
  function start(host, results, onFinish) {
    stop();
    const controller = new AbortController(), { signal } = controller;
    let frame = 0, index = 0, finished = false, audio = null, voices = [], phase = '', ready = false, turn = 0, resizeObserver = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function clearAudio() { for (const v of voices) { try { v.stop(); } catch {} } voices=[]; }
    dispose = () => { finished=true;turn++;resizeObserver?.disconnect();controller.abort();cancelAnimationFrame(frame);clearAudio();if(audio)audio.close().catch(()=>{}); };
    function cue(final, rarity) {
      let enabled=false;try {enabled=localStorage.getItem('patient-zero-sound')==='true';}catch{}
      if(!enabled || reduced)return;
      try {audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});
        const now=audio.currentTime;
        for(const [i,f] of (final?(rarity==='SSR'?[130.81,261.63,392,523.25]:[196,293.66]):[65.4,98]).entries()) {
          const o=audio.createOscillator(),g=audio.createGain();o.type=final?'triangle':'sine';o.frequency.setValueAtTime(f,now);if(!final)o.frequency.exponentialRampToValueAtTime(f*2,now+.75);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.024/(i+1),now+.07);g.gain.exponentialRampToValueAtTime(.001,now+(final?1.3:.9));o.connect(g).connect(audio.destination);o.start(now);o.stop(now+1.5);voices.push(o);
        }
      } catch {}
    }
    function finish(){if(finished)return;stop();onFinish();}
    function show(){
      cancelAnimationFrame(frame);resizeObserver?.disconnect();clearAudio();const currentTurn=++turn,c=results[index];ready=false;phase='charge';
      const color=Cast.rarities[c.rarity]||'#7dbbeb';
      host.innerHTML=`<section class="summon-stage rarity-${c.rarity.toLowerCase()} ${reduced?'reduced':''}" data-phase="charge" style="--summon-color:${color}"><div class="summon-city"></div><div class="summon-face" style="background-image:url('${Cast.face(c.id)}')"></div><div class="summon-rays"></div><div class="summon-ring"></div><div class="summon-core"></div><canvas class="summon-particles" aria-hidden="true"></canvas><div class="summon-slash slash-one"></div><div class="summon-slash slash-two"></div><img class="summon-actor" src="${Cast.ld(c.id)}" alt="${c.name}" draggable="false"><div class="summon-flare"></div><header class="summon-header"><span>RECRUITMENT <b>${String(index+1).padStart(2,'0')} / ${String(results.length).padStart(2,'0')}</b></span><button id="reveal-results">SKIP <span>▶▶</span></button></header><div class="summon-status" role="status" aria-live="polite">신호 동기화 중…</div><div class="summon-identity"><span class="summon-rarity">${c.rarity}</span><h3>${c.name}</h3><div class="summon-stars" aria-label="${c.rarity} 등급">${c.rarity==='SSR'?'★★★★★':c.rarity==='SR'?'★★★★':'★★★'}</div><p>“${Cast.line(c.id,0)}”</p><span class="summon-acquired">${c.duplicate?'중복 획득 · 조각 +'+(c.rarity==='SSR'?30:c.rarity==='SR'?10:5):'NEW CHARACTER · 신규 획득'}</span></div><aside class="summon-phases" aria-label="등장 단계"><div data-step="charge"><i>01</i><span>신호 포착</span></div><div data-step="silhouette"><i>02</i><span>감염체 식별</span></div><div data-step="revealed" style="background-image:linear-gradient(#080e1b66,#080e1bcc),url('${Cast.face(c.id)}');background-size:cover;background-position:center 22%"><i>03</i><span>캐릭터 등장</span></div></aside><button id="summon-next" disabled>${index+1<results.length?'다음 캐릭터':'전체 결과 확인'} <span>→</span></button></section>`;
      const stage=host.firstElementChild,canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d'),img=stage.querySelector('.summon-actor'),status=stage.querySelector('.summon-status');
      stage.querySelector('#reveal-results').addEventListener('click',finish,{signal});
      stage.querySelector('#summon-next').addEventListener('click',()=>{if(!ready)return;if(++index>=results.length)finish();else show();},{signal});
      stage.querySelector('#reveal-results').focus({preventScroll:true});
      let width=0,height=0;
      function size(){width=stage.clientWidth;height=stage.clientHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
      const observer=new ResizeObserver(size);resizeObserver=observer;observer.observe(stage);signal.addEventListener('abort',()=>observer.disconnect(),{once:true});size();
      // Deterministic particles must not consume recruitment's random number stream.
      const count=c.rarity==='SSR'?110:c.rarity==='SR'?72:44;
      const particles=Array.from({length:count},(_,i)=>({a:i*2.39996,v:70+(i*71%260),size:1+i%3}));
      const revealAt=reduced?0:c.rarity==='SSR'?2.65:1.8;
      let began=0,played=false;
      function tick(now){if(finished||currentTurn!==turn||!host.isConnected){observer.disconnect();return;}if(!began)began=now;const t=(now-began)/1000;
        const next=t>=revealAt?'revealed':t>.8?'silhouette':'charge';
        if(next!==phase || (reduced&&!ready)){phase=next;stage.dataset.phase=phase;status.textContent=phase==='revealed'?`${c.rarity} ${c.name} 등장`:phase==='silhouette'?'감염체 식별 완료 · 연결 중':'신호 동기화 중…';}
        if(phase==='revealed'&&!ready){ready=true;stage.querySelector('#summon-next').disabled=false;cue(true,c.rarity);}
        if(!played){played=true;if(!reduced)cue(false,c.rarity);}
        ctx.clearRect(0,0,width,height);
        if(!reduced){const cx=width*.58,cy=height*.48,burst=Math.max(0,t-revealAt);ctx.globalCompositeOperation='lighter';
          for(const p of particles){let x,y,alpha;if(t<revealAt){const radius=(1-Math.min(1,t/revealAt))*Math.min(width,height)*.7+22;x=cx+Math.cos(p.a+t*.7)*radius;y=cy+Math.sin(p.a+t*.7)*radius*.75;alpha=.35;}else{x=cx+Math.cos(p.a)*p.v*burst;y=cy+Math.sin(p.a)*p.v*burst*.72+burst*burst*12;alpha=Math.max(0,1-burst/2.6);}ctx.globalAlpha=alpha;ctx.fillStyle=p.size===1?'#ff405e':color;ctx.fillRect(x,y,p.size*2,p.size);if(t>=revealAt){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(p.a)*12,y-Math.sin(p.a)*9);ctx.stroke();}}
          ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
        }
        if(t<revealAt+3)frame=requestAnimationFrame(tick);else observer.disconnect();
      }
      // Decode first so the flash never reveals an unloaded portrait.
      const begin=()=>{if(!finished&&currentTurn===turn)frame=requestAnimationFrame(tick);};
      img.addEventListener('error',()=>{if(img.dataset.fallback)return;img.dataset.fallback='1';img.src=Cast.face(c.id);},{signal});
      img.decode().catch(()=>{}).then(begin);
    }
    show();
  }
  return {start,stop};
})();
