#!/bin/sh
# Pixel test: renders two plan SVGs in headless Chromium, all devices off and
# all on (compare-render.html), and compares the screenshots.
#   tools/compare-render.sh old.svg new.svg [--names a.json] [--names-new b.json]
# exit 1 when they differ. --names: the name table the SVGs were built with
# (for the state classes); --names-new: a different one for new.svg.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PORT=${PORT:-8767}
OUT=$(mktemp -d)
WEB=$(mktemp -d)
PROFILE=$(mktemp -d)
cp "$HERE/compare-render.html" "$HERE/../generator/names.js" "$WEB/"
cp "$1" "$WEB/old.svg"; cp "$2" "$WEB/new.svg"
shift 2
while [ $# -gt 0 ]; do
  case "$1" in
    --names) cp "$2" "$WEB/names.json"; shift 2 ;;
    --names-new) cp "$2" "$WEB/names-new.json"; shift 2 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WEB" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$PROFILE" "$WEB"' EXIT
sleep 1
for state in off on; do
  for tag in old new; do
    chromium --headless --no-sandbox --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
      --virtual-time-budget=5000 --window-size=1234,633 --force-device-scale-factor=2 \
      --screenshot="$OUT/$tag-$state.png" "http://127.0.0.1:$PORT/compare-render.html?svg=$tag.svg&state=$state" >/dev/null 2>&1
  done
done
python3 - "$OUT" <<'PY'
import sys
from PIL import Image, ImageChops
d = sys.argv[1]; bad = 0
for st in ("off", "on"):
    a = Image.open(f"{d}/old-{st}.png").convert("RGB"); b = Image.open(f"{d}/new-{st}.png").convert("RGB")
    diff = ImageChops.difference(a, b)
    px = sum(1 for p in diff.getdata() if max(p) > 8)
    print(f"{st}: {a.size}, pixels differing (>8/255): {px}, bbox {diff.getbbox()}")
    if px:
        bad = 1
        diff.point(lambda v: 255 if v > 8 else 0).save(f"{d}/diff-{st}.png")
print("screenshots:", d)
sys.exit(bad)
PY
