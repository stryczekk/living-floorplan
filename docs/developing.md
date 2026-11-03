# Developing

    npm install
    npm run build                  # card, editor page, panel, demo -> custom_components/living_floorplan/frontend/, dist/
    npm test                       # unit tests: geometry, walls, maps, timeline, rules, tablet mode
    python3 tests/editor/run.py    # the editor in headless Chromium (drawing, rooms, openings, lights, furniture, saving)
    tests/browser/run.sh           # the card in headless Chromium on the example house
    node tests/browser/run-webkit.mjs .   # the card's checks in WebKit (Safari) as an iPhone and an iPad (needs playwright)

## The editor on its own

Without Home Assistant, saving versions into a folder:

    node tools/serve.mjs --data ./plans --port 8090    # http://localhost:8090/editor/

## The demo

`demo/` is the card on the example house in a simulated home (`demo/sim.js`: a day of three people, the sun and the
weather, appliances, power; history and statistics from the same day plan; what a visitor switches is kept in their
browser). `npm run build` makes it one file, `dist/living-floorplan-demo.html`, with
[Entity Insights](https://github.com/stryczekk/entity-insights) and
[Long-term Chart Card](https://github.com/stryczekk/long-term-chart-card) inside when their repositories sit next to
this one.

    DEMO_STATS_TOKEN=... node demo/server.mjs --port 8080 --root dist --data ./demo-data

serves it with a visit counter of its own (no cookies, no IP kept): `/stats?t=<token>` shows visits a day, time on the
page, where visitors came from and what they played with.

## Screenshots

`docs/images/` - the plan shots come from the card's browser test:

    SHOTS_MODEL=tests/browser/local/demo-house.json tests/browser/run.sh --shots

(any `house.json` under the repository; without `SHOTS_MODEL` the example house). The dialogs, the camera, the demo
page and the editor are taken from the demo and the editor in headless Chromium.

## How it works

The editor and the card share one SVG generator (`generator/`): the card builds the same plan in the browser from the
model the integration keeps. The light field is computed once per floor (a visibility polygon from every bulb against
the walls, windows and closed doors, filled with a radial gradient) and only its opacity follows the states; a door
contact rebuilds it.

`examples/house.json` is a made-up house (two floors, a double garage, a garden with a pool behind the house), full of devices: it is also the demo.
