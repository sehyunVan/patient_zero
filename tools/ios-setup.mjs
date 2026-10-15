/* iOS 프로젝트에 손으로 넣어야 하는 값들을 한 번에 박는다 — 맥에서 실행한다.
     cd mobile && npx cap add ios && cd .. && node tools/ios-setup.mjs

   Xcode 에서 클릭으로 하는 일과 **같은 일**이다(Target App → Info → URL Types …).
   손으로 하면 빠뜨리기 쉬운 자리들이라 적어 둔 대로 넣어 준다:

     ① URL Types — 구글 로그인 창이 사파리로 떴다가 **앱으로 돌아오는 길**.
        값은 iOS 클라이언트 ID 를 거꾸로 쓴 것이다(점 사이 순서를 뒤집는다).
        없으면 로그인 창은 뜨는데 끝나고 앱으로 못 돌아온다.
     ② 가로 전용 — 세로를 아예 빼 둔다. 웹판의 「폰을 돌려 주세요」는 보험이고, 앱은 OS 가 막는 게 맞다.
     ③ 전체 화면 · 상태 표시줄 숨김 — 아이패드에서 창 모드(Slide Over)로 뜨는 것을 막는다.

   Xcode 로 직접 할 거면: App(파란 아이콘) → TARGETS 의 App → Info 탭 → 맨 아래 URL Types → ＋.
   **PROJECT 가 아니라 TARGETS** 쪽이다 — 둘이 같은 이름이라 헷갈린다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLIST = path.join(ROOT, 'mobile/ios/App/App/Info.plist');

// server/.env 의 GOOGLE_IOS_CLIENT_ID 와 **같은 값**이어야 한다. 다르면 로그인이 조용히 실패한다.
const IOS_CLIENT_ID = '471925328010-e84hj0ulod1uia9difn798tsur8i87pr.apps.googleusercontent.com';
const REVERSED = 'com.googleusercontent.apps.' + IOS_CLIENT_ID.replace('.apps.googleusercontent.com', '');
const BUNDLE = 'sarl.patientzero.app';

if (!fs.existsSync(PLIST)) {
  console.error('Info.plist 가 없다 — 먼저 `cd mobile && npx cap add ios` 를 돌린다.\n찾은 자리: ' + PLIST);
  process.exit(1);
}
let plist = fs.readFileSync(PLIST, 'utf8');
const had = [];

/* ① URL Types */
if (plist.includes(REVERSED)) had.push('URL Types(이미 있음)');
else {
  const block = `	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>${BUNDLE}</string>
			<key>CFBundleTypeRole</key>
			<string>Editor</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>${REVERSED}</string>
			</array>
		</dict>
	</array>
`;
  plist = plist.replace(/\n<\/dict>\n<\/plist>/, '\n' + block + '</dict>\n</plist>');
  had.push('URL Types(넣음)');
}

/* ①-2 홈 화면 이름 — 어느 나라에서든 PATIENT ZERO.
   (스토어 등록 이름은 나라별로 따로다 — 한국 스토어는 「최초 감염자」. STORE.md §6) */
const NAME = 'PATIENT ZERO';
for (const key of ['CFBundleDisplayName', 'CFBundleName']) {
  const re = new RegExp('<key>' + key + '</key>\\s*\\n\\s*<string>[^<]*</string>');
  if (re.test(plist)) plist = plist.replace(re, `<key>${key}</key>\n	<string>${NAME}</string>`);
  else plist = plist.replace(/\n<\/dict>\n<\/plist>/, `\n	<key>${key}</key>\n	<string>${NAME}</string>\n</dict>\n</plist>`);
  had.push(key);
}

/* ② 가로 전용 — 아이폰·아이패드 둘 다 */
const landscape = `	<array>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>`;
for (const key of ['UISupportedInterfaceOrientations', 'UISupportedInterfaceOrientations~ipad']) {
  const re = new RegExp('(<key>' + key.replace('~', '~') + '</key>\\s*\\n)\\s*<array>[\\s\\S]*?</array>');
  if (re.test(plist)) { plist = plist.replace(re, `$1${landscape}`); had.push(key); }
  else { plist = plist.replace(/\n<\/dict>\n<\/plist>/, `\n	<key>${key}</key>\n${landscape}\n</dict>\n</plist>`); had.push(key + '(새로)'); }
}

/* ③ 전체 화면 · 상태 표시줄 */
for (const [key, value] of [['UIRequiresFullScreen', '<true/>'], ['UIStatusBarHidden', '<true/>'], ['UIViewControllerBasedStatusBarAppearance', '<false/>']]) {
  const re = new RegExp('<key>' + key + '</key>\\s*\\n\\s*<(true|false)/>');
  if (re.test(plist)) plist = plist.replace(re, `<key>${key}</key>\n	${value}`);
  else plist = plist.replace(/\n<\/dict>\n<\/plist>/, `\n	<key>${key}</key>\n	${value}\n</dict>\n</plist>`);
  had.push(key);
}

fs.writeFileSync(PLIST, plist);
console.log('Info.plist 에 넣었다:\n  ' + had.join('\n  '));
console.log('\n역순 URL 스킴: ' + REVERSED);
console.log('\nXcode 에서 아직 사람이 해야 하는 것(스크립트가 못 한다):');
console.log('  · Signing & Capabilities → Team 선택, Bundle ID ' + BUNDLE);
console.log('  · ＋ Capability → Sign in with Apple   ← 없으면 애플 로그인이 아예 안 뜬다');
console.log('  · Edit Scheme → Run → Options → StoreKit Configuration = None');
