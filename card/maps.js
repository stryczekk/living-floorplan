// Room maps: rooms coloured by a value - temperature and humidity (now, or the
// average of a period), hours of light and of presence, the energy of the light
// and of the meters in each room, the signal of the radio devices. Any period
// can be compared with the one before it.

export const MAP_KINDS = ["live", "temperature", "humidity", "light_hours", "presence_hours", "light_energy", "energy", "signal"];
// maps drawn from history (hours or energy over the last days)
export const HISTORY_KINDS = ["light_hours", "presence_hours", "light_energy", "energy"];
// maps that are "now" by default and can be the average of a period too
export const AVERAGE_KINDS = ["temperature", "humidity"];

// [start, end] of a period: a number of days back from now, or the last winter / summer
// (the one going on, up to now). `before`: the same length just before it (a season: a year before).
export function periodRange(p, now = Date.now(), { before = false, south = false } = {}) {
  if (typeof p === "number") {
    const end = before ? now - p * 864e5 : now;
    return [end - p * 864e5, end];
  }
  const d = new Date(now);
  // winter: December-February, summer: June-August (the other way round south of the equator)
  const startMonth = (p === "winter") !== south ? 11 : 5;
  let y = d.getFullYear();
  let a = new Date(y, startMonth, 1);
  if (a.getTime() > now) a = new Date(y - 1, startMonth, 1);
  if (before) a = new Date(a.getFullYear() - 1, startMonth, 1);
  const b = new Date(a.getFullYear(), startMonth + 3, 1);
  return [a.getTime(), Math.min(b.getTime(), before ? b.getTime() : now)];
}

// Long-term statistics -> one number per entity: the mean of the means, or the sum of the changes.
export function statsValue(rows, type) {
  const v = (rows || []).map((r) => r[type]).filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return null;
  return type === "change" ? v.filter((x) => x >= 0).reduce((a, b) => a + b, 0) : v.reduce((a, b) => a + b, 0) / v.length;
}

// The average per room of its sensors' period values.
export function roomAverages(sources, kind, valueOf) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const vals = (src[kind] || []).map(valueOf).filter((v) => v !== null && v !== undefined);
    if (vals.length) out[room] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}

// This period minus the one before, room by room (rooms with both only).
export function diffValues(cur, prev) {
  const out = {};
  for (const [room, v] of Object.entries(cur || {})) if (prev && prev[room] !== undefined) out[room] = v - prev[room];
  return out;
}

// A radio device's signal as 0..1: Zigbee link quality (0-255) or RSSI in dBm.
export function signalLevel(s) {
  if (!s || s.state === "unavailable" || s.state === "unknown" || s.state === "" || isNaN(Number(s.state))) return null;
  const v = Number(s.state);
  const unit = String((s.attributes && s.attributes.unit_of_measurement) || "");
  const rssi = /dbm/i.test(unit) || v < 0;
  const q = rssi ? (v + 90) / 45 : (v - 20) / 160;
  return Math.max(0, Math.min(1, q));
}

const EPS = 1e-9;

export function pointInPolygon(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + EPS) + xi) c = !c;
  }
  return c;
}

function centroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f;
  }
  if (Math.abs(a) < EPS) return pts[0];
  return [cx / (3 * a), cy / (3 * a)];
}

// Rooms of a lowered floor model with a centre for the value, and a lookup by position.
export function roomIndex(model) {
  const rooms = (model.rooms || []).filter((r) => r.points && r.points.length >= 3 && !r.unused).map((r) => {
    const c = r.label || r.at || centroid(r.points);
    return { id: r.id, name: r.name || r.id, points: r.points, at: pointInPolygon(c[0], c[1], r.points) ? c : centroid(r.points) };
  });
  const roomAt = (x, y) => (rooms.find((r) => pointInPolygon(x, y, r.points)) || {}).id || null;
  return { rooms, roomAt };
}

// What each room has: climate sensors, lights, presence / motion sensors.
export function roomSources(model, roomAt) {
  const by = {};
  const get = (id) => by[id] || (by[id] = { temperature: [], humidity: [], lights: [], presence: [] });
  for (const k of model.climate || []) {
    const id = k.at ? roomAt(k.at[0], k.at[1]) : null;
    if (!id) continue;
    if (k.temperature) get(id).temperature.push(k.temperature);
    if (k.humidity) get(id).humidity.push(k.humidity);
  }
  for (const l of model.lights || []) {
    const at = l.at || (l.bulbs && l.bulbs[0]);
    const id = l.room || (at ? roomAt(at[0], at[1]) : null);
    if (!id) continue;
    if (l.type === "fixture") for (const c of l.circuits || []) { if (c.entity) get(id).lights.push(c.entity); }
    else if (l.entity) get(id).lights.push(l.entity);
  }
  for (const d of model.devices || []) {
    if (!["presence", "motion"].includes(d.type) || !d.entity) continue;
    const at = d.at || d.position;
    const id = d.room || (at ? roomAt(at[0], at[1]) : null);
    if (id) get(id).presence.push(d.entity);
  }
  return by;
}

// Colour stops per kind: [value, colour].
export const SCALES = {
  temperature: [[17, "#3b78c9"], [20.5, "#43a047"], [23, "#fb8c00"], [25.5, "#e53935"]],
  humidity: [[30, "#fb8c00"], [45, "#43a047"], [60, "#3b78c9"], [75, "#5e35b1"]],
  light_hours: [[0, "#1b2433"], [1, "#4a3f22"], [1000, "#ffc300"]],
  presence_hours: [[0, "#1b2433"], [1, "#22394a"], [1000, "#29b6f6"]],
  light_energy: [[0, "#1b2433"], [0.01, "#2f3a22"], [1000, "#9ccc65"]],
  energy: [[0, "#1b2433"], [0.01, "#2f3a22"], [1000, "#9ccc65"]],
  // a change against the period before: less (blue), the same, more (red)
  delta: [[-1, "#3b78c9"], [0, "#2a3547"], [1, "#e53935"]],
  signal: [[0, "#e53935"], [0.5, "#fb8c00"], [1, "#43a047"]],
};

export function colorAt(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a || 1);
      const ch = (h, k) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
      return "#" + [0, 1, 2].map((k) => Math.round(ch(ca, k) + (ch(cb, k) - ch(ca, k)) * f).toString(16).padStart(2, "0")).join("");
    }
  }
  return stops[stops.length - 1][1];
}

// Hours scales stretch to the busiest room: 1 = a trace, the maximum = full colour.
export function scaleFor(kind, max) {
  const s = SCALES[kind];
  if (kind === "light_hours" || kind === "presence_hours") return [s[0], s[1], [Math.max(2, max), s[2][1]]];
  if (kind === "light_energy" || kind === "energy") return [s[0], s[1], [Math.max(0.05, max), s[2][1]]];
  return s;
}

const numeric = (s) => (s && s.state !== "" && s.state !== "unavailable" && s.state !== "unknown" && !isNaN(Number(s.state)) ? Number(s.state) : null);

// The value per room for a live kind: the average of its sensors.
export function liveValues(kind, sources, states) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const vals = (src[kind] || []).map((id) => numeric(states[id])).filter((v) => v !== null);
    if (vals.length) out[room] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}

const ON = new Set(["on", "home", "detected", "occupied", "open", "moving", "presence", "true"]);
export const isActiveState = (s) => ON.has(String(s).toLowerCase());

// Periods "on" within [start, end] from minimal history rows [{s, lu}] (lu in
// seconds), sorted; the first row is the state at the start.
export function onPeriods(rows, start, end) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const a = Math.max(start, rows[i].lu * 1000);
    const b = Math.min(end, i + 1 < rows.length ? rows[i + 1].lu * 1000 : end);
    if (b > a && isActiveState(rows[i].s)) out.push([a, b]);
  }
  return out;
}

export function onMs(rows, start, end) {
  return onPeriods(rows, start, end).reduce((t, [a, b]) => t + b - a, 0);
}

// Length of the union of periods: two lamps on at once count once.
export function unionMs(periods) {
  const p = periods.slice().sort((x, y) => x[0] - y[0]);
  let ms = 0, a = null, b = null;
  for (const [s, e] of p) {
    if (b === null || s > b) { if (b !== null) ms += b - a; a = s; b = e; }
    else if (e > b) b = e;
  }
  return b === null ? 0 : ms + b - a;
}

// Hours per room when anything of the kind was on (any lamp / any sensor).
export function hoursValues(kind, sources, history, start, end) {
  const key = kind === "light_hours" ? "lights" : "presence";
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const ids = src[key] || [];
    if (!ids.length) continue;
    out[room] = unionMs(ids.flatMap((id) => onPeriods(history[id] || [], start, end))) / 3600e3;
  }
  return out;
}

// Power of every light entity in W from the model (`watts` of a lamp, of a chandelier circuit).
export function lightWatts(model) {
  const out = {};
  for (const l of model.lights || []) {
    if (l.type === "fixture") { for (const c of l.circuits || []) if (c.entity && Number(c.watts) > 0) out[c.entity] = Number(c.watts); }
    else if (l.entity && Number(l.watts) > 0) out[l.entity] = Number(l.watts);
  }
  return out;
}

// kWh per room: every lamp's own time on x its power; a dimmable lamp at its
// brightness then (LEDs draw roughly in proportion). Rows: [{ t, state, attributes }].
// levels: { id: 0..1 } for lamps whose history has no brightness (the recorder may
// not keep it) - its brightness now, so a strip kept at 20 % is not counted at 100 %.
export function energyValues(sources, history, start, end, watts, levels = {}) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    let kwh = 0, any = false;
    for (const id of src.lights || []) {
      if (!watts[id]) continue;
      any = true;
      const rows = history[id] || [];
      let level = levels[id] !== undefined ? levels[id] : 1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const b = r.attributes && r.attributes.brightness;
        if (typeof b === "number") level = b / 255;
        const a = Math.max(start, r.t), z = Math.min(end, i + 1 < rows.length ? rows[i + 1].t : end);
        if (z > a && isActiveState(r.state)) kwh += ((z - a) * watts[id] * level) / 3.6e9;
      }
    }
    if (any) out[room] = kwh;
  }
  return out;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const f1 = (v) => Math.round(v * 10) / 10;

// The fill of the rooms (goes over the floor, under the furniture) and the values
// (on top), as two SVG strings. `angle` keeps the texts upright.
export function mapLayers(rooms, values, kind, { format, angle = 0, paint = (c) => c, delta = false }) {
  const vals = Object.values(values);
  const spread = Math.max(1e-6, ...vals.map((v) => Math.abs(v)));
  const base = delta ? SCALES.delta.map(([v, c]) => [v * spread, c]) : scaleFor(kind, vals.length ? Math.max(...vals) : 0);
  const stops = base.map(([v, c]) => [v, paint(c)]);
  const fills = [], texts = [];
  for (const r of rooms) {
    const v = values[r.id];
    if (v === undefined) continue;
    const pts = r.points.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ");
    fills.push(`<polygon points="${pts}" fill="${colorAt(stops, v)}" fill-opacity="0.55"/>`);
    const [x, y] = r.at;
    texts.push(`<text x="${f1(x)}" y="${f1(y)}" transform="rotate(${angle} ${f1(x)} ${f1(y)})">${esc(format(v))}</text>`);
  }
  return {
    fill: `<g id="fc-map" pointer-events="none">${fills.join("")}</g>`,
    text: `<g id="fc-map-text" pointer-events="none" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="middle">${texts.join("")}</g>`,
    stops,
  };
}

// The signal map: a coloured spot under every radio device (red weak .. green strong),
// its value on top. points: [{ x, y, level (0..1 or null = silent), text }]
export function signalLayers(points, { angle = 0, paint = (c) => c, r = 46 } = {}) {
  const stops = SCALES.signal.map(([v, c]) => [v, paint(c)]);
  const defs = [], spots = [], texts = [];
  points.forEach((p, i) => {
    const c = p.level === null ? paint("#5b6a80") : colorAt(stops, p.level);
    defs.push(`<radialGradient id="fc-sig-${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
    spots.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r}" fill="url(#fc-sig-${i})"/>`);
    texts.push(`<text x="${f1(p.x)}" y="${f1(p.y)}" transform="rotate(${angle} ${f1(p.x)} ${f1(p.y)})" font-size="10">${esc(p.text)}</text>`);
  });
  return {
    fill: `<g id="fc-map" pointer-events="none"><defs>${defs.join("")}</defs>${spots.join("")}</g>`,
    text: `<g id="fc-map-text" pointer-events="none" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">${texts.join("")}</g>`,
    stops,
  };
}
