// Geometry of the realistic light - no browser needed.
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { obstacles, visibility, nudge, bulbsOf, lightLayer, _test } from "../../card/lighting.js";

// Two rooms side by side, 0..100 and 100..200 (y 0..100), divided by a wall at
// x = 100 with a doorway from y = 40 to 60. Walls as thin rectangles.
const T = 2;
const model = {
  canvas: { cm_per_svg: 1 },
  walls: {
    exterior: [[-T, -T, 200 + 2 * T, T], [-T, 100, 200 + 2 * T, T], [-T, 0, T, 100], [200, 0, T, 100]],
    interior: [[100 - T / 2, 0, T, 40], [100 - T / 2, 60, T, 40]],
  },
  doors: [{ id: "d1", hinge: [100, 40], closed: [100, 60] }],
  windows: [],
  lights: [{ entity: "light.left", kind: "ceiling", bulbs: [[30, 50]] }],
};
const lit = (poly, x, y) => _test.inside(x, y, poly);

test("light stays in its room, spills through the doorway", () => {
  const segs = obstacles(model);
  const poly = visibility(30, 50, segs, 500);
  assert.ok(lit(poly, 60, 20), "own room");
  assert.ok(lit(poly, 150, 50), "straight through the doorway");
  assert.ok(!lit(poly, 150, 5), "behind the wall, next to the door: shadow");
  assert.ok(!lit(poly, 190, 95), "far corner of the next room: shadow");
});

test("a closed door blocks the light", () => {
  const segs = obstacles(model, new Set(["d1"]));
  const poly = visibility(30, 50, segs, 500);
  assert.ok(lit(poly, 60, 20));
  assert.ok(!lit(poly, 150, 50), "the other room is dark");
});

test("reach limits the light", () => {
  const poly = visibility(30, 50, obstacles(model), 20);
  assert.ok(lit(poly, 40, 50));
  assert.ok(!lit(poly, 80, 50));
});

test("a bulb on a wall face is moved off the wall", () => {
  const segs = obstacles(model);
  const [x, y] = nudge(1, 50, segs);
  assert.ok(x > 1.5, "moved into the room: " + x);
  assert.equal(y, 50);
  const poly = visibility(x, y, segs, 500);
  assert.ok(lit(poly, 50, 50), "lights its room");
});

test("bulbs: one per bulb, chandelier circuits, power shared and widening the reach", () => {
  const b = bulbsOf({
    canvas: { cm_per_svg: 2 },
    lights: [
      { entity: "light.a", kind: "ceiling", bulbs: [[0, 0], [10, 0]], watts: 40 },
      { type: "fixture", at: [5, 5], circuits: [{ entity: "light.c1", watts: 15 }, { entity: "light.c3", watts: 45 }] },
    ],
  });
  assert.equal(b.length, 4);
  assert.equal(b[0].watts, 20);
  assert.ok(b[0].R > 330 / 2, "20 W reaches further than the 10 W reference");
  assert.deepEqual([b[2].entity, b[2].x, b[2].y, b[2].kind], ["light.c1", 5, 5, "main"]);
  assert.ok(b[3].R > b[2].R);
});

test("layer: a group per entity, a gradient per bulb", () => {
  const svg = lightLayer(model);
  assert.match(svg, /<g class="lf" style="opacity: 0" data-lf="light.left"><defs><radialGradient[^]*?<\/defs><path d="M/);
  assert.equal((svg.match(/<radialGradient/g) || []).length, 1);
});

import { unionMs, onPeriods, hoursValues } from "../../card/maps.js";
test("maps: hours count overlapping lamps once", () => {
  assert.equal(unionMs([[0, 10], [5, 20], [30, 40]]), 30);
  const rows = [{ s: "off", lu: 0 }, { s: "on", lu: 10 }, { s: "off", lu: 20 }];
  assert.deepEqual(onPeriods(rows, 0, 30000), [[10000, 20000]]);
  const h = hoursValues("light_hours", { r: { lights: ["a", "b"] } }, { a: rows, b: rows }, 0, 30000);
  assert.equal(h.r, 10000 / 3600e3);
});

test("tablet: night window over midnight", async () => {
  globalThis.HTMLElement ??= class {};
  globalThis.window ??= globalThis;
  globalThis.customElements ??= { _d: new Map(), get(n) { return this._d.get(n); }, define(n, c) { this._d.set(n, c); } };
  globalThis.navigator ??= { language: "en" };
  const { inWindow, kioskConfig } = await import("../../card/card.js");
  const at = (h, m) => new Date(2026, 9, 26, h, m);
  assert.ok(inWindow("22:00-06:00", at(23, 0)));
  assert.ok(inWindow("22:00-06:00", at(5, 59)));
  assert.ok(!inWindow("22:00-06:00", at(6, 0)));
  assert.ok(inWindow("13:00-15:00", at(14, 0)));
  assert.deepEqual(kioskConfig({ night_dim: "sun" }), { idle: 60, night: "sun", dim: 0.4 });
  assert.equal(kioskConfig(null), null);
});

import { normalizeHistory, rowAt, statesAt } from "../../card/timeline.js";
test("time travel: the state at a moment", () => {
  const h = normalizeHistory({ "light.a": [{ s: "off", lu: 0 }, { s: "on", a: { brightness: 80 }, lu: 10 }, { s: "off", lu: 20 }] });
  assert.equal(rowAt(h["light.a"], 15000).state, "on");
  assert.equal(rowAt(h["light.a"], 20000).state, "off");
  const get = statesAt(h, { "light.a": { state: "off", attributes: { friendly_name: "A" } }, "sensor.x": { state: "5" } }, 12000);
  assert.equal(get("light.a").state, "on");
  assert.equal(get("light.a").attributes.brightness, 80);
  assert.equal(get("light.a").attributes.friendly_name, "A");
  assert.equal(get("sensor.x").state, "5", "no history: live state");
});

test("an LED strip lights along its length, a beam only one side", () => {
  const b = bulbsOf({ canvas: { cm_per_svg: 1 }, lights: [{ entity: "light.s", kind: "strip", strip: [0, 0, 200, 2], beam: 180, beam_dir: 180 }] });
  assert.equal(b.length, 5);
  assert.deepEqual(b.map((x) => x.y), [1, 1, 1, 1, 1]);
  const poly = visibility(50, 50, [], 40, 72, b[0].beam);
  assert.ok(_test.inside(50, 70, poly), "beam_dir 180 = down (+y) with the generator's convention (dir - 90)");
  assert.ok(!_test.inside(50, 30, poly), "not behind");
});

import { outOfWalls, wallPolygons } from "../../card/lighting.js";
import { windowRoom } from "../../card/alerts.js";
test("a bulb on the wall's axis gets out of the wall and lights the room", () => {
  const polys = wallPolygons(model);
  const [x, y] = outOfWalls(-1, 50, polys);   // inside the left wall (x -2..0)
  assert.ok(x > 0, "out on the room side: " + x);
  assert.ok(_test.inside(50, 50, visibility(x, y, obstacles(model), 500)));
});
test("cold window: the room from a sash line, either side when inward is unknown", () => {
  const roomAt = (x, y) => (y > 0 && y < 100 && x > 0 && x < 100 ? "left" : null);
  assert.equal(windowRoom({ sashes: { a: { line: [[20, 0], [60, 0]] } } }, roomAt), "left");
  assert.equal(windowRoom({ line: [[20, 0], [60, 0]], inward: [0, 1] }, roomAt), "left");
  assert.equal(windowRoom({ line: [[20, 0], [60, 0]], inward: [0, -1] }, roomAt), null);
});

import { sunPosition, sunPatches, facadeAngle } from "../../card/sun.js";
test("sun: position in Bielsko-Biała at noon and in the evening", () => {
  const noon = sunPosition(new Date("2026-06-21T11:00:00Z"), 49.8, 19.0); // ~13:00 CEST, near the south
  assert.ok(noon.azimuth > 160 && noon.azimuth < 215, "azimuth " + noon.azimuth);
  assert.ok(noon.elevation > 60, "elevation " + noon.elevation);
  const night = sunPosition(new Date("2026-06-21T23:00:00Z"), 49.8, 19.0);
  assert.ok(night.elevation < 0);
  assert.equal(facadeAngle("SW"), 225);
  assert.equal(facadeAngle("west"), 270);
});
test("sun: a south window gets a patch at noon, a north one does not; the patch goes into the room", () => {
  const roomAt = (x, y) => (y > 0 && y < 400 && x > 0 && x < 400 ? "r" : null);
  const model = { windows: [
    { id: "s", facade: "S", inward: [0, 1], line: [[100, 0], [200, 0]] },   // plan: south at the top
    { id: "n", facade: "N", inward: [0, -1], line: [[100, 400], [200, 400]] },
  ] };
  const p = sunPatches(model, { azimuth: 180, elevation: 30 }, { roomAt, cmPerSvg: 1 });
  assert.deepEqual(p.map((x) => x.id), ["s"]);
  assert.ok(p[0].points.every((q) => q[1] > 0), "inside the house (+y)");
  assert.ok(Math.abs(p[0].points[2][1] - p[0].points[1][1]) > 100, "a long patch: low sun");
  const west = sunPatches(model, { azimuth: 225, elevation: 30 }, { roomAt, cmPerSvg: 1 });
  // the sun from the south-west; with south at the top, west is on the right: the light slants to the left
  assert.ok(west[0].points[3][0] < west[0].points[0][0], "slants: " + JSON.stringify(west[0].points));
  assert.deepEqual(sunPatches(model, { azimuth: 180, elevation: -5 }, { roomAt }), []);
});

test("sliding windows: sashes as bare point pairs block light and get the sun", () => {
  const segs = obstacles({ walls: {}, windows: [{ id: "h", sashes: { a: [[0, 0], [10, 0]], b: [[8, 3], [20, 3]] } }] });
  assert.equal(segs.length, 2);
  const roomAt = (x, y) => (y > 0 && y < 400 && x > -50 && x < 100 ? "r" : null);
  const p = sunPatches({ windows: [{ id: "hst", type: "hst", facade: "S", sashes: { a: [[0, 0], [40, 0]], b: [[30, 3], [70, 3]] } }] },
    { azimuth: 180, elevation: 30 }, { roomAt, cmPerSvg: 1 });
  assert.equal(p.length, 1);
  assert.ok(p[0].points[0][1] >= 0 && p[0].points[0][1] < 30, "near edge from the floor (sill 0): " + p[0].points[0][1]);
});

import { activations, trailLayer } from "../../card/trail.js";
test("trail: activations in the window, a line between sensors in time order", () => {
  const rows = [{ t: 0, state: "off" }, { t: 100, state: "on" }, { t: 200, state: "off" }, { t: 900, state: "presence" }];
  assert.deepEqual(activations(rows, 1000, 950), [100, 900]);
  assert.deepEqual(activations(rows, 1000, 500), [900]);
  const svg = trailLayer([{ entity: "a", at: [0, 0] }, { entity: "b", at: [100, 0] }],
    (id) => (id === "a" ? [{ t: 0, state: "off" }, { t: 500, state: "on" }] : [{ t: 0, state: "off" }, { t: 800, state: "move" }]), 1000, 1000);
  assert.equal((svg.match(/<line/g) || []).length, 1);
  assert.equal((svg.match(/<circle/g) || []).length, 2);
});

import { fromStates, fromSeries, isNumericSensor } from "../../card/influx.js";
test("proxy rows in the timeline's format", () => {
  assert.deepEqual(fromStates([[1000, "on", 200, null]], ["brightness", "current_position"]), [{ t: 1000, state: "on", attributes: { brightness: 200 } }]);
  assert.deepEqual(fromSeries([{ start: 5, mean: 21.46 }, { start: 6, mean: null }]), [{ t: 5, state: "21.5", attributes: {} }]);
  assert.ok(isNumericSensor("sensor.t", { state: "21", attributes: { unit_of_measurement: "°C" } }));
  assert.ok(!isNumericSensor("binary_sensor.x", { state: "on", attributes: {} }));
  assert.ok(!isNumericSensor("sensor.presence_state", { state: "none", attributes: {} }));
});

import { energyValues } from "../../card/maps.js";
test("energy: a dimmed lamp counts at its brightness", () => {
  const rows = { a: [{ t: 0, state: "on", attributes: { brightness: 51 } }, { t: 3600e3, state: "off", attributes: {} }] };
  const e = energyValues({ r: { lights: ["a"] } }, rows, 0, 7200e3, { a: 25 });
  assert.ok(Math.abs(e.r - 0.005) < 1e-9, String(e.r)); // 25 W x 20 % x 1 h = 5 Wh
});

import { lightColor } from "../../card/live.js";
test("light colour: RGB as a pastel, white by its temperature, none = default", () => {
  assert.equal(lightColor({ rgb_color: [255, 0, 0] }), "rgb(255, 64, 64)");
  assert.equal(lightColor({ color_temp_kelvin: 2700 }), "rgb(255, 207, 115)");
  assert.match(lightColor({ color_temp: 154 }), /^rgb\(2[34]\d, 24\d, 255\)$/); // ~6500 K
  assert.equal(lightColor({}), null);
});

import { daysUntil, readingText } from "../../card/live.js";
test("readings: a bin's collection day, the weather, a value with its unit", () => {
  const now = new Date(2026, 9, 26, 10);
  assert.equal(daysUntil({ state: "2026-10-27" }, now), 1);
  assert.equal(daysUntil({ state: "3", attributes: {} }, now), 3);
  assert.equal(readingText("bin", { state: new Date(Date.now() + 864e5).toISOString().slice(0, 10), attributes: {} }, "pl"), "jutro");
  assert.equal(readingText("weather", { entity_id: "weather.home", state: "rainy", attributes: { temperature: 7.4 } }, "pl"), "7° deszcz");
  assert.equal(readingText("info", { state: "21.5", attributes: { unit_of_measurement: "°C" } }), "21.5 °C");
});
