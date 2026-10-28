// Live preview: Home Assistant states applied to a generated plan SVG - the
// classes and texts the generator's CSS reacts to. A reference for what a
// floor plan card does; read-only, it never calls a service.

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

export function applyStates(svg, states, locale = "en") {
  const st = (id) => (id ? states.get(id) : undefined);
  const each = (sel, f) => svg.querySelectorAll(sel).forEach(f);
  const set = (el, cls, on) => el.classList.toggle(cls, !!on);

  each(".light[data-entity]", (el) => set(el, "on", st(el.dataset.entity)?.state === "on"));
  each(".cover[data-entity]", (el) => {
    const s = st(el.dataset.entity);
    const pos = s && s.attributes && s.attributes.current_position;
    const covered = s ? (typeof pos === "number" ? pos < 100 : s.state === "closed") : true;
    set(el, N.isCovered, covered);
    set(el, N.isUnknown, !s || s.state === "unavailable");
    const band = el.querySelector("." + N.coverBandScale);
    if (band) band.setAttribute("transform", `scale(1 ${typeof pos === "number" ? (100 - pos) / 100 : covered ? 1 : 0})`);
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
    const a = st(el.dataset.entity)?.attributes?.hvac_action;
    set(el, N.isCooling, a === "cooling"); set(el, N.isHeating, a === "heating");
  });
  each(`.${N.lock}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    set(el, N.isOpen, s && ["open", "unlocked", "opening"].includes(s.state));
  });
  each(`.${N.iconDevice}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    const alarmKind = ["smoke", "co", "leak"].includes(el.dataset.kind);
    set(el, alarmKind ? N.isAlarm : "on", isOn(s));
    const txt = el.querySelector("." + N.deviceValue), v = st(el.getAttribute(N.attrValue));
    if (txt) txt.textContent = v ? `${v.state}${v.attributes?.unit_of_measurement ? " " + v.attributes.unit_of_measurement : ""}` : "—";
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
    if (kind === "heating") set(el, N.isHeating, s.attributes?.hvac_action === "heating" || (s.state === "on" && !s.attributes?.hvac_action));
    else if (kind === "presence" || kind === "state") set(el, N.isOccupied, isOn(s));
    else if (SCALES[kind] && num(s) !== null) el.style.fill = scale(SCALES[kind], num(s));
  });
}

// Clear everything applyStates set (back to the plain drawing).
export function clearStates(svg) {
  for (const c of ["on", N.isCovered, N.isUnknown, N.isDetected, N.isMoving, N.isCooling, N.isHeating, N.isOpen,
    N.isTilted, N.isAlarm, N.isOccupied]) svg.querySelectorAll("." + c).forEach((el) => el.classList.remove(c));
  svg.querySelectorAll("#rooms polygon").forEach((el) => { el.style.fill = ""; });
}
