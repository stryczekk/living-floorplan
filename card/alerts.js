// Alerts on the plan: the room pulses - smoke, CO and leak detectors, windows
// open in the cold, and any entity listed under `alerts` in the card config.

export const ALARM_KINDS = ["smoke", "co", "leak"];
const ON = new Set(["on", "detected", "open", "true", "problem", "wet", "alarm", "triggered"]);
const isOn = (s) => !!s && ON.has(String(s.state).toLowerCase());
const num = (s) => (s && s.state !== "" && !isNaN(Number(s.state)) ? Number(s.state) : null);

// `alerts:` items: { entity, state? | above? | below?, room?, color?, name? }
export function normalizeAlerts(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((a) => a && typeof a.entity === "string").map((a) => ({
    entity: a.entity,
    states: a.state === undefined ? null : [].concat(a.state).map(String),
    above: a.above === undefined ? null : Number(a.above),
    below: a.below === undefined ? null : Number(a.below),
    room: a.room || null,
    color: /^#[0-9a-fA-F]{3,8}$/.test(a.color || "") ? a.color : "#e53935",
    name: a.name || null,
  }));
}

export function ruleActive(rule, s) {
  if (!s) return false;
  if (rule.above !== null || rule.below !== null) {
    const v = num(s);
    return v !== null && (rule.above === null || v > rule.above) && (rule.below === null || v < rule.below);
  }
  return rule.states ? rule.states.includes(String(s.state)) : isOn(s);
}

// The room behind a window: a step past the wall, inwards when the window knows
// which way that is, else whichever side of its line is a room.
export function windowRoom(w, roomAt) {
  const line = w.line || Object.values(w.sashes || {}).map((x) => (Array.isArray(x) ? x : x && x.line)).find(Boolean);
  if (!line) return null;
  const [a, b] = line;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const normal = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  const tries = w.inward ? [w.inward] : [normal, [-normal[0], -normal[1]]];
  for (const n of tries) {
    for (const step of [20, 35, 55]) {
      const r = roomAt(mx + n[0] * step, my + n[1] * step);
      if (r) return r;
    }
  }
  return null;
}

// Active alerts on one floor: [{ entity, room, color, kind, text? }].
// `roomAt(x, y)` finds the room of a point; `cold` = { outside, below } or null.
export function activeAlerts(model, states, { roomAt, rules = [], cold = null, entityRoom = () => null }) {
  const out = [];
  for (const d of model.devices || []) {
    if (d.type !== "icon" || !ALARM_KINDS.includes(d.kind) || !d.entity) continue;
    if (isOn(states[d.entity])) out.push({ entity: d.entity, room: d.room || (d.at ? roomAt(d.at[0], d.at[1]) : null), color: "#e53935", kind: d.kind });
  }
  if (cold && cold.outside) {
    const t = num(states[cold.outside]);
    if (t !== null && t < cold.below) {
      for (const w of model.windows || []) {
        for (const c of w.contacts || []) {
          if (!c || !isOn(states[c])) continue;
          out.push({ entity: c, room: windowRoom(w, roomAt), color: "#29b6f6", kind: "cold", value: t });
        }
      }
    }
  }
  for (const r of rules || []) {
    if (ruleActive(r, states[r.entity])) out.push({ entity: r.entity, room: r.room || entityRoom(r.entity), color: r.color, kind: "rule", name: r.name });
  }
  return out;
}
