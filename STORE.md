# 「최초 감염자 / PATIENT ZERO」 스토어 출시 — 고정한 값과 남은 일 (2026-10-14)

[README.md](README.md) 는 **게임이 재미있는가**를 본다. 이 문서는 **스토어에 올릴 수 있는가**만 본다.
먼저 읽을 것: 저장소 루트의 [`SHIPPING.md`](../SHIPPING.md) — copycat 을 두 스토어에 올리며 **실제로 반려된** 것들.
**제출 전에 한 번, 반려를 받으면 다시 한 번** 읽는다.

**결정(2026-10-14, 유저): 이름은 「최초 감염자 / PATIENT ZERO」.** 지금 로고·아이콘·카피·티저가 전부 이 이름에
맞춰져 있어 다시 구울 것이 없다. 영문권 검색에서 「Patient Zero」와 묻히는 것이 유일한 비용이고,
그건 부제(subtitle)로 벌충한다 — 아래 §6 원고.

---

## 1. 고정한 값 — 여기서부터는 되돌리기 어렵다

| | 값 | 되돌릴 수 있나 |
|---|---|---|
| 스토어 이름 (ko) | **최초 감염자** | 바꿀 수 있다 |
| 스토어 이름 (en) | **PATIENT ZERO** | 바꿀 수 있다 |
| 스토어 이름 (ja) | **零号感染者** | 바꿀 수 있다 (게임 안 번역과 같은 말) |
| iOS 번들 ID | `sarl.patientzero.app` | **못 바꾼다** |
| Android 패키지 | `sarl.patientzero.app` | **못 바꾼다** |
| Apple Services ID | `sarl.patientzero.signin` | 웹 흐름을 쓸 때만 만든다 — §3 |
| 인앱 상품 ID | `ticket_10` · `ticket_60` · `ticket_130` · `ticket_400` | **못 바꾸고, 지운 ID 는 재사용도 안 된다** |
| 재화 구조 | 모집권(유료) · 검체(무료) · 조각(부산물) — 서로 바뀌지 않는다 | [`ECONOMY.md`](ECONOMY.md) |
| 가격 모델 | **무료 + 인앱 결제** | **못 바꾼다**(유료/무료는 한 번 정하면 끝) |
| 심사 문서 URL | `https://copycat.sarl/patient-zero/` (지원) · `…/privacy.html` · `…/delete.html` | 바꿀 수 있다 |
| 같은 문서의 임시 주소 | `https://home.165-227-196-68.sslip.io/patient-zero/support/` — `tools/deploy.sh` 가 함께 올린다 | 콘솔에는 위 주소를 적는다 |
| 화면 방향 | **가로 고정** | 바꿀 수 있다 |
| 지원 언어 | 한국어 · English · 日本語 (기기 언어 따라감 + 설정에서 수동) | 늘릴 수 있다 |

`sarl.` 접두사는 copycat(`sarl.copycat.app`) · 막차 이후(`sarl.makcha.app`)와 같은 꼴을 쓴 것이다.
Apple 콘솔의 Identifiers 목록에서 세 앱이 나란히 보이고, 심사 문서도 이미 가진 `copycat.sarl` 아래에 둘 수 있다.

**상품 ID 는 `js/shop.js` 의 `PACKS[].sku` 가 유일한 출처다.** 위 표와 어긋나면
`node test/store-pay-test.cjs` 가 막는다 — 한 글자만 달라도 결제는 되고 물건은 안 들어간다(SHIPPING.md §5).

### 등록할 인앱 상품 네 개

두 콘솔과 `js/shop.js` 가 **같은 문자열·같은 금액**을 써야 한다. 어긋나면 결제는 되고 물건은 안 들어간다.
유형은 넷 다 **소모성**이다 — App Store 「소모품(Consumable)」, Play 「인앱 상품 · 소모성」.
**소모품에는 「구매 복원」을 달지 않는다**(copycat 이 3.1.1 로 반려된 자리다 — SHIPPING.md §0).

| 상품 ID | 가격(KRW) | 실제 지급 | 표시 이름 ko / en / ja |
|---|---|---|---|
| `ticket_10` | ₩1,100 | 모집권 **10장** | 모집권 10장 / Recruit Tickets ×10 / 募集券 10枚 |
| `ticket_60` | ₩5,500 | 모집권 **65장** (60 + 보너스 5) | 모집권 60장 / Recruit Tickets ×60 / 募集券 60枚 |
| `ticket_130` | ₩11,000 | 모집권 **145장** (130 + 보너스 15) | 모집권 130장 / Recruit Tickets ×130 / 募集券 130枚 |
| `ticket_400` | ₩33,000 | 모집권 **460장** (400 + 보너스 60) | 모집권 400장 / Recruit Tickets ×400 / 募集券 400枚 |

**ID 의 숫자는 기본 장수이고, 실제로 들어가는 것은 보너스를 더한 값이다.** 그래서 스토어 설명에는 둘을
같이 적는다 — 예: 「모집권 60장에 보너스 5장을 더해 **총 65장**을 드립니다. 모집권은 캐릭터 모집에 씁니다.」
이름만 적고 총량을 빼면 「상품 설명 불일치」로 걸린다(copycat 의 미해결 항목이 그것이었다).

가격은 **한국 원화 기준**으로 정한 값이다. 애플은 지역별 **가격 포인트 목록**에서 고르게 하므로, 콘솔에
그 금액이 없으면 가장 가까운 포인트로 맞추고 `js/shop.js` 의 `price` 와 위 표를 **같이** 고친다
(`node test/store-pay-test.cjs` 가 둘을 맞춰 본다). 다른 나라 가격은 콘솔이 환산해 제안하는 값을 그대로 쓴다.

> **2026-10-15 재화 개편 이후**(설계·구현은 [`ECONOMY.md`](ECONOMY.md)): 모집권은 **유료 전용**이고,
> 플레이로 들어오는 길은 **챕터 첫 통과**(챕터당 2장 · 19챕터 = 38장)와 처음 시작할 때의 10장뿐이다.
> 반복 수급은 0 이다. 일일 임무·출격·교환소는 전부 **검체**(무료 재화)로 나가고, 검체는 아이템 상점에서만 쓴다.
> **두 재화는 서로 바뀌지 않는다** — 심사 답변에 그대로 적을 수 있는 사실이고, `test/economy-test.cjs` 가 지킨다.

---

## 2. 끝난 것

| 한 일 | 왜 출시에 필요한가 | 어디 |
|---|---|---|
| **계정 삭제** — 게임 안 경로 + 서버 | 계정을 만들 수 있으면 **앱 안에서 지울 수 있어야 한다**(Apple 5.1.1(v) · Play 데이터 삭제 정책). 없으면 그 자리에서 반려 | `js/auth.js` · `POST /api/account/delete` · 검사 `test/auth-test.cjs` |
| **4.8 단추 크기 검사** | 제3자 로그인을 쓰면 「동등한 수단」이 **눈에도 같아야** 한다. 세로로 쌓아 폭을 맞췄고, px 로 재는 검사를 붙였다 | `test/auth-test.cjs` |
| **Sign in with Apple** | 구글을 넣는 순간 4.8 이 따라온다. 메일 코드로는 면제가 안 된다(주소를 숨길 수 없기 때문) — 애플 로그인이 그 조항의 답 | `js/auth.js` · `server/auth.mjs` |
| **모집 확률 공지** | 유료 확률형 재화는 확률을 적어야 한다. **뽑는 표와 공지가 같은 표**라 어긋날 수 없다 | `js/progression.js` (`DRAW`) · 검사 `test/store-pay-test.cjs` |
| **스토어 그림 36장 + 아이콘 + 홍보** | 화소가 한 장만 달라도 업로더가 통째로 되돌린다. 스크린샷은 **실제 플레이 화면**이어야 한다(2.3.3) | `site/` · `node tools/store-check.mjs` |
| **20초 티저** | App Store 앱 미리보기 · Play 프로모션 영상 | `promo/patient-zero-teaser.mp4` |
| **심사 문서 세 장** | 개인정보처리방침 · 계정 삭제 · 지원 — 셋 다 **URL 로** 요구된다 | `site/index.html` · `privacy.html` · `delete.html` |
| **서버 배포 파일** | systemd · Caddy · 환경 파일 서식 (투입은 허락 뒤) | `server/deploy/` |
| **ko / en / ja** | 언어마다 원고를 따로 올릴 수 있다. 번역 누수 0 | `i18n/` · `node tools/i18n-leak.mjs` |

---

## 3. 로그인 — 콘솔에서 채울 값과, 만들지 **않을** 것

| 수단 | 서버가 보는 환경 변수 | 콘솔에서 할 일 |
|---|---|---|
| Google (웹 · 안드로이드) | `GOOGLE_WEB_CLIENT_ID` | OAuth **웹** 클라이언트 ID 하나. 안드로이드는 이 값을 `serverClientId` 로 넘겨야 ID 토큰이 난다 — 안드로이드 클라이언트 ID 로는 안 난다 |
| Google (iOS) | `GOOGLE_IOS_CLIENT_ID` | iOS 클라이언트 ID. **iOS 판에서 구글 단추를 숨기면 안 만들어도 된다** |
| Apple (iOS 네이티브) | `APPLE_BUNDLE_ID` = `sarl.patientzero.app` | App ID 에 Sign in with Apple 체크. **aud 로 번들 ID 가 온다** |
| Apple (웹) | `APPLE_SERVICES_ID` = `sarl.patientzero.signin` · `APPLE_REDIRECT` | Services ID 와 Return URL (2026-10-15 발급·연결 완료). Team `FN9DUHVG65` |
| 메일 코드 | `RESEND_API_KEY` · `MAIL_FROM` | Resend 의 **HTTP API**(SMTP 아님) |
| 심사용 데모 | `DEMO_EMAIL=review@copycat.sarl` · `DEMO_CODE=503118` | 고정 코드 한 쌍. 메일이 실제로 가지 않는다 |

### 발급받은 구글 클라이언트 ID (2026-10-15 · 프로젝트 471925328010)

| 어디에 쓰나 | 값 | 어디에 넣나 |
|---|---|---|
| **웹** — 서버가 검증하는 `aud`, 안드로이드의 `serverClientId` | `471925328010-7u5l0thds2peipm327r8395e4pe96mnv.apps.googleusercontent.com` | `server/.env` 의 `GOOGLE_WEB_CLIENT_ID` (화면은 `/api/config` 로 받아 간다) |
| **iOS** | `471925328010-e84hj0ulod1uia9difn798tsur8i87pr.apps.googleusercontent.com` | `server/.env` 의 `GOOGLE_IOS_CLIENT_ID` + iOS `Info.plist` 에 **역순** URL 스킴 `com.googleusercontent.apps.471925328010-e84hj0ulod1uia9difn798tsur8i87pr` |
| **안드로이드** | `471925328010-nd06egu8juahv6e1ioklbo2p2ciukcf0.apps.googleusercontent.com` | **서버에는 안 넣는다**(aud 로 오지 않는다). 콘솔에서 패키지 `sarl.patientzero.app` + **서명 지문**으로 묶는 용도 |

지문은 셋이 다르다 — 디버그 `86:14:0E:E0:1C:74:E0:C3:95:AD:14:A3:76:33:B9:DA:13:28:61:97` ·
업로드 키(껍데기 만들 때 생성) · **Play 앱 서명 키(첫 AAB 업로드 뒤 Play Console → 앱 무결성 → 앱 서명)**.
마지막 것을 빼먹으면 **Play 로 받은 앱에서만** 구글 로그인이 죽는다(`DEVELOPER_ERROR`).

> 클라이언트 ID 는 **비밀이 아니다** — 앱 안에 그대로 들어간다. 이 저장소에서 비밀인 것은
> 애플 `.p8` 과 Resend 키뿐이고, 둘 다 `server/.env` 에만 두고 올리지 않는다.

### 판마다 여는 로그인 수단이 다르다 (2026-10-15 결정)

| | 구글 | 애플 | 메일 코드 |
|---|---|---|---|
| **Android** | ○ | **×** | ○ |
| **iOS** | ○ | **○ (필수)** | ○ |
| 웹 | ○ | ○ | ○ |

- **안드로이드에서 애플을 빼는 이유.** 안드로이드 사용자가 애플 계정으로 들어올 이유가 거의 없는데,
  넣으면 **웹 흐름**(Services ID · Return URL · `.p8` 로 서명한 6개월짜리 비밀)을 통째로 세워야 한다 —
  SHIPPING.md §3 의 「콘솔에서 틀린 값 넷」이 전부 그 길에 있다.
- **iOS 에서 애플을 넣는 이유.** 제3자 로그인(구글)이 있으면 애플이 **동등한 수단**을 요구한다(4.8).
  메일 코드로는 면제가 안 된다 — 주소를 숨길 수 없기 때문이다. iOS 네이티브 흐름은 `aud` 가 번들 ID 로
  와서 위의 함정 넷을 하나도 밟지 않는다.
- 가르는 곳은 `js/auth.js` 의 `platform()` 한 곳(Capacitor 가 알려 준다. 없으면 웹).
  `test/auth-test.cjs` 가 세 판을 모두 열어 **안드로이드엔 애플 단추가 0개**, **iOS 엔 구글과 같은 크기**인지 잰다.
- 단추에는 각각 **구글 4색 G** 와 **애플 마크**가 붙는다. 전역 svg 규칙이 선 그림이라,
  로고만 `fill` 과 `stroke:none` 으로 따로 그린다(브랜드 가이드라인상 모양·색을 바꾸면 안 된다).

> 앱 안에서 **구글 로그인은 아직 못 연다** — 구글이 WebView 의 OAuth 를 막는다(`disallowed_useragent`).
> 네이티브 플러그인(`@capgo/capacitor-social-login`)으로 바꿔야 열린다. 그때까지 앱의 실질 수단은 **메일 코드**다.

### 앱 안의 로그인 — 네이티브 플러그인 (2026-10-15)

`@capgo/capacitor-social-login` 을 붙였다. **구글이 WebView 안의 OAuth 를 막기** 때문이다(`disallowed_useragent`) —
팝업을 열면 시스템 브라우저로 나가고, 거기서 로그인이 끝나도 **앱으로 돌아올 길이 없다**(창이 다르다).

| 판 | 구글 | 애플 |
|---|---|---|
| 웹 | 팝업 + fragment → `oauth.html` | 팝업 + form_post → `POST /api/auth/apple` |
| 안드로이드 | 플러그인(Credential Manager) — **웹 클라이언트 ID** 를 넘긴다 | 안 띄운다 |
| iOS | 플러그인 — iOS 클라이언트 ID | 플러그인(OS 창), 토큰의 aud 는 **번들 ID** |

- 안드로이드에서 **웹** 클라이언트 ID 를 넘기는 게 급소다. 안드로이드 클라이언트 ID 로는 ID 토큰이 안 나온다.
  그 대신 콘솔에 **패키지명 + 서명 지문**이 등록돼 있어야 한다(디버그·업로드·Play 재서명 셋이 다르다).
- 플러그인이 없으면 단추를 **꺼 둔다** — 눌리는데 안 되는 단추보다 낫다. 화면에 「앱에서는 준비 중」.
- 서버는 네 가지 aud 를 받는다: 구글 웹·구글 iOS·애플 번들·애플 Services ID.
**애플 콘솔에서 걸린 자리.** Domains 칸은 **도메인만** 받는다 — `https://` 나 경로를 넣으면
「One or more domains are invalid」로 막힌다. 도메인은 `home.165-227-196-68.sslip.io`,
Return URL 은 `https://home.165-227-196-68.sslip.io/patient-zero/api/auth/apple` 전체 주소다.

**웹 흐름을 열면서 배운 것.** 애플은 토큰을 주소 뒤가 아니라 **POST 본문(form_post)** 으로 돌려준다 —
정적 파일로는 못 받아서 서버가 `POST /api/auth/apple` 로 직접 받는다. 구글은 fragment 라 `oauth.html` 이 받는다.
둘의 모양이 다른 게 맞다.

**(옛 기록) 1차에 Services ID 를 만들지 않는 이유.** SHIPPING.md §3 의 「콘솔에서 틀린 값 넷」은 전부 **웹 흐름**의
함정이다(Client IDs 순서 · `sub` · `.p8` 로 서명한 JWT · Return URL). 네이티브 iOS 로그인은 그 넷을 하나도
밟지 않고, `aud` 가 번들 ID 로 오는 것만 맞으면 된다. **6개월마다 비밀을 갈아 끼우는 일도 없다.**
웹판(home 사이트)에서 애플 로그인을 열고 싶어지면 그때 Services ID 를 만들고 `APPLE_AUD` 에 쉼표로 더한다.

> 비어 있는 키는 그 수단을 **꺼진 채로** 띄운다. `/api/config` 가 무엇이 켜졌는지 그대로 말하고,
> 화면은 꺼진 단추를 비활성으로 그린다. 아무 `aud` 나 받아 주는 것보다 꺼진 편이 낫다.

서버 켜는 순서는 [`server/deploy/README.md`](server/deploy/README.md). **Caddy 는 허락 뒤에** —
같은 박스에서 트레이딩 루프가 돈다.

---

## 3-2. 다시 굽는 법 — 안드로이드 · iOS

웹(배포본)과 앱이 **같은 파일**을 쓴다. `tools/pack-mobile.mjs` 가 그 한 벌을 굽고,
Capacitor 가 그걸 그대로 담는다. 그래서 굽는 단계를 빼먹으면 **옛 번들이 들어간 채로 빌드가 성공한다.**

### 안드로이드 (윈도에서 됨)

```bash
cd mobile
npm install                 # 처음 한 번
npm run aab                 # 굽기 → cap sync android → bundleRelease 를 한 줄로
#   → mobile/android/app/build/outputs/bundle/release/app-release.aab
```

**`npx cap sync` 만 부르면 안 된다** — 그건 `webDir` 를 복사만 한다.
`npm run aab` 은 `tools/build-aab.mjs` 를 부른다 — 굽기·동기화·gradle 을 **순서대로, 실패하면 거기서 멈춘다.**
gradle 래퍼 이름이 판마다 달라서(`gradlew.bat` / `gradlew`) 그 선택도 여기서 한다.

버전은 `npm run aab -- --bump` 으로 올린다(versionCode +1). 손으로 고치려면
`mobile/android/app/build.gradle` 의 둘을 같이 본다:
`versionCode`(스토어가 보는 번호, 같은 번호는 두 번 못 올린다) · `versionName`(사람이 보는 이름).

### iOS (맥에서만)

```bash
git clone https://github.com/sehyunVan/patient_zero.git
cd patient_zero
node tools/fetch-fonts.mjs            # 글꼴 832조각 — 저장소에 없다
cd mobile && npm install
npx cap add ios                       # 처음 한 번
cd .. && node tools/ios-setup.mjs     # Info.plist (URL 스킴 · 이름 · 가로 고정 · 전체 화면)
node tools/ios-icons.mjs              # 앱 아이콘 1024²(알파 없음) · 스플래시 2732²
                                      #   원화: icons/store/app-icon-1024.png (저장소에 있다)
cd mobile && npm run pack && npx cap sync ios
npx cap open ios                      # Xcode
```

Xcode 에서 **사람이 해야 하는 것 셋** (스크립트가 끝나면 다시 알려 준다):

| 자리 | 할 일 |
|---|---|
| Signing & Capabilities | Team 선택 · Bundle ID `sarl.patientzero.app` |
| ＋ Capability | **Sign in with Apple** — 없으면 iOS 애플 로그인이 아예 안 뜬다 |
| Edit Scheme → Run → Options | StoreKit Configuration = **None** (안 그러면 결제가 가짜 거래가 된다) |

그다음 `Product → Destination → Any iOS Device → Archive → Distribute App`.

### 두 판 공통

- 홈 화면 이름은 **PATIENT ZERO** 로 고정이다(스토어 등록 이름은 나라별로 따로 — §6 원고).
- 번들에 박히는 서버 주소는 `tools/pack-mobile.mjs` 의 `--api`(기본값이 지금 서버다).
- 굽고 나면 `pack-mobile` 이 스스로 점검한다 — CDN 글꼴 잔재 · 서버 주소 · 끊긴 경로.

---

## 4. 사람이 해야 하는 것 — 내가 못 하는 자리

순서는 SHIPPING.md §6 그대로다. **3번과 6번을 앞당기는 것**이 그 노트의 요점이다.

```
1  유료 앱 계약 · 세금 · 은행        ← 제일 오래 걸린다. 비어 있으면 상품이 「제출 준비 안 됨」에서 안 넘어간다
2  Play 비공개 테스트 14일 시작       ← 12명이 아니라 14~15명. 한 명 빠지면 시계가 리셋된다
3  App ID `sarl.patientzero.app` + Sign in with Apple 체크 · Play 앱 등록
     └ Play 앱 서명 **재서명 SHA-1** 을 구글 OAuth 콘솔에 넣는다(안 넣으면 안드로이드 구글 로그인만 조용히 죽는다)
4  인앱 상품 4개 등록(위 표의 ID 그대로) → 실기기에서 결제 한 바퀴
5  스크린샷·원고 올리기(§6) · 앱 개인정보/데이터 안전성(§7) · 연령 등급
6  2.1 녹화 + 답변을 **미리 써 둔다**  ← §8 에 원고가 있다. 신규 계정이면 어차피 온다
7  Archive → 업로드 → 상품을 버전에 붙여 **함께** 제출
```

내가 손댈 수 없는 것: 두 콘솔의 모든 입력, `.p8`·키 발급, 실기기 결제, Archive·업로드, 테스터 모집.

---

## 5. 지금 막혀 있는 것 — 결정이 필요한 둘

### ① 1차 제출에 결제를 넣는가

상점의 꾸러미 네 칸은 지금 **「준비 중」으로 눌리지 않는다.** 그 상태가 그대로 심사에 가면 위험하다 —
막차 이후에서 **눌러도 「준비 중」만 뜨던 단추 자체가 2.1 사유**였다(SHIPPING.md §1).

| 길 | 해야 하는 일 | 비용 |
|---|---|---|
| **A. 결제를 붙여 함께 낸다** | RevenueCat + 네이티브 IAP(막차 이후 `poc/pay-native.js` 를 옮긴다) · 서버에 웹훅 · 상품 4개 등록 · 실기기 한 바퀴 | 며칠 |
| **B. 꾸러미 칸을 숨기고 먼저 낸다** (추천) | `js/shop.js` 에서 `PACKS` 를 접고, 조각 교환·무료 획득만 남긴다. 상품은 다음 버전에 붙인다 | 반나절 · 2.1 사유 하나를 지운다 |

B 를 추천하는 이유는 리텐션을 먼저 재는 쪽이 낫기 때문이다 — 결제는 사람이 남는 걸 본 다음에 붙이면 된다.
다만 **「첫 제출은 상품을 앱 버전에 붙여 같이 낸다」**(SHIPPING.md §2)를 한 번 더 쓰게 되는 비용이 있다.
+ 단추는 유저가 직접 요청해 만든 자리다. **지우지 말고 접는다** — 결정은 유저가 한다.

### ② 앱 껍데기 — 안드로이드는 **구워졌다**(2026-10-15), iOS 는 아직

```
mobile/                      Capacitor 8 · appId sarl.patientzero.app
tools/fetch-fonts.mjs        글꼴 832조각 11.3MB — CDN 없이도 제 글꼴로 뜬다
tools/pack-mobile.mjs        dist/mobile 조립 + 점검(끊긴 경로 · CDN 잔재 · 서버 주소)
mobile/android/              가로 고정(sensorLandscape) · 아이콘 5크기 + 적응형
```

| | 값 |
|---|---|
| versionCode / versionName | `26101502` / `1.0.1015b` (26101501 은 이미 올렸다 — **같은 번호는 두 번 못 쓴다**) |
| 업로드 키 | `C:/Users/sehyu/keys/patientzero-upload.jks` (별칭 `patientzero`) — **저장소 밖** |
| 업로드 키 SHA-1 | `49:56:3C:9A:22:C5:1A:73:A7:BB:12:D0:D3:B6:2A:90:12:B4:1C:8C` ← 구글 OAuth 콘솔에 넣는다 |
| 번들에 박힌 서버 주소 | `https://home.165-227-196-68.sslip.io/patient-zero` |

**다시 굽는 순서**

```
node tools/fetch-fonts.mjs            # 한 번만 (fonts/ 가 없을 때)
cd mobile && npm run aab              # 굽기 → cap sync → bundleRelease 를 한 줄로
  → android/app/build/outputs/bundle/release/app-release.aab
```

**`cap sync` 만 부르면 안 된다** — 그건 `webDir` 를 **복사만** 한다. 굽는 단계를 빼먹으면
옛 번들이 그대로 앱에 들어가고, 빌드는 멀쩡히 성공한다(2026-10-15 에 한 번 당했다).
그래서 `npm run aab` 이 굽기부터 하도록 묶어 두었다.

`pack-mobile.mjs` 는 굽고 나서 **스스로 점검한다** — Google Fonts 주소가 남아 있으면(비행기 모드에서
글자가 안 나온다), 서버 주소가 안 박혔으면(로그인·순위가 꺼진 채로 뜬다), index.html·js 가 부르는
파일이 번들에 없으면 거기서 멈춘다.

**아직 남은 것**

- **웹뷰 안에서 구글 로그인은 안 된다.** 구글이 WebView 의 OAuth 를 막는다(`disallowed_useragent`).
  네이티브 플러그인(막차 이후가 쓴 `@capgo/capacitor-social-login`)으로 바꿔야 앱에서 열린다.
  **내부 테스트는 데모 계정(메일 고정 코드)으로 들어갈 수 있다.**
- **Resend 키가 없어 일반 메일 로그인은 꺼져 있다.** 키를 넣으면 바로 열린다.
- iOS 는 맥에서: `cd mobile && npx cap add ios` → `node tools/ios-setup.mjs` →
  Xcode 에서 Team · Bundle ID · **Sign in with Apple** 체크 → Archive.
  `ios-setup.mjs` 가 Info.plist 에 박는 것: 구글 역순 URL 스킴(로그인이 앱으로 돌아오는 길) ·
  가로 전용 · 전체 화면 · 상태 표시줄 숨김. 손으로 하면 **URL Types 를 제일 자주 빠뜨린다.**

---|---|
| versionCode / versionName | `26101501` / `1.0.1015` |
| 업로드 키 | `C:/Users/sehyu/keys/patientzero-upload.jks` (별칭 `patientzero`) — **저장소 밖** |
| 업로드 키 SHA-1 | `49:56:3C:9A:22:C5:1A:73:A7:BB:12:D0:D3:B6:2A:90:12:B4:1C:8C` ← 구글 OAuth 콘솔에 넣는다 |
| 번들에 박힌 서버 주소 | `https://home.165-227-196-68.sslip.io/patient-zero` |

**다시 굽는 순서**

```
node tools/fetch-fonts.mjs            # 한 번만 (fonts/ 가 없을 때)
cd mobile && npx cap sync android     # pack-mobile 이 dist/mobile 을 다시 굽고 복사한다
cd android && gradlew.bat bundleRelease
  → app/build/outputs/bundle/release/app-release.aab
```

`pack-mobile.mjs` 는 굽고 나서 **스스로 점검한다** — Google Fonts 주소가 남아 있으면(비행기 모드에서
글자가 안 나온다), 서버 주소가 안 박혔으면(로그인·순위가 꺼진 채로 뜬다), index.html·js 가 부르는
파일이 번들에 없으면 거기서 멈춘다.

**아직 남은 것**

- **웹뷰 안에서 구글 로그인은 안 된다.** 구글이 WebView 의 OAuth 를 막는다(`disallowed_useragent`).
  네이티브 플러그인(막차 이후가 쓴 `@capgo/capacitor-social-login`)으로 바꿔야 앱에서 열린다.
  **내부 테스트는 데모 계정(메일 고정 코드)으로 들어갈 수 있다.**
- **Resend 키가 없어 일반 메일 로그인은 꺼져 있다.** 키를 넣으면 바로 열린다.
- iOS 는 `npx cap add ios` 부터 — 맥에서 한다.

---|---|
| versionCode / versionName |  /  |
| 업로드 키 |  (별칭 ) — **저장소 밖** |
| 업로드 키 SHA-1 |  ← 구글 OAuth 콘솔에 넣는다 |
| 서버 주소 |  (번들에 박힘) |

**다시 굽는 순서**



**아직 남은 것**

- **웹뷰 안에서 구글 로그인은 안 된다.** 구글이 WebView 의 OAuth 를 막는다().
  네이티브 플러그인(막차 이후가 쓴 )으로 바꿔야 앱에서 열린다.
  내부 테스트는 **데모 계정(메일 고정 코드)** 으로 들어갈 수 있다.
- **Resend 키가 없어 일반 메일 로그인은 꺼져 있다.** 키를 넣으면 바로 열린다.
- iOS 는  부터 — 맥에서 한다.

---

## 6. 원고 — 그대로 붙여 넣는다

### 이름 · 부제

| | 이름 (30자) | 부제 (30자) |
|---|---|---|
| ko | 최초 감염자 | 90초, 도시를 감염시켜라 |
| en | PATIENT ZERO | Spread the outbreak in 90s |
| ja | 零号感染者 | 90秒、街を感染させろ |

### 설명 (ko)

```
당신은 이 도시의 최초 감염자입니다.

백신을 든 사람들이 거리를 지키고, 당신에게 남은 시간은 90초뿐입니다.
닿은 사람은 쓰러지지 않습니다 — 당신 편이 되어 같이 번집니다.
한 명이 둘, 둘이 넷. 90초가 끝날 때 도시가 누구의 것인지가 정해집니다.

■ 90초 한 판
짧게 끊어 가는 가로 화면 액션입니다. 왼손으로 움직이고, 오른손으로 돌진해
백신을 피합니다. 한 판이 지하철 한 정거장보다 짧습니다.

■ 19개 챕터, 8곳의 거리
학교 · 지하철 · 공장 · 항구 · 연구소… 통과선을 넘기면 다음 거리가 열립니다.

■ 20명의 감염자
붉은 눈을 가진 아이들. 빠른 아이, 단단한 아이, 번지게 하는 아이 —
누구를 데리고 나가느냐로 한 판이 달라집니다. 로비에서 말을 걸면 대답합니다.

■ 광고 없음
광고도, 추적도, 알림도 없습니다. 로그인 없이 끝까지 할 수 있습니다.

■ 모집 확률은 전부 적어 두었습니다
모집 화면의 「모집 확률 · 보장 안내」에 결과별 확률과 보장 횟수가 그대로 있습니다.
게임이 실제로 뽑는 표와 같은 표를 보여 줍니다.

가로로 쥐고, 90초만 써 보세요.
```

### 프로모션 텍스트 (170자, ko)

```
퍼뜨리는 쪽에 앉는 90초. 닿은 사람은 쓰러지지 않고 당신 편이 되어 같이 번집니다. 광고 없음 · 로그인 없이 플레이 · 모집 확률 전부 공개.
```

### 키워드 (ASC, 100자 · 쉼표만, 공백 없이)

```
좀비,감염,생존,서바이벌,가챠,미소녀,아포칼립스,액션,가로,한손,아케이드,수집,디스토피아,방치
```

영문: `zombie,infection,outbreak,survival,gacha,anime,apocalypse,arcade,action,landscape,collect,idle`

### 스크린샷 순서 (두 스토어 동일)

[`site/README.md`](site/README.md) 의 번호 그대로. **앞 두 장이 실제 플레이 화면**이다 —
타이틀·로그인만 올리면 2.3.3 으로 잡힌다.

### 영상

`promo/patient-zero-teaser.mp4` — 1920×1080 · 30fps · 20초 · H.264+AAC.
Play 프로모션 영상은 YouTube 링크라 이대로 쓴다. **App Store 앱 미리보기는 칸마다 요구 화소가 다르다** —
ASC 가 거부하면 같은 영상을 그 칸의 화소로 다시 뽑는다(게임이 2.16:1 이라 세로를 잘라도 화면이 산다).
출시 전이라 영상에 **스토어 배지·출시일·가격은 넣지 않았다.**

---

## 7. 앱 개인정보 · 데이터 안전성 — 설문에 그대로 답할 값

근거 문서는 [`site/privacy.html`](site/privacy.html). **코드가 하는 일만 적었다.**

| 항목 | 답 |
|---|---|
| 수집하는 것 | **이메일 주소**(계정) · **게임 진행 상황**(클라우드 저장) · **순위 기록**(표시 이름 · 대표 캐릭터 · 최고 기록 · 챕터). 로그인하지 않으면 **아무것도** 수집하지 않는다 |
| 공개되는 것 | 순위의 **표시 이름 · 대표 캐릭터 아이콘 · 점수 · 챕터**. 이메일은 나가지 않는다. **등재를 끄는 스위치는 없다**(2026-10-15 결정) — 공개가 싫으면 로그인하지 않고 플레이한다 |
| 신원과 연결되는가 | 이메일 — 그렇다. 진행 상황 — 계정에 붙으므로 그렇다 |
| 추적(Tracking) | **없다.** 광고 식별자·분석 SDK·광고망이 하나도 없다 |
| 제3자 | Google · Apple(로그인) · Resend(코드 메일) · Google Fonts(**웹판만**) |
| 전송 중 암호화 | HTTPS |
| 삭제 요청 | 앱 안 경로 + [`site/delete.html`](site/delete.html) |
| 권한 | 없음 (연락처·사진·위치·마이크·카메라 모두 요구하지 않는다) |
| 연령 등급 | **12+ 로 신청한다** — 좀비·감염 묘사(만화풍, 피 없음), 유료 확률형 재화. 설문에서 「Infrequent/Mild Horror or Fear Themes」와 「Contests/Gambling 아님」을 고른다. 최종 등급은 각 콘솔의 설문 결과를 따른다 |

---

## 8. 2.1 Information Needed — 미리 써 둔 답변

신규 개발자 계정의 첫 앱에는 **거의 반드시 온다.** 반려가 아니다. 빌드를 다시 올릴 일도 아니다.
답글로 아래를 붙이고, **같은 내용을 App Review Information 의 Notes 칸에도** 넣는다.

### 녹화에 담을 순서

로그인 뒤에만 계정 삭제가 보이는 구조이므로 **로그인 → 삭제 순서를 꼭 밟는다.**
안 그러면 애플이 「삭제 흐름이 없다」로 읽는다(SHIPPING.md §2).

```
0:00  실행 — 타이틀, 로그인 없이 바로 시작
0:05  인트로 5컷(건너뛰기도 보여 준다)
0:20  첫 전투 + 튜토리얼 4단계 — 움직이기 · 감염 · 번짐 · 돌진
1:00  결과 화면 → 로비
1:10  캐릭터 — 반신 카드를 옆으로 넘기고, 대표를 바꾼다
1:25  모집 — 「모집 확률 · 보장 안내」를 펼쳐 확률표를 보여 준다
1:40  상점 — 꾸러미 칸(결제 상태를 그대로 보여 준다) · 아이템 상점(검체) · 조각 교환
1:55  설정 — 언어를 영어로 바꿔 보인다
2:05  로그인 → 데모 계정 메일 코드로 입장
2:25  계정 삭제 → 확인 화면 → 삭제 → 로그인 전 화면으로 돌아옴
```

### 붙여넣을 전문 (영문 · 7항목)

```
1. SCREEN RECORDING
Attached; iPhone, latest iOS, from launch. Timestamps above.

2. PURPOSE AND AUDIENCE
PATIENT ZERO is a single-player landscape arcade game. You are the first
infected person in a city; in 90 seconds you must reach as many people as
possible. People you touch are not defeated - they join you and spread with
you, so one becomes two and two becomes four.
Nineteen chapters across eight streets, twenty playable infected characters.
Audience: adults and teens who want a 90-second game. No ads, no notifications,
no tracking. Rated 12+ for cartoon-style infection themes; there is no blood or
gore.

3. SETUP AND ACCESS
No account is needed: launching starts the game at once and every chapter is
reachable without signing in. Sign-in (title screen "Log in", or Settings >
Save > Log in) is optional and only carries the save across devices.
Demo account for review: review@copycat.sarl with the fixed code 503118 - it is a
fixed code, so no email is sent and no inbox is required.
Once signed in, "Delete account" in the same panel erases the account, the
cloud save and every device's session, in-app
(guide: https://copycat.sarl/patient-zero/delete.html).

4. EXTERNAL SERVICES
Our own account server (login and cloud save; Node, no third-party backend).
Google Sign-In and Sign in with Apple - identity tokens only; we read the email
claim and nothing else. Resend - email delivery for the six-digit sign-in code
only. Google Fonts - web build only; the app bundles its fonts.
No AI service, analytics or attribution SDK, ad network or third-party data
provider, and no cross-app or cross-site tracking.

5. REGIONAL DIFFERENCES
None. The same content everywhere; nothing is country-gated. Korean, English
and Japanese follow the device language and can be switched in Settings.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not a regulated industry: a single-player game with no financial, medical,
gambling or government function. The infection theme is fiction and does not
reference any real disease, place or person.
All art, music and voice in the app are ours. Fonts: Barlow Condensed, Gothic
A1, Noto Sans KR, Nanum Pen Script (SIL OFL 1.1).

7. IN-APP PURCHASE
Four consumables, nothing else: ticket_10 (10 recruit tickets), ticket_60
(60 + 5 bonus = 65), ticket_130 (130 + 15 = 145), ticket_400 (400 + 60 = 460).
Tickets are spent on character recruitment and on nothing else; they cannot buy
items. Odds are published in-app under Recruit > "Odds and guarantees": a
character appears in 10% of standard draws (SSR 0.8%) and 15% of the pickup
banner (SSR 2.0%); the rest are tactical supplies, fragments and samples. A
character is guaranteed within 30 draws and an SSR within 80.
Progress does not require a purchase: all 19 chapters are playable without one,
and recruit tickets are also granted for clearing each chapter for the first
time (2 per chapter, plus 10 at the start). Everything else the game rewards is
"samples", a free currency earned by playing and spent only in the item shop on
permanent tactical-supply upgrades. The two currencies do not convert in either
direction.
```

> 데모 계정 `review@copycat.sarl` / `503118` 은 **계정 서버가 떠 있어야** 동작한다(`.env` 의 `DEMO_EMAIL`·`DEMO_CODE`).
> 서버 없이 제출하면 심사자가 「로그인 하기」를 눌렀을 때 「서버 없음」만 본다 — §3 의 배포가 제출보다 먼저다.
> §8 의 확률 숫자는 `js/progression.js` 의 `DRAW` 표에서 계산한 값이고, `node test/store-pay-test.cjs` 가
> 이 문서와 그 표를 맞춰 본다 — 표를 고치면 검사가 먼저 깨진다.

---

## 9. 제출 전 마지막 점검

```
node tools/store-check.mjs      # 그림 36장 + 아이콘 + 홍보 화소·알파·장수
node test/store-pay-test.cjs    # 상품 ID · 확률 공지가 코드와 같은가
node test/auth-test.cjs         # 로그인 · 4.8 단추 크기 · 계정 삭제
node tools/i18n-leak.mjs        # en/ja 에 한국어가 새지 않는가
```

- [ ] 유료 앱 계약 「활성」
- [ ] 상품 4개가 **앱 버전에 붙어** 있다 (따로 심사되지 않는다)
- [ ] 스크린샷 셋(6.9 · 6.5 · 13") 모두 올렸다
- [ ] 지원 URL · 개인정보 URL 이 실제로 열린다
- [ ] App Review Notes 에 §8 전문과 데모 계정을 넣었다
- [ ] StoreKit Configuration = **None** (Xcode Scheme → Run)
- [ ] `.p8` 과 `.env` 가 저장소에 없다
