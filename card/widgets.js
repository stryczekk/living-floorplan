// Widgets: a clock, the next calendar event, a reading, a button (a scene, a
// script, any entity) - in a bar under the plan, or in a free spot of it:
//   widgets: [{ type: clock | calendar | state | button, at?: [x %, y %], entity?, attribute?, name?, icon?, tap_action?, hold_action? }]
// `at` is a point of the whole plan in per cent (0 0 = top left, 100 100 = bottom right); without it the
// widget goes to the bar (on a phone the plan's margins are under the card's own buttons).

import { readingText } from "./live.js";

export const WIDGET_TYPES = ["clock", "calendar", "state", "button"];

export function normalizeWidgets(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((w) => w && WIDGET_TYPES.includes(w.type)).map((w, i) => ({
    type: w.type,
    // on the plan at this point; without it, in the bar under the plan
    at: Array.isArray(w.at) && w.at.length === 2 && w.at.every((v) => Number.isFinite(Number(v))) ? w.at.map(Number) : null,
    entity: typeof w.entity === "string" ? w.entity : null,
    // a state widget can show one attribute instead of the state (e.g. a text the entity keeps there)
    attribute: typeof w.attribute === "string" ? w.attribute : null,
    name: typeof w.name === "string" ? w.name : null,
    icon: typeof w.icon === "string" ? w.icon : null,
    tap: w.tap_action || null,
    hold: w.hold_action || null,
  }));
}

const W = {
  en: { now: "now", tomorrow: "tomorrow", none: "nothing planned" },
  pl: { now: "teraz", tomorrow: "jutro", none: "nic w planie" },
  de: { now: "jetzt", tomorrow: "morgen", none: "nichts geplant" },
};
const word = (lang, k) => (W[String(lang).slice(0, 2)] || W.en)[k];
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// The next event of a calendar entity, as one line.
export function calendarLine(s, lang = "en", now = new Date()) {
  if (!s || s.state === "unavailable" || s.state === "unknown") return "—";
  const a = s.attributes || {};
  if (!a.message) return word(lang, "none");
  const msg = cut(String(a.message), 30);
  if (s.state === "on") return word(lang, "now") + ": " + msg;
  const t = new Date(String(a.start_time || "").replace(" ", "T"));
  if (isNaN(t)) return msg;
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dd = Math.round((day(t) - day(now)) / 864e5);
  const hm = a.all_day ? "" : t.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) + " ";
  const when = dd === 0 ? "" : dd === 1 ? word(lang, "tomorrow") + " " : t.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "numeric" }) + " ";
  return when + hm + msg;
}

// a name with the entity's attributes in it: "Bins · {when}" -> "Bins · Fri 6.11" ({state} = the state)
export function nameWith(name, s) {
  if (!name || !name.includes("{")) return name;
  return name.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => {
    const v = k === "state" ? s && s.state : s && s.attributes ? s.attributes[k] : undefined;
    return v === undefined || v === null ? "—" : Array.isArray(v) ? v.join(", ") : String(v);
  });
}

// [big line, small line] of a widget.
export function widgetText(w, states, lang = "en", now = new Date()) {
  const s = w.entity ? states[w.entity] : null;
  const fname = nameWith(w.name, s) || (s && s.attributes && s.attributes.friendly_name) || w.entity || "";
  if (w.type === "clock") {
    return [now.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }), now.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })];
  }
  if (w.type === "calendar") return [calendarLine(s, lang, now), fname];
  if (w.type === "state" && w.attribute) {
    const a = s && s.attributes ? s.attributes[w.attribute] : undefined;
    return [a === undefined || a === null ? "—" : Array.isArray(a) ? a.join(", ") : String(a), fname];
  }
  if (w.type === "state") {
    // the weather as "13° clouds", a date sensor as "tomorrow", anything else with its unit
    const kind = w.entity && w.entity.startsWith("weather.") ? "weather" : /date|timestamp/.test((s && s.attributes && s.attributes.device_class) || "") ? "bin" : "info";
    return [readingText(kind, s, lang), fname];
  }
  return [(w.icon ? w.icon + " " : "") + (fname), ""];
}
