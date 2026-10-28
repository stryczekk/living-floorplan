# floorplan-editor (working name)

A house floor plan as data: a JSON model (centimetres, walls as centre lines
with openings, rooms, lights, covers, sensors, cameras), a generator that turns
it into an interactive SVG for a Home Assistant floor plan card, and a browser
editor to draw it from scratch.

> **Not published.** Private repository, work in progress. `examples/house.json` is a made-up house;
> keep a real one in `local/` (ignored by git).

## Layout

| Path | What |
|---|---|
| `generator/floorplan-model.js` | `generateSvg(model, {furniture})` - no dependencies, Node and browser |
| `generator/model-v2.js` | model v2 (cm): wall geometry (`wallEnds`, `wallPolygons` - mitred corners, T-joints), `lowerV2()` |
| `generator/theme.js` | CSS and shared `<defs>` of the drawing |
| `generator/rooms.js` | rooms from walls: planar graph of wall axes and dividers, faces, outline on the wall faces, area |
| `generator/icons.js` | glyphs of the icon devices (only the used ones go into the SVG) |
| `generator/names.js` | ids, classes and `data-*` attributes a card reads, and the state classes it sets - override with `names` / `--names` to match another card |
| `editor/` | the editor: plain HTML + ES modules, no build; English and Polish UI (`editor/i18n.js`) |
| `editor/openings.js` | openings on walls: inner range, snapping, overlap, outside side, new / retyped openings |
| `editor/devices.js` | devices: new elements, unique ids, room from position, wall-light rotation, moving, handles |
| `editor/ha.js` | Home Assistant WebSocket connection: states, live updates; token or the HA frontend login |
| `editor/live.js` | states -> classes and texts on the plan (a reference for a card) |
| `editor/shapes.js` | ready-made outlines (rectangle, L, T) from outside or axis dimensions |
| `tools/build-svg.mjs` | `node tools/build-svg.mjs house.json [out.svg] [--names names.json]` |
| `tools/compare-svg.py` | structural diff of two plan SVGs (ids, classes, `data-*`, geometry with a tolerance) |
| `tools/compare-render.sh` | pixel diff of two plan SVGs in headless Chromium, devices off and on |
| `generator/furniture.js` | furniture: the library (pieces by room, drawn from their size) and custom pieces carried over as drawn |
| `editor/furniture-edit.js` | furniture in the editor: new pieces backed against the nearest wall, hit-testing turned pieces |
| `tools/import-furniture.mjs` | a ready furniture SVG fragment -> custom pieces in the model (sizes measured in headless Chromium) |
| `tools/serve.mjs` | the editor with saving on the server: the plan, its versions and the built SVG in a data directory |
| `tools/json-pretty.py` | JSON with short arrays on one line (readable model diffs; `editor/json-pretty.js` writes the same) |
| `tests/editor/run.py` | editor test: real mouse and keyboard events (Chrome DevTools) |
| `examples/house.json` | a made-up house: two storeys (stairs between them), an attached garage, rooms, windows with covers, lights, sensors, a camera, a lock and furniture; entities are placeholders (`light.kitchen`, …) |
| `local/` | your own house (ignored by git) |

## Run the editor

    python3 -m http.server 8080        # in the repository root
    # http://localhost:8080/editor/    (?model=<url of a house.json> opens a model, ?lang=en|pl)

Served as static files, **Save** downloads `house.json`. With saving on the server and versions:

    node tools/serve.mjs --data plans/ [--port 8090] [--host 127.0.0.1] [--names names.json] [--svg out.svg]

- `plans/house.json` is the current plan (the latest version); `plans/versions/v<N>.json` and
  `versions/index.json` (`{current, versions: [{id, saved, note}]}`) keep every saved version.
- **Save** asks: overwrite the current version, or save as a new version (with a note). The dialog
  lists the versions; an older one opens in the editor and can be saved as a new version (it
  never overwrites: only the latest version can be overwritten, and only by the editor that
  started from it - otherwise the server answers 409).
- Every save also builds the SVG (`--svg`, default `plans/plan.svg`; `furniture.svg` in the data
  directory is inserted, `--names` renames for a card). **Preview** shows that SVG for the plan
  in the editor, before saving.
- Unsaved changes stay in the browser (`localStorage`) and survive a reload; the version label
  next to Save shows `v3 •` while there are some.
- No login: anyone who reaches the port can save. Keep it on a trusted network.

## Editor

- **Wall (W)**: click corners or type a length + Enter; snaps to 45°, corners, other walls'
  centre lines (T-joints) and the grid; live length and angle.
- **Shapes (S)**: a rectangle, L or T with given outside (or axis) dimensions, placed with a
  click - walls on centre lines half a thickness inside, one undo step.
- **Openings (O)**: window, sliding window (HST), balcony door, door, double door, sliding
  door, garage door, passage - a click on a wall; snapped to the grid, kept inside the wall and
  off other openings, distances to the neighbours shown live. Doors open towards the cursor's
  side (R - hinge at the other end). Exterior openings get their facade and outside side.
- **Rooms (P)**: a click inside an area closed by walls makes a room (name, ID, net area and
  perimeter, a list with the total).
- **Divide (L)**: a virtual line (two clicks, snapping to walls) splits an open space into rooms;
  not drawn on the plan. Rooms split only by such lines share a glow zone, unless the line is set
  to stop the light (e.g. a hallway open to a living room).
  The outline follows the walls when they move; a hand-drawn room can be switched to the walls.
- **Devices (D)**: ceiling / wall / night lights (Shift + click adds bulbs to the selected light,
  wall lights turn away from the nearest wall), track lights and LED strips (two clicks), a
  two-circuit chandelier, presence sensors, temperature / humidity readings, cameras (handles for
  direction, length and field of view), TV and A/C (along the nearest wall), appliances (alert
  glow, snowflake icon), door locks. The room is assigned from the position; entities, glow
  radius, bulb rotation, sizes and camera streams in the panel. Dragging moves one bulb / device.
  Also: alarm motion detectors and presence sensors with a detection range (a fan, cut to the
  room), and icon devices - recuperator, boiler, plug, speaker / media, gate, smoke / CO / leak
  detectors (red pulse on alarm), air quality, thermostat, radiator valve, fan, purifier, robot
  vacuum, EV charger, water valve - with an optional reading under the icon.
- **Openings** also take window panes and contact sensors (one per opening or one per pane).
- **Rooms** can be coloured by an entity: a floor-heating zone, temperature, humidity, CO₂,
  presence or any state.
- **Floors**: a room's floor as boards, herringbone, tiles, large tiles, concrete or carpet in a
  colour (`room.floor = {pattern, color}`), and a colour for any piece of furniture
  (`piece.color`); both toned down into the plan's palette.
- **Notes** (devices tool, "Notes"): a text (size, colour, bold, turned), a marker pin with an icon,
  a caption and a longer note (a card shows the note on a tap), an arrow (two clicks) - `notes: []`.
- **Garden** (G): the plot round the house - areas (lawn, terrace, driveway, path, flower bed, pool,
  gravel, the plot's boundary) as a rectangle or a polygon, lines (fence, hedge), plants (tree, bush);
  drag a corner or the whole item - `garden: []`, drawn under the house, inside the plan's frame.
- **Wizard** ("a house in 5 minutes"): the outside size and which rooms (bedrooms, children's rooms,
  bathrooms, office, WC, utility, wardrobe, kitchen open or not) - walls, doors, windows, rooms, a
  light in each and furniture to suit it are drawn; everything can be moved afterwards.
- **Export**: PNG (dark or light) or PDF A4 / A3 at a true scale (1:50, 1:100, 1:200 ... - the
  largest that fits) with the dimensions, room names and areas, a title block and a scale bar.
- **My furniture**: draw your own piece (rectangles, ellipses and polygons over a grid, with
  detail lines), name it, colour it and keep it in the model's `furniture_library` - it shows
  up in the furniture palette under "My furniture"; a placed piece can be saved there too.
- **Underlay**: an image (photo, scan) to draw over - drag to place it, click two points a known
  distance apart to scale it, opacity; kept in the browser, never in the model or the SVG.
- **Home Assistant**: connect with the HA address and a long-lived access token (kept in this
  browser), or automatically with the HA login when the page is served by HA. Entity fields then
  suggest entities (with friendly names) and mark unknown ones; **live** shows the states on the
  plan (`editor/live.js` - lights, covers, presence, motion, contacts, appliances, A/C, locks,
  readings, room colouring). Read only: the editor never calls a service.
- **Select (V)**: wall properties (type, thickness, length); an opening's type, ID, width,
  distance from the corner, hinge / opening side and cover entity (per sash on a sliding
  window); drag walls, corners and openings (along their wall); Delete.
- Snapping: the grid picked in the toolbar, or **auto** (default) - a step of 1-50 cm that stays
  within ~6 px on screen, so dragging is smooth at any zoom and finer when zoomed in.
- Dimensions (toggle): inner walls show their length; exterior walls get chains outside the
  building like on an architect's drawing - corner / openings / corner, and the overall length -
  on the outer face; rectangular rooms show width x depth under their area.
- While dragging: the rooms a moving wall (or corner) bounds are measured inside, face to face
  (without rooms: the free space from the wall's faces to the next walls); the distances around an
  opening and the exterior chains update live; a device shows its distances to the nearest wall
  faces on four sides. A selected wall is outlined as a rectangle to its corners.
- Undo / redo, autosave in the browser, open / save `house.json`.

## Model v2 in short

- Units: centimetres; `canvas.cm_per_svg` converts to SVG units (default 30/17).
- `walls[]`: `{type, a, b, thickness?, openings?}`; `wall_types` gives default thickness
  (`exterior` 40, `load_bearing` 25, `partition` 12). Ends equal to another wall's end
  or lying on its centre line join it (mitred corner / T-joint).
- `openings[]` on a wall, `from`/`to` in cm from `a`: `window`, `hst` (sliding window, sashes
  offset across the wall), `balcony_door`, `door`, `double_door`, `sliding_door`, `garage_door`
  (doors: `hinge: from|to`, `swing: left|right`), `passage`. Exterior: `facade`, `outside`.
- `rooms[]`: `{id, name, at}` - the outline is found from the walls around `at` - or
  `{id, name, points, label?, zone?}` drawn by hand. `dividers[]`: `{a, b, blocks_light?}` virtual boundaries; rooms split only by
  boundaries share a glow zone, unless the boundary has `blocks_light` (e.g. a hallway open to a
  living room keeps its lights to itself).
- `canvas.door_symbols: false` hides door leaves and swings (the openings stay).
- `canvas.rotate` turns the whole plan for the card (e.g. -90); the frame follows the walls as shown
  after that turn, plus `canvas.margin` (cm, one number or `[top, right, bottom, left]`, default 100).
  A fixed `canvas.viewBox` (+ `sheet`) overrides it. The editor itself always draws north up.
- `furniture[]`: `{id, kind, at, size: [w, d], rot, room?, note?}` (cm; `rot` clockwise, 0 = the back up).
  Library kinds are drawn from their size; `kind: "custom"` carries its own `svg` (plan units) and
  `origin`, and gets a transform when moved or turned. Without `furniture[]`, a `furniture.svg` next
  to the model is inserted as it is.
- Floors: the model itself is the ground floor (`floor_name` optional); `floors: [{id, name, walls, rooms,
  lights, devices, furniture, ...}]` are the floors above, in order, each with its own lists (canvas and wall
  types shared). `generateSvg(model, {floor: id})` draws one; `build-svg.mjs` and `serve.mjs` also write
  `<out>-<floor id>.svg`. The editor switches floors in the top bar (the floor below shows faint; each
  floor keeps its own undo), adds a floor (from the exterior walls below, or empty), renames / removes it.
- Furniture order = drawing order (`]` / `[` one step, with Shift to the front / back). `group` (an id)
  ties pieces together: a click selects the whole group, it moves and turns as one (Ctrl+G / Ctrl+Shift+G);
  Shift + click adds pieces to the selection. A carried-over piece splits into its separate parts
  ("Split into parts": children that overlap or touch stay together).
- A room with `unused: true` (under the roof slopes, a void) is drawn darker; a divider with `show: true`
  is drawn dashed (e.g. where the usable attic ends).
- Walls lying on one another are joined into one (`editor/walls-merge.js`) after drawing a wall, placing
  a shape or moving walls: two shapes side by side share a wall; the joined wall takes the stronger type
  and keeps the openings of both. Walls on one line where one continues the other (end to end, same type
  and thickness) become one long wall; a wall meeting that point from the side ends on it (a T-joint).
- Stairs are furniture kinds (`stairs_straight`, `stairs_l`, `stairs_u`, `stairs_spiral`, `attic_ladder`:
  you walk up towards their back, -y): moved, turned and resized like furniture; the floor above shows
  them as a void with an arrow down.
- `beam` (degrees, default 360) on a light or a device with a glow: it lights only a wedge around its
  direction (a bulb's rotation, else `beam_dir`; 0 = up, clockwise). New TVs and A/C units get 180°
  away from their wall.
- openings: `panes` (window panes, drawn with ticks), `contacts` (one entity, or one per pane).
- `rooms[].tint`: `{entity, kind}` - `heating` | `temperature` | `humidity` | `co2` | `presence` | `state`.
- `devices[]` also: `motion` (with `direction`, `fov`, `range` in cm), `icon` (`kind` from
  `generator/icons.js`, optional `value_entity`); `presence` may have a range too.
- The card applies states as classes: `open` / `tilted` (contacts), `heating` / `occupied`
  (rooms), `on` / `alarm` (devices), `detected` (presence); continuous values (temperature, CO₂)
  are coloured by the card itself.
- `covers[]`: `{entity, window, sash?}` - a cover on a window, balcony door or HST sash.
- `rooms`, `zones`, `lights`, `devices` (`presence`, `appliance`, `climate_unit`, `tv`),
  `covers`, `climate`, `cameras`, `locks`.

## Tests

    python3 tests/editor/run.py
    HA_URL=http://ha.local:8123 HA_TOKEN=... python3 tests/editor/run.py   # + read-only checks against a real HA
    tools/compare-render.sh a.svg b.svg [--names a.json] [--names-new b.json]
