// Home Assistant states applied to a generated plan SVG - the
// classes and texts the generator's CSS reacts to. Taken from the editor
// (editor/live.js) and extended: brightness, the light field, alarms.

import { NAMES } from "../generator/names.js";

const N = NAMES;
const OFF = ["off", "standby", "unavailable", "unknown", "idle", "paused", "none", "closed", "locked", "clear", "0"];
const isOn = (s) => !!s && !OFF.includes(String(s.state).toLowerCase());
const num = (s) => (s && s.state !== "" && !isNaN(Number(s.state)) ? Number(s.state) : null);
const fmt = (v, d, locale) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });

// colour scales for rooms tinted by a value: [value, colour] stops
const SCALES = {
  temperature: [[16, "#26324a"], [20, "#1e2836"], [23, "#33302a"], [27, "#3d2626"]],
  humidity: [[30, "#36301f"], [45, "#1e2836"], [60, "#1f2f3d"], [75, "#1d3347"]],
  co2: [[600, "#1e2836"], [1000, "#33302a"], [1500, "#3d2626"]],
};
function scale(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a);
      const c = (h, k) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
      return "#" + [0, 1, 2].map((k) => Math.round(c(ca, k) + (c(cb, k) - c(ca, k)) * f).toString(16).padStart(2, "0")).join("");
    }
  }
  return stops[stops.length - 1][1];
}

const WORDS = {
  en: { today: "today", tomorrow: "tomorrow", in: "in {n} d", sunny: "sun", clear: "clear", cloudy: "cloudy", partlycloudy: "clouds",
    rainy: "rain", pouring: "pouring", snowy: "snow", fog: "fog", windy: "wind", lightning: "storm", "lightning-rainy": "storm", "clear-night": "night" },
  pl: { today: "dziś", tomorrow: "jutro", in: "za {n} dni", sunny: "słońce", clear: "pogodnie", cloudy: "pochmurno", partlycloudy: "chmury",
    rainy: "deszcz", pouring: "ulewa", snowy: "śnieg", fog: "mgła", windy: "wiatr", lightning: "burza", "lightning-rainy": "burza", "clear-night": "noc" },
};
const word = (locale, k) => (WORDS[String(locale).slice(0, 2)] || WORDS.en)[k] || (WORDS.en[k] ?? k);

// Days until the date in a state (a date, a timestamp, or a number of days); null when it is none of these.
export function daysUntil(s, now = new Date()) {
  if (!s || s.state === "unknown" || s.state === "unavailable" || s.state === "") return null;
  if (/^\d+(\.\d+)?$/.test(s.state) && !/date|timestamp/.test(s.attributes?.device_class || "")) return Math.round(Number(s.state));
  const t = Date.parse(s.state);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t), a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 864e5);
}

// A climate entity's temperatures: "21.5° → 22°" (current from `sensor` when given, else its own).
export function climateText(c, sensor, locale = "en") {
  const f = (x) => (typeof x === "number" ? x.toLocaleString(locale, { maximumFractionDigits: 1 }) + "°" : null);
  const cur = num(sensor) ?? (typeof c?.attributes?.current_temperature === "number" ? c.attributes.current_temperature : null);
  const target = c && c.state !== "off" ? c.attributes?.temperature : null;
  const a = f(cur), b = f(target);
  return a && b ? a + " → " + b : a || b || (c ? c.state : "—");
}

// What a climate entity is doing: "heating", "cooling" or null (idle, off, fan only...).
export function climateAction(s) {
  if (!s) return null;
  const a = s.attributes?.hvac_action;
  if (a === "heating" || a === "preheating") return "heating";
  if (a === "cooling") return "cooling";
  if (a !== undefined) return null;
  // no hvac_action reported: the mode stands for it
  return s.state === "heat" ? "heating" : s.state === "cool" ? "cooling" : null;
}

// A fan's turn in seconds: faster with its speed (percentage), 1.6 s when it does not say.
export function fanSpin(s) {
  const p = Number(s?.attributes?.percentage);
  return p > 0 ? Math.round(Math.max(0.35, 2.4 - 0.02 * p) * 100) / 100 : 1.6;
}

// The text under an icon: a bin's collection day, the weather, or the value with its unit.
export function readingText(kind, v, locale = "en") {
  if (!v) return "—";
  if (v.entity_id && v.entity_id.startsWith("climate.")) return climateText(v, null, locale);
  if (kind === "fan" && v.entity_id && v.entity_id.startsWith("fan.")) {
    const p = Number(v.attributes?.percentage);
    return v.state === "on" && p > 0 ? Math.round(p) + "%" : "";
  }
  if (kind === "bin") {
    const n = daysUntil(v);
    if (n === null) return v.state;
    return n <= 0 ? word(locale, "today") : n === 1 ? word(locale, "tomorrow") : word(locale, "in").replace("{n}", n);
  }
  if (kind === "weather" && v.entity_id && v.entity_id.startsWith("weather.")) {
    const t = v.attributes?.temperature;
    return (typeof t === "number" ? Math.round(t) + "° " : "") + word(locale, v.state);
  }
  return `${v.state}${v.attributes?.unit_of_measurement ? " " + v.attributes.unit_of_measurement : ""}`;
}

// Appliance labels ("W 1:25", "D ✓"): a machine's state, job and end entities.
const DONE = ["finished", "finish", "complete", "completed", "end", "done"];
const NOT_RUNNING = [...OFF, "stop", "stopped", "ready", "pause", "pausing", "finished", "finish", "end", "done", "complete", "completed", "error"];

// Minutes to the end from a timestamp ("2026-10-26T15:40:00Z"), a number with
// its unit (min / h / s), or "h:mm(:ss)"; null when it says nothing.
export function minutesLeft(s, now = Date.now()) {
  if (!s || ["unknown", "unavailable", "", "none"].includes(s.state)) return null;
  const v = String(s.state).trim();
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const u = String(s.attributes?.unit_of_measurement || "min").toLowerCase();
    const x = Number(v);
    return Math.round(u.startsWith("h") ? x * 60 : u === "s" ? x / 60 : x);
  }
  const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.round((t - now) / 60e3) : null;
}

// -> { text, done }: "W 1:25" while it runs (time left when known), "W ✓" when the cycle is over.
export function machineLabel(state, job, end, short, now = Date.now()) {
  const st = state ? String(state.state).toLowerCase() : "";
  if (state && !NOT_RUNNING.includes(st)) {
    const min = minutesLeft(end, now);
    return { text: short + (min > 0 ? " " + Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0") : ""), done: false };
  }
  if ((job && DONE.includes(String(job.state).toLowerCase())) || DONE.includes(st)) return { text: short + " ✓", done: true };
  return { text: "", done: false };
}

// The colour a lamp shines with: its RGB colour, else its white's temperature, else null (the warm default).
export function lightColor(a) {
  const rgb = a.rgb_color;
  if (Array.isArray(rgb) && rgb.length === 3 && rgb.every((v) => Number.isFinite(v))) {
    // a pastel of it: the light field is a glow, saturated colours would read as paint
    const [r, g, b] = rgb.map((v) => Math.round(255 - (255 - v) * 0.75));
    return `rgb(${r}, ${g}, ${b})`;
  }
  let k = Number(a.color_temp_kelvin);
  if (!(k > 0) && Number(a.color_temp) > 0) k = 1e6 / Number(a.color_temp);
  if (!(k > 0)) return null;
  // warm 2200 K ... cool 6500 K
  const stops = [[2200, [255, 190, 110]], [2700, [255, 207, 115]], [4000, [255, 228, 190]], [6500, [236, 242, 255]]];
  if (k <= stops[0][0]) return "rgb(" + stops[0][1].join(", ") + ")";
  for (let i = 1; i < stops.length; i++) {
    if (k <= stops[i][0]) {
      const [ka, ca] = stops[i - 1], [kb, cb] = stops[i], f = (k - ka) / (kb - ka);
      return "rgb(" + ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(", ") + ")";
    }
  }
  return "rgb(" + stops[stops.length - 1][1].join(", ") + ")";
}

// paint: a colour swap for the light theme
export function applyStates(svg, states, locale = "en", paint = (c) => c) {
  const st = (id) => (id ? states.get(id) : undefined);
  const each = (sel, f) => svg.querySelectorAll(sel).forEach(f);
  const set = (el, cls, on) => el.classList.toggle(cls, !!on);

  // brightness 0..255 -> 0.25..1, so a dimmed lamp still reads as on
  const level = (s) => {
    const b = s && s.attributes && s.attributes.brightness;
    return typeof b === "number" ? 0.25 + (0.75 * b) / 255 : 1;
  };
  each(".light[data-entity]", (el) => {
    const s = st(el.dataset.entity), on = s?.state === "on";
    set(el, "on", on);
    el.querySelectorAll(".glow, .glow-dim").forEach((g) => { g.style.opacity = on && level(s) < 1 ? String(level(s)) : ""; });
  });
  each("[data-lf]", (g) => {
    const s = st(g.dataset.lf);
    g.style.opacity = s?.state === "on" ? String(level(s)) : "0";
    const c = s?.state === "on" ? lightColor(s.attributes || {}) : null;
    if (c) g.style.setProperty("--fc-light-color", c); else g.style.removeProperty("--fc-light-color");
  });
  each(".cover[data-entity]", (el) => {
    const s = st(el.dataset.entity);
    const pos = s && s.attributes && s.attributes.current_position;
    const covered = s ? (typeof pos === "number" ? pos < 100 : s.state === "closed") : true;
    set(el, N.isCovered, covered);
    set(el, N.isUnknown, !s || s.state === "unavailable");
    const band = el.querySelector("." + N.coverBandScale);
    if (band) band.setAttribute("transform", `scale(1 ${typeof pos === "number" ? (100 - pos) / 100 : covered ? 1 : 0})`);
  });
  // a roof window: its cover over the glass (--sky = how much it hides)
  each(".skylight[data-entity]", (el) => {
    const s = st(el.dataset.entity);
    const pos = s && s.attributes && s.attributes.current_position;
    const part = s ? (typeof pos === "number" ? (100 - pos) / 100 : s.state === "closed" ? 1 : 0) : 0;
    set(el, N.isCovered, part > 0);
    el.style.setProperty("--sky", String(Math.round(part * 75) / 100));
  });
  each(`.${N.presence}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    set(el, N.isDetected, isOn(s));
    set(el, N.isMoving, s && /move|motion/i.test(s.state));
    set(el, N.isUnknown, !s || s.state === "unavailable");
  });
  each(`.${N.motion}[data-entity], .${N.appliance}[data-entity]`, (el) => set(el, "on", isOn(st(el.dataset.entity))));
  each(".tv[data-entity]", (el) => set(el, "on", isOn(st(el.dataset.entity))));
  each(`.${N.ac}[data-entity]`, (el) => {
    const a = climateAction(st(el.dataset.entity));
    set(el, N.isCooling, a === "cooling"); set(el, N.isHeating, a === "heating");
  });
  each(`.${N.deviceLabel}`, (el) => {
    const short = el.getAttribute(N.attrShort) || el.getAttribute(N.attrName) || "";
    const { text, done } = machineLabel(st(el.getAttribute(N.attrState)), st(el.getAttribute("data-job")), st(el.getAttribute(N.attrEnd)), short);
    if (el.textContent !== text) el.textContent = text;
    set(el, N.isDone, done);
  });
  // a camera that sees a person (or motion): its fan turns red
  each("[data-entity-detect]", (el) => set(el, N.isDetected, isOn(st(el.getAttribute("data-entity-detect")))));
  each(`.${N.lock}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    set(el, N.isOpen, s && ["open", "unlocked", "opening"].includes(s.state));
  });
  each(`.${N.iconDevice}[data-entity]`, (el) => {
    const id = el.dataset.entity, s = st(id), kind = el.dataset.kind;
    const alarmKind = ["smoke", "co", "leak", "gas", "siren"].includes(kind);
    const climate = id.startsWith("climate.");
    // a bin glows the day before its collection and on the day
    const due = kind === "bin" ? daysUntil(s) : null;
    // a thermostat / TRV: coral while heating, cyan while cooling, quiet when idle
    const act = climate ? climateAction(s) : null;
    set(el, N.isHeating, act === "heating");
    set(el, N.isCooling, act === "cooling");
    // a reading (weather, info, solar power, battery) is not "working": only its text changes
    const readingOnly = ["weather", "info", "solar", "battery", "meter", "inverter", "ups", "lux", "rain", "water_tank"].includes(kind);
    set(el, alarmKind ? N.isAlarm : "on", kind === "bin" ? due !== null && due <= 1 : readingOnly || climate ? false : isOn(s));
    if (kind === "fan") el.style.setProperty("--fp-spin", fanSpin(s) + "s");
    const txt = el.querySelector("." + N.deviceValue);
    if (!txt) return;
    const vid = el.getAttribute(N.attrValue), v = st(vid);
    // a thermostat with a separate temperature sensor: "sensor° → target°"
    txt.textContent = climate && vid !== id ? climateText(s, v, locale) : readingText(kind, v, locale);
  });
  each(`[${N.attrContact}]`, (el) => {
    const s = st(el.getAttribute(N.attrContact));
    set(el, N.isOpen, s && (s.state === "on" || s.state === "open"));
    set(el, N.isTilted, s && s.state === "tilted");
  });
  each("[data-temp]", (el) => {
    const t = num(st(el.dataset.temp)), h = num(st(el.dataset.hum));
    const tt = el.querySelector(".climate-temp"), hh = el.querySelector(".climate-hum");
    if (tt) tt.textContent = t === null ? "—" : fmt(t, 1, locale) + "°";
    if (hh) hh.textContent = h === null ? "—" : fmt(h, 0, locale) + "%";
  });
  each(`#rooms polygon[${N.attrTintEntity}]`, (el) => {
    const s = st(el.getAttribute(N.attrTintEntity)), kind = el.getAttribute(N.attrTintKind);
    el.classList.remove(N.isHeating, N.isOccupied);
    el.style.fill = "";
    if (!s) return;
    if (kind === "heating") set(el, N.isHeating, climateAction(s) === "heating" || (s.state === "on" && !s.attributes?.hvac_action));
    else if (kind === "presence" || kind === "state") set(el, N.isOccupied, isOn(s));
    else if (SCALES[kind] && num(s) !== null) el.style.fill = scale(SCALES[kind].map(([v, c]) => [v, paint(c)]), num(s));
  });
}

// Clear everything applyStates set (back to the plain drawing).
export function clearStates(svg) {
  for (const c of ["on", N.isCovered, N.isUnknown, N.isDetected, N.isMoving, N.isCooling, N.isHeating, N.isOpen,
    N.isTilted, N.isAlarm, N.isOccupied]) svg.querySelectorAll("." + c).forEach((el) => el.classList.remove(c));
  svg.querySelectorAll("#rooms polygon").forEach((el) => { el.style.fill = ""; });
}
