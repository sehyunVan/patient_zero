// 코드 속 한글 문자열 전수 조사 — 주석은 빼고 문자열 리터럴(따옴표·템플릿)과 index.html 의 마크업 글자만.
// 카탈로그(ui.*.json)·역명표에 없는 것을 poc/i18n/scan.json 으로. 사용: node tools/i18n-scan.mjs
import fs from 'node:fs'; import path from 'node:path';
const P='C:/Users/sehyu/playground/patient-zero';
const LANGS=['en','ja'];
const cat=Object.fromEntries(LANGS.map(l=>[l,JSON.parse(fs.readFileSync(`${P}/i18n/ui.${l}.json`,'utf8'))]));
const st=Object.fromEntries(LANGS.map(l=>[l,{}]));   // 이 게임엔 역명표가 없다
const KO=/[가-힣]/;
/* JS 문자열 리터럴 — 주석·정규식은 건너뛴다. 템플릿은 ${…} 를 ${} 로 */
function strings(src){
  const out=[]; let i=0; const n=src.length; let prev='';
  const regexOK=()=>/^$|[(,=:[!&|?{};+\-*%<>~^]$/.test(prev)||/\b(return|typeof|case|in|of)$/.test(prev);
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/'&&d==='/'){ i=src.indexOf('\n',i); if(i<0) break; continue; }
    if(c==='/'&&d==='*'){ i=src.indexOf('*/',i+2); if(i<0) break; i+=2; continue; }
    if(c==='\''||c==='"'){ let j=i+1, s=''; while(j<n&&src[j]!==c){ if(src[j]==='\\'){ s+=src[j+1]; j+=2; continue; } if(src[j]==='\n') break; s+=src[j++]; } out.push(s); i=j+1; prev='a'; continue; }
    if(c==='`'){ let j=i+1, s='', parts=[]; while(j<n&&src[j]!=='`'){ if(src[j]==='\\'){ s+=src[j+1]; j+=2; continue; }
        if(src[j]==='$'&&src[j+1]==='{'){ let depth=1, k=j+2; while(k<n&&depth){ if(src[k]==='{') depth++; else if(src[k]==='}') depth--; else if(src[k]==='`'){ // 안쪽 템플릿
              let m=k+1; while(m<n&&src[m]!=='`'){ if(src[m]==='\\') m++; m++; } const inner=src.slice(k+1,m); for(const t of strings('`'+inner+'`')) parts.push(t); k=m; }
              else if(src[k]==='\''||src[k]==='"'){ const q=src[k]; let m=k+1; let t=''; while(m<n&&src[m]!==q){ if(src[m]==='\\'){ t+=src[m+1]; m+=2; continue; } t+=src[m++]; } parts.push(t); k=m; }
              k++; }
          s+='${}'; j=k; continue; }
        s+=src[j++]; }
      out.push(s); out.push(...parts); i=j+1; prev='a'; continue; }
    if(c==='/'&&regexOK()){ let j=i+1, cls=false; while(j<n){ if(src[j]==='\\'){ j+=2; continue; } if(src[j]==='[') cls=true; else if(src[j]===']') cls=false; else if(src[j]==='/'&&!cls) break; else if(src[j]==='\n') break; j++; } i=j+1; prev='a'; continue; }
    if(!/\s/.test(c)) prev=(prev+c).slice(-8);
    i++;
  }
  return out;
}
const found=new Map();
const note=(s,f)=>{ for(const piece of s.split(/<[^>]*>/)){ const t=piece.replace(/\s+/g,' ').trim(); if(!t||!KO.test(t)) continue; if(!found.has(t)) found.set(t,f); } };
for(const f of fs.readdirSync(P+'/js').filter(f=>/.js$/.test(f)&&!/^(i18n|bundle).js$/.test(f))){
  for(const s of strings(fs.readFileSync(path.join(P,'js',f),'utf8'))) note(s,'js/'+f);
}
const html=fs.readFileSync(`${P}/index.html`,'utf8');
for(const m of html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)) for(const s of strings(m[1])) note(s,'index.html:js');
const body=html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
for(const m of body.matchAll(/>([^<]+)</g)) note(m[1],'index.html');
for(const m of body.matchAll(/(?:aria-label|title|placeholder|alt)="([^"]*)"/g)) note(m[1],'index.html:attr');
const miss={}; let n=0;
for(const [t,f] of found){ const lack=LANGS.filter(l=>!cat[l][t]&&!st[l][t]); if(lack.length){ miss[t]={f,lack}; n++; } }
fs.writeFileSync(`${P}/i18n/scan.json`,JSON.stringify(miss,null,1));
const byFile={}; for(const v of Object.values(miss)) byFile[v.f]=(byFile[v.f]||0)+1;
console.log('strings',found.size,'missing',n); console.log(Object.entries(byFile).sort((a,b)=>b[1]-a[1]).map(([f,c])=>f+' '+c).join('\n'));
