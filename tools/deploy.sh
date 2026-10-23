#!/usr/bin/env bash
# 「PATIENT ZERO — 최초 감염자」를 NYC 박스에 올린다.
#
#   ./tools/deploy.sh            # 올린다
#   ./tools/deploy.sh --dry-run  # 쌓기만 하고 보여 준다
#
# Caddy 는 건드리지 않는다. 같은 박스에서 트레이딩 루프가 돌고 있어서
# `systemctl reload caddy` 가 실패하면 그게 같이 다친다.
# 기존 home 사이트의 루트(/var/www/home) 아래 하위 폴더로 들어가므로,
# file_server 가 알아서 /patient-zero/ 로 내준다 — 설정 변경이 필요 없다.
#
# 올라가는 것: index/phone.html, style.css, panels.css, manifest.webmanifest, js/*.js, icons/*(store 제외),
# assets/*.webp. 심사 문서 세 장은 제 주소(copycat.sarl/patient-zero/)로 따로 간다.
# assets/src(원본 PNG)·shots(스크린샷)·test·tools 는 올리지 않는다.
# 폰에서 받는 양을 줄이려고 그림은 전부 WebP 로 굽는다(원본 PNG 는 저장소에만 남는다).
set -euo pipefail

HOST="${HOST:-root@64.227.141.147}"
DEST="${DEST:-/var/www/home/patient-zero}"
URL="https://home.64-227-141-147.sslip.io/patient-zero/"
# 게임 파일 말고 **다른 두 주소**가 더 있다. 한 박스지만 Caddy 블록이 다르다:
#   · API — copycat.sarl/patient-zero/api/* → 127.0.0.1:4190. 게임의 PZ_API 가 이 주소다.
#     home 쪽에는 그 경로가 없다. 거기서 /api/config 를 찔러 404 를 받고 배포가 실패했다(2026-10-23).
#   · 심사 문서 세 장 — 두 스토어에 **이 주소로** 등록돼 있다.
API_URL="https://copycat.sarl/patient-zero/"
DOCS_DEST="${DOCS_DEST:-/var/www/copycat/patient-zero}"
DOCS_URL="https://copycat.sarl/patient-zero/"

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    *) echo "모르는 옵션: $a" >&2; exit 2 ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
say(){ printf '\033[36m▸\033[0m %s\n' "$*"; }

say "쌓는다: $STAGE"
mkdir -p "$STAGE/assets" "$STAGE/js" "$STAGE/icons" "$STAGE/i18n"
for f in index.html phone.html oauth.html manifest.webmanifest; do cp "$ROOT/$f" "$STAGE/$f"; done
# css 는 이름을 적지 않고 전부 가져온다 — 한 장이 늘 때마다 여기를 고치는 걸 잊으면
# 그 화면만 옷을 안 입은 채로 올라간다(2026-10-15 에 interaction/touch-feedback 두 장이 그랬다)
cp "$ROOT"/*.css "$STAGE/"
# 번역 번들. 이게 빠지면 영어·일본어가 **조용히** 한국어로 뜬다 — 오류도 안 난다
cp "$ROOT"/i18n/bundle.js "$STAGE/i18n/"
# 아이콘은 WebP 가 아니라 PNG·ICO 다(파비콘·홈 화면 아이콘). icons/store 는 스토어 제출용 원본이라 안 올린다
cp "$ROOT"/icons/*.png "$ROOT"/icons/*.ico "$STAGE/icons/"
cp "$ROOT"/js/*.js            "$STAGE/js/"
cp "$ROOT"/assets/*.webp      "$STAGE/assets/"        # assets/src(원본 PNG) 은 하위 폴더라 안 딸려온다
# 그림 하위 폴더(cast·icons·art·ui…)는 통째로 — 새 폴더가 생겨도 빠지지 않는다. src(원본)만 뺀다
for dir in "$ROOT"/assets/*/; do
  name="$(basename "$dir")"
  [ "$name" = "src" ] && continue
  mkdir -p "$STAGE/assets/$name"
  cp "$dir"*.webp "$STAGE/assets/$name/" 2>/dev/null || true
done
# 심사 문서 세 장 — 두 스토어가 **URL 로** 요구한다(지원 · 개인정보 · 계정 삭제).
# 게임과 **다른 주소**로 간다. 스토어에 그 주소가 적혀 있고, 지원 페이지의 index.html 과
# 게임의 index.html 이 같은 자리를 다투기 때문이다.
# 예전엔 게임 쪽에 support/ 로 한 벌 더 올렸다 — 아무도 안 보는 사본이라 낡기만 했다.
# (Caddyfile 이 같은 함정을 적어 두고 있다: 두 벌이 생기면 심사자는 낡은 쪽을 연다)
# site/ 의 스크린샷은 올리지 않는다(한 장이 3MB 다).
DOCS="$(mktemp -d)"
trap 'rm -rf "$STAGE" "$DOCS"' EXIT
cp "$ROOT"/site/index.html "$ROOT"/site/privacy.html "$ROOT"/site/delete.html "$ROOT"/site/_style.css "$DOCS/"

# assets 에 PNG 가 남아 있으면 폰이 몇 MB 를 더 받는다 — 올리긴 하되 알려는 준다
for big in "$ROOT"/assets/*.png; do
  [ -e "$big" ] || break
  cp "$big" "$STAGE/assets/"
  echo "   ⚠ PNG 그대로 올라감: $(basename "$big") $(du -h "$big" | cut -f1) — tools/bake.mjs 로 WebP 를 권함" >&2
done

# 빠진 그림이 있으면 폰에서 빈 화면이 된다 — 올리기 전에 참조를 맞춰 본다
missing=0
for ref in $(grep -rho "assets/[A-Za-z0-9_-]*\.\(webp\|png\|jpg\)" "$STAGE"/*.html "$STAGE"/*.css "$STAGE"/js/*.js | sort -u); do
  [ -f "$STAGE/$ref" ] || { echo "   빠짐: $ref" >&2; missing=1; }
done
# index.html 이 부르는 css·js 도 본다 — 그림만 보다가 번역 번들을 통째로 빠뜨렸다(2026-10-15)
for ref in $(grep -oE '(src|href)="[A-Za-z0-9_./-]+[.](js|css)"' "$STAGE/index.html" | sed 's/.*="//;s/"$//' | sort -u); do
  [ -f "$STAGE/$ref" ] || { echo "   빠짐(index.html 이 부른다): $ref" >&2; missing=1; }
done
[ "$missing" = "0" ] || { echo "참조하는 그림이 staging 에 없다" >&2; exit 1; }

SIZE="$(du -sh "$STAGE" | cut -f1)"
say "크기 $SIZE"
( cd "$STAGE" && find . -type f | sort | sed 's/^/    /' )
echo "    ── 심사 문서 → $DOCS_URL"
( cd "$DOCS" && find . -type f | sort | sed 's/^/    /' )

if [ "$DRY" = "1" ]; then say "--dry-run 이라 여기까지"; exit 0; fi

TAR="$STAGE/../patient-zero-$$.tgz"
tar -czf "$TAR" -C "$STAGE" .
say "보낸다 ($(du -h "$TAR" | cut -f1))"
scp -q "$TAR" "$HOST:/tmp/patient-zero.tgz"
rm -f "$TAR"

# 받는 쪽: 새 폴더에 풀고 한 번에 바꿔치기 — 반쯤 쓰인 상태가 보이는 창을 없앤다
ssh "$HOST" bash -se <<REMOTE
set -euo pipefail
DEST="$DEST"
rm -rf "\$DEST.new"
mkdir -p "\$DEST.new"
tar -xzf /tmp/patient-zero.tgz -C "\$DEST.new"
rm -f /tmp/patient-zero.tgz
rm -rf "\$DEST.old"
[ -d "\$DEST" ] && mv "\$DEST" "\$DEST.old" || true
mv "\$DEST.new" "\$DEST"
rm -rf "\$DEST.old"
chown -R root:root "\$DEST"
find "\$DEST" -type d -exec chmod 755 {} +
find "\$DEST" -type f -exec chmod 644 {} +
echo "   올라간 파일 \$(find "\$DEST" -type f | wc -l)개, \$(du -sh "\$DEST" | cut -f1)"
REMOTE

say "심사 문서 세 장 → $DOCS_DEST"
tar -czf "$DOCS/docs.tgz" -C "$DOCS" index.html privacy.html delete.html _style.css
scp -q "$DOCS/docs.tgz" "$HOST:/tmp/patient-zero-docs.tgz"
ssh "$HOST" bash -se <<REMOTE
set -euo pipefail
mkdir -p "$DOCS_DEST"
tar -xzf /tmp/patient-zero-docs.tgz -C "$DOCS_DEST"
rm -f /tmp/patient-zero-docs.tgz
chown -R caddy:caddy "$DOCS_DEST"
chmod 644 "$DOCS_DEST"/*.html "$DOCS_DEST"/*.css
REMOTE

say "확인"
code=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
echo "    $URL  ->  $code"
[ "$code" = "200" ] || { echo "열리지 않는다" >&2; exit 1; }
for f in js/game.js js/expansion.js style.css touch-feedback.css i18n/bundle.js assets/lobby.webp assets/characters.webp assets/infected.webp; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$URL$f")
  echo "    $f  ->  $c"
  [ "$c" = "200" ] || { echo "빠진 파일이 있다" >&2; exit 1; }
done
# API 와 심사 문서는 **다른 주소**다 — 여기서 틀리면 앱은 로그인이 꺼진 채로 뜨고,
# 스토어 심사는 열리지 않는 링크를 받는다
for u in "${API_URL}api/config" "${DOCS_URL}privacy.html" "${DOCS_URL}delete.html" "${DOCS_URL}"; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$u")
  echo "    $u  ->  $c"
  [ "$c" = "200" ] || { echo "스토어가 보는 주소가 열리지 않는다" >&2; exit 1; }
done
say "끝 — 폰에서 $URL"
