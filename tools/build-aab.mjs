/* 안드로이드 AAB 한 줄로 굽기 —  cd mobile && npm run aab
   굽기(pack-mobile) → cap sync android → bundleRelease 를 순서대로 돌린다.

   왜 npm 스크립트에 직접 적지 않는가: `gradlew.bat` 은 cmd 에서만 그 이름으로 불린다.
   Git Bash 에서는 못 찾고(2026-10-15 에 조용히 실패했다), 맥·리눅스에는 아예 없다(`gradlew`).
   그래서 **판을 보고 골라** 부른다. 그리고 빌드가 실패하면 여기서 0이 아닌 값으로 끝낸다 —
   npm 스크립트로 이어 붙이면 실패가 묻혀서 「성공했는데 파일이 어제 것」이 된다. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = path.join(ROOT, 'mobile');
const ANDROID = path.join(MOBILE, 'android');
const win = process.platform === 'win32';

/* shell:true 는 **경로에 빈칸이 있으면 깨진다**("C:\Program Files\nodejs\node.exe" → 'C:\Program' 을 찾는다).
   그런데 윈도의 .bat(gradlew.bat)은 shell 없이 못 띄운다(Node 20+). 그래서 둘을 갈라 쓰고,
   shell 을 쓸 때만 따옴표로 묶는다. npx 는 아예 거치지 않는다 — 윈도에서 패키지를 못 찾고 죽었다. */
function run(cmd, args, cwd, shell = false) {
  console.log('\n▸ ' + cmd + ' ' + args.join(' '));
  const r = spawnSync(shell ? '"' + cmd + '"' : cmd, args, { cwd, stdio: 'inherit', shell });
  if (r.error) { console.error('\n실패: ' + r.error.message); process.exit(1); }
  if (r.status !== 0) { console.error('\n실패: ' + cmd + ' (' + r.status + ')'); process.exit(r.status || 1); }
}

run(process.execPath, [path.join(ROOT, 'tools/pack-mobile.mjs'), ...process.argv.slice(2)], ROOT);
run(process.execPath, [path.join(MOBILE, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'], MOBILE);
run(path.join(ANDROID, win ? 'gradlew.bat' : 'gradlew'), ['bundleRelease'], ANDROID, win);

const aab = path.join(ANDROID, 'app/build/outputs/bundle/release/app-release.aab');
if (!fs.existsSync(aab)) { console.error('AAB 가 없다 — 빌드는 끝났는데 파일이 없다'); process.exit(1); }
const st = fs.statSync(aab);
const fresh = Date.now() - st.mtimeMs < 10 * 60e3;
console.log('\nAAB ' + (st.size / 1048576).toFixed(1) + 'MB · ' + st.mtime.toLocaleString());
console.log(aab);
if (!fresh) console.error('※ 방금 구운 파일이 아니다 — gradle 이 건너뛰었을 수 있다');
