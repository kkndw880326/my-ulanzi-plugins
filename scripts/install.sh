#!/bin/bash
# 사용법: scripts/install.sh <플러그인 폴더명>
#   예) scripts/install.sh com.ulanzi.slackunread.ulanziPlugin
#
# 리포의 플러그인 폴더를 Ulanzi Studio 플러그인 폴더로 복사한다.
# 대상 폴더에 같은 이름의 플러그인이 있으면 리포 내용으로 덮어쓴다(리포에 없는 파일은 삭제).
# 반영하려면 복사 후 Ulanzi Studio 를 재시작해야 한다.
set -euo pipefail

PLUGIN="${1:?플러그인 폴더명을 지정하세요 (예: com.ulanzi.slackunread.ulanziPlugin)}"
PLUGIN="${PLUGIN%/}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/$PLUGIN"
DEST_ROOT="$HOME/Library/Application Support/Ulanzi/UlanziDeck/Plugins"

if [[ ! -f "$SRC/manifest.json" ]]; then
  echo "manifest.json 이 없습니다: $SRC" >&2
  exit 1
fi

if [[ -f "$SRC/package.json" ]]; then
  (cd "$SRC" && npm install --omit=dev --no-audit --no-fund)
fi

mkdir -p "$DEST_ROOT"
rsync -a --delete --exclude 'test/' --exclude '.DS_Store' "$SRC/" "$DEST_ROOT/$PLUGIN/"

echo "설치 완료: $DEST_ROOT/$PLUGIN"
echo "Ulanzi Studio 를 재시작하면 반영됩니다."
