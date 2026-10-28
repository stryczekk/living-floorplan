// Rules: how the plan looks when something holds - a room tinted while CO2 is high,
// a window blinking once it has been open for 15 minutes, a lamp glowing orange
// after three hours on. Quiet, unlike alerts (no banner, no pulse).
//
//   rules:
//     - entity: sensor.office_co2
//       above: 1000
//       color: "#ff7043"          # the room of the entity (or `room:`) is tinted
//     - entity: binary_sensor.kitchen_window
//       state: "on"
//       for: 15                   # minutes in that state
//       blink: true               # the entity's mark on the plan blinks
//     - entity: light.living_room
//       state: "on"
//       for: 180
//       color: orange             # a coloured glow round the lamp
//       target: light.living_room # what is styled (default: the entity; a room id tints the room)

const NAMED = { red: "#e53935", orange: "#ff9800", amber: "#ffc107", yellow: "#ffeb3b", green: "#43a047", teal: "#26a69a",
  blue: "#1e88e5", cyan: "#00bcd4", purple: "#8e24aa", pink: "#ec407a", white: "#ffffff", grey: "#9e9e9e", gray: "#9e9e9e" };

export function ruleColor(c) {
  if (typeof c !== "string") return null;
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c)) return c;
  return NAMED[c.toLowerCase()] || null;
}

export function normalizeRules(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && typeof r.entity === "string").map((r) => ({
    entity: r.entity,
    states: r.state === undefined ? null : [].concat(r.state).map(String),
    above: r.above === undefined ? null : Number(r.above),
    below: r.below === undefined ? null : Number(r.below),
    attribute: typeof r.attribute === "string" ? r.attribute : null,
    for: Number(r.for) > 0 ? Number(r.for) : 0, // minutes
    color: ruleColor(r.color),
    blink: r.blink === true,
    room: typeof r.room === "string" ? r.room : null,
    target: typeof r.target === "string" ? r.target : null,
  }));
}

const ON = new Set(["on", "open", "detected", "true", "home", "playing", "heat", "cool", "heating", "cooling", "unlocked", "wet", "problem"]);

// Does the rule hold now? `now` in ms. Without state / above / below: the entity is "on" in any sense.
export function ruleHolds(rule, s, now = Date.now()) {
  if (!s || s.state === "unavailable" || s.state === "unknown") return false;
  const raw = rule.attribute ? s.attributes && s.attributes[rule.attribute] : s.state;
  let ok;
  if (rule.above !== null || rule.below !== null) {
    const v = Number(raw);
    ok = raw !== "" && raw !== null && raw !== undefined && Number.isFinite(v) && (rule.above === null || v > rule.above) && (rule.below === null || v < rule.below);
  } else if (rule.states) ok = rule.states.includes(String(raw));
  else ok = ON.has(String(raw).toLowerCase());
  if (!ok || !rule.for) return ok;
  // held long enough: since the last change of the state (an attribute rule: of the entity)
  const since = Date.parse((rule.attribute ? s.last_updated : s.last_changed) || s.last_changed || "");
  return Number.isFinite(since) && now - since >= rule.for * 60e3;
}

// What the plan shows: { rooms: Map(roomId -> colour), marks: Map(entityId -> {color?, blink}) }.
// `roomOf(entity)` - the room an entity is drawn in (null: not on this floor / nowhere);
// `drawn(entity)` - whether the entity has a mark on the plan; `isRoom(id)` - a room of this floor.
export function ruleEffects(rules, states, { roomOf, drawn, isRoom, now = Date.now() }) {
  const rooms = new Map(), marks = new Map();
  for (const r of rules) {
    if (!ruleHolds(r, states[r.entity], now)) continue;
    const target = r.target || r.entity;
    // a room: named, the target is a room id, or the entity has no mark of its own (a sensor not drawn)
    const room = r.room || (isRoom(target) ? target : !drawn(target) ? roomOf(target) : null);
    if (room && isRoom(room)) {
      if (r.color && !rooms.has(room)) rooms.set(room, r.color);
      if (!r.blink) continue;
    }
    if (drawn(target)) {
      const m = marks.get(target) || { color: null, blink: false };
      if (r.color && !m.color) m.color = r.color;
      if (r.blink) m.blink = true;
      marks.set(target, m);
    }
  }
  return { rooms, marks };
}

// Power: "640 W", "1.2 kW" (W in, the locale's decimal sign)
export function powerText(w, lang = "en") {
  if (!Number.isFinite(w)) return "";
  return Math.abs(w) >= 1000 ? (w / 1000).toLocaleString(lang, { maximumFractionDigits: 1 }) + " kW" : Math.round(w).toLocaleString(lang) + " W";
}

// A power sensor's value in W (W or kW), null when it is not one.
export function powerWatts(s) {
  if (!s) return null;
  const v = Number(s.state);
  if (s.state === "" || !Number.isFinite(v)) return null;
  const u = String((s.attributes && s.attributes.unit_of_measurement) || "").trim();
  if (u === "W") return v;
  if (u === "kW") return v * 1000;
  if (u === "mW") return v / 1000;
  return s.attributes && s.attributes.device_class === "power" ? v : null;
}
