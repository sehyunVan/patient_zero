// 번역이 필요한 키 모으기 — ① 코드의 T('…')·T`…` 전부  ② 감사(audit.json)에서 화면에 남은 한글(조각·값은 ${})
// 출력: poc/i18n/need.json  { key: ['en','ja',…빠진 언어] }   사용: node tools/i18n-keys.mjs
import fs from 'node:fs'; import path from 'node:path';
const P='C:/Users/sehyu/playground/patient-zero';
const LANGS=['en','ja'];
const cat=Object.fromEntries(LANGS.map(l=>[l,JSON.parse(fs.readFileSync(`${P}/i18n/ui.${l}.json`,'utf8'))]));
const st=Object.fromEntries(LANGS.map(l=>[l,{}]));   // 이 게임엔 역명표가 없다
const KO=/[가-힣]/;
const keys=new Map();   // key → 출처
const add=(k,src)=>{ k=k.trim(); if(!k||!KO.test(k)) return; if(!keys.has(k)) keys.set(k,src); };

/* ① 코드 */
const files=fs.readdirSync(P).filter(f=>/\.js$/.test(f)&&!/^(bundle|busan-net|net|net-true)\.js$/.test(f)).concat(['index.html']);
for(const f of files){
  const src=fs.readFileSync(path.join(P,f),'utf8');
  for(const m of src.matchAll(/\bT\(\s*'((?:[^'\\\n]|\\.)*)'\s*[,)]/g)) add(m[1].replace(/\\'/g,"'"),f);
  for(const m of src.matchAll(/\bT\(\s*"((?:[^"\\\n]|\\.)*)"\s*[,)]/g)) add(m[1],f);
  for(const m of src.matchAll(/\bT`((?:[^`\\]|\\.)*)`/g)){                 // 태그드 템플릿 — ${식} 을 ${} 로
    let body=m[1], out='', d=0, i=0;
    while(i<body.length){ if(body.startsWith('${',i)&&d===0){ out+='${}'; d=1; i+=2; continue; } if(d>0){ if(body[i]==='{') d++; else if(body[i]==='}') d--; i++; continue; } out+=body[i++]; }
    add(out,f);
  }
}
/* ② 감사 — 구분자로 조각 내고, 값(숫자·로마자·한자·가나 덩어리)은 ${} */
const auditPath=`${P}/i18n/audit.json`;
if(fs.existsSync(auditPath)){
  const A=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  const KEEP=new Set(['HP','Lv','Lv.','DAY','AI','EXP','ENTER','NIGHT','TRANSIT','SEOUL','BUSAN','ROUND','REWARD','d100','B','Enter','Esc','Shift','DEMO']);
  const stNames=new Set(Object.keys(st.en));
  const VAL=/[0-9A-Za-z\u3040-\u30ff\u4e00-\u9fff₩][0-9A-Za-z\u3040-\u30ff\u4e00-\u9fff₩,.]*/g;
  const norm=s=>s.replace(VAL,t=>KEEP.has(t)||KEEP.has(t.replace(/\.$/,''))?t:'${}').replace(/(\$\{\})(\s*\$\{\})+/g,'${}');
  for(const lang of LANGS) for(const t of Object.keys(A[lang]?.leaks||{})){
    let body=t.startsWith('@')?t.slice(t.indexOf(': ')+2):t; if(body.startsWith('!')) continue;
    for(const seg of body.split(/ · | — | → | \/ /)){ if(!KO.test(seg)) continue; if(stNames.has(seg.trim())) continue;
      const k=norm(seg.trim()); if(KO.test(k)&&k!=='${}') add(k,'audit:'+lang); }
    if(!/ · | — | → | \/ /.test(body)){ const k=norm(body.trim()); if(KO.test(k)) add(k,'audit:'+lang); }
  }
  for(const lang of LANGS) for(const k of A[lang]?.missing||[]) add(k,'missing:'+lang);
}
const need={};
for(const [k,src] of keys){ const miss=LANGS.filter(l=>!cat[l][k]&&!st[l][k]); if(miss.length) need[k]={miss,src}; }
fs.writeFileSync(`${P}/i18n/need.json`,JSON.stringify(need,null,1));
console.log('keys',keys.size,'need',Object.keys(need).length, Object.fromEntries(LANGS.map(l=>[l,Object.values(need).filter(v=>v.miss.includes(l)).length])));
