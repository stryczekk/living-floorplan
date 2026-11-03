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
# the shots on another house: SHOTS_MODEL=tests/browser/local/demo-house.json tests/browser/run.sh --shots (a path the server serves)
SHOT_Q=${SHOTS_MODEL:+&model=../../$SHOTS_MODEL}
OUT=$(TZ=Europe/Warsaw "$CHROME" $FLAGS --window-size=1000,2600 --dump-dom "$URL" 2>/dev/null \
  | sed -n '/<pre id="results">/,/<\/pre>/p' | sed -e 's/<[^>]*>//g' -e 's/&gt;/>/g' -e 's/&lt;/</g' -e 's/&amp;/\&/g')
echo "$OUT"
if [ "$1" = "--shots" ]; then
  mkdir -p docs/images
  for s in night day glow upstairs temperature lighthours alerts travel sun onboarding light heating; do
    "$CHROME" $FLAGS --window-size=1024,800 --screenshot=docs/images/$s.png "$URL?shot=$s$SHOT_Q" >/dev/null 2>&1
  done
  "$CHROME" $FLAGS --window-size=400,860 --force-device-scale-factor=2 --screenshot=docs/images/phone.png "$URL?shot=phone$SHOT_Q" >/dev/null 2>&1
  echo "screenshots in docs/images/ (the dialogs, the camera, the demo page and the editor are taken by hand - docs/README.md)"
fi
echo "$OUT" | grep -qE "^[[:space:]]*OK +[0-9]+/[0-9]+ checks passed"
