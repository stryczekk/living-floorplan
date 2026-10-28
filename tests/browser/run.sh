#!/bin/sh
# Browser test of the card on the example house (headless Chromium, one at a time).
#   tests/browser/run.sh          -> checks, exit 1 on failure
#   tests/browser/run.sh --shots  -> also docs/*.png
set -e
cd "$(dirname "$0")/../.."
node tools/build.mjs >/dev/null
PORT=${PORT:-8766}
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
PROFILE=$(mktemp -d)
trap 'kill $SERVER 2>/dev/null; rm -rf "$PROFILE"' EXIT
sleep 1
CHROME=${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}
FLAGS="--headless --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=60000 --user-data-dir=$PROFILE"
URL="http://127.0.0.1:$PORT/tests/browser/harness.html"
OUT=$(TZ=Europe/Warsaw "$CHROME" $FLAGS --window-size=1000,2600 --dump-dom "$URL" 2>/dev/null \
  | sed -n '/<pre id="results">/,/<\/pre>/p' | sed -e 's/<[^>]*>//g' -e 's/&gt;/>/g' -e 's/&lt;/</g' -e 's/&amp;/\&/g')
echo "$OUT"
if [ "$1" = "--shots" ]; then
  mkdir -p docs
  for s in night day glow upstairs temperature lighthours alerts travel sun onboarding light camera; do
    "$CHROME" $FLAGS --window-size=1024,800 --screenshot=docs/$s.png "$URL?shot=$s" >/dev/null 2>&1
  done
  "$CHROME" $FLAGS --window-size=400,860 --force-device-scale-factor=2 --screenshot=docs/phone.png "$URL?shot=phone" >/dev/null 2>&1
  echo "screenshots in docs/"
fi
echo "$OUT" | grep -q "^OK "
