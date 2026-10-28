import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRules, ruleHolds, ruleEffects, powerText, powerWatts, ruleColor } from "../../card/rules.js";

const now = Date.parse("2026-10-27T12:00:00Z");
const ago = (min) => new Date(now - min * 60e3).toISOString();

test("rules: above / below, states, on in any sense", () => {
  const [co2, win, lamp] = normalizeRules([{ entity: "sensor.co2", above: 1000 }, { entity: "binary_sensor.w", state: "on" }, { entity: "light.l" }]);
  assert.equal(ruleHolds(co2, { state: "1200" }, now), true);
  assert.equal(ruleHolds(co2, { state: "800" }, now), false);
  assert.equal(ruleHolds(co2, { state: "unavailable" }, now), false);
  assert.equal(ruleHolds(win, { state: "on" }, now), true);
  assert.equal(ruleHolds(lamp, { state: "on" }, now), true);
  assert.equal(ruleHolds(lamp, { state: "off" }, now), false);
});

test("rules: for - minutes in the state", () => {
  const [r] = normalizeRules([{ entity: "binary_sensor.w", state: "on", for: 15 }]);
  assert.equal(ruleHolds(r, { state: "on", last_changed: ago(10) }, now), false);
  assert.equal(ruleHolds(r, { state: "on", last_changed: ago(20) }, now), true);
});

test("rules: an attribute", () => {
  const [r] = normalizeRules([{ entity: "climate.ac", attribute: "current_temperature", above: 25 }]);
  assert.equal(ruleHolds(r, { state: "cool", attributes: { current_temperature: 26.5 } }, now), true);
});

test("rules: effects - a sensor not drawn tints its room, a drawn mark glows / blinks", () => {
  const rules = normalizeRules([
    { entity: "sensor.co2", above: 1000, color: "orange" },
    { entity: "light.l", color: "#ff0000", blink: true },
    { entity: "binary_sensor.door", target: "hall", color: "blue" },
  ]);
  const states = { "sensor.co2": { state: "1500" }, "light.l": { state: "on" }, "binary_sensor.door": { state: "on" } };
  const fx = ruleEffects(rules, states, { roomOf: (id) => (id === "sensor.co2" ? "office" : "living"), drawn: (id) => id === "light.l",
    isRoom: (id) => ["office", "living", "hall"].includes(id), now });
  assert.equal(fx.rooms.get("office"), "#ff9800");
  assert.equal(fx.rooms.get("hall"), "#1e88e5");
  assert.deepEqual(fx.marks.get("light.l"), { color: "#ff0000", blink: true });
});

test("rules: colours by name or hex, nothing else", () => {
  assert.equal(ruleColor("red"), "#e53935");
  assert.equal(ruleColor("#abc"), "#abc");
  assert.equal(ruleColor("url(x)"), null);
});

test("power: W and kW, text", () => {
  assert.equal(powerWatts({ state: "640", attributes: { unit_of_measurement: "W" } }), 640);
  assert.equal(powerWatts({ state: "1.25", attributes: { unit_of_measurement: "kW" } }), 1250);
  assert.equal(powerWatts({ state: "3", attributes: { unit_of_measurement: "kWh" } }), null);
  assert.equal(powerText(640, "en"), "640 W");
  assert.equal(powerText(1250, "pl"), "1,3 kW");
});
