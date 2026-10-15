/* i18n 번들 재생성 — poc/i18n/{ui,stations}.{en,ja,zh}.json → poc/i18n/bundle.js
   런타임은 bundle.js 만 읽는다. 원본 json 만 고치면 화면에 반영되지 않는다.
   사용: node tools/i18n-bundle.mjs [--check]   (--check 는 쓰지 않고 차이만 보고) */
import fs from 'node:fs';
const DIR='C:/Users/sehyu/playground/patient-zero/i18n/';
const HEAD='/* 생성 파일 — tools/i18n-bundle.mjs 로 다시 만든다. 카탈로그는 한국어 원문이 키다. 역명: en=Wikidata+로마자 규칙, ja/zh=Wikidata(없는 역은 한글 폴백). 역명이 든 문장은 키에서 빼고 ${} 패턴으로만 번역한다. */\n';
const J=f=>JSON.parse(fs.readFileSync(DIR+f,'utf8'));
const out={}; for(const l of ['en','ja']) out[l]={ui:J(`ui.${l}.json`),stations:{}};   // 역명표 없음
const next=HEAD+'window.I18N_BUNDLED='+JSON.stringify(out)+';\n';

const cur=fs.readFileSync(DIR+'bundle.js','utf8');
const parse=s=>{ const w={}; new Function('window',s.slice(s.indexOf('window.I18N_BUNDLED')))(w); return w.I18N_BUNDLED; };
const before=parse(cur);
let diff=0;
for(const l of Object.keys(out)) for(const sec of ['ui']){
  const a=before[l]?.[sec]||{}, b=out[l][sec];
  const add=Object.keys(b).filter(k=>a[k]===undefined), del=Object.keys(a).filter(k=>b[k]===undefined);
  const chg=Object.keys(b).filter(k=>a[k]!==undefined&&a[k]!==b[k]);
  if(add.length||del.length||chg.length){ diff+=add.length+del.length+chg.length;
    console.log(`${l}.${sec}: +${add.length} -${del.length} ~${chg.length}`);
    [...add.map(k=>'  + '+k),...del.map(k=>'  - '+k),...chg.map(k=>'  ~ '+k)].slice(0,12).forEach(x=>console.log(x)); }
}
if(process.argv.includes('--check')){ console.log(diff?`차이 ${diff}건 — 쓰지 않음`:'차이 없음'); process.exit(0); }
fs.writeFileSync(DIR+'bundle.js',next);
console.log(diff?`bundle.js 재생성 — 반영 ${diff}건`:'bundle.js 재생성 — 내용 동일');
