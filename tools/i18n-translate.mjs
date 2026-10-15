// 빠진 번역 채우기 — poc/i18n/need.json(tools/i18n-keys.mjs) 의 키를 en·ja·zh 로 옮겨 ui.*.json 에 더한다.
// 기존 카탈로그에서 관련 용어를 골라 용어집으로 같이 준다(같은 말은 같은 번역). ${} 자리 수가 다르면 버린다.
// 역명은 --stations 로: poc/i18n/stations-need.json {ko:{en,ja,zh 힌트}} → stations.*.json
// 키: ask-gpt/.env OPENAI_API_KEY · OPENAI_MODEL.   사용: node tools/i18n-translate.mjs [--stations]
import fs from 'node:fs';
const P='C:/Users/sehyu/playground/patient-zero/i18n';
const env=Object.fromEntries(fs.readFileSync('C:/Users/sehyu/playground/ask-gpt/.env','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const KEY=env.OPENAI_API_KEY, MODEL=env.OPENAI_MODEL||'gpt-5.1';
const LANGS=['en','ja'];
const cat=Object.fromEntries(LANGS.map(l=>[l,JSON.parse(fs.readFileSync(`${P}/ui.${l}.json`,'utf8'))]));
const stt=Object.fromEntries(LANGS.map(l=>[l,{}]));   // 역명표 없음
async function ask(instructions,input){
  for(let t=1;t<=3;t++){
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+KEY},
      body:JSON.stringify({model:MODEL,instructions,input:'Reply with a json object only. '+input,reasoning:{effort:'low'},text:{format:{type:'json_object'}}})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){ console.log('HTTP',r.status,JSON.stringify(j).slice(0,200)); continue; }
    const txt=(j.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||'').join('');
    try{ return JSON.parse(txt); }catch(e){ console.log('bad json',txt.slice(0,200)); }
  }
  return null;
}
const holes=s=>(s.match(/\$\{\d*\}/g)||[]).length;



/* --from=scan : tools/i18n-scan.mjs 의 scan.json {key:{f,lack}} — 파일별로 묶어 맥락을 준다 */
const FROM=(process.argv.find(a=>a.startsWith('--from='))||'').split('=')[1]||'need';
const raw=JSON.parse(fs.readFileSync(`${P}/${FROM}.json`,'utf8'));
const need=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,{miss:v.miss||v.lack,src:v.src||v.f}]));
const CTX={ 'lore.js':'character backstory and lore records (literary, melancholic)', 'pairs.js':'two-character scenes and dialogue between crew members (natural spoken lines, keep each voice)',
  'story-clues.js':'story clues and narrative beats (literary)', 'story-axis.js':'story progression text (literary)', 'home.js':'lobby: crew members talking to the player-controller (spoken, short)',
  'intro.js':'intro cutscene narration', 'recruit.js':'recruit screen and character skill descriptions', 'mobs.js':'monster descriptions', 'purify-scene.js':'purification cutscene lines' };
const keys=Object.keys(need).sort((a,b)=>String(need[a].src).localeCompare(String(need[b].src)));
/* 용어집 — 키에 들어 있는 기존 용어(짧은 것 위주) */
const terms=Object.keys(cat.en).filter(k=>k.length<=10&&!k.includes('${')&&cat.ja[k]).sort((a,b)=>b.length-a.length);
const ins=`You translate UI text of a Korean late-night subway occult RPG ("막차 이후" / "After the Last Train") into English (en), Japanese (ja) and Simplified Chinese (zh).
Return JSON {"<korean key>":{"en":"…","ja":"…","zh":"…"}} with EVERY input key.
Rules:
- Keep "\${}" placeholders: same count, same order. If the target language needs a different order write \${0}, \${1}… explicitly.
- Keep it short and terse like game UI; keep the dry, eerie tone. No added words, no explanations.
- Keep literal tokens like HP, Lv., DAY, EXP, AI, B, ₩, ★, numbers, punctuation like " · ", " — ", "/", "→" as they are.
- A key that is a fragment (e.g. starts with "까지" or "·") must be translated as the same fragment so it can be glued back.
- Use the glossary's existing translations for the same terms.`;
const out={};
const BATCH=40, JOBS=5, batches=[]; for(let i=0;i<keys.length;i+=BATCH) batches.push(keys.slice(i,i+BATCH));
let done=0, next=0;
await Promise.all(Array.from({length:JOBS},async()=>{ while(next<batches.length){ const part=batches[next++];
  const gl={}; for(const t of terms){ if(part.some(k=>k.includes(t))){ gl[t]={en:cat.en[t],ja:cat.ja[t]}; if(Object.keys(gl).length>=120) break; } }
  const files=[...new Set(part.map(k=>String(need[k].src).split(':')[0]))], ctx=files.map(f=>CTX[f]).filter(Boolean).join('; ');
  const r=await ask(ins,(ctx?'CONTEXT: '+ctx+'\n':'')+'GLOSSARY:\n'+JSON.stringify(gl)+'\n\nTRANSLATE:\n'+JSON.stringify(part));
  if(r) Object.assign(out,r); done++; if(done%5===0||done===batches.length) console.log('batch',done,'/',batches.length); } }));
let added=0, bad=[];
for(const k of keys){ const v=out[k]; if(!v){ bad.push(k+' (없음)'); continue; }
  for(const l of need[k].miss){ const val=(v[l]||'').trim(); if(!val){ bad.push(k+' ['+l+'] 빈값'); continue; }
    if(holes(val)!==holes(k)){ bad.push(k+' ['+l+'] 자리 '+holes(k)+'≠'+holes(val)); continue; }
    if(!cat[l][k]){ cat[l][k]=val; added++; } } }
for(const l of LANGS) fs.writeFileSync(`${P}/ui.${l}.json`,JSON.stringify(cat[l],null,1));
console.log('added',added,'bad',bad.length); if(bad.length) console.log(bad.slice(0,40).join('\n'));
