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

/* ③-2 UIScene 생명주기 — **iOS 26/27 에서는 이게 없으면 실행 순간 죽는다.**
   2026-10-15 심사 반려(2.1a)의 정체였다. 크래시 로그 맨 위가
   `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_` 였다 —
   UIKit 이 「장면(scene)을 안 쓰는 앱」을 보고 직접 트랩을 건다(EXC_BREAKPOINT).
   Capacitor 기본 템플릿은 아직 AppDelegate 만 쓰므로 여기서 채워 넣는다.

   SceneDelegate 를 **AppDelegate.swift 안에** 적는다. 파일을 새로 만들면 Xcode 프로젝트(pbxproj)의
   소스 목록에도 등록해야 하는데, 그 파일을 손으로 고치다 깨뜨리는 것이 더 위험하다.
   Swift 는 한 파일에 여러 클래스를 둘 수 있으니 이 편이 안전하다.

   URL 콜백도 같이 옮긴다 — 장면을 쓰면 `application(_:open:)` 대신 `scene(_:openURLContexts:)` 로 온다.
   구글 로그인이 돌아오는 길이 거기라, 안 옮기면 **로그인만 조용히 안 된다.** */
const APPDELEGATE = path.join(ROOT, 'mobile/ios/App/App/AppDelegate.swift');
if (fs.existsSync(APPDELEGATE)) {
  let swift = fs.readFileSync(APPDELEGATE, 'utf8');
  if (swift.includes('class SceneDelegate')) had.push('SceneDelegate(이미 있음)');
  else {
    if (!/^import Capacitor$/m.test(swift)) swift = swift.replace(/^import UIKit$/m, 'import UIKit\nimport Capacitor');
    swift += `

// ── iOS 26+ 의 장면 생명주기 ──────────────────────────────────────────
// tools/ios-setup.mjs 가 넣는다. 없으면 iOS 27 에서 **실행 순간 죽는다**(2.1a 반려의 원인).
// Info.plist 의 UIApplicationSceneManifest 가 이 클래스를 가리킨다.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController()
        self.window = window
        window.makeKeyAndVisible()
        // 앱이 꺼져 있을 때 열린 주소도 흘려보내지 않는다
        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    // 로그인 창이 돌아오는 길 — 장면을 쓰면 AppDelegate 가 아니라 여기로 온다
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
`;
    fs.writeFileSync(APPDELEGATE, swift);
    had.push('SceneDelegate(AppDelegate.swift 에 넣음)');
  }
} else had.push('AppDelegate.swift 없음 — cap add ios 먼저');

/* ③-3 Info.plist 의 장면 선언 */
if (plist.includes('UIApplicationSceneManifest')) had.push('UIApplicationSceneManifest(이미 있음)');
else {
  const manifest = `	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
		<key>UISceneConfigurations</key>
		<dict>
			<key>UIWindowSceneSessionRoleApplication</key>
			<array>
				<dict>
					<key>UISceneConfigurationName</key>
					<string>Default Configuration</string>
					<key>UISceneDelegateClassName</key>
					<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
				</dict>
			</array>
		</dict>
	</dict>
`;
  plist = plist.replace(/\n<\/dict>\n<\/plist>/, '\n' + manifest + '</dict>\n</plist>');
  had.push('UIApplicationSceneManifest(넣음)');
}
fs.writeFileSync(PLIST, plist);

/* ④ 서명 팀 — **project.pbxproj 에 박아 둔다.**
   Xcode 에서 고른 팀도 결국 이 파일에 적히는데, 버전을 올리느라 같은 파일을 커밋하면
   맥이 `git pull` 하는 순간 날아간다. 그러면 **화면에는 팀이 보이는데 빌드만 「팀이 없다」**고 한다
   (Signing for "App" requires a development team) — 막차 이후에서 한 번 당한 자리다(SHIPPING.md §4).
   Debug·Release 양쪽에 박고, 자동 서명으로 고정한다. */
const TEAM = 'FN9DUHVG65';
const PBX = path.join(ROOT, 'mobile/ios/App/App.xcodeproj/project.pbxproj');
if (fs.existsSync(PBX)) {
  const before = fs.readFileSync(PBX, 'utf8');
  /* **블록 단위로** 고친다. 줄 단위로 하면 이미 팀이 있는 설정에 한 줄을 더 넣어
     DEVELOPMENT_TEAM 이 두 번 적힌다(처음에 그렇게 썼다가 중복이 났다). */
  let count = 0;
  const pbx = before.replace(/buildSettings = \{[\s\S]*?\n(\s*)\};/g, block => {
    if (!/PRODUCT_BUNDLE_IDENTIFIER/.test(block)) return block;          // 앱 타깃의 설정만
    count++;
    if (/DEVELOPMENT_TEAM/.test(block)) return block.replace(/DEVELOPMENT_TEAM = "?[A-Z0-9]*"?;/, `DEVELOPMENT_TEAM = ${TEAM};`);
    return block.replace(/(\n(\s*)PRODUCT_BUNDLE_IDENTIFIER = [^;]+;)/, (m, line, indent) =>
      `${line}\n${indent}DEVELOPMENT_TEAM = ${TEAM};`);
  }).replace(/CODE_SIGN_STYLE = Manual;/g, 'CODE_SIGN_STYLE = Automatic;');
  if (pbx !== before) { fs.writeFileSync(PBX, pbx); had.push(`DEVELOPMENT_TEAM=${TEAM} · 빌드 설정 ${count}곳`); }
  else had.push(`DEVELOPMENT_TEAM(이미 ${TEAM} · ${count}곳)`);
} else had.push('project.pbxproj 없음 — cap add ios 먼저');

console.log('넣었다:\n  ' + had.join('\n  '));
console.log('\n역순 URL 스킴: ' + REVERSED);
console.log('\nXcode 에서 아직 사람이 해야 하는 것(스크립트가 못 한다):');
console.log('  · Signing & Capabilities → Team 선택, Bundle ID ' + BUNDLE);
console.log('  · ＋ Capability → Sign in with Apple   ← 없으면 애플 로그인이 아예 안 뜬다');
console.log('  · Edit Scheme → Run → Options → StoreKit Configuration = None');
