// Thermostats, fans, marks on the time line, lamps left on - pure functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { climateText, climateAction, fanSpin, readingText } from "../../card/live.js";
import { eventMarks, clusterMarks, normalizeEvents } from "../../card/events.js";
import { forgottenLights } from "../../card/forgotten.js";

const S = (state, attributes = {}, extra = {}) => ({ state, attributes, ...extra });

test("climate: what it does and its temperatures", () => {
  assert.equal(climateAction(S("heat", { hvac_action: "heating" })), "heating");
  assert.equal(climateAction(S("heat", { hvac_action: "idle" })), null);
  assert.equal(climateAction(S("cool")), "cooling", "no hvac_action: the mode stands for it");
  assert.equal(climateAction(S("off")), null);
  assert.equal(climateText(S("heat", { current_temperature: 21.5, temperature: 22 }), null, "en"), "21.5° → 22°");
  assert.equal(climateText(S("heat", { current_temperature: 21.5, temperature: 22 }), S("20.4"), "en"), "20.4° → 22°");
  assert.equal(climateText(S("off", { current_temperature: 19 }), null, "en"), "19°");
  assert.equal(readingText("trv", { entity_id: "climate.x", ...S("heat", { current_temperature: 20, temperature: 21 }) }), "20° → 21°");
});

test("fan: speed and its turn", () => {
  assert.equal(fanSpin(S("on", { percentage: 60 })), 1.2);
  assert.equal(fanSpin(S("on", { percentage: 100 })), 0.4);
  assert.equal(fanSpin(S("on")), 1.6);
  assert.equal(readingText("fan", { entity_id: "fan.x", ...S("on", { percentage: 33.3 }) }), "33%");
  assert.equal(readingText("fan", { entity_id: "fan.x", ...S("off", { percentage: 0 }) }), "");
});

test("events: changes into the state within the range, merged when close", () => {
  const [rule] = normalizeEvents([{ entity: "binary_sensor.door" }]);
  assert.equal(rule.color, "#ffab40");
  const hist = { "binary_sensor.door": [{ t: 0, state: "on" }, { t: 10, state: "off" }, { t: 20, state: "on" }, { t: 30, state: "off" }, { t: 31, state: "on" }] };
  const marks = eventMarks([rule], hist, 0, 100);
  assert.deepEqual(marks.map((m) => m.t), [20, 31], "the first row is the starting state, not a change");
  const c = clusterMarks(marks, 0, 100, 0.2);
  assert.equal(c.length, 1);
  assert.equal(c[0].n, 2);
});

test("forgotten: only rooms with a sensor, quiet long enough", () => {
  const now = Date.parse("2026-10-26T20:00:00Z");
  const ago = (min) => new Date(now - min * 60e3).toISOString();
  const sources = { living: { lights: ["light.a", "light.b"], presence: ["binary_sensor.p"] }, attic: { lights: ["light.c"], presence: [] } };
  const states = {
    "light.a": S("on", {}, { last_changed: ago(45) }), "light.b": S("on", {}, { last_changed: ago(5) }),
    "light.c": S("on", {}, { last_changed: ago(300) }), "binary_sensor.p": S("off", {}, { last_changed: ago(40) }),
  };
  const out = forgottenLights(sources, states, now, 30);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].lights, ["light.a"], "light.b is on for 5 min only; the attic has no sensor");
  states["binary_sensor.p"] = S("off", {}, { last_changed: ago(10) });
  assert.equal(forgottenLights(sources, states, now, 30).length, 0, "someone left 10 min ago");
  states["binary_sensor.p"] = S("unavailable", {}, { last_changed: ago(100) });
  assert.equal(forgottenLights(sources, states, now, 30).length, 0, "a sensor that does not answer: nobody knows");
});

test("energy: a lamp whose history has no brightness counts at its brightness now", async () => {
  const { energyValues } = await import("../../card/maps.js");
  const H = 3600e3;
  const sources = { dining: { lights: ["light.strip"] } };
  const rows = { "light.strip": [{ t: 0, state: "on", attributes: { friendly_name: "Strip" } }] };
  const full = energyValues(sources, rows, 0, 10 * H, { "light.strip": 25 });
  const now20 = energyValues(sources, rows, 0, 10 * H, { "light.strip": 25 }, { "light.strip": 51 / 255 });
  assert.equal(Math.round(full.dining * 1000), 250);
  assert.equal(Math.round(now20.dining * 1000), 50);
  const withB = { "light.strip": [{ t: 0, state: "on", attributes: { brightness: 255 } }] };
  assert.equal(Math.round(energyValues(sources, withB, 0, 10 * H, { "light.strip": 25 }, { "light.strip": 0.2 }).dining * 1000), 250, "history wins when it has it");
});

test("appliances: time left and done", async () => {
  const { minutesLeft, machineLabel } = await import("../../card/live.js");
  const now = Date.parse("2026-10-26T12:00:00Z");
  assert.equal(minutesLeft({ state: "2026-10-26T13:25:00Z", attributes: {} }, now), 85);
  assert.equal(minutesLeft({ state: "42", attributes: { unit_of_measurement: "min" } }, now), 42);
  assert.equal(minutesLeft({ state: "1.5", attributes: { unit_of_measurement: "h" } }, now), 90);
  assert.equal(minutesLeft({ state: "1:05:00", attributes: {} }, now), 65);
  assert.equal(minutesLeft({ state: "unknown", attributes: {} }, now), null);
  const S = (state) => ({ state, attributes: {} });
  assert.deepEqual(machineLabel(S("run"), S("wash"), S("2026-10-26T13:25:00Z"), "W", now), { text: "W 1:25", done: false });
  assert.deepEqual(machineLabel(S("active"), null, S("40"), "W", now), { text: "W 0:40", done: false });
  assert.deepEqual(machineLabel(S("run"), null, S("2026-10-26T11:00:00Z"), "W", now), { text: "W", done: false }, "an end in the past: no minus");
  assert.deepEqual(machineLabel(S("stop"), S("finished"), null, "D", now), { text: "D ✓", done: true });
  assert.deepEqual(machineLabel(S("stop"), S("none"), null, "D", now), { text: "", done: false });
});

test("openings: a corner window glazes the corner, a pocket door has its pocket, a double gate two leaves", async () => {
  const { wallPolygons, lowerV2 } = await import("../../generator/model-v2.js");
  const model = {
    version: 2, canvas: { cm_per_svg: 1, rotate: 0 }, wall_types: { exterior: { thickness: 40 } },
    walls: [
      { type: "exterior", a: [0, 0], b: [500, 0], openings: [{ id: "cw-1", type: "corner_window", from: 0, to: 150, corner: "from", outside: "right" }] },
      { type: "exterior", a: [0, 0], b: [0, 400], openings: [{ id: "cw-2", type: "corner_window", from: 0, to: 120, corner: "from", outside: "left" },
        { id: "pd", type: "pocket_door", from: 200, to: 290, hinge: "to", swing: "left", outside: "left" }] },
      { type: "exterior", a: [500, 0], b: [500, 400], openings: [{ id: "gate", type: "double_gate", from: 50, to: 350, swing: "left", outside: "right" }] },
    ],
    rooms: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [],
  };
  const piecesAtOrigin = (w) => wallPolygons(model, w).filter((poly) => poly.some((p) => Math.hypot(p[0], p[1]) < 25)).length;
  assert.equal(piecesAtOrigin(model.walls[0]), 0, "the top wall has no piece at the glazed corner");
  assert.equal(piecesAtOrigin(model.walls[1]), 0, "nor the left wall");
  const L = lowerV2(model);
  assert.equal(L.windows.filter((w) => /^cw-/.test(w.id)).length, 2, "both corner panes are windows (covers, contacts, the sun)");
  const pocket = L.doors.find((d) => d.id === "pd-pocket");
  assert.ok(pocket && pocket.dashed && Math.abs(pocket.lines[0][1][1] - 380) < 1e-6, "the pocket runs 90 cm into the wall past the hinge end");
  assert.equal(L.doors.filter((d) => /^gate-/.test(d.id)).length, 2);
});

test("review 26.10: a corner window keeps knowing its corner; both leaves of a double door have the contact", async () => {
  const { fitOpening, shiftOpening, retype, makeOpening } = await import("../../editor/openings.js");
  const { lowerV2 } = await import("../../generator/model-v2.js");
  const w = { type: "exterior", a: [0, 0], b: [500, 0], openings: [] };
  const model = { version: 2, canvas: { cm_per_svg: 1, rotate: 0 }, wall_types: { exterior: { thickness: 40 } }, walls: [w] };
  const o = makeOpening(model, w, "corner_window", 0, 150);
  w.openings.push(o);
  assert.equal(o.corner, "from");
  const f = fitOpening(model, w, 420, 150, 0, o, "corner_window");
  shiftOpening(o, f.from);
  assert.equal(o.corner, "to", "dragged to the other end");
  const win = makeOpening(model, w, "window", 200, 300);
  const w2 = { ...w, openings: [win] };
  retype(model, w2, win, "corner_window");
  assert.ok(win.from === 0 || win.to === 500, "retyped: moved to an end");
  const dd = { version: 2, canvas: { cm_per_svg: 1, rotate: 0 }, wall_types: { partition: { thickness: 10 } },
    walls: [{ type: "partition", a: [0, 0], b: [400, 0], openings: [{ id: "dd", type: "double_door", from: 100, to: 260, swing: "left", contacts: ["binary_sensor.dd"] }] }],
    rooms: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [] };
  assert.deepEqual(lowerV2(dd).doors.map((d) => d.contact), ["binary_sensor.dd", "binary_sensor.dd"]);
});

test("widgets: a state widget can show an attribute", async () => {
  const { normalizeWidgets, widgetText } = await import("../../card/widgets.js");
  const [w] = normalizeWidgets([{ type: "state", entity: "sensor.waste", attribute: "opis", name: "Śmieci" }]);
  const states = { "sensor.waste": { state: "2026-11-06", attributes: { opis: "pt. 6.11: segregowane" } } };
  assert.deepEqual(widgetText(w, states, "pl"), ["pt. 6.11: segregowane", "Śmieci"]);
  assert.deepEqual(widgetText(w, {}, "pl"), ["—", "Śmieci"]);
});

// `entities:` keys for a whole domain ("light.*") and for everything ("*"): an entity's own key wins
test("actions: an entity's own, then its domain's, then everyone's", async () => {
  globalThis.HTMLElement ??= class {};
  globalThis.window ??= globalThis;
  globalThis.customElements ??= { _d: new Map(), get(n) { return this._d.get(n); }, define(n, c) { this._d.set(n, c); } };
  globalThis.navigator ??= { language: "en" };
  const { LivingFloorplanCard, normalizeEntityActions } = await import("../../card/card.js");
  const P = LivingFloorplanCard.prototype;
  const acts = normalizeEntityActions({
    "light.a": { hold_action: { action: "own" } },
    "light.*": { hold_action: { action: "lamp" } },
    "*": { tap_action: { action: "any" } },
  });
  const me = { _config: { actions: acts }, _svg: null, _fixtureOf: () => null, _ownActionFor: P._ownActionFor };
  const pick = (id, k) => (P._actionFor.call(me, id, k) || {}).action;
  assert.equal(pick("light.a", "hold"), "own");
  assert.equal(pick("light.b", "hold"), "lamp");
  assert.equal(pick("cover.x", "hold"), undefined);
  assert.equal(pick("cover.x", "tap"), "any");
  me._isLock = (id) => id === "cover.door";
  assert.equal(pick("cover.door", "tap"), undefined);
});
