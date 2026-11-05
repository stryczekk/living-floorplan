// Floor plan card for Home Assistant: draws the house from the floor plan
// editor's model (house.json) and shows it live - lights that light the rooms
// and spill through doorways, covers, readings, presence, contacts, alarms.
//
//   type: custom:living-floorplan-card
//   model: /local/house.json     # the editor's model (required)
//   light: realistic             # or: glow (round glows clipped to the room)
//   rotate: auto                 # or: 0 / 90 - turn a wide plan on a tall screen
//
// See README.md for all options.

import { generateSvg } from "../generator/floorplan-model.js";
import { lowerV2, floorModel, floorIndex } from "../generator/model-v2.js";
import { NAMES } from "../generator/names.js";
import { lightLayer } from "./lighting.js";
import { applyStates } from "./live.js";
import { lightSvg, paintLight, paletteCss } from "./theme.js";
import { normalizeEvents, eventMarks, clusterMarks } from "./events.js";
import { forgottenLights } from "./forgotten.js";
import { isMotion } from "./trail.js";
import { normalizeWidgets, widgetText } from "./widgets.js";
import { MAP_KINDS, AVERAGE_KINDS, roomIndex, roomSources, liveValues, hoursValues, energyValues, lightWatts, mapLayers, signalLayers,
  periodRange, statsValue, roomAverages, diffValues, signalLevel } from "./maps.js";
import { normalizeAlerts, activeAlerts, ALARM_KINDS, windowRoom } from "./alerts.js";
import { normalizeRules, ruleEffects, powerText, powerWatts } from "./rules.js";
import { makePalette, indexer, encodeGif } from "./gif.js";
import { normalizeHistory, statesAt } from "./timeline.js";
import { sunPosition, sunPatches, sunLayer } from "./sun.js";
import { trailLayer } from "./trail.js";
import { hasProxy, proxyHistory } from "./influx.js";

export const CARD_NAME = "living-floorplan-card";
// the card's name until 28.10.2026: dashboards made with it keep working
export const OLD_CARD_NAME = "house-floorplan-card";
export const VERSION = "1.0.2";
// the address Home Assistant loaded the card from: its ?v= tells which copy a browser runs
const LOADED_FROM = (() => { try { return new URL(import.meta.url); } catch (e) { return null; } })();
export function versionLabel(url = LOADED_FROM) {
  const v = url && url.searchParams.get("v");
  return VERSION + (v ? " · v" + v : "");
}

export const STRINGS = {
  en: {
    card_name: "Living Floor Plan",
    card_description: "Your house from the floor plan editor, live: light that fills the rooms, covers, readings, presence.",
    model_required: "Set 'model' to the house.json from the floor plan editor, e.g. /local/house.json.",
    loading: "Loading the plan…",
    g_click: "Click", g_hold: "hold", g_on: "turn on", g_off: "turn off", g_open: "open", g_close: "close", g_stop: "stop",
    g_info: "details", g_stats: "statistics", g_door: "open the door", undo: "Undo", u_on: "on", u_off: "off",
    u_opening: "opening", u_closing: "closing", u_stopped: "stopped", door_opening: "Opening the door…", door_open: "Door opened",
    load_error: "Could not load {url}: {msg}",
    onb_title: "Draw your house",
    onb_text: "Open the floor plan editor (Floor plan in the sidebar): draw the walls or trace a photo or PDF of your plan, place lights, covers and sensors and pick their entities. Save - this card shows the plan at once.",
    onb_button: "Open the editor",
    ground_floor: "Ground floor",
    zoom_in: "Zoom in",
    zoom_out: "Zoom out",
    fit: "Whole plan",
    map_live: "Live",
    map_temperature: "Temperature",
    map_humidity: "Humidity",
    map_light_hours: "Hours of light",
    map_presence_hours: "Hours of presence",
    map_light_energy: "Light energy",
    hours: "{n} h",
    loading_history: "Loading history…",
    alert_smoke: "Smoke",
    alert_co: "Carbon monoxide",
    alert_leak: "Leak",
    alert_gas: "Gas",
    alert_siren: "Alarm",
    alert_cold: "Window open, {t}° outside",
    time_travel: "Go back in time",
    live: "Live",
    range_24h: "24 h",
    range_7d: "7 days",
    range_30d: "30 days",
    range_90d: "3 months",
    play: "Play",
    pause: "Pause",
    settings: "Settings",
    s_light: "Light",
    s_realistic: "Realistic",
    s_glow: "Glows",
    s_sun: "Sun through the windows",
    s_trail: "Trail of movement",
    s_labels: "Room names",
    s_readings: "Temperatures", s_heating: "Heating rooms tinted",
    s_reset: "Defaults",
    s_layers: "Show on the plan",
    s_idle_lights: "Lamps that are off",
    s_sensors: "Motion and presence sensors",
    s_devices: "Devices and appliances",
    s_cameras: "Cameras",
    s_furniture: "Furniture",
    s_strength: "Light strength",
    s_note: "Only on this device.",
    s_theme: "Theme",
    th_auto: "Like Home Assistant",
    th_dark: "Dark",
    th_light: "Light",
    forgotten: "💡 {room}: on, nobody there for {min} min · turn off",
    cam_seen: "someone there",
    ev_open: "{name} open",
    ev_detect: "{name}: detection",
    close: "Close",
    confirm: "Are you sure?",
    map_energy: "Energy in the rooms",
    map_signal: "Signal (Zigbee, Wi-Fi)",
    p_now: "Now",
    p_days: "{n} days",
    p_year: "Year",
    p_winter: "Winter",
    p_summer: "Summer",
    compare: "± before",
    vs_before: "against the period before",
    sig_weak: "weak",
    sig_good: "strong",
    none_found: "no signal sensors found",
    r_lights: "Lights",
    r_covers: "Covers",
    r_climate: "Climate",
    r_devices: "Devices",
    r_all_off: "All off",
    r_all_up: "All up",
    r_all_down: "All down",
    r_someone: "someone there",
    r_empty: "nobody",
    r_empty_for: "nobody for {t}",
    r_nothing: "Nothing of this room is on the plan.",
    r_24h: "24 h",
    lasso_hint: "Select an area: draw round it (Shift + drag with a mouse)",
    lasso_count: "{l} lights · {c} covers",
    lasso_none: "Nothing to switch here",
    lasso_on: "Turn on",
    lasso_off: "Turn off",
    power_house: "House now {w}",
    power_devices: "Devices now {w}",
    rec_t: "Save the range as an animated GIF (about 30 seconds)",
    edit_plan: "Edit the plan",
  },
  pl: {
    card_name: "Living Floor Plan",
    card_description: "Twój dom z edytora rzutu, na żywo: światło wypełniające pokoje, rolety, odczyty, obecność.",
    model_required: "Ustaw 'model' na house.json z edytora rzutu, np. /local/house.json.",
    g_click: "Klik", g_hold: "przytrzymaj", g_on: "zapal", g_off: "zgaś", g_open: "otwórz", g_close: "zamknij", g_stop: "zatrzymaj",
    g_info: "szczegóły", g_stats: "statystyki", g_door: "otwórz drzwi", undo: "Cofnij", u_on: "zapalone", u_off: "zgaszone",
    u_opening: "otwiera się", u_closing: "zamyka się", u_stopped: "zatrzymana", door_opening: "Otwieram drzwi…", door_open: "Drzwi otwarte",
    loading: "Wczytuję rzut…",
    load_error: "Nie udało się wczytać {url}: {msg}",
    onb_title: "Narysuj swój dom",
    onb_text: "Otwórz edytor rzutu (Floor plan w menu bocznym): narysuj ściany albo odrysuj zdjęcie lub PDF planu, postaw lampy, rolety i czujniki i wybierz ich encje. Zapisz — karta od razu pokaże plan.",
    onb_button: "Otwórz edytor",
    ground_floor: "Parter",
    zoom_in: "Przybliż",
    zoom_out: "Oddal",
    fit: "Cały rzut",
    map_live: "Na żywo",
    map_temperature: "Temperatura",
    map_humidity: "Wilgotność",
    map_light_hours: "Godziny światła",
    map_presence_hours: "Godziny obecności",
    map_light_energy: "Prąd na światło",
    hours: "{n} h",
    loading_history: "Wczytuję historię…",
    alert_smoke: "Dym",
    alert_co: "Czad",
    alert_leak: "Zalanie",
    alert_gas: "Gaz",
    alert_siren: "Alarm",
    alert_cold: "Okno otwarte, na dworze {t}°",
    time_travel: "Cofnij się w czasie",
    live: "Na żywo",
    range_24h: "24 h",
    range_7d: "7 dni",
    range_30d: "30 dni",
    range_90d: "3 mies.",
    play: "Odtwórz",
    pause: "Pauza",
    settings: "Ustawienia",
    s_light: "Światło",
    s_realistic: "Realistyczne",
    s_glow: "Poświaty",
    s_sun: "Słońce w oknach",
    s_trail: "Ślad ruchu",
    s_labels: "Nazwy pokoi",
    s_readings: "Temperatury", s_heating: "Grzejące pokoje na czerwono",
    s_reset: "Domyślne",
    s_layers: "Pokazuj na rzucie",
    s_idle_lights: "Zgaszone lampy",
    s_sensors: "Czujniki ruchu i obecności",
    s_devices: "Urządzenia i AGD",
    s_cameras: "Kamery",
    s_furniture: "Meble",
    s_strength: "Siła światła",
    s_note: "Tylko na tym urządzeniu.",
    s_theme: "Wygląd",
    th_auto: "Jak Home Assistant",
    th_dark: "Ciemny",
    th_light: "Jasny",
    forgotten: "💡 {room}: świeci, nikogo od {min} min · zgaś",
    cam_seen: "ktoś jest",
    ev_open: "{name} otwarte",
    ev_detect: "{name}: wykrycie",
    close: "Zamknij",
    confirm: "Na pewno?",
    map_energy: "Prąd w pokojach",
    map_signal: "Zasięg (Zigbee, Wi-Fi)",
    p_now: "Teraz",
    p_days: "{n} dni",
    p_year: "Rok",
    p_winter: "Zima",
    p_summer: "Lato",
    compare: "± poprzedni",
    vs_before: "wobec poprzedniego",
    sig_weak: "słaby",
    sig_good: "dobry",
    none_found: "brak czujników zasięgu",
    r_lights: "Światło",
    r_covers: "Rolety",
    r_climate: "Klimat",
    r_devices: "Urządzenia",
    r_all_off: "Zgaś wszystko",
    r_all_up: "Wszystkie w górę",
    r_all_down: "Wszystkie w dół",
    r_someone: "ktoś jest",
    r_empty: "pusto",
    r_empty_for: "pusto od {t}",
    r_nothing: "Z tego pokoju nic nie ma na rzucie.",
    r_24h: "24 h",
    lasso_hint: "Zaznacz obszar: obrysuj go (myszą: Shift + przeciągnięcie)",
    lasso_count: "lampy: {l} · rolety: {c}",
    lasso_none: "Nic tu nie ma do przełączenia",
    lasso_on: "Zapal",
    lasso_off: "Zgaś",
    power_house: "Dom teraz {w}",
    power_devices: "Urządzenia teraz {w}",
    rec_t: "Zapisz zakres jako animowany GIF (około 30 sekund)",
    edit_plan: "Edytuj rzut",
  },
  de: {
    card_name: "Living Floor Plan",
    card_description: "Dein Haus aus dem Grundriss-Editor, live: Licht, das die Räume füllt, Rollläden, Messwerte, Präsenz.",
    model_required: "Setze 'model' auf die house.json aus dem Grundriss-Editor, z. B. /local/house.json.",
    loading: "Grundriss wird geladen…",
    g_click: "Klick", g_hold: "halten", g_on: "einschalten", g_off: "ausschalten", g_open: "öffnen", g_close: "schließen", g_stop: "stoppen",
    g_info: "Details", g_stats: "Statistik", g_door: "Tür öffnen", undo: "Rückgängig", u_on: "an", u_off: "aus",
    u_opening: "öffnet", u_closing: "schließt", u_stopped: "gestoppt", door_opening: "Tür wird geöffnet…", door_open: "Tür geöffnet",
    load_error: "{url} konnte nicht geladen werden: {msg}",
    onb_title: "Zeichne dein Haus",
    onb_text: "Öffne den Grundriss-Editor (Grundriss in der Seitenleiste): zeichne die Wände oder zeichne ein Foto oder PDF deines Plans nach, platziere Lichter, Rollläden und Sensoren und wähle ihre Entitäten. Speichern - diese Karte zeigt den Plan sofort.",
    onb_button: "Editor öffnen",
    ground_floor: "Erdgeschoss",
    zoom_in: "Vergrößern",
    zoom_out: "Verkleinern",
    fit: "Ganzer Plan",
    map_live: "Live",
    map_temperature: "Temperatur",
    map_humidity: "Luftfeuchtigkeit",
    map_light_hours: "Stunden Licht",
    map_presence_hours: "Stunden Präsenz",
    map_light_energy: "Energie für Licht",
    hours: "{n} h",
    loading_history: "Verlauf wird geladen…",
    alert_smoke: "Rauch",
    alert_co: "Kohlenmonoxid",
    alert_leak: "Wasserleck",
    alert_gas: "Gas",
    alert_siren: "Alarm",
    alert_cold: "Fenster offen, draußen {t}°",
    time_travel: "Zurück in der Zeit",
    live: "Live",
    range_24h: "24 h",
    range_7d: "7 Tage",
    range_30d: "30 Tage",
    range_90d: "3 Monate",
    play: "Abspielen",
    pause: "Pause",
    settings: "Einstellungen",
    s_light: "Licht",
    s_realistic: "Realistisch",
    s_glow: "Lichtkreise",
    s_sun: "Sonne durch die Fenster",
    s_trail: "Bewegungsspur",
    s_labels: "Raumnamen",
    s_readings: "Temperaturen", s_heating: "Heizende Räume einfärben",
    s_reset: "Standard",
    s_layers: "Auf dem Plan zeigen",
    s_idle_lights: "Ausgeschaltete Lampen",
    s_sensors: "Bewegungs- und Präsenzsensoren",
    s_devices: "Geräte und Haushaltsgeräte",
    s_cameras: "Kameras",
    s_furniture: "Möbel",
    s_strength: "Lichtstärke",
    s_note: "Nur auf diesem Gerät.",
    s_theme: "Design",
    th_auto: "Wie Home Assistant",
    th_dark: "Dunkel",
    th_light: "Hell",
    forgotten: "💡 {room}: an, seit {min} min niemand da · ausschalten",
    cam_seen: "jemand da",
    ev_open: "{name} offen",
    ev_detect: "{name}: Erkennung",
    close: "Schließen",
    confirm: "Bist du sicher?",
    map_energy: "Energie in den Räumen",
    map_signal: "Signal (Zigbee, WLAN)",
    p_now: "Jetzt",
    p_days: "{n} Tage",
    p_year: "Jahr",
    p_winter: "Winter",
    p_summer: "Sommer",
    compare: "± vorher",
    vs_before: "im Vergleich zum Zeitraum davor",
    sig_weak: "schwach",
    sig_good: "stark",
    none_found: "keine Signalsensoren gefunden",
    r_lights: "Lichter",
    r_covers: "Rollläden",
    r_climate: "Klima",
    r_devices: "Geräte",
    r_all_off: "Alle aus",
    r_all_up: "Alle hoch",
    r_all_down: "Alle runter",
    r_someone: "jemand da",
    r_empty: "niemand",
    r_empty_for: "seit {t} niemand",
    r_nothing: "Von diesem Raum ist nichts auf dem Plan.",
    r_24h: "24 h",
    lasso_hint: "Bereich wählen: umrande ihn (mit der Maus: Shift + Ziehen)",
    lasso_count: "{l} Lichter · {c} Rollläden",
    lasso_none: "Hier gibt es nichts zu schalten",
    lasso_on: "Einschalten",
    lasso_off: "Ausschalten",
    power_house: "Haus jetzt {w}",
    power_devices: "Geräte jetzt {w}",
    rec_t: "Zeitraum als animiertes GIF speichern (etwa 30 Sekunden)",
    edit_plan: "Plan bearbeiten",
  },
};

export function translate(lang, key, vars = {}) {
  const code = String(lang || "en").slice(0, 2).toLowerCase();
  const t = STRINGS[code] || STRINGS.en;
  const text = t[key] !== undefined ? t[key] : STRINGS.en[key] !== undefined ? STRINGS.en[key] : key;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const TOGGLE_DOMAINS = new Set(["light", "switch", "fan", "input_boolean", "cover", "media_player", "humidifier"]);
// what a tap on the plan switches: lights and covers only (safe, and undone at once); anything else opens its details,
// a hold always does (a door strike set to `lock_action: hold` is the one exception: a hold opens it)
const TAP_TOGGLE = new Set(["light", "cover"]);
// what a tap on a cover does (cover.toggle): stops a moving one, closes an open one, opens a closed one
function coverTapWord(st) {
  if (st.state === "opening" || st.state === "closing") return "u_stopped";
  const p = st.attributes && st.attributes.current_position;
  return (typeof p === "number" ? p > 0 : st.state === "open") ? "u_closing" : "u_opening";
}
const HIT_PX = 24;      // a finger hits the nearest device within this distance
const DRAG_PX = 10;     // movement that turns a tap into panning
const HOLD_MS = 500;
const MAX_ZOOM = 8;
const MIN_ZOOM = 0.5;
const RECORDER_DAYS = 10;  // the recorder's default history (purge_keep_days)    // zoomed out: the whole plan with room around it (the old card had it too)

// The viewBox of a plan turned 90 degrees clockwise: (x, y) -> (-y, x).
export function turnedViewBox([x, y, w, h]) {
  return [-(y + h), x, h, w];
}

// Whether turning the plan fits a box better: compare the scale of both fits.
export function shouldTurn(boxW, boxH, vbW, vbH) {
  if (!(boxW > 0 && boxH > 0)) return false;
  const flat = Math.min(boxW / vbW, boxH / vbH);
  const turned = Math.min(boxW / vbH, boxH / vbW);
  return turned > flat * 1.15;
}

// Entities a plan SVG refers to (to know when a state change matters).
export function entitiesOf(svg) {
  const ids = new Set();
  const attrs = ["data-entity", "data-lf", "data-temp", "data-hum", "data-entity-detect", "data-job", NAMES.attrState, NAMES.attrEnd,
    NAMES.attrContact, NAMES.attrValue, NAMES.attrTintEntity];
  for (const a of attrs) {
    svg.querySelectorAll("[" + a + "]").forEach((el) => {
      for (const id of String(el.getAttribute(a)).split(",")) if (/^[a-z0-9_]+\.[a-z0-9_]+$/.test(id.trim())) ids.add(id.trim());
    });
  }
  return ids;
}

// Tablet on a wall: back to the start view after `idle` seconds, dimmed at night.
export function kioskConfig(k) {
  if (!k) return null;
  const c = typeof k === "object" ? k : {};
  const night = c.night_dim === undefined ? null : String(c.night_dim);
  return {
    idle: Number(c.idle) > 0 ? Number(c.idle) : 60,
    night: night === "sun" ? "sun" : night && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(night) ? night : null,
    dim: Number(c.dim) > 0 && Number(c.dim) < 1 ? Number(c.dim) : 0.4,
  };
}

// Whether `now` (a Date) falls in "HH:MM-HH:MM" (may wrap over midnight).
export function inWindow(range, now) {
  const [a, b] = range.split("-").map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; });
  const m = now.getHours() * 60 + now.getMinutes();
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

// Ids from the model go into the SVG as attributes: keep them to plain characters
// (a shared house.json must not be able to inject markup).
// The card's and the generator's own element ids: a device called "legend" or a room called "labels"
// ("room-labels") would take their place.
const RESERVED_IDS = new Set(["wrap", "stage", "floors", "zoom", "zoom-in", "zoom-out", "zoom-fit", "lasso-btn", "layers", "set-btn", "tt-btn", "layer-btn", "layer-menu", "settings",
  "timeline", "tt-play", "tt-rec", "tt-when", "tt-ranges", "tt-live", "tt-marks", "tt-slider", "campop", "campop-x", "legend", "dim", "alerts", "info",
  "palette", "plan", "sheet", "rooms", "dividers", "lights", "covers", "cameras", "controls", "furniture", "devices", "locks", "climate",
  "labels", "desc", "light-field", "room-labels", "room-climate", "walls-exterior", "walls-interior", "doors-interior", "device-labels"]);
export function safeIds(model) {
  const walk = (o) => {
    if (Array.isArray(o)) return o.map(walk);
    if (!o || typeof o !== "object") return o;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "id" && typeof v === "string") {
        const id = v.replace(/[^\w.:-]/g, "_");
        out[k] = RESERVED_IDS.has(id) || id.startsWith("fc-") ? id + "-1" : id;
      } else out[k] = walk(v);
    }
    return out;
  };
  return walk(model);
}

// The binary sensor that tells a camera saw someone: on the camera's own device
// (Reolink, Frigate, UniFi... all put one there), a person sensor before a motion one.
export function detectSensorFor(camId, entities, states) {
  const dev = entities && entities[camId] && entities[camId].device_id;
  if (!dev) return null;
  let best = null, bestScore = 0;
  for (const e of Object.values(entities)) {
    if (e.device_id !== dev || !e.entity_id || !e.entity_id.startsWith("binary_sensor.")) continue;
    const dc = (states && states[e.entity_id] && states[e.entity_id].attributes && states[e.entity_id].attributes.device_class) || "";
    const score = /person|osoba|people|human|face|twarz/.test(e.entity_id) ? 3
      : dc === "occupancy" || dc === "presence" ? 2 : dc === "motion" || /motion|ruch/.test(e.entity_id) ? 1 : 0;
    if (score > bestScore) { best = e.entity_id; bestScore = score; }
  }
  return best;
}

// The box of a device without its glows and ranges: an A/C's glow or a sensor's
// range must not take the taps meant for a lamp under it.
const NOT_CORE = ".glows, .glow, .glow-dim, .sensor-fan, .wave, .camera-fan";
export function coreRect(el) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const c of el.querySelectorAll("circle, ellipse, rect, path, line, polygon, polyline, use, text")) {
    if (c.closest(NOT_CORE)) continue;
    const q = c.getBoundingClientRect();
    if (!q.width && !q.height) continue;
    l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
  }
  if (l === Infinity) return el.getBoundingClientRect();
  return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
}

// `entities:` - Home Assistant actions of your own for a device on the plan, by entity:
//   { light.x: { tap_action: {...}, hold_action: {...} } }  or  [{ entity, tap_action, hold_action }]
// A key may also be a whole domain ("light.*") or "*" - an entity's own key wins over them.
export function normalizeEntityActions(e) {
  const out = {};
  const put = (id, v) => { if (typeof id === "string" && v && typeof v === "object") out[id] = { tap: v.tap_action || null, hold: v.hold_action || null }; };
  if (Array.isArray(e)) for (const x of e) put(x && x.entity, x);
  else if (e && typeof e === "object") for (const [k, v] of Object.entries(e)) put(k, v);
  return out;
}

// An energy meter (kWh, Wh, MWh) with long-term statistics, and its factor to kWh.
export function isEnergyMeter(s) {
  const a = (s && s.attributes) || {};
  return !!s && (a.device_class === "energy" || /^[kM]?Wh$/.test(a.unit_of_measurement || "")) && /^total/.test(a.state_class || "");
}
export function kwhFactor(s) {
  const u = (s && s.attributes && s.attributes.unit_of_measurement) || "kWh";
  return u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1;
}

// Layers a viewer can hide in ⚙ (and `hide:` in the config).
export const LAYERS = ["idle_lights", "sensors", "devices", "cameras", "furniture"];

// Where HACS puts the editor that comes with the card.
// the editor of the integration (its panel in the sidebar)
export const DEFAULT_EDITOR_URL = "/living-floorplan";

export class LivingFloorplanCard extends HTMLElement {
  setConfig(config) {
    const lang = navigator.language;
    if (!config) throw new Error(translate(lang, "model_required"));
    const hasModel = (typeof config.model === "string" && config.model.trim()) || (config.model && typeof config.model === "object");
    this._config = {
      // no model yet: the card shows how to get one (the editor that comes with the card)
      model: hasModel ? config.model : null,
      editorUrl: typeof config.editor_url === "string" && config.editor_url ? config.editor_url : DEFAULT_EDITOR_URL,
      light: config.light === "glow" ? "glow" : "realistic",
      rotate: config.rotate === 0 || config.rotate === "0" ? 0 : config.rotate === 90 || config.rotate === "90" ? 90 : "auto",
      floor: config.floor || null,
      height: Number(config.height) > 0 ? Number(config.height) : null,
      showFloors: config.show_floors !== false,
      showZoom: config.show_zoom !== false,
      hold: config.hold_action === "more-info" ? "more-info" : "insights",
      maps: config.maps !== false,
      mapDays: Number(config.map_days) > 0 ? Math.min(365, Number(config.map_days)) : 7,
      kiosk: kioskConfig(config.kiosk),
      alerts: normalizeAlerts(config.alerts),
      timeTravel: config.time_travel !== false,
      // use InfluxDB Proxy for history beyond the recorder, when installed
      influx: config.influx !== false,
      // per kWh, for the light energy map
      price: Number(config.price) > 0 ? Number(config.price) : null,
      // a lock / door strike: "more-info" (default) or "hold" - opened by holding it 0.8 s
      lockAction: config.lock_action === "hold" ? "hold" : "more-info",
      undo: config.undo !== false,
      // a tap on a chandelier of two circuits: "toggle" (off -> the smaller one, on -> off) or "cycle"
      // (off -> the smaller -> both -> off)
      fixtureTap: config.fixture_tap === "cycle" ? "cycle" : "toggle",
      // doors without a contact sensor: "closed" (default) - they stop the light, "open" - light goes through
      doors: config.doors === "open" ? "open" : "closed",
      labels: config.show_room_names === true,
      trail: config.trail !== false,
      trailMs: (Number(config.trail_minutes) > 0 ? Math.min(240, Number(config.trail_minutes)) : 30) * 60e3,
      // sun through the windows; off by default. { offset: degrees the house is turned from its facades }
      sun: config.sun ? { offset: Number((config.sun && config.sun.offset) || 0) || 0 } : null,
      cold: config.cold && typeof config.cold.outside === "string"
        ? { outside: config.cold.outside, below: Number(config.cold.below) > -50 ? Number(config.cold.below) : 12 } : null,
      // a camera that sees someone opens its picture: "kiosk" (default: in tablet mode), "always", "never"
      cameraPopup: config.camera_popup === true || config.camera_popup === "always" ? "always"
        : config.camera_popup === false || config.camera_popup === "never" ? "never" : "kiosk",
      popupSeconds: Number(config.camera_popup_seconds) > 0 ? Number(config.camera_popup_seconds) : 30,
      // { camera.x: binary_sensor.y } when the sensor is not on the camera's device
      cameraDetect: config.camera_detect && typeof config.camera_detect === "object" ? config.camera_detect : {},
      // marks on the time travel line: alarms, locks, camera detections + these; false = none
      events: config.events === false ? null : normalizeEvents(config.events),
      // a lamp on in a room with nobody for this long
      forgotten: config.forgotten === false ? null
        : { minutes: Number(config.forgotten && config.forgotten.minutes) > 0 ? Number(config.forgotten.minutes) : 30 },
      // rooms with a thermostat / TRV on the plan are tinted while it heats
      roomHeating: config.room_heating !== false,
      accent: /^#[0-9a-fA-F]{3,8}$/.test(config.accent || "") ? config.accent : null,
      // your own tap / hold actions per entity (navigate, perform-action, fire-dom-event...)
      actions: normalizeEntityActions(config.entities),
      // a small version label at the bottom (for testing which copy a browser runs)
      showVersion: config.show_version === true,
      // a tap on a room's empty floor: its window (lights, covers, climate, presence) or nothing
      roomTap: config.room_tap === "none" ? "none" : "dialog",
      // a lasso: draw round a part of the house, then switch everything in it
      lasso: config.lasso !== false,
      // rules: a room tinted, a mark glowing or blinking while something holds (rules.js)
      rules: normalizeRules(config.rules),
      // live power by the devices: found on their HA device, or `power: { <entity on the plan>: <power sensor> }`; false hides it
      power: config.power === false ? false : config.power && typeof config.power === "object" ? config.power : {},
      powerTotal: typeof config.power_total === "string" ? config.power_total : null,
      powerMin: Number.isFinite(Number(config.power_min)) ? Number(config.power_min) : 2,
      // a clock, a calendar, a reading, buttons - in free spots of the plan
      widgets: normalizeWidgets(config.widgets),
      // energy meters the plan does not show: [sensor.x] or [{ entity, room }]
      energy: (Array.isArray(config.energy) ? config.energy : []).map((e) => (typeof e === "string" ? { entity: e } : e))
        .filter((e) => e && typeof e.entity === "string"),
    };
    this._map = MAP_KINDS.includes(config.map) ? config.map : "live";
    // what the config says; a viewer's own choices (⚙) go on top of it
    // layers: `hide: [idle_lights, sensors, devices, cameras, furniture]` in the config, each switchable in ⚙
    const hide = new Set(Array.isArray(config.hide) ? config.hide : []);
    this._defaults = { light: this._config.light, sun: !!this._config.sun, trail: this._config.trail, labels: this._config.labels, readings: true,
      heating: this._config.roomHeating,
      idle_lights: !hide.has("idle_lights"), sensors: !hide.has("sensors"), devices: !hide.has("devices"),
      cameras: !hide.has("cameras"), furniture: !hide.has("furniture"),
      strength: 0.36, // a quarter of the ⚙ slider (owner, 26.10)
      theme: ["dark", "light"].includes(config.theme) ? config.theme : "auto" };
    this._sunCfg = this._config.sun || { offset: 0 };
    this._prefs = this._loadPrefs();
    this._applyPrefs();
    // a live card gets a new config (dashboard editor): forget everything of the old one
    if (this._playTimer) { clearInterval(this._playTimer); this._playTimer = null; }
    if (this._kioskTimer && !this._config.kiosk) { clearInterval(this._kioskTimer); this._kioskTimer = null; }
    this._travel = null;
    this._travelReq = (this._travelReq || 0) + 1;
    this._svg = this._entities = this._floorsLowered = this._alertEntities = null;
    this._alertKey = "";
    this._bannerKey = null;
    this._mapCache = null;
    this._trailRows = null;
    this._trailAt = 0;
    this._mapPeriod = null;
    this._compare = false;
    this._influx = undefined;
    this._detState = {};
    this._closePopup && this._closePopup();
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._floor = this._config.floor;
    this._model = null;
    this._sig = "";
    this._render();
    this._load();
    if (this.isConnected) this.connectedCallback();
  }

  _render() {
    this.shadowRoot.innerHTML = `
<style>
  ha-card { overflow: hidden; position: relative; background: var(--fc-solid); }
  #wrap { position: relative; width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; }
  #stage { position: absolute; inset: 0; }
  #wrap { container-type: inline-size; }
  /* a narrow card (a phone): compact buttons, the map button as its icon only */
  @container (max-width: 520px) {
    button.fc { padding: 5px 8px; font-size: 12px; }
    #layer-btn .lbl { display: none; }
    #floors, #layers { top: 6px; }
    #floors { left: 6px; gap: 4px; } #layers { right: 6px; }
  }
  #stage svg { width: 100%; height: 100%; display: block; }
  #info.onb { display: grid; gap: 8px; padding: 20px; }
  #info .onb-h { font-size: 18px; font-weight: 600; color: var(--primary-text-color, #e1e7ef); }
  #info p { margin: 0; line-height: 1.5; max-width: 62ch; }
  #info .onb-err { color: #e57373; }
  #info .onb-btn { justify-self: start; margin-top: 4px; padding: 8px 14px; border-radius: 8px; background: var(--fc-accent); color: var(--fc-ink);
    font-weight: 600; text-decoration: none; }
  #info { padding: 16px; color: var(--secondary-text-color, #7c8ca3); font: 14px var(--paper-font-body1_-_font-family, sans-serif); }
  #floors { position: absolute; top: 8px; left: 8px; display: flex; gap: 6px; z-index: 2; }
  #zoom { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px; z-index: 2; }
  button.fc { font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text);
    background: var(--fc-panel); border: 1px solid var(--fc-line);
    border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  button.fc:hover { border-color: var(--fc-line-hi); }
  button.fc.sel { border-color: var(--fc-accent); color: var(--fc-accent); }
  #zoom button.fc { width: 36px; height: 36px; padding: 0; font-size: 18px; line-height: 1; }
  /* realistic light: the generator's round glows give way to the light field */
  .fc-realistic .light .glow, .fc-realistic .light .glow-dim { display: none; } /* device glows (appliances, alarms) stay */
  #light-field { mix-blend-mode: var(--fc-blend); opacity: var(--fc-light-k, 0.36); }
  /* readings: theme text colour, with a halo so they stay readable in the light */
  #room-labels text { fill: var(--fc-text2); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  #room-climate text { fill: var(--fc-text); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  #room-climate .climate-hum, #room-climate .climate-name { fill: var(--fc-text2); }
  #light-field .lf { transition: opacity 0.35s; }
  #layers { position: absolute; top: 8px; right: 8px; z-index: 3; text-align: right; }
  #layer-menu { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  #layer-menu[hidden] { display: none; }
  #settings { margin-top: 6px; margin-left: auto; width: 230px; text-align: left; background: var(--fc-panel);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 10px 12px; color: var(--fc-text);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); display: grid; gap: 8px; }
  #settings[hidden] { display: none; }
  #settings .ttl { font-weight: 600; }
  #settings label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
  #settings input { accent-color: var(--fc-accent); width: 16px; height: 16px; }
  #settings label.strength { flex-direction: column; align-items: stretch; gap: 4px; }
  #settings label.strength input { width: 100%; height: auto; }
  #settings .seg { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  #settings .seg span { flex: 1 0 100%; color: var(--fc-text2); }
  #settings button.edit { display: block; width: 100%; margin: 8px 0 6px; font-weight: 600; }
  #settings .foot { display: flex; align-items: center; gap: 8px; color: var(--fc-text2); font-size: 12px; }
  #settings .foot span { flex: 1; }
  .no-readings #room-climate { display: none; }
  #settings .sub { color: var(--fc-text2); margin-top: 2px; }
  /* hidden layers: invisible but still there to tap (a lamp that is off can be switched on) */
  .no-idle-lights .light:not(.on), .no-idle-lights .light:not(.on) ~ .bulb-shared { opacity: 0; }
  .no-sensors .presence, .no-sensors .motion { opacity: 0; }
  .no-devices .icon-device:not(.alarm), .no-devices .appliance, .no-devices .tv, .no-devices .ac { opacity: 0; }
  .no-cameras .camera { display: none; }
  .no-furniture #furniture { display: none; }
  #legend { position: absolute; left: 8px; bottom: 8px; z-index: 2; font: 12px var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--fc-text); background: var(--fc-panel); border: 1px solid var(--fc-line); border-radius: 8px; padding: 6px 10px; }
  #alerts { position: absolute; top: 48px; left: 50%; transform: translateX(-50%); z-index: 5; display: flex; flex-direction: column; gap: 4px; align-items: center; }
  #alerts button.fc { border-color: currentColor; font-weight: 600; }
  #floors button.fc.alarm::after { content: ""; display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: #e53935; vertical-align: 1px; }
  #fc-alerts polygon { animation: fc-pulse 1.4s ease-in-out infinite; }
  @keyframes fc-pulse { 0%, 100% { fill-opacity: 0.12; } 50% { fill-opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) { #fc-alerts polygon { animation: none; fill-opacity: 0.4; } }
  #timeline { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 4; background: var(--fc-panel);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 8px 10px; font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #timeline[hidden] { display: none; }
  #timeline .row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  #timeline .sp { flex: 1; }
  #timeline button.fc { white-space: nowrap; padding: 6px 9px; }
  #tt-ranges { display: flex; gap: 6px; }
  #timeline #tt-when { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #timeline #tt-when { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--fc-accent); }
  #tt-slider { width: 100%; accent-color: var(--fc-accent); }
  .traveling #zoom, .traveling #legend { bottom: calc(var(--fc-timeline-h, 84px) + 16px); }
  .traveling #alerts { display: none; }
  #dim { position: absolute; inset: 0; z-index: 4; background: #000; pointer-events: none; transition: opacity 1.2s; }
  #legend .bar { width: 150px; height: 8px; border-radius: 4px; margin: 4px 0 2px; }
  #legend .ends { display: flex; justify-content: space-between; color: var(--fc-text2); }
  #legend { max-width: calc(100% - 150px); box-sizing: border-box; }
  #legend .periods { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
  @container (max-width: 520px) {
    #legend { padding: 4px 7px; font-size: 11px; }
    #legend .bar { width: 110px; }
    #legend .periods button.fc { padding: 2px 6px; font-size: 11px; flex: none; }
    #legend .periods { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  }
  /* a map's legend under the plan, not over it */
  .mapping #stage { bottom: var(--fc-legend-h, 0px); }
  #legend .periods button.fc { padding: 3px 8px; font-size: 12px; }
  .mapping #light-field, .mapping #room-climate, .mapping #fc-sun, .mapping #fc-trail { display: none; }
  #fc-sun { mix-blend-mode: var(--fc-blend); }
  #fc-map-text text { fill: var(--fc-text); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  /* a camera that saw someone: its fan red */
  .camera.detected .camera-fan { fill: #e53935 !important; fill-opacity: 0.3; stroke: #e53935; stroke-opacity: 0.9; animation: fc-cam 1.2s ease-in-out infinite; }
  .camera.detected .camera-mark { fill: #e53935; }
  @keyframes fc-cam { 50% { fill-opacity: 0.12; } }
  /* a lamp on in an empty room */
  .light.fc-forgotten use, .light.fc-forgotten ~ .bulb-shared { animation: fc-forgot 1.6s ease-in-out infinite; }
  @keyframes fc-forgot { 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .camera.detected .camera-fan, .light.fc-forgotten use, .light.fc-forgotten ~ .bulb-shared { animation: none; } }
  #alerts button.nudge { font-weight: 500; }
  /* the picture of a camera that saw someone */
  #campop { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 6; width: min(92%, 640px);
    background: var(--fc-solid); border: 1px solid var(--fc-line); border-radius: 12px; padding: 8px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #campop[hidden] { display: none; }
  #campop .bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  #campop .bar .t { flex: 1; font-weight: 600; }
  #campop .bar .t .seen { color: #e57373; font-weight: 500; margin-left: 6px; }
  #campop .pic { aspect-ratio: 16 / 9; background: #000; border-radius: 8px; overflow: hidden; cursor: pointer; }
  #campop .pic > * { width: 100%; height: 100%; object-fit: contain; display: block; }
  /* under the floor buttons, off the bottom bar (power, zoom) */
  #fc-version { position: absolute; left: 12px; top: 46px; z-index: 2; pointer-events: none;
    font: 10px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text2); opacity: 0.7; white-space: nowrap; }
  #fc-version[hidden] { display: none; }
  /* rules and live power */
  #fc-rules polygon { fill-opacity: 0.26; stroke-opacity: 0.85; stroke-width: 1.5; }
  .fc-rc { filter: drop-shadow(0 0 1.5px var(--fc-rc)) drop-shadow(0 0 5px var(--fc-rc)); }
  .fc-blink { animation: fc-blink 1.2s ease-in-out infinite; }
  @keyframes fc-blink { 50% { opacity: 0.2; } }
  @media (prefers-reduced-motion: reduce) { .fc-blink { animation: none; } }
  #fc-power text { fill: var(--fc-text); font-weight: 600; paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round;
    font-family: var(--paper-font-body1_-_font-family, sans-serif); text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
  #fc-power-total { position: absolute; left: 8px; bottom: 8px; z-index: 2; padding: 4px 9px; border-radius: 14px; background: var(--fc-panel);
    border: 1px solid var(--fc-line); color: var(--fc-text); font: 600 12px var(--paper-font-body1_-_font-family, sans-serif); pointer-events: none; }
  #fc-power-total[hidden], #legend:not([hidden]) + #fc-power-total { display: none; }
  .traveling #fc-rules, .traveling #fc-power, .traveling #fc-power-total { display: none; }
  .traveling .fc-rc { filter: none; }
  .traveling .fc-blink { animation: none; }
  /* the lasso */
  #fc-lasso { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; overflow: visible; }
  #fc-lasso[hidden] { display: none; }
  #fc-lasso .l { fill: color-mix(in srgb, var(--fc-accent) 12%, transparent); stroke: var(--fc-accent); stroke-width: 2; stroke-dasharray: 6 4; }
  #fc-lasso .dots circle { fill: var(--fc-accent); stroke: var(--fc-solid); stroke-width: 2; }
  #lasso-btn.on { border-color: var(--fc-accent); color: var(--fc-accent); }
  #fc-lasso-bar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 54px; z-index: 4; display: flex; align-items: center; gap: 6px;
    flex-wrap: wrap; justify-content: center; max-width: calc(100% - 16px); box-sizing: border-box; padding: 6px 8px; border-radius: 12px;
    background: var(--fc-solid); border: 1px solid var(--fc-line); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #fc-lasso-bar[hidden] { display: none; }
  /* a finger held on a device: a ring fills until the hold acts (red: it opens a door) */
  #fc-press { position: absolute; z-index: 6; width: 52px; height: 52px; margin: -26px 0 0 -26px; pointer-events: none; }
  #fc-press[hidden] { display: none; }
  #fc-press svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
  #fc-press circle { fill: none; stroke-width: 4; }
  #fc-press .bg { stroke: rgba(0, 0, 0, 0.35); }
  #fc-press .fg { stroke: var(--fc-accent, #ffc300); stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; }
  #fc-press.run .fg { transition: stroke-dashoffset var(--fc-press-ms, 400ms) linear; stroke-dashoffset: 0; }
  #fc-press.door .fg { stroke: #e57373; }
  #fc-press span { position: absolute; left: 50%; top: -22px; transform: translateX(-50%); white-space: nowrap; font-size: 12px;
    background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 2px 7px; }
  #fc-press span:empty { display: none; }
  #fc-press.door span { border-color: #e57373; }
  /* what a tap just switched, with an undo */
  #fc-undo { position: absolute; left: 50%; transform: translateX(-50%); bottom: 54px; z-index: 5; display: flex; align-items: center; gap: 10px;
    background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 10px; padding: 6px 6px 6px 12px;
    font-size: 13px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35); max-width: calc(100% - 24px); }
  #fc-undo[hidden] { display: none; }
  #fc-undo .m { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #fc-undo button[hidden] { display: none; }
  /* a phone: small, in the bottom left corner, off the plan's middle (the zoom buttons are on the right) */
  @media (max-width: 600px) {
    #fc-undo { left: 8px; transform: none; bottom: 8px; font-size: 12px; padding: 2px 2px 2px 8px; gap: 6px; border-radius: 8px;
      max-width: calc(100% - 190px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
    #fc-undo button { padding: 2px 8px; font-size: 12px; min-height: 0; }
  }
  /* a mouse over a device: what a click and a hold do */
  #fc-tip { position: absolute; z-index: 6; pointer-events: none; white-space: nowrap; font-size: 12px; background: var(--fc-panel);
    color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 3px 8px; transform: translate(12px, 14px); }
  #fc-tip[hidden] { display: none; }
  #fc-lasso-bar .n { color: var(--fc-text2); padding: 0 4px; }
  #fc-lasso-bar .b { display: contents; }
  /* a marker's note */
  #fc-note { position: absolute; z-index: 5; max-width: min(80%, 280px); background: var(--fc-solid); color: var(--fc-text);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 7px 10px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); pointer-events: none; white-space: pre-line; }
  #fc-note[hidden] { display: none; }
  #fc-note .t { font-weight: 600; }
  #fc-note .t:empty { display: none; }
  #fc-note .n { color: var(--fc-text2); margin-top: 2px; }
  #fc-note .n:empty { display: none; }
  /* a room's window */
  #fc-room { position: absolute; inset: 0; z-index: 6; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; }
  #fc-room[hidden] { display: none; }
  #fc-room .dlg { width: min(94%, 460px); max-height: 92%; overflow: auto; box-sizing: border-box; background: var(--fc-solid);
    border: 1px solid var(--fc-line); border-radius: 12px; padding: 10px 12px 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #fc-room .bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  #fc-room .bar .t { flex: 1; font-size: 16px; font-weight: 600; }
  #fc-room .sec { margin-top: 10px; }
  #fc-room .sec h4 { margin: 0 0 5px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fc-text2); }
  #fc-room .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  #fc-room .chip { border: 1px solid var(--fc-line); background: var(--fc-panel); color: var(--fc-text); border-radius: 18px; padding: 6px 11px;
    font: inherit; cursor: pointer; }
  #fc-room .chip.on { border-color: var(--fc-accent); color: var(--fc-accent); }
  #fc-room .chip.act { font-weight: 600; }
  #fc-room .cov { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
  #fc-room .cov .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #fc-room .cov .p { color: var(--fc-text2); font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }
  #fc-room .cov button.fc { padding: 4px 9px; }
  #fc-room .clim { display: flex; align-items: center; gap: 12px; }
  #fc-room .clim .v { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
  #fc-room .clim .h { color: var(--fc-text2); }
  #fc-room .clim svg { flex: 1; height: 38px; min-width: 0; }
  #fc-room .clim svg polyline { fill: none; stroke: var(--fc-accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  #fc-room .pres { color: var(--fc-text2); }
  #fc-room .empty { color: var(--fc-text2); }
  /* widgets in the bar under the plan */
  #fc-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-top: 1px solid var(--fc-line); background: var(--fc-solid);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); }
  #fc-bar[hidden] { display: none; }
  .fc-chip { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 1px; padding: 5px 10px;
    min-height: 40px; box-sizing: border-box; border: 1px solid var(--fc-line); border-radius: 10px; background: var(--fc-panel);
    color: var(--fc-text); font: inherit; text-align: left; max-width: 100%; min-width: 0; }
  button.fc-chip { cursor: pointer; }
  button.fc-chip:hover { border-color: var(--fc-line-hi); }
  .fc-chip.on { border-color: var(--fc-accent); }
  .fc-chip .big, .fc-chip .sub { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .fc-chip .big { font-size: 15px; font-weight: 600; white-space: nowrap; }
  .fc-chip .sub { font-size: 11px; color: var(--fc-text2); white-space: nowrap; }
  /* a long text (a calendar line) wraps in the bar instead of running off the screen */
  #fc-bar .fc-chip .big { white-space: normal; overflow-wrap: anywhere; }
  .fc-chip .sub:empty { display: none; }
  .fc-chip.sub-below { flex-direction: column-reverse; }
  .fc-chip-clock .big { font-size: 20px; font-variant-numeric: tabular-nums; }
  /* widgets on the plan */
  .fc-w rect.bg { fill: var(--fc-panel); stroke: var(--fc-line); stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .fc-w text { fill: var(--fc-text); font-family: system-ui, sans-serif; dominant-baseline: middle; }
  .fc-w text.sub { fill: var(--fc-text2); }
  .fc-w.act { cursor: pointer; }
  .fc-w.on rect.bg { stroke: var(--fc-accent); }
  .fc-w.on text.big { fill: var(--fc-accent); }
  /* marks on the time travel line; the label shows at once on hover */
  #tt-marks { position: relative; height: 12px; margin: 0 8px; }
  #tt-marks button.mk { position: absolute; top: 2px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; }
  #tt-marks button.mk.many { width: 11px; height: 11px; margin-left: -5.5px; top: 1px; }
  #tt-marks button.mk:hover::after { content: attr(data-label); position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
    white-space: nowrap; background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 3px 7px; font-size: 12px; pointer-events: none; }
</style>
<style id="palette">:host { ${this._paletteStyle()} }</style>
<ha-card>
  <div id="wrap" class="fc-${this._config.light}${this._config.readings ? "" : " no-readings"}">
    <div id="stage"></div>
    <div id="floors"></div>
    <div id="zoom"></div>
    <div id="layers"><button class="fc" id="set-btn">⚙</button> <button class="fc" id="tt-btn">⏱</button> <button class="fc" id="layer-btn"></button><div id="layer-menu" hidden></div><div id="settings" hidden></div></div>
    <div id="timeline" hidden>
      <div class="row"><button class="fc" id="tt-play">▶</button><button class="fc" id="tt-rec">🎬</button><span id="tt-when"></span>
        <span class="sp"></span><span id="tt-ranges"></span><button class="fc" id="tt-live"></button></div>
      <div id="tt-marks"></div>
      <input id="tt-slider" type="range" min="0" max="1000" step="1" value="1000">
    </div>
    <div id="fc-version"${this._config.showVersion ? "" : " hidden"}>${versionLabel()}</div>
    <svg id="fc-lasso" hidden><path class="l"/><g class="dots"></g></svg>
    <div id="fc-lasso-bar" hidden><span class="n"></span><span class="b"></span><button class="fc" data-l="x">✕</button></div>
    <div id="fc-note" hidden><div class="t"></div><div class="n"></div></div>
    <div id="fc-press" hidden><svg viewBox="0 0 52 52"><circle class="bg" cx="26" cy="26" r="22"/><circle class="fg" cx="26" cy="26" r="22" pathLength="100"/></svg><span></span></div>
    <div id="fc-undo" hidden><span class="m"></span><button class="fc" data-undo></button></div>
    <div id="fc-tip" hidden></div>
    <div id="fc-room" hidden><div class="dlg"><div class="bar"><span class="t"></span><button class="fc" id="fc-room-x">✕</button></div><div class="body"></div></div></div>
    <div id="campop" hidden><div class="bar"><span class="t"></span><button class="fc" id="campop-x">✕</button></div><div class="pic"></div></div>
    <div id="legend" hidden></div>
    <div id="fc-power-total" hidden></div>
    <div id="dim" hidden></div>
    <div id="alerts"></div>
  </div>
  <div id="fc-bar" hidden></div>
  <div id="info">${translate(navigator.language, "loading")}</div>
</ha-card>`;
    const zoom = this.shadowRoot.getElementById("zoom");
    if (this._config.showZoom) {
      for (const [label, key, f] of [["+", "zoom_in", () => this._zoomBy(1.5)], ["−", "zoom_out", () => this._zoomBy(1 / 1.5)], ["□", "fit", () => this._fit()]]) {
        const b = document.createElement("button");
        b.className = "fc";
        b.id = "zoom-" + key.replace("zoom_", "").replace("_", "-");
        b.textContent = label;
        b.title = translate(navigator.language, key);
        b.addEventListener("click", f);
        zoom.appendChild(b);
      }
    }
    if (this._config.lasso) {
      const b = document.createElement("button");
      b.className = "fc"; b.id = "lasso-btn"; b.textContent = "◌";
      b.title = translate(navigator.language, "lasso_hint");
      b.addEventListener("click", () => this._lassoMode(!this._lassoArmed));
      zoom.appendChild(b);
    }
    this._renderLayers();
    this._wireTimeline();
    this._renderSettings();
    this.shadowRoot.getElementById("wrap").style.setProperty("--fc-light-k", String(this._pref("strength")));
    for (const k of LAYERS) this.shadowRoot.getElementById("wrap").classList.toggle("no-" + k.replace("_", "-"), !this._pref(k));
    this.shadowRoot.getElementById("set-btn").onclick = () => {
      const p = this.shadowRoot.getElementById("settings");
      p.hidden = !p.hidden;
      this.shadowRoot.getElementById("layer-menu").hidden = true;
    };
    this._attachGestures();
    // layout in the next frame: changing our own height inside the observer's callback is a loop
    // (Safari reports it as an error)
    if (!this._resize) this._resize = new ResizeObserver(() => {
      cancelAnimationFrame(this._layoutFrame);
      this._layoutFrame = requestAnimationFrame(() => this._layout());
    });
    this._resize.disconnect(); // the old wrap is gone
    this._resize.observe(this.shadowRoot.getElementById("wrap"));
  }

  // No plan (yet): what to do, with a button to the editor.
  _onboarding(problem) {
    const info = this.shadowRoot.getElementById("info");
    const lang = this._lang();
    info.style.display = "";
    info.classList.add("onb");
    this.shadowRoot.getElementById("wrap").hidden = true; // no plan: no buttons over the text
    info.innerHTML = "";
    const h = document.createElement("div");
    h.className = "onb-h";
    h.textContent = translate(lang, "onb_title");
    const p = document.createElement("p");
    p.textContent = translate(lang, "onb_text");
    info.append(h, p);
    if (problem) { const w = document.createElement("p"); w.className = "onb-err"; w.textContent = problem; info.appendChild(w); }
    const a = document.createElement("a");
    a.href = this._integration ? "/living-floorplan" : this._config.editorUrl;
    if (this._integration) a.addEventListener("click", (e) => { e.preventDefault(); this._openEditor(); });
    else { a.target = "_blank"; a.rel = "noopener"; }
    a.className = "onb-btn";
    a.textContent = translate(lang, "onb_button");
    info.appendChild(a);
  }

  async _load() {
    const cfg = this._config;
    // no model: the plan kept by the floor plan integration (once there is a connection to HA)
    if (!cfg.model) {
      if (this._hass) this._loadFromHa();
      else this._waitHa = true;
      return;
    }
    try {
      let model = cfg.model;
      if (typeof model === "string") {
        const r = await fetch(model, { cache: "no-cache" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        model = await r.json();
      }
      if (cfg !== this._config) return;
      this._useModel(model);
    } catch (e) {
      if (cfg !== this._config) return;
      this._onboarding(translate(this._lang(), "load_error", { url: typeof cfg.model === "string" ? cfg.model : "model", msg: e.message || e }));
    }
  }

  // The plan from the integration (living_floorplan): drawn, and drawn again after every save in its editor.
  async _loadFromHa() {
    const cfg = this._config, h = this._hass;
    let res;
    try {
      res = await h.callWS({ type: "living_floorplan/plan" });
      if (!res || !Array.isArray(res.versions)) throw new Error("not the floor plan integration");
    } catch (e) {
      // the integration is not installed: the way in is the editor page
      if (cfg !== this._config) return;
      this._integration = false;
      this._onboarding(null);
      return;
    }
    if (cfg !== this._config) return;
    this._integration = true;
    if (!this._savedSub && h.connection && h.connection.subscribeEvents) {
      this._savedSub = h.connection.subscribeEvents(() => { if (!this._config.model) this._loadFromHa(); }, "living_floorplan_saved");
    }
    if (res && res.model) {
      try { this._useModel(res.model); } catch (e) { this._onboarding(translate(this._lang(), "load_error", { url: "Home Assistant", msg: e.message || e })); }
    } else this._onboarding(null);
  }

  _useModel(model) {
    const info = this.shadowRoot.getElementById("info");
    this._model = safeIds(model);
    this._lowerAll();
    info.style.display = "none";
    info.classList.remove("onb");
    this.shadowRoot.getElementById("wrap").hidden = false;
    this._buildFloor();
  }

  // Into the editor: the integration's panel, else the editor page (with the card's model when it is a file).
  _openEditor() {
    if (this._integration) {
      history.pushState(null, "", "/living-floorplan");
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return;
    }
    const m = this._config.model;
    window.open(this._config.editorUrl + (typeof m === "string" ? "?model=" + encodeURIComponent(m) : ""), "_blank", "noopener");
  }

  // Every floor lowered once: alerts are watched on all floors, not only the one shown.
  _lowerAll() {
    const m = this._model;
    this._floorsLowered = [];
    if (!m || m.version !== 2) return;
    const ids = [null, ...(m.floors || []).map((f) => f.id)];
    for (const id of ids) {
      const lowered = lowerV2(floorModel(m, floorIndex(m, id)));
      const roomAt = roomIndex(lowered).roomAt;
      this._floorsLowered.push({ id, lowered, roomAt, sources: roomSources(lowered, roomAt) });
    }
    // entities that can raise an alert anywhere in the house: watched on every floor
    const ae = new Set();
    for (const f of this._floorsLowered) {
      for (const d of f.lowered.devices || []) if (d.type === "icon" && d.entity) ae.add(d.entity);
      for (const w of f.lowered.windows || []) for (const c of w.contacts || []) if (c) ae.add(c);
    }
    // lamps left on in empty rooms: on every floor too
    if (this._config.forgotten) for (const f of this._floorsLowered) for (const src of Object.values(f.sources)) for (const id of [...src.lights, ...src.presence]) ae.add(id);
    if (this._config.cold) ae.add(this._config.cold.outside);
    for (const r of this._config.alerts) ae.add(r.entity);
    this._alertEntities = ae;
  }

  _floorsList() {
    const m = this._model;
    if (!m || m.version !== 2 || !(m.floors && m.floors.length)) return [];
    return [{ id: null, name: m.floor_name || translate(this._lang(), "ground_floor") }, ...m.floors.map((f) => ({ id: f.id, name: f.name || f.id }))];
  }

  // Closed doors stop the light: doors with a contact sensor reporting closed.
  _closedDoors(lowered, get) {
    const closed = new Set();
    const h = this._hass;
    get = get || ((id) => h && h.states[id]);
    for (const d of lowered.doors || []) {
      if (!d.contact) { if (this._config.doors === "closed" && d.id) closed.add(d.id); continue; }
      const s = get(d.contact);
      if (s && (s.state === "off" || s.state === "closed")) closed.add(d.id);
    }
    return closed;
  }

  // ---- theme ----------------------------------------------------------------

  // "dark" / "light": the viewer's choice, else the config, else Home Assistant's dark mode
  _themeNow() {
    const t = this._pref ? this._pref("theme") : "auto";
    if (t === "dark" || t === "light") return t;
    const th = this._hass && this._hass.themes;
    return th && th.darkMode === false ? "light" : "dark";
  }

  _paletteStyle() {
    return paletteCss(this._themeNow(), this._config && this._config.accent);
  }

  _paintFn() {
    return this._themeBuilt === "light" ? paintLight : (c) => c;
  }

  // The look follows the theme: colours of the card at once, the plan redrawn when it changed.
  _syncPalette() {
    const pal = this.shadowRoot && this.shadowRoot.getElementById("palette");
    const css = ":host { " + this._paletteStyle() + " }";
    if (pal && pal.textContent !== css) pal.textContent = css;
  }

  _applyTheme(force = false) {
    this._syncPalette();
    if (this._model && this._svg && (force || this._themeNow() !== this._themeBuilt)) { this._buildFloor(); return true; }
    return false;
  }

  // ---- cameras, heating ------------------------------------------------------

  // Cameras without a detection sensor in the model: the config's, else one found on the camera's device.
  _wireCameras() {
    const svg = this._svg;
    if (!svg) return;
    this._autoDetect = this._autoDetect || {};
    for (const g of svg.querySelectorAll("[data-entity-camera]")) {
      const cam = g.getAttribute("data-entity-camera");
      let id = this._config.cameraDetect[cam] || g.getAttribute("data-entity-detect");
      if (!id && this._hass) {
        id = detectSensorFor(cam, this._hass.entities, this._hass.states) ||
          detectSensorFor(g.getAttribute("data-entity-camera-hq"), this._hass.entities, this._hass.states);
        if (id) this._autoDetect[cam] = id;
      }
      if (id) g.setAttribute("data-entity-detect", id);
    }
  }

  // Readings under icons (a thermostat's "21° → 21°", a plug's watts) kept off the walls: under the icon when there is
  // room, else to its right, its left or above it - whichever touches no wall on the screen (the plan may be turned).
  // Done again only when the texts' lengths, the floor or the turn change.
  _placeLabels() {
    const svg = this._svg;
    if (!svg) return;
    const texts = [...svg.querySelectorAll("text." + NAMES.deviceValue)].filter((t) => t.textContent && t.textContent !== "—");
    const key = (this._turned ? "t" : "f") + (this._floor || "") + ":" + texts.map((t) => t.textContent.length).join(",");
    if (key === this._labelKey) return;
    this._labelKey = key;
    const walls = [...svg.querySelectorAll("#walls-exterior path, #walls-interior path")];
    if (!walls.length || !svg.getBoundingClientRect().width) { this._labelKey = null; return; }
    const hits = (t) => {
      const r = t.getBoundingClientRect();
      if (!r.width) return 0;
      let n = 0;
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
        const x = r.left + (r.width * i) / 6, y = r.top + r.height * (0.2 + 0.3 * j);
        for (const w of walls) {
          const m = w.getScreenCTM();
          if (m && w.isPointInFill(new DOMPoint(x, y).matrixTransform(m.inverse()))) { n++; break; }
        }
      }
      return n;
    };
    for (const t of texts) {
      if (t.dataset.fcX === undefined) { t.dataset.fcX = t.getAttribute("x"); t.dataset.fcY = t.getAttribute("y"); }
      // the icon's middle: the generator writes the text 12 units under it
      const x = Number(t.dataset.fcX), y = Number(t.dataset.fcY) - 12;
      const spots = [[x, y + 12, "middle"], [x + 9, y + 3.5, "start"], [x - 9, y + 3.5, "end"], [x, y - 9, "middle"]];
      let best = null;
      for (const [sx, sy, a] of spots) {
        t.setAttribute("x", sx); t.setAttribute("y", sy); t.style.textAnchor = a;
        const h = hits(t);
        if (!best || h < best.h) best = { sx, sy, a, h };
        if (!h) break;
      }
      t.setAttribute("x", best.sx); t.setAttribute("y", best.sy); t.style.textAnchor = best.a;
    }
  }

  // Rooms the plan itself tints by heating (tint: {kind: heating}) follow the ⚙ switch too: off - put aside, on - back.
  _heatingTints() {
    const svg = this._svg;
    if (!svg) return;
    if (!this._config.roomHeating) {
      svg.querySelectorAll(`#rooms polygon[${NAMES.attrTintKind}="heating"]:not([data-fc-heat])`).forEach((el) => {
        el.setAttribute("data-fc-heat-off", el.getAttribute(NAMES.attrTintEntity) || "");
        el.removeAttribute(NAMES.attrTintEntity); el.removeAttribute(NAMES.attrTintKind);
        el.classList.remove(NAMES.isHeating);
        el.style.removeProperty("fill");
      });
    } else {
      svg.querySelectorAll("#rooms polygon[data-fc-heat-off]").forEach((el) => {
        el.setAttribute(NAMES.attrTintEntity, el.getAttribute("data-fc-heat-off")); el.setAttribute(NAMES.attrTintKind, "heating");
        el.removeAttribute("data-fc-heat-off");
      });
    }
  }

  // A room with a thermostat or a TRV on the plan, and no colour of its own, is tinted while it heats.
  _heatRooms(roomAt) {
    if (!this._config.roomHeating || !this._svg) return;
    for (const d of this._lowered.devices || []) {
      if (d.type !== "icon" || !["thermostat", "trv"].includes(d.kind) || !/^climate\./.test(d.entity || "")) continue;
      const room = d.room || (d.at ? roomAt(d.at[0], d.at[1]) : null);
      const poly = room && this._svg.querySelector("#rooms #room-" + CSS.escape(room));
      if (!poly || poly.hasAttribute(NAMES.attrTintEntity) || poly.classList.contains("unused")) continue;
      poly.setAttribute(NAMES.attrTintEntity, d.entity);
      poly.setAttribute(NAMES.attrTintKind, "heating");
      poly.setAttribute("data-fc-heat", "");
    }
  }

  // A camera's sensor going on: its picture pops up (tablet mode by default).
  _checkDetections() {
    const svg = this._svg;
    if (!svg || !this._hass) return;
    for (const g of svg.querySelectorAll("[data-entity-detect]")) {
      const id = g.getAttribute("data-entity-detect");
      if (!id) continue;
      const s = this._hass.states[id];
      const on = !!s && isMotion(s.state);
      const was = this._detState[id];
      this._detState[id] = on;
      if (on && was === false) this._cameraSeen(g);
    }
  }

  _cameraSeen(g) {
    const mode = this._config.cameraPopup;
    if (mode === "never" || (mode === "kiosk" && !this._config.kiosk) || this._travel) return;
    if (this._config.kiosk) this._touched(); // wakes a dimmed tablet
    this._openPopup(g.getAttribute("data-entity-camera"), g.getAttribute("data-entity-camera-hq"), g.getAttribute(NAMES.attrName), g.getAttribute("data-entity-detect"));
  }

  _openPopup(cam, hq, name, detect) {
    const sr = this.shadowRoot, box = sr && sr.getElementById("campop");
    if (!box || !this._hass) return;
    this._closePopup();
    const lang = this._lang();
    const s = this._hass.states[cam];
    const title = box.querySelector(".t");
    title.textContent = name || (s && s.attributes && s.attributes.friendly_name) || cam;
    const seen = document.createElement("span");
    seen.className = "seen";
    seen.textContent = translate(lang, "cam_seen");
    title.appendChild(seen);
    const pic = box.querySelector(".pic");
    pic.innerHTML = "";
    if (customElements.get("ha-camera-stream") && s) {
      // Home Assistant's own player (WebRTC / HLS), when the frontend has it loaded
      const st = document.createElement("ha-camera-stream");
      st.hass = this._hass;
      st.stateObj = s;
      st.muted = true;
      st.controls = false;
      pic.appendChild(st);
    } else {
      // a still picture refreshed every second
      const img = document.createElement("img");
      img.alt = "";
      const load = () => {
        const cs = this._hass && this._hass.states[cam];
        const tok = cs && cs.attributes && cs.attributes.access_token;
        if (tok) img.src = "/api/camera_proxy/" + cam + "?token=" + encodeURIComponent(tok) + "&_=" + Date.now();
      };
      load();
      this._popImg = setInterval(load, 1000);
      pic.appendChild(img);
    }
    pic.onclick = () => { this._closePopup(); this._moreInfo(hq || cam); };
    const x = sr.getElementById("campop-x");
    x.onclick = () => this._closePopup();
    x.title = translate(lang, "close");
    box.hidden = false;
    // closes itself a while after the sensor goes quiet
    const keep = this._config.popupSeconds * 1000;
    this._popup = { cam, detect, until: Date.now() + keep };
    this._popTimer = setInterval(() => {
      const p = this._popup;
      if (!p) return;
      const d = this._hass && this._hass.states[p.detect];
      if (d && isMotion(d.state)) p.until = Math.max(p.until, Date.now() + keep);
      if (Date.now() > p.until) this._closePopup();
    }, 1000);
  }

  _closePopup() {
    if (this._popTimer) { clearInterval(this._popTimer); this._popTimer = null; }
    if (this._popImg) { clearInterval(this._popImg); this._popImg = null; }
    this._popup = null;
    const box = this.shadowRoot && this.shadowRoot.getElementById("campop");
    if (box) { box.hidden = true; box.querySelector(".pic").innerHTML = ""; }
  }

  _buildFloor() {
    const m = this._model;
    if (!m) return;
    let floor = this._floor;
    if (m.version === 2 && floor && floorIndex(m, floor) < 0) floor = this._floor = null;
    this._themeBuilt = this._themeNow();
    this._syncPalette(); // the card's colours with the plan's, whenever it is drawn
    let svgText = generateSvg(m, { floor: m.version === 2 ? floor : null });
    if (this._themeBuilt === "light") svgText = lightSvg(svgText);
    this._lowered = m.version === 2 ? lowerV2(floorModel(m, floorIndex(m, floor))) : null;
    const stage = this.shadowRoot.getElementById("stage");
    stage.innerHTML = svgText;
    const svg = (this._svg = stage.querySelector("svg"));
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this._baseVB = svg.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    // the start view set in the editor (SVG units), else the whole plan
    const st = (svg.getAttribute("data-start") || "").split(/[\s,]+/).map(Number);
    this._startVB = st.length === 4 && st.every(Number.isFinite) && st[2] > 0 && st[3] > 0 ? st : null;
    this._doorsKey = null;
    this._placeLightField();
    if (this._config.labels) svg.querySelector("#room-labels")?.removeAttribute("display");
    this._turned = null;
    this._labelKey = null; // a new drawing: its readings placed again
    if (this._lowered) {
      const idx = roomIndex(this._lowered);
      this._rooms = idx.rooms;
      this._sources = roomSources(this._lowered, idx.roomAt);
      this._roomAt = idx.roomAt;
      this._heatingTints();
      this._heatRooms(idx.roomAt);
    } else { this._rooms = []; this._sources = {}; }
    this._wireCameras();
    this._entities = entitiesOf(svg);
    for (const w of this._config.widgets) if (w.entity) this._entities.add(w.entity);
    this._mapCache = null;
    this._renderFloors();
    this._layout(true);
    this._sig = "";
    if (this._travel) this._showAt(this._sliderTime());
    else this._update();
  }

  // ---- per-viewer settings (⚙) ---------------------------------------------------

  _prefKey() {
    return "living-floorplan-card:" + (typeof this._config.model === "string" ? this._config.model : "inline");
  }

  _loadPrefs() {
    try { return JSON.parse(localStorage.getItem(this._prefKey()) || "{}") || {}; } catch (e) { return {}; }
  }

  _savePrefs() {
    try { localStorage.setItem(this._prefKey(), JSON.stringify(this._prefs)); } catch (e) { /* private mode */ }
  }

  _pref(k) {
    return this._prefs[k] !== undefined ? this._prefs[k] : this._defaults[k];
  }

  _applyPrefs() {
    const c = this._config;
    c.light = this._pref("light") === "glow" ? "glow" : "realistic";
    c.sun = this._pref("sun") ? this._sunCfg : null;
    c.trail = !!this._pref("trail");
    c.labels = !!this._pref("labels");
    c.readings = this._pref("readings") !== false;
    c.roomHeating = !!this._pref("heating");
  }

  _renderSettings() {
    const sr = this.shadowRoot;
    const panel = sr.getElementById("settings");
    const lang = this._lang();
    const t = (k) => translate(lang, k);
    sr.getElementById("set-btn").title = t("settings");
    const check = (k) => `<label><input type="checkbox" data-k="${k}"${this._pref(k) ? " checked" : ""}> ${t("s_" + k)}</label>`;
    panel.innerHTML = `<div class="ttl">${t("settings")}</div>
      ${this._hass && this._hass.user && this._hass.user.is_admin ? `<button class="fc edit" data-edit>✎ ${t("edit_plan")}</button>` : ""}
      <div class="seg"><span>${t("s_light")}</span><button class="fc${this._pref("light") !== "glow" ? " sel" : ""}" data-light="realistic">${t("s_realistic")}</button><button class="fc${this._pref("light") === "glow" ? " sel" : ""}" data-light="glow">${t("s_glow")}</button></div>
      <div class="seg"><span>${t("s_theme")}</span>${["auto", "dark", "light"].map((v) => `<button class="fc${this._pref("theme") === v ? " sel" : ""}" data-theme="${v}">${t("th_" + v)}</button>`).join("")}</div>
      <label class="strength"><span>${t("s_strength")} <b data-pct>${Math.round(this._pref("strength") * 100)} %</b></span><input type="range" min="0.15" max="1" step="0.01" data-strength value="${this._pref("strength")}"></label>
      ${check("sun")}${check("trail")}${check("labels")}${check("readings")}${check("heating")}
      <div class="sub">${t("s_layers")}</div>${LAYERS.map(check).join("")}
      <div class="foot"><span>${t("s_note")}</span><button class="fc" data-reset>${t("s_reset")}</button></div>`;
    const ed = panel.querySelector("[data-edit]");
    if (ed) ed.addEventListener("click", () => { panel.hidden = true; this._openEditor(); });
    panel.querySelectorAll("input[data-k]").forEach((i) => i.addEventListener("change", () => this._setPref(i.dataset.k, i.checked)));
    panel.querySelectorAll("[data-light]").forEach((b) => b.addEventListener("click", () => this._setPref("light", b.dataset.light)));
    panel.querySelectorAll("[data-theme]").forEach((b) => b.addEventListener("click", () => this._setPref("theme", b.dataset.theme)));
    const st = panel.querySelector("[data-strength]");
    // live while dragging, saved when let go
    st.addEventListener("input", () => {
      sr.getElementById("wrap").style.setProperty("--fc-light-k", st.value);
      panel.querySelector("[data-pct]").textContent = Math.round(st.value * 100) + " %";
    });
    st.addEventListener("change", () => this._setPref("strength", Number(st.value)));
    panel.querySelector("[data-reset]").addEventListener("click", () => { this._prefs = {}; this._savePrefs(); this._afterPrefs(); });
  }

  _setPref(k, v) {
    if (v === this._defaults[k] || (k === "light" && v === (this._defaults.light || "realistic"))) delete this._prefs[k];
    else this._prefs[k] = v;
    this._savePrefs();
    this._afterPrefs();
  }

  // Redraw what the settings touch.
  _afterPrefs() {
    this._applyPrefs();
    const sr = this.shadowRoot, svg = this._svg;
    const wrap = sr.getElementById("wrap");
    // the card's own class names: "glow" is the plan's (glows take no clicks) and would switch the whole card off (26.10)
    wrap.classList.toggle("fc-realistic", this._config.light === "realistic");
    wrap.classList.toggle("fc-glow", this._config.light === "glow");
    wrap.classList.toggle("no-readings", !this._config.readings);
    for (const k of LAYERS) wrap.classList.toggle("no-" + k.replace("_", "-"), !this._pref(k));
    wrap.style.setProperty("--fc-light-k", String(this._pref("strength")));
    this._renderSettings();
    if (!svg) return;
    if (this._config.light !== "realistic") svg.querySelectorAll("#light-field").forEach((el) => el.remove());
    this._doorsKey = null;
    const labels = svg.querySelector("#room-labels");
    if (labels) { if (this._config.labels) labels.removeAttribute("display"); else labels.setAttribute("display", "none"); }
    if (!this._config.sun) svg.querySelectorAll("#fc-sun").forEach((el) => el.remove());
    if (!this._config.trail) svg.querySelectorAll("#fc-trail").forEach((el) => el.remove());
    // heating rooms tinted (⚙): the tint this card gave them goes or comes back
    svg.querySelectorAll("[data-fc-heat]").forEach((el) => {
      el.removeAttribute(NAMES.attrTintEntity); el.removeAttribute(NAMES.attrTintKind); el.removeAttribute("data-fc-heat");
      el.classList.remove(NAMES.isHeating);
      el.style.removeProperty("fill"); el.style.removeProperty("fill-opacity");
    });
    this._heatingTints();
    if (this._config.roomHeating && this._roomAt) this._heatRooms(this._roomAt);
    if (this._applyTheme()) return; // the plan drawn again in the new look
    this._sig = "";
    if (this._travel) this._showAt(this._sliderTime());
    else this._update();
  }

  // ---- the trail of movement ---------------------------------------------------

  _motionDevices() {
    return ((this._lowered && this._lowered.devices) || []).filter((d) => ["presence", "motion"].includes(d.type) && d.entity && d.at);
  }

  // Recent history of the motion sensors (live), refreshed every minute.
  async _fetchTrail() {
    const ids = this._motionDevices().map((d) => d.entity);
    if (!this._config.trail || !ids.length || !this._hass || this._travel) return;
    if (this._trailAt && Date.now() - this._trailAt < 55e3) return;
    this._trailAt = Date.now();
    const end = Date.now(), start = end - this._config.trailMs;
    try {
      const raw = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      this._trailRows = normalizeHistory(raw);
    } catch (e) { this._trailRows = {}; }
    this._drawTrail();
  }

  // t: a moment of time travel, or now; rowsOf: history rows of an entity.
  _drawTrail(t, rowsOf) {
    const svg = this._svg;
    if (!svg || !this._config.trail) return;
    svg.querySelectorAll("#fc-trail").forEach((el) => el.remove());
    const devices = this._motionDevices();
    if (!devices.length) return;
    if (!rowsOf) {
      // live: the fetched minutes plus the state right now
      rowsOf = (id) => {
        const rows = ((this._trailRows || {})[id] || []).slice();
        const s = this._hass && this._hass.states[id];
        if (s) {
          const lc = Date.parse(s.last_changed || s.last_updated) || Date.now();
          if (!rows.length || rows[rows.length - 1].t < lc) rows.push({ t: lc, state: s.state });
        }
        return rows;
      };
    }
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = trailLayer(devices, rowsOf, t || Date.now(), this._config.trailMs);
    const lights = svg.querySelector("#lights");
    if (lights) lights.after(g.firstElementChild);
  }

  // Patches of sunlight on the floor for the moment t (now when live).
  _drawSun(t) {
    const svg = this._svg;
    if (!svg || !this._config.sun || !this._lowered || !this._hass || !this._hass.config) return;
    const { latitude, longitude } = this._hass.config;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    const sun = sunPosition(new Date(t || Date.now()), latitude, longitude);
    const idx = roomIndex(this._lowered);
    const patches = sunPatches(this._lowered, sun, { roomAt: idx.roomAt, offset: this._config.sun.offset,
      cmPerSvg: (this._lowered.canvas && this._lowered.canvas.cm_per_svg) || 1 });
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // clipped to the whole open space a room belongs to (its zone): a kitchen, a dining room and a living
    // room without walls between them are one space for the sun - no edge at an invisible room line
    const zones = new Map((this._lowered.zones || []).map((z) => [z.id, z.points]));
    const zoneOf = new Map((this._lowered.rooms || []).filter((r) => r.zone && zones.has(r.zone)).map((r) => [r.id, zones.get(r.zone)]));
    g.innerHTML = sunLayer(patches, idx.rooms.map((r) => (zoneOf.has(r.id) ? { ...r, points: zoneOf.get(r.id) } : r)));
    const layer = g.firstElementChild;
    const old = svg.querySelector("#fc-sun");
    if (old) old.replaceWith(layer);
    else {
      // on the floor: under the furniture (it does not paint their tops), else under the light
      const before = svg.querySelector("#furniture") || svg.querySelector("#light-field") || svg.querySelector("#lights");
      if (before) before.parentNode.insertBefore(layer, before);
    }
  }

  _placeLightField(get) {
    if (this._config.light !== "realistic" || !this._lowered || !this._svg) return;
    const closed = this._closedDoors(this._lowered, get);
    const key = [...closed].sort().join(",");
    if (key === this._doorsKey) return;
    this._doorsKey = key;
    const svg = this._svg;
    const old = svg.querySelector("#light-field");
    const lights = svg.querySelector("#lights");
    if (!lights) return;
    const tmp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tmp.innerHTML = lightLayer(this._lowered, { closedDoors: closed });
    const layer = tmp.firstElementChild;
    if (old) old.replaceWith(layer);
    else lights.parentNode.insertBefore(layer, lights);
    this._sig = ""; // opacities need to be set again
  }

  _renderFloors() {
    const box = this.shadowRoot.getElementById("floors");
    box.innerHTML = "";
    const list = this._floorsList();
    if (!this._config.showFloors || list.length < 2) return;
    for (const f of list) {
      const b = document.createElement("button");
      b.className = "fc" + ((f.id || null) === (this._floor || null) ? " sel" : "");
      b.textContent = f.name;
      b.addEventListener("click", () => {
        if ((f.id || null) === (this._floor || null)) return;
        this._floor = f.id;
        this._buildFloor();
      });
      box.appendChild(b);
    }
  }

  // ---- size, turning and the view box -------------------------------------

  _layout(force = false) {
    const svg = this._svg;
    if (!svg) return;
    const wrap = this.shadowRoot.getElementById("wrap");
    const W = wrap.clientWidth || this.clientWidth || 400;
    // whether to turn: by the start view's shape when the editor set one (the house, not its garden)
    const vb = this._startVB || this._baseVB;
    let turn = this._config.rotate === 90;
    if (this._config.rotate === "auto") {
      // the space a dashboard gives: the card's width and most of the window height
      const H = this._config.height || Math.max(240, (window.innerHeight || 800) - 140);
      turn = shouldTurn(W, H, vb[2], vb[3]);
    }
    if (turn !== this._turned || force) {
      this._turned = turn;
      this._applyTurn(turn);
      this._fit();
      this._enterMap(); // map texts are placed for the current turn
    }
    const v = this._fullVB;
    let h = this._config.height || Math.round((W * v[3]) / v[2]);
    // no taller than the screen below the card's top: a tall plan on a phone shrinks to fit, not cut off (26.10)
    if (!this._config.height) {
      const top = Math.max(0, wrap.getBoundingClientRect().top + (window.scrollY || 0));
      const bar = this.shadowRoot.getElementById("fc-bar");
      const barH = bar && !bar.hidden ? bar.offsetHeight : 0;
      const room = Math.round((window.innerHeight || 800) - Math.min(top, (window.innerHeight || 800) * 0.4) - 8 - barH);
      h = Math.min(h, Math.max(240, room));
    }
    const px = h + "px";
    if (wrap.style.height !== px) wrap.style.height = px;
  }

  _applyTurn(turn) {
    const svg = this._svg;
    svg.querySelectorAll("#fc-widgets").forEach((el) => el.remove()); // drawn again, upright
    let g = svg.querySelector("#fc-turn");
    if (turn && !g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.id = "fc-turn";
      g.setAttribute("transform", "rotate(90)");
      for (const c of [...svg.childNodes]) if (c.nodeName !== "style" && c.nodeName !== "desc") g.appendChild(c);
      svg.appendChild(g);
    } else if (!turn && g) {
      for (const c of [...g.childNodes]) svg.appendChild(c);
      g.remove();
    }
    // Texts and icons the generator keeps upright (rotate(textRot x y)) turn back by 90 more.
    const textRot = -((this._lowered && this._lowered.canvas && this._lowered.canvas.rotate) || 0);
    svg.querySelectorAll("[transform]").forEach((el) => {
      if (el.id === "fc-turn") return;
      if (el.dataset.fcTr === undefined) el.dataset.fcTr = el.getAttribute("transform");
      const tr = el.dataset.fcTr;
      const m = /^rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)$/.exec(tr);
      if (m && Math.abs(Number(m[1]) - textRot) < 0.01) {
        el.setAttribute("transform", turn ? `rotate(${Number(m[1]) - 90} ${m[2]} ${m[3]})` : tr);
      }
      // a moving cover's arrow (translate, then rotate): up / down the screen too
      const mv = el.classList.contains("cover-move") && /^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)$/.exec(tr);
      if (mv) el.setAttribute("transform", turn ? `translate(${mv[1]} ${mv[2]}) rotate(${Number(mv[3]) - 90})` : tr);
    });
    this._fullVB = turn ? turnedViewBox(this._baseVB) : this._baseVB.slice();
    this._homeVB = this._startVB ? (turn ? turnedViewBox(this._startVB) : this._startVB.slice()) : null;
    this._drawWidgets();
    this._drawPower();
  }

  // Widgets: at their per cent of the plan (turned with it), always upright, sized to the plan.
  _drawWidgets() {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-widgets").forEach((el) => el.remove());
    const list = this._config.widgets;
    this._renderBar();
    if (!list.some((w) => w.at) || !this._baseVB) return;
    const vb = this._baseVB, F = this._fullVB || vb;
    const u = Math.min(F[2], F[3]) / 34; // a font size that reads at the whole plan
    const states = (this._hass && this._hass.states) || {};
    const lang = this._lang();
    const NS = "http://www.w3.org/2000/svg";
    const root = document.createElementNS(NS, "g");
    root.id = "fc-widgets";
    svg.appendChild(root);
    list.forEach((w, i) => {
      if (!w.at) return;
      const bx = vb[0] + (vb[2] * w.at[0]) / 100, by = vb[1] + (vb[3] * w.at[1]) / 100;
      const [x, y] = this._turned ? [-by, bx] : [bx, by];
      const g = document.createElementNS(NS, "g");
      const s = w.entity ? states[w.entity] : null;
      const on = w.type === "button" && s && ["on", "open", "playing", "home"].includes(s.state);
      g.setAttribute("class", "fc-w fc-w-" + w.type + (w.type !== "clock" ? " act" : "") + (on ? " on" : ""));
      g.setAttribute("data-w", String(i));
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const [big, small] = widgetText(w, states, lang);
      const bg = document.createElementNS(NS, "rect");
      bg.setAttribute("class", "bg");
      g.appendChild(bg);
      const t1 = document.createElementNS(NS, "text");
      t1.setAttribute("class", "big");
      t1.setAttribute("font-size", String((w.type === "clock" ? 1.9 : 1) * u));
      t1.textContent = big;
      g.appendChild(t1);
      let t2 = null;
      if (small) {
        t2 = document.createElementNS(NS, "text");
        t2.setAttribute("class", "sub");
        t2.setAttribute("font-size", String(0.7 * u));
        t2.textContent = small;
        g.appendChild(t2);
      }
      root.appendChild(g);
      // lay out: the small line above the value (a calendar's or a reading's name), below the time
      const pad = 0.5 * u;
      const h1 = (w.type === "clock" ? 1.9 : 1) * u, h2 = t2 ? 0.7 * u : 0;
      const smallFirst = w.type === "calendar" || w.type === "state";
      let w1 = 0, w2 = 0;
      try { w1 = t1.getComputedTextLength(); if (t2) w2 = t2.getComputedTextLength(); } catch (e) { w1 = big.length * 0.55 * h1; }
      const width = Math.max(w1, w2) + 2 * pad, height = h1 + h2 + (t2 ? 0.35 * u : 0) + 2 * pad;
      const y1 = smallFirst && t2 ? pad + h2 + 0.35 * u + h1 / 2 : pad + h1 / 2;
      t1.setAttribute("x", String(pad)); t1.setAttribute("y", String(y1));
      if (t2) { t2.setAttribute("x", String(pad)); t2.setAttribute("y", String(smallFirst ? pad + h2 / 2 : y1 + h1 / 2 + 0.35 * u + h2 / 2)); }
      // `at` is the widget's middle
      bg.setAttribute("x", "0"); bg.setAttribute("y", "0"); bg.setAttribute("rx", String(0.4 * u));
      bg.setAttribute("width", String(width)); bg.setAttribute("height", String(height));
      g.setAttribute("transform", `translate(${(x - width / 2).toFixed(1)} ${(y - height / 2).toFixed(1)})`);
    });
  }

  // The bar under the plan: widgets without `at`. Built once, then only its texts change
  // (a button must stay the same node under a finger).
  _renderBar() {
    const bar = this.shadowRoot && this.shadowRoot.getElementById("fc-bar");
    if (!bar) return;
    const list = this._config.widgets.filter((w) => !w.at);
    bar.hidden = !list.length;
    const states = (this._hass && this._hass.states) || {};
    const lang = this._lang();
    if (bar.children.length !== list.length) {
      bar.innerHTML = "";
      for (const w of list) {
        const el = document.createElement(w.type === "clock" ? "div" : "button");
        el.className = "fc-chip fc-chip-" + w.type;
        el.innerHTML = '<span class="sub"></span><span class="big"></span>';
        if (w.type !== "clock") {
          let held = false, timer = null;
          el.addEventListener("pointerdown", () => { held = false; timer = setTimeout(() => { held = true; this._widgetAction(w, true); }, HOLD_MS); });
          for (const t of ["pointerup", "pointerleave", "pointercancel"]) el.addEventListener(t, () => clearTimeout(timer));
          el.addEventListener("click", () => { if (!held) this._widgetAction(w, false); });
        }
        bar.appendChild(el);
      }
    }
    list.forEach((w, i) => {
      const el = bar.children[i];
      const [big, small] = widgetText(w, states, lang);
      const s = w.entity ? states[w.entity] : null;
      el.classList.toggle("on", w.type === "button" && !!s && ["on", "open", "playing", "home"].includes(s.state));
      const b = el.querySelector(".big"), sm = el.querySelector(".sub");
      // the time over its date; a reading's name over its value
      const top = w.type === "clock" ? "" : small, bottom = w.type === "clock" ? small : "";
      if (b.textContent !== big) b.textContent = big;
      if (sm.textContent !== (top || bottom)) sm.textContent = top || bottom;
      el.classList.toggle("sub-below", w.type === "clock");
    });
  }

  _widgetAt(clientX, clientY) {
    if (!this._svg) return null;
    for (const g of this._svg.querySelectorAll("#fc-widgets [data-w]")) {
      const r = g.getBoundingClientRect();
      if (clientX >= r.left - 4 && clientX <= r.right + 4 && clientY >= r.top - 4 && clientY <= r.bottom + 4) return this._config.widgets[Number(g.getAttribute("data-w"))];
    }
    return null;
  }

  _widgetAction(w, hold) {
    const a = hold ? w.hold : w.tap;
    if (a) { this._runAction(a, w.entity); return; }
    if (!w.entity || w.type === "clock") return;
    const domain = w.entity.split(".")[0];
    if (hold || w.type !== "button") { this._moreInfo(w.entity); return; }
    if (["scene", "script"].includes(domain)) this._hass.callService(domain, "turn_on", { entity_id: w.entity });
    else if (TOGGLE_DOMAINS.has(domain)) this._hass.callService(domain === "cover" ? "cover" : "homeassistant", "toggle", { entity_id: w.entity });
    else if (domain === "button" || domain === "input_button") this._hass.callService(domain, "press", { entity_id: w.entity });
    else this._moreInfo(w.entity);
  }

  // back to the start view (the editor's), else the whole plan
  _fit() {
    this._vb = this._homeView();
    this._applyVB();
  }
  _homeView() {
    const F = this._fullVB, H = this._homeVB;
    if (!H) return F.slice();
    // the start view at the whole plan's proportions (the card keeps them), round its middle, inside the plan
    const s = Math.max(H[2] / F[2], H[3] / F[3]);
    const keep = this._vb;
    this._vb = [H[0] + H[2] / 2 - (F[2] * s) / 2, H[1] + H[3] / 2 - (F[3] * s) / 2, F[2] * s, F[3] * s];
    this._clampVB();
    const v = this._vb;
    this._vb = keep;
    return v;
  }

  _applyVB() {
    if (this._picked) this._clearLasso(); // the dots are on the screen: a moved plan leaves them behind
    if (!this._svg || !this._vb) return;
    this._svg.setAttribute("viewBox", this._vb.map((v) => Math.round(v * 100) / 100).join(" "));
  }

  // keep the view inside the plan, between MIN_ZOOM (the plan in the middle) and MAX_ZOOM
  _clampVB() {
    const F = this._fullVB, v = this._vb;
    const s = Math.min(1 / MIN_ZOOM, Math.max(1 / MAX_ZOOM, v[2] / F[2]));
    v[2] = F[2] * s;
    v[3] = F[3] * s;
    if (s > 1) {
      // zoomed out: the plan stays in the middle
      v[0] = F[0] - (v[2] - F[2]) / 2;
      v[1] = F[1] - (v[3] - F[3]) / 2;
      return;
    }
    v[0] = Math.min(F[0] + F[2] - v[2], Math.max(F[0], v[0]));
    v[1] = Math.min(F[1] + F[3] - v[3], Math.max(F[1], v[1]));
  }

  // A point on the screen -> plan coordinates of the current view.
  _toPlan(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const v = this._vb;
    const s = Math.min(r.width / v[2], r.height / v[3]);
    const ox = r.left + (r.width - v[2] * s) / 2, oy = r.top + (r.height - v[3] * s) / 2;
    return [v[0] + (clientX - ox) / s, v[1] + (clientY - oy) / s, s];
  }

  _zoomAt(clientX, clientY, factor) {
    if (!this._vb) return;
    const [px, py] = this._toPlan(clientX, clientY);
    const v = this._vb;
    const nw = v[2] / factor, nh = v[3] / factor;
    this._vb = [px - ((px - v[0]) * nw) / v[2], py - ((py - v[1]) * nh) / v[3], nw, nh];
    this._clampVB();
    this._applyVB();
  }

  _zoomBy(f) {
    const r = this._svg && this._svg.getBoundingClientRect();
    if (r) this._zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  }

  // ---- gestures: pan, pinch, wheel, tap, hold ------------------------------

  _attachGestures() {
    const wrap = this.shadowRoot.getElementById("wrap");
    const pts = new Map();
    let start = null, pinch = null, holdTimer = null, moved = false, lasso = null;
    const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } this._pressRing(null); };
    for (const t of ["pointerdown", "wheel", "keydown"]) wrap.addEventListener(t, () => this._touched(), { capture: true, passive: true });
    // the plan's gestures start on the plan only - not on a button, a checkbox or a slider of a panel over it (26.10)
    const onPanel = (e) => !!(e.target.closest && e.target.closest("button, input, label, select, #layers, #settings, #layer-menu, #timeline, #legend, #alerts, #campop, #zoom, #floors, #fc-room, #fc-lasso-bar"));
    wrap.addEventListener("pointerdown", (e) => {
      if (onPanel(e)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      // a lasso: armed with its button, or Shift + drag with a mouse
      if (pts.size === 1 && this._config.lasso && (this._lassoArmed || e.shiftKey)) {
        cancelHold();
        start = null;
        lasso = [[e.clientX, e.clientY]];
        try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* no capture */ }
        this._drawLasso(lasso, []);
        return;
      }
      lasso = null;
      if (pts.size === 1) {
        start = { x: e.clientX, y: e.clientY, vb: this._vb && this._vb.slice(), t: Date.now() };
        moved = false;
        cancelHold();
        const hitNow = this._hit(e.clientX, e.clientY);
        const wait = hitNow && this._isLock(hitNow) ? 800 : HOLD_MS;
        this._tipHide();
        if (hitNow && !this._actionFor(hitNow, "hold")) this._pressRing(e.clientX, e.clientY, wait, this._isLock(hitNow) && this._config.lockAction === "hold");
        holdTimer = setTimeout(() => {
          holdTimer = null;
          this._pressRing(null);
          // a hold on a device opens it; on empty floor the finger may still pan
          if (!moved && start && this._activate(start.x, start.y, true)) start = null;
          else if (start) start.held = true;
        }, wait);
      } else if (pts.size === 2) {
        cancelHold();
        if (!this._vb) return;
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: this._vb.slice() };
        start = null;
      }
    });
    wrap.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && !e.buttons && !pts.size) { this._tipAt(e.clientX, e.clientY, onPanel(e)); return; }
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (lasso) {
        const last = lasso[lasso.length - 1];
        if (Math.hypot(e.clientX - last[0], e.clientY - last[1]) >= 3) { lasso.push([e.clientX, e.clientY]); this._drawLasso(lasso, []); }
        return;
      }
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this._vb = pinch.vb.slice();
        this._zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d);
        moved = true;
        return;
      }
      if (!start || !start.vb) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < DRAG_PX) return;
      moved = true;
      cancelHold();
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      const [, , s] = this._toPlan(e.clientX, e.clientY);
      this._vb = [start.vb[0] - dx / s, start.vb[1] - dy / s, start.vb[2], start.vb[3]];
      this._clampVB();
      this._applyVB();
    });
    const end = (e) => {
      if (lasso) {
        pts.delete(e.pointerId);
        const poly = lasso;
        lasso = null;
        if (e.type === "pointerup") this._finishLasso(poly);
        else this._clearLasso();
        return;
      }
      const wasTap = start && !moved && !start.held && pts.size === 1;
      pts.delete(e.pointerId);
      if (pinch && pts.size === 1) {
        // a pinch ends with one finger left: that finger pans from here
        const [p] = [...pts.values()];
        start = { x: p[0], y: p[1], vb: this._vb && this._vb.slice(), held: true };
        moved = true;
      }
      if (pts.size < 2) pinch = null;
      cancelHold();
      if (wasTap && e.type === "pointerup") this._activate(start.x, start.y, false);
      if (!pts.size) start = null;
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointerleave", () => this._tipHide());
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("wheel", (e) => {
      if (!this._vb || onPanel(e)) return;
      e.preventDefault();
      this._zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    }, { passive: false });
    // a double tap on empty floor shows the whole plan; on a device it is two taps
    wrap.addEventListener("dblclick", (e) => { if (!onPanel(e) && !this._hit(e.clientX, e.clientY) && !this._widgetAt(e.clientX, e.clientY)) this._fit(); });
  }

  // The device under a finger: the nearest element with an entity within HIT_PX.
  _hit(clientX, clientY) {
    if (!this._svg) return null;
    let best = null;
    this._svg.querySelectorAll("[data-entity]").forEach((el) => {
      if (el.closest("#rooms")) return;
      const r = coreRect(el);
      if (!r.width && !r.height) return;
      const dx = Math.max(r.left - clientX, 0, clientX - r.right);
      const dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      const area = r.width * r.height;
      if (d <= HIT_PX && (!best || d < best.d - 0.5 || (Math.abs(d - best.d) <= 0.5 && area < best.area))) best = { el, d, area };
    });
    // a chandelier's shared bulb icon (no entity of its own): its circuits
    this._svg.querySelectorAll(".bulb-shared").forEach((el) => {
      const circuit = el.parentNode && el.parentNode.querySelector("[data-entity]");
      if (!circuit) return;
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - clientX, 0, clientX - r.right), dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d <= HIT_PX && (!best || d < best.d - 0.5)) best = { el: circuit, d, area: r.width * r.height };
    });
    // a camera's mark competes on distance too: a doorbell camera sits next to the door lock
    let camBest = null;
    for (const g of this._svg.querySelectorAll("[data-entity-camera]")) {
      const mark = g.querySelector("." + NAMES.cameraMark);
      if (!mark) continue;
      const r = mark.getBoundingClientRect();
      const d = Math.max(0, Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) - r.width / 2);
      if (d <= HIT_PX && (!camBest || d < camBest.d)) camBest = { g, d };
    }
    const camId = (g) => g.getAttribute("data-entity-camera-hq") || g.getAttribute("data-entity-camera");
    if (camBest && (!best || camBest.d < best.d)) return camId(camBest.g);
    // on a device itself it is that device; near one but inside a camera's field of view - the camera
    // (a lamp 20 px away must not take a click meant for the camera, 26.10)
    if (best && best.d === 0) return best.el.getAttribute("data-entity");
    // a finger right on a room's reading: the reading (a device next to it is only near)
    for (const el of this._svg.querySelectorAll("#room-climate [data-temp]")) {
      const r = el.getBoundingClientRect();
      if (r.width && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return el.getAttribute("data-temp");
    }
    for (const g of this._svg.querySelectorAll("[data-entity-camera]")) {
      const fan = g.querySelector("." + NAMES.cameraFan);
      try {
        const m = fan && fan.getScreenCTM();
        if (m && fan.isPointInFill(new DOMPoint(clientX, clientY).matrixTransform(m.inverse()))) return camId(g);
      } catch (e) { /* no geometry yet */ }
    }
    if (best) return best.el.getAttribute("data-entity");
    // a room's reading: its temperature sensor (the dialog, or an action of your own)
    for (const el of this._svg.querySelectorAll("#room-climate [data-temp]")) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const dx = Math.max(r.left - clientX, 0, clientX - r.right), dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      if (Math.hypot(dx, dy) <= 6) return el.getAttribute("data-temp");
    }
    return null;
  }

  // The chandelier a circuit belongs to: [small, large] entities (the editor's circuit_small / circuit_large).
  _fixtureOf(id) {
    for (const l of (this._lowered && this._lowered.lights) || []) {
      if (l.type !== "fixture" || !(l.circuits || []).some((c) => c.entity === id)) continue;
      const [large, small] = l.circuits.map((c) => c.entity);
      return small && large ? [small, large] : null;
    }
    return null;
  }

  // A chandelier's dialog title: its name from the editor, else the common start of its circuits' names
  // ("Salon lampa x1" + "Salon lampa x3" -> "Salon lampa", circuits "x1" / "x3"), else both names
  _fixtureTitle(id, ids) {
    const l = ((this._lowered && this._lowered.lights) || []).find((f) => f.type === "fixture" &&
      (f.circuits || []).some((c) => c.entity === id));
    const names = ids.map((e) => { const st = this._hass.states[e]; return (st && st.attributes.friendly_name) || e; });
    const words = names.map((n) => n.split(/\s+/));
    let k = 0;
    while (k < words[0].length && words.every((w) => k < w.length - 1 && w[k] === words[0][k])) k++;
    const labels = k ? words.map((w) => w.slice(k).join(" ")) : undefined;
    const name = (l && l.name) || (k ? words[0].slice(0, k).join(" ") : names.join(" / "));
    return { name, ...(labels ? { labels } : {}) };
  }

  // A cover just tapped: its arrow at once (a toggle opens a closed one, closes an open one, stops a moving one),
  // until the controller reports it moving or a few seconds pass
  _coverTapped(id) {
    const s = this._hass.states[id];
    if (!s || !this._svg) return;
    const moving = s.state === "opening" || s.state === "closing";
    const pos = s.attributes && s.attributes.current_position;
    const dir = moving ? null : (typeof pos === "number" ? pos > 0 : s.state === "open") ? "down" : "up";
    for (const el of this._svg.querySelectorAll(`.cover[data-entity="${CSS.escape(id)}"]`)) {
      if (dir) Object.assign(el.dataset, { move: dir, moveAt: String(Date.now()), moveFrom: s.state });
      else { delete el.dataset.move; delete el.dataset.moveFrom; }
      el.classList.toggle("moving-up", dir === "up");
      el.classList.toggle("moving-down", dir === "down");
    }
  }

  // A lock drawn on the plan (its element carries the lock class).
  _isLock(id) {
    return !!(this._svg && this._svg.querySelector(`.${NAMES.lock}[data-entity="${CSS.escape(id)}"]`));
  }

  _openLock(id) {
    const domain = id.split(".")[0];
    if (domain === "lock") this._hass.callService("lock", "open", { entity_id: id });
    else if (domain === "cover") this._hass.callService("cover", "open_cover", { entity_id: id });
    else this._moreInfo(id);
  }

  // ---- what a gesture will do: the ring of a hold, the hint of a mouse, the undo of a tap ----

  // x, y: the finger (null: hide); ms: the hold's time; door: the hold opens a door strike
  _pressRing(x, y, ms, door) {
    const el = this.shadowRoot && this.shadowRoot.getElementById("fc-press");
    if (!el) return;
    clearTimeout(this._pressT);
    if (x === null) { el.hidden = true; el.classList.remove("run"); return; }
    // only once the finger stays a moment: a plain tap shows nothing
    this._pressT = setTimeout(() => {
      const r = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
      el.style.left = x - r.left + "px"; el.style.top = y - r.top + "px";
      el.style.setProperty("--fc-press-ms", Math.max(80, ms - 120) + "ms");
      el.classList.toggle("door", !!door);
      el.querySelector("span").textContent = door ? translate(this._lang(), "door_opening") : "";
      el.classList.remove("run");
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add("run");
    }, 120);
  }

  // "Click: turn on · hold: statistics" next to the mouse, for what is under it
  _gestureHint(id) {
    const t = (k) => translate(this._lang(), k), st = this._hass && this._hass.states[id];
    if (!st) return "";
    const domain = id.split(".")[0];
    const own = this._actionFor(id, "tap");
    const holdWord = this._isLock(id) && this._config.lockAction === "hold" ? t("g_door")
      : this._config.hold === "insights" && window.entityInsights ? t("g_stats") : t("g_info");
    const inRack = this._svg && this._svg.querySelector(`.rack-item[data-entity="${CSS.escape(id)}"]`);
    let tap = t("g_info");
    if (own) tap = "…";
    else if (this._isLock(id)) tap = t("g_info");
    else if (this._fixtureOf(id)) { const [s, l] = this._fixtureOf(id); tap = [s, l].some((e) => this._hass.states[e] && this._hass.states[e].state === "on") ? t("g_off") : t("g_on"); }
    else if (TAP_TOGGLE.has(domain) && !inRack) tap = domain === "cover" ? t({ u_opening: "g_open", u_closing: "g_close", u_stopped: "g_stop" }[coverTapWord(st)]) : st.state === "on" ? t("g_off") : t("g_on");
    return `${t("g_click")}: ${tap} · ${t("g_hold")}: ${holdWord}`;
  }
  _tipAt(x, y, overPanel) {
    const now = Date.now();
    if (this._tipT && now - this._tipT < 60) return;
    this._tipT = now;
    const tip = this.shadowRoot.getElementById("fc-tip");
    const id = !overPanel && this._hass && !this._travel ? this._hit(x, y) : null;
    const text = id ? this._gestureHint(id) : "";
    if (!text) { tip.hidden = true; return; }
    const r = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    tip.textContent = text;
    tip.hidden = false;
    // kept inside the card: to the left of the mouse near the right edge
    const left = Math.min(x - r.left, r.width - tip.offsetWidth - 16);
    tip.style.left = Math.max(0, left) + "px"; tip.style.top = y - r.top + "px";
  }
  _tipHide() { const tip = this.shadowRoot && this.shadowRoot.getElementById("fc-tip"); if (tip) tip.hidden = true; }

  // A message at the bottom for a few seconds; with undo: the states before the tap come back
  _toast(text, undo) {
    const box = this.shadowRoot.getElementById("fc-undo");
    box.querySelector(".m").textContent = text;
    const b = box.querySelector("[data-undo]");
    b.textContent = translate(this._lang(), "undo");
    b.hidden = !undo;
    b.onclick = () => { box.hidden = true; if (undo) undo(); };
    box.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { box.hidden = true; }, undo ? (matchMedia("(max-width: 600px)").matches ? 4000 : 6000) : 3000);
  }
  _undoable(ids, name, word) {
    if (!this._config.undo) return; // undo: false - no bar after a tap
    const prev = ids.map((e) => this._hass.states[e]).filter(Boolean).map((s) => ({ id: s.entity_id, state: s.state, a: { ...s.attributes } }));
    this._toast(`${name} — ${translate(this._lang(), word)}`, () => {
      for (const p of prev) {
        const domain = p.id.split(".")[0];
        if (domain === "cover") {
          if (typeof p.a.current_position === "number") this._hass.callService("cover", "set_cover_position", { entity_id: p.id, position: p.a.current_position });
          else this._hass.callService("cover", p.state === "closed" ? "close_cover" : "open_cover", { entity_id: p.id });
        } else if (p.state === "on") this._hass.callService("light", "turn_on", { entity_id: p.id, ...(typeof p.a.brightness === "number" ? { brightness: p.a.brightness } : {}) });
        else this._hass.callService(domain === "light" ? "light" : "homeassistant", "turn_off", { entity_id: p.id });
      }
    });
  }

  // -> true when a device was hit
  _activate(clientX, clientY, hold) {
    const wd = this._hass && this._widgetAt(clientX, clientY);
    if (wd) {
      const now = Date.now();
      if (!hold && this._lastToggle && this._lastToggle.id === "w" + this._config.widgets.indexOf(wd) && now - this._lastToggle.t < 400) return true;
      if (!hold) this._lastToggle = { id: "w" + this._config.widgets.indexOf(wd), t: now };
      this._widgetAction(wd, hold);
      return true;
    }
    if (this._picked) { this._clearLasso(); return true; }
    // a marker of the plan (no entity): its caption and note in a bubble
    const mk = this._markerAt(clientX, clientY);
    if (mk) { this._showNote(mk, clientX, clientY); return true; }
    this._hideNote();
    const id = this._hit(clientX, clientY);
    if (!id && !hold && this._hass && this._config.roomTap === "dialog") {
      const room = this._roomAtPoint(clientX, clientY);
      if (room) { this._openRoom(room); return true; }
    }
    if (!id || !this._hass) return false;
    const domain = id.split(".")[0];
    // an action of your own for this device wins
    const own = this._actionFor(id, hold ? "hold" : "tap");
    if (own) {
      const now = Date.now();
      if (!hold && this._lastToggle && this._lastToggle.id === id && now - this._lastToggle.t < 400) return true;
      if (!hold) this._lastToggle = { id, t: now };
      this._runAction(own, id);
      return true;
    }
    if (this._isLock(id)) {
      // a door is never opened by a tap
      if (hold && this._config.lockAction === "hold") { this._openLock(id); this._toast(translate(this._lang(), "door_open")); }
      else this._moreInfo(id);
      return true;
    }
    const fx = !hold && this._fixtureOf(id);
    if (fx) {
      // a chandelier on two circuits: off -> the smaller circuit -> off (or, as a cycle, -> both -> off)
      const now = Date.now();
      if (this._lastToggle && this._lastToggle.id === fx.join() && now - this._lastToggle.t < 400) return true;
      this._lastToggle = { id: fx.join(), t: now };
      const on = (e) => this._hass.states[e] && this._hass.states[e].state === "on";
      const [small, large] = fx;
      this._undoable(fx, this._fixtureTitle(id, fx).name, !on(small) && !on(large) ? "u_on" : this._config.fixtureTap === "cycle" && on(small) && !on(large) ? "u_on" : "u_off");
      if (!on(small) && !on(large)) this._hass.callService("light", "turn_on", { entity_id: small });
      else if (this._config.fixtureTap === "cycle" && on(small) && !on(large)) this._hass.callService("light", "turn_on", { entity_id: large });
      else this._hass.callService("light", "turn_off", { entity_id: [small, large] });
      return true;
    }
    if (hold) {
      if (this._config.hold === "insights" && window.entityInsights && typeof window.entityInsights.open === "function") {
        // a chandelier: both its circuits in one dialog; the power of each from the plan and the price of a kWh -
        // the dialog shows their energy and what it cost
        const fx = this._fixtureOf(id), ids = fx || [id];
        const watts = ids.map((e) => {
          const w = this._svg && this._svg.querySelector(`.light[data-entity="${CSS.escape(e)}"]`);
          return w && w.getAttribute("data-watts") !== null ? Number(w.getAttribute("data-watts")) : NaN;
        });
        // "place in the house" among what is on the plan (not every entity of the domain: spare channels...)
        const onPlan = this._svg ? [...new Set([...this._svg.querySelectorAll(`[data-entity^="${id.split(".")[0]}."]`)]
          .map((e) => e.getAttribute("data-entity")))] : [];
        window.entityInsights.open({ entities: ids, ...(fx ? this._fixtureTitle(id, fx) : {}),
          rank_with: onPlan.length > 1 ? onPlan : undefined,
          watts: watts.every(Number.isFinite) ? watts : undefined, price: this._config.price || undefined }, this._hass);
      } else this._moreInfo(id);
      return true;
    }
    // equipment in a rack: its window only, a tap never switches it (a recorder's "recording" is a switch)
    const inRack = this._svg && this._svg.querySelector(`.rack-item[data-entity="${CSS.escape(id)}"]`);
    if (TAP_TOGGLE.has(domain) && this._hass.states[id] && !inRack) {
      // a quick second tap on the same device (a double tap) does not switch it back
      const now = Date.now();
      if (this._lastToggle && this._lastToggle.id === id && now - this._lastToggle.t < 400) return true;
      this._lastToggle = { id, t: now };
      const st = this._hass.states[id];
      this._undoable([id], st.attributes.friendly_name || id, domain === "cover" ? coverTapWord(st) : st.state === "on" ? "u_off" : "u_on");
      this._hass.callService(domain === "cover" ? "cover" : "homeassistant", "toggle", { entity_id: id });
      if (domain === "cover") this._coverTapped(id);
    } else this._moreInfo(id);
    return true;
  }

  // ---- the lasso: switch everything in a drawn outline ---------------------------------

  _lassoMode(on) {
    this._lassoArmed = !!on;
    const b = this.shadowRoot.getElementById("lasso-btn");
    if (b) b.classList.toggle("on", this._lassoArmed);
    if (!on && !(this._picked && this._picked.length)) this._clearLasso();
  }

  // the outline (screen points) and the picked devices' dots, over the plan
  _drawLasso(poly, dots) {
    const svg = this.shadowRoot.getElementById("fc-lasso"), host = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    svg.hidden = false;
    const rel = (p) => `${(p[0] - host.left).toFixed(1)},${(p[1] - host.top).toFixed(1)}`;
    svg.querySelector(".l").setAttribute("d", poly.length > 1 ? "M" + poly.map(rel).join(" L") + (dots.length ? " Z" : "") : "");
    svg.querySelector(".dots").innerHTML = dots.map((p) => `<circle cx="${(p[0] - host.left).toFixed(1)}" cy="${(p[1] - host.top).toFixed(1)}" r="5"/>`).join("");
  }

  _clearLasso() {
    this._picked = null;
    const sr = this.shadowRoot;
    if (!sr || !sr.getElementById("fc-lasso")) return;
    sr.getElementById("fc-lasso").hidden = true;
    sr.getElementById("fc-lasso-bar").hidden = true;
  }

  // The lights and covers whose middle is inside the outline (screen points).
  _lassoPick(poly) {
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const out = new Map();
    for (const el of this._svg.querySelectorAll("[data-entity]")) {
      const id = el.getAttribute("data-entity");
      // (equipment in a rack is never switched from the plan: a recorder's "recording" is a switch too)
      if (!id || out.has(id) || el.closest("#rooms, #controls, #notes") || el.classList.contains("rack-item")) continue;
      const domain = id.split(".")[0];
      const kind = el.classList.contains("light") || ["light", "switch"].includes(domain) ? "light" : domain === "cover" ? "cover" : null;
      if (!kind) continue;
      const r = coreRect(el);
      if (!r.width && !r.height) continue;
      const c = [r.left + r.width / 2, r.top + r.height / 2];
      if (inside(c[0], c[1])) out.set(id, { id, kind, at: c });
    }
    return [...out.values()];
  }

  _finishLasso(poly) {
    let span = 0;
    for (let i = 1; i < poly.length; i++) span += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    if (span < 30 || !this._svg) { this._clearLasso(); return; }
    const picked = this._lassoPick(poly);
    this._lassoMode(false);
    this._picked = picked;
    this._drawLasso(poly, picked.map((p) => p.at));
    const sr = this.shadowRoot, bar = sr.getElementById("fc-lasso-bar"), lang = this._lang();
    const lights = picked.filter((p) => p.kind === "light").map((p) => p.id), covers = picked.filter((p) => p.kind === "cover").map((p) => p.id);
    bar.querySelector(".n").textContent = picked.length
      ? translate(lang, "lasso_count", { l: lights.length, c: covers.length }) : translate(lang, "lasso_none");
    const btn = (key, label) => `<button class="fc" data-l="${key}">${label}</button>`;
    bar.querySelector(".b").innerHTML = (lights.length ? btn("on", translate(lang, "lasso_on")) + btn("off", translate(lang, "lasso_off")) : "") +
      (covers.length ? btn("up", "▲") + btn("down", "▼") : "");
    bar.hidden = false;
    bar.onclick = (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b) return;
      const call = (d, sv, ids) => ids.length && this._hass && this._hass.callService(d, sv, { entity_id: ids });
      switch (b.dataset.l) {
        case "on": call("homeassistant", "turn_on", lights); break;
        case "off": call("homeassistant", "turn_off", lights); break;
        case "up": call("cover", "open_cover", covers); return; // covers take a while: the selection stays for a stop or the other way
        case "down": call("cover", "close_cover", covers); return;
      }
      this._clearLasso();
    };
  }

  // ---- notes: a marker's bubble -------------------------------------------------------

  // The marker pin under a point (only markers without an entity: those are devices), or null.
  _markerAt(clientX, clientY) {
    if (!this._svg) return null;
    let best = null;
    for (const g of this._svg.querySelectorAll(".note-marker:not([data-entity])")) {
      const pin = g.querySelector(".note-pin");
      if (!pin) continue;
      const r = pin.getBoundingClientRect();
      const d = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) - r.width / 2;
      if (d <= 6 && (!best || d < best.d)) best = { g, d };
    }
    return best && best.g;
  }

  _showNote(g, clientX, clientY) {
    const box = this.shadowRoot.getElementById("fc-note"), host = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    const title = g.getAttribute("data-title") || "", note = g.getAttribute("data-note") || "";
    if (!title && !note) { this._hideNote(); return; }
    box.querySelector(".t").textContent = title;
    box.querySelector(".n").textContent = note;
    box.hidden = false;
    const w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = Math.max(4, Math.min(host.width - w - 4, clientX - host.left - w / 2)) + "px";
    box.style.top = Math.max(4, clientY - host.top - h - 14 < 4 ? clientY - host.top + 16 : clientY - host.top - h - 14) + "px";
    clearTimeout(this._noteTimer);
    this._noteTimer = setTimeout(() => this._hideNote(), 8000);
  }

  _hideNote() {
    const box = this.shadowRoot && this.shadowRoot.getElementById("fc-note");
    if (box) box.hidden = true;
    clearTimeout(this._noteTimer);
  }

  // ---- a room's window ----------------------------------------------------------

  // The room under a point of the screen (its floor polygon), or null.
  _roomAtPoint(clientX, clientY) {
    if (!this._svg) return null;
    for (const poly of this._svg.querySelectorAll("#rooms polygon[id^='room-']")) {
      if (poly.classList.contains("unused")) continue;
      try {
        const m = poly.getScreenCTM();
        if (m && poly.isPointInFill(new DOMPoint(clientX, clientY).matrixTransform(m.inverse()))) return poly.id.slice(5);
      } catch (e) { /* no geometry yet */ }
    }
    return null;
  }

  // What a room has on the plan: lights, covers, climate sensors, presence, other devices.
  _roomContents(roomId) {
    const L = this._lowered, idx = roomIndex(L), src = (roomSources(L, idx.roomAt)[roomId]) || { lights: [], presence: [], temperature: [], humidity: [] };
    const winRoom = new Map((L.windows || []).map((w) => [w.id, windowRoom(w, idx.roomAt)]));
    const covers = (L.covers || []).filter((c) => c.entity && winRoom.get(c.window) === roomId).map((c) => c.entity);
    const devices = (L.devices || []).filter((d) => {
      if (!d.entity || ["presence", "motion"].includes(d.type)) return false;
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      return (d.room || (at ? idx.roomAt(at[0], at[1]) : null)) === roomId;
    }).map((d) => d.entity);
    const room = (L.rooms || []).find((r) => r.id === roomId) || { id: roomId };
    return { name: room.name || roomId, lights: [...new Set(src.lights)], covers: [...new Set(covers)], temperature: src.temperature[0], humidity: src.humidity[0],
      presence: src.presence, devices: [...new Set(devices)] };
  }

  _openRoom(roomId) {
    this._roomOpen = { id: roomId, c: this._roomContents(roomId) };
    const box = this.shadowRoot.getElementById("fc-room");
    box.hidden = false;
    box.onclick = (e) => { if (e.target === box) this._closeRoom(); };
    this.shadowRoot.getElementById("fc-room-x").onclick = () => this._closeRoom();
    this._renderRoom(true);
    this._roomSpark();
  }

  _closeRoom() {
    this._roomOpen = null;
    const box = this.shadowRoot && this.shadowRoot.getElementById("fc-room");
    if (box) { box.hidden = true; box.querySelector(".body").innerHTML = ""; }
  }

  // build = true: the whole window; false: only the states (the buttons stay the same nodes under a finger)
  _renderRoom(build) {
    const r = this._roomOpen, sr = this.shadowRoot;
    if (!r || !this._hass) return;
    const st = this._hass.states, lang = this._lang(), t = (k, v) => translate(lang, k, v);
    const name = (id) => this._shortName(id);
    const c = r.c, body = sr.querySelector("#fc-room .body");
    sr.querySelector("#fc-room .t").textContent = c.name;
    const num = (id, d) => { const s = st[id]; const v = s && Number(s.state); return s && s.state !== "" && Number.isFinite(v) ? v.toLocaleString(lang, { maximumFractionDigits: d }) : null; };
    if (build) {
      const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      let h = "";
      if (c.temperature || c.humidity) h += `<div class="sec"><h4>${t("r_climate")}</h4><div class="clim" data-more="${esc(c.temperature || c.humidity)}"><span class="v"></span><span class="h"></span><svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points=""/></svg></div></div>`;
      if (c.presence.length) h += `<div class="sec pres"></div>`;
      if (c.lights.length) h += `<div class="sec"><h4>${t("r_lights")}</h4><div class="chips">${c.lights.map((id) => `<button class="chip" data-light="${esc(id)}">${esc(name(id))}</button>`).join("")}
        ${c.lights.length > 1 ? `<button class="chip act" data-all-off>${t("r_all_off")}</button>` : ""}</div></div>`;
      if (c.covers.length) h += `<div class="sec"><h4>${t("r_covers")}</h4>${c.covers.map((id) => `<div class="cov" data-cover="${esc(id)}"><span class="n">${esc(name(id))}</span><span class="p"></span>` +
        `<button class="fc" data-cmd="open_cover">▲</button><button class="fc" data-cmd="stop_cover">■</button><button class="fc" data-cmd="close_cover">▼</button></div>`).join("")}
        ${c.covers.length > 1 ? `<div class="chips"><button class="chip act" data-all="open_cover">▲ ${t("r_all_up")}</button><button class="chip act" data-all="close_cover">▼ ${t("r_all_down")}</button></div>` : ""}</div>`;
      if (c.devices.length) h += `<div class="sec"><h4>${t("r_devices")}</h4><div class="chips">${c.devices.map((id) => `<button class="chip" data-more="${esc(id)}">${esc(name(id))}</button>`).join("")}</div></div>`;
      if (!h) h = `<div class="empty">${t("r_nothing")}</div>`;
      body.innerHTML = h;
      const call = (d, sv, ids) => this._hass.callService(d, sv, { entity_id: ids });
      body.querySelectorAll("[data-light]").forEach((b) => { b.onclick = () => call("homeassistant", "toggle", b.dataset.light); });
      const off = body.querySelector("[data-all-off]");
      if (off) off.onclick = () => call("homeassistant", "turn_off", c.lights);
      body.querySelectorAll(".cov button[data-cmd]").forEach((b) => { b.onclick = () => call("cover", b.dataset.cmd, b.closest(".cov").dataset.cover); });
      body.querySelectorAll("[data-all]").forEach((b) => { b.onclick = () => call("cover", b.dataset.all, c.covers); });
      body.querySelectorAll("[data-more]").forEach((b) => { b.onclick = () => this._moreInfo(b.dataset.more); });
    }
    // states
    body.querySelectorAll("[data-light]").forEach((b) => b.classList.toggle("on", !!st[b.dataset.light] && st[b.dataset.light].state === "on"));
    body.querySelectorAll(".cov").forEach((row) => {
      const s = st[row.dataset.cover], pos = s && s.attributes && s.attributes.current_position;
      row.querySelector(".p").textContent = typeof pos === "number" ? pos + "%" : s ? s.state : "—";
    });
    const cl = body.querySelector(".clim");
    if (cl) {
      const tv = c.temperature && num(c.temperature, 1), hv = c.humidity && num(c.humidity, 0);
      cl.querySelector(".v").textContent = tv !== null && tv !== undefined ? tv + "°" : "—";
      cl.querySelector(".h").textContent = hv !== null && hv !== undefined ? hv + "%" : "";
    }
    const pr = body.querySelector(".pres");
    if (pr) {
      const on = c.presence.some((id) => st[id] && isMotion(st[id].state));
      let txt = on ? t("r_someone") : t("r_empty");
      if (!on) {
        const last = Math.max(...c.presence.map((id) => Date.parse((st[id] && (st[id].last_changed || st[id].last_updated)) || "")).filter(Number.isFinite));
        if (Number.isFinite(last)) {
          const min = Math.round((Date.now() - last) / 60e3);
          txt = t("r_empty_for", { t: min < 60 ? min + " min" : Math.floor(min / 60) + " h " + (min % 60) + " min" });
        }
      }
      pr.textContent = "● " + txt;
    }
  }

  // An entity's name as Home Assistant's own lists show it: the name it was given, else
  // the friendly name without its device's name in front ("Relay board 3 Living room light" -> "Living room light").
  _shortName(id) {
    const h = this._hass, s = h.states[id], reg = h.entities && h.entities[id];
    if (reg && reg.name) return reg.name;
    const full = (s && s.attributes && s.attributes.friendly_name) || id.split(".")[1].replace(/_/g, " ");
    const dev = reg && reg.device_id && h.devices && h.devices[reg.device_id];
    const dn = dev && (dev.name_by_user || dev.name);
    if (dn && full.length > dn.length + 1 && full.toLowerCase().startsWith(dn.toLowerCase() + " ")) return full.slice(dn.length + 1);
    return full;
  }

  // The temperature (or humidity) of the last 24 hours as a small line.
  async _roomSpark() {
    const r = this._roomOpen;
    const id = r && (r.c.temperature || r.c.humidity);
    if (!id || !this._hass) return;
    try {
      const end = Date.now(), start = end - 864e5;
      const raw = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(),
        entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
      if (this._roomOpen !== r) return;
      const rows = (normalizeHistory(raw)[id] || []).map((x) => [x.t, Number(x.state)]).filter((x) => Number.isFinite(x[1]));
      if (rows.length < 2) return;
      const lo = Math.min(...rows.map((x) => x[1])), hi = Math.max(...rows.map((x) => x[1])), span = hi - lo || 1;
      const pts = rows.map(([tt, v]) => `${(((tt - start) / 864e5) * 100).toFixed(1)},${(28 - ((v - lo) / span) * 26).toFixed(1)}`).join(" ");
      const pl = this.shadowRoot.querySelector("#fc-room .clim polyline");
      if (pl) pl.setAttribute("points", pts);
    } catch (e) { /* no history: no line */ }
  }

  // The `entities:` action for a device: by its own id, a camera's other stream, a chandelier's other circuit.
  _actionFor(id, kind) {
    const acts = this._config.actions;
    if (!acts || !Object.keys(acts).length) return null;
    const own = this._ownActionFor(acts, id, kind);
    if (own) return own;
    // a whole domain ("light.*"), then everything ("*") - never for a lock: a door opens only as set for it
    if (this._isLock && this._isLock(id)) return null;
    const dom = id.split(".")[0] + ".*";
    for (const x of [dom, "*"]) if (acts[x] && acts[x][kind]) return acts[x][kind];
    return null;
  }

  _ownActionFor(acts, id, kind) {
    const ids = [id];
    const cam = this._svg && [...this._svg.querySelectorAll("[data-entity-camera]")].find((g) =>
      [g.getAttribute("data-entity-camera"), g.getAttribute("data-entity-camera-hq")].includes(id));
    if (cam) ids.push(cam.getAttribute("data-entity-camera"), cam.getAttribute("data-entity-camera-hq"));
    const fx = this._fixtureOf(id);
    if (fx) ids.push(...fx);
    for (const x of ids) if (x && acts[x] && acts[x][kind]) return acts[x][kind];
    return null;
  }

  // Home Assistant's actions, as in its own cards.
  _runAction(a, id) {
    const entity = a.entity || id;
    if (a.confirmation) {
      const text = (typeof a.confirmation === "object" && a.confirmation.text) || translate(this._lang(), "confirm");
      if (!window.confirm(text)) return;
    }
    switch (a.action) {
      case "none": return;
      case "toggle": this._hass.callService("homeassistant", "toggle", { entity_id: entity }); return;
      case "perform-action":
      case "call-service": {
        const [d, sv] = String(a.perform_action || a.service || "").split(".");
        if (d && sv) this._hass.callService(d, sv, { ...(a.data || a.service_data || {}) }, a.target);
        return;
      }
      case "navigate":
        if (!a.navigation_path) return;
        history.pushState(null, "", a.navigation_path);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
        return;
      case "url": if (a.url_path) window.open(a.url_path, "_blank", "noopener"); return;
      // for your own scripts (browser_mod and the like): the action with the entity it came from
      case "fire-dom-event":
        this.dispatchEvent(new CustomEvent("ll-custom", { detail: { ...a, entity_id: a.entity_id || entity }, bubbles: true, composed: true }));
        return;
      default: this._moreInfo(entity);
    }
  }

  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  // ---- tablet mode ---------------------------------------------------------

  connectedCallback() {
    const wrap = this.shadowRoot && this.shadowRoot.getElementById("wrap");
    if (this._resize && wrap) this._resize.observe(wrap);
    if (this._config && !this._sunTimer) this._sunTimer = setInterval(() => { if (!this._travel && this._config.sun) this._drawSun(); }, 5 * 60e3);
    // the trail fades with time even when nothing changes
    if (this._config && !this._trailTimer) this._trailTimer = setInterval(() => { if (!this._travel && this._config.trail) { this._drawTrail(); this._fetchTrail(); } }, 60e3);
    if (this._config && !this._clockTimer && this._config.widgets.some((w) => w.type === "clock" || w.type === "calendar"))
      this._clockTimer = setInterval(() => this._drawWidgets(), 20e3);
    // a lamp becomes "forgotten" with time alone
    // and an appliance's time left
    if (this._config && !this._minuteTimer) this._minuteTimer = setInterval(() => {
      if (this._travel) return;
      if (this._svg && this._svg.querySelector("." + NAMES.deviceLabel)) { this._sig = ""; this._update(); }
      else if (this._config.forgotten) this._drawAlerts();
      // a rule with `for:` comes true with time alone
      if (this._config.rules.some((r) => r.for)) this._drawRules();
    }, 60e3);
    if (this._config && this._config.kiosk && !this._kioskTimer) {
      this._lastTouch = Date.now();
      this._kioskTimer = setInterval(() => this._kioskTick(), 5000);
      this._kioskTick();
    }
  }

  disconnectedCallback() {
    if (this._savedSub) { this._savedSub.then((un) => un()).catch(() => {}); this._savedSub = null; }
    if (this._kioskTimer) { clearInterval(this._kioskTimer); this._kioskTimer = null; }
    if (this._resize) this._resize.disconnect();
    if (this._sunTimer) { clearInterval(this._sunTimer); this._sunTimer = null; }
    if (this._trailTimer) { clearInterval(this._trailTimer); this._trailTimer = null; }
    if (this._minuteTimer) { clearInterval(this._minuteTimer); this._minuteTimer = null; }
    if (this._clockTimer) { clearInterval(this._clockTimer); this._clockTimer = null; }
    this._closePopup();
    this._closeRoom();
    this._clearLasso();
    this._lassoArmed = false;
    this._stopPlay();
  }

  _touched() {
    this._lastTouch = Date.now();
    if (this._config && this._config.kiosk) this._kioskTick();
  }

  _isNight() {
    const k = this._config.kiosk;
    if (!k || !k.night) return false;
    if (k.night === "sun") {
      const sun = this._hass && this._hass.states["sun.sun"];
      return !!sun && sun.state === "below_horizon";
    }
    return inWindow(k.night, new Date());
  }

  _kioskTick() {
    const k = this._config && this._config.kiosk;
    if (!k) return;
    const idle = Date.now() - (this._lastTouch || 0) > k.idle * 1000;
    if (idle) {
      // back to the start: default floor, live view, the whole plan
      const startFloor = this._config.floor || null;
      if ((this._floor || null) !== startFloor) { this._floor = startFloor; this._buildFloor(); }
      if (this._map !== "live") { this._map = "live"; this._renderLayers(); this._enterMap(); }
      if (this._travel && !this._playTimer) this._exitTravel();
      const menu = this.shadowRoot.getElementById("layer-menu");
      if (menu) menu.hidden = true;
      if (this._vb && this._fullVB && this._vb.join() !== this._homeView().join()) this._fit();
    }
    const dim = this.shadowRoot.getElementById("dim");
    const night = this._isNight() && idle;
    dim.hidden = false;
    dim.style.opacity = night ? String(1 - k.dim) : "0";
  }

  // ---- states --------------------------------------------------------------

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._waitHa && this._config) { this._waitHa = false; this._loadFromHa(); }
    if (first && this._config) { this._renderLayers(); this._renderFloors(); this._renderSettings(); } // labels in the user's language
    // the first states (cameras' sensors from the device registry) or a new dark / light mode: drawn again
    if (this._config && this._svg && (first || this._themeNow() !== this._themeBuilt) && this._applyTheme(true)) return;
    if (this._config) this._syncPalette();
    this._update();
  }

  _update() {
    if (!this._hass || !this._svg || !this._entities) return;
    if (this._travel) return; // the past does not change
    // hass changes on every event in the house: redraw only when one of the plan's entities did
    let sig = "";
    for (const id of this._entities) {
      const s = this._hass.states[id];
      sig += id + (s ? s.last_updated : "-") + ";";
    }
    for (const id of this._alertEntities || []) {
      if (this._entities.has(id)) continue;
      const s = this._hass.states[id];
      sig += id + (s ? s.last_updated : "-") + ";";
    }
    if (sig === this._sig) return;
    this._placeLightField();
    this._sig = sig;
    const states = { get: (id) => this._hass.states[id] };
    applyStates(this._svg, states, this._lang(), this._paintFn());
    this._placeLabels();
    this._checkDetections();
    if (this._config.widgets.length) this._drawWidgets();
    if (this._roomOpen) this._renderRoom(false);
    this._drawSun();
    this._drawTrail();
    this._fetchTrail();
    if (this._map === "signal" || (AVERAGE_KINDS.includes(this._map) && this._period() === "now")) this._drawMap();
    this._drawAlerts();
    this._drawRules();
    this._drawPower();
  }

  // ---- alerts ----------------------------------------------------------------

  // The room an entity is drawn in on floor fl (a device, a lamp, a reading under an icon, a climate sensor), or null.
  _entityRoom(fl, id) {
    const L = fl.lowered;
    for (const x of [...(L.devices || []), ...(L.lights || [])]) {
      if (x.entity === id || x.value_entity === id || (x.circuits || []).some((c) => c.entity === id)) {
        const at = x.at || (x.bulbs && x.bulbs[0]) || (x.hit && [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2]);
        return x.room || (at ? fl.roomAt(at[0], at[1]) : null);
      }
    }
    for (const k of L.climate || []) if ((k.temperature === id || k.humidity === id) && k.at) return fl.roomAt(k.at[0], k.at[1]);
    return null;
  }

  _alertsOf(fl) {
    const L = fl.lowered;
    const entityRoom = (id) => this._entityRoom(fl, id);
    // a rule belongs to the floor its entity is drawn on, else to the ground floor
    const rules = this._config.alerts.filter((r) => {
      if (r.room) return fl === (this._floorsLowered.find((f) => (f.lowered.rooms || []).some((x) => x.id === r.room)) || this._floorsLowered[0]);
      const home = this._floorsLowered.find((f) => [...(f.lowered.devices || []), ...(f.lowered.lights || [])]
        .some((x) => x.entity === r.entity || (x.circuits || []).some((c) => c.entity === r.entity)));
      return (home || this._floorsLowered[0]) === fl;
    });
    return activeAlerts(L, this._hass.states, { roomAt: fl.roomAt, rules, cold: this._config.cold, entityRoom });
  }

  // ---- rules: rooms tinted, marks glowing or blinking ---------------------------------------

  _drawRules() {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-rules").forEach((el) => el.remove());
    svg.querySelectorAll(".fc-rc, .fc-blink").forEach((el) => { el.classList.remove("fc-rc", "fc-blink"); el.style.removeProperty("--fc-rc"); });
    if (!this._config.rules.length || !this._hass || !this._floorsLowered) return;
    const fl = this._floorsLowered.find((f) => (f.id || null) === (this._floor || null));
    if (!fl) return;
    const roomById = new Map((this._rooms || []).map((r) => [r.id, r]));
    const marksOf = (id) => svg.querySelectorAll(`[data-entity="${CSS.escape(id)}"]`);
    const { rooms, marks } = ruleEffects(this._config.rules, this._hass.states, {
      roomOf: (id) => this._entityRoom(fl, id), drawn: (id) => marksOf(id).length > 0, isRoom: (id) => roomById.has(id) });
    for (const [id, m] of marks) {
      for (const el of marksOf(id)) {
        if (m.color) { el.classList.add("fc-rc"); el.style.setProperty("--fc-rc", m.color); }
        if (m.blink) el.classList.add("fc-blink");
      }
    }
    if (!rooms.size) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = "fc-rules";
    g.setAttribute("pointer-events", "none");
    g.innerHTML = [...rooms].map(([id, c]) => `<polygon points="${roomById.get(id).points.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="${c}" stroke="${c}"/>`).join("");
    const r = svg.querySelector("#rooms");
    if (r) r.after(g);
  }

  // ---- live power by the devices -------------------------------------------------------------

  // [mark entity, power sensor] for the marks on the plan: from `power:`, else a power sensor of the
  // mark's own HA device - only when that device has one mark here (a 32-channel relay board's meter
  // is not every lamp's).
  _powerPairs() {
    const svg = this._svg, h = this._hass;
    if (!svg || !h) return [];
    const key = (this._floor || "") + "|" + Object.keys(h.entities || {}).length;
    if (this._powerCache && this._powerCache.key === key && this._powerCache.svg === svg) return this._powerCache.pairs;
    const marks = [...new Set([...svg.querySelectorAll("[data-entity]")].filter((el) => !el.closest("#rooms, #notes")).map((el) => el.getAttribute("data-entity")).filter(Boolean))];
    const ents = h.entities || {}, byDevice = {}, perDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    for (const id of marks) { const d = ents[id] && ents[id].device_id; if (d) perDevice[d] = (perDevice[d] || 0) + 1; }
    const isPower = (x) => { const s = h.states[x]; return !!s && x.startsWith("sensor.") && powerWatts(s) !== null &&
      ((s.attributes && s.attributes.device_class === "power") || ["W", "kW"].includes(s.attributes && s.attributes.unit_of_measurement)); };
    const pairs = [];
    for (const id of marks) {
      const own = this._config.power[id];
      if (typeof own === "string" || (Array.isArray(own) && own.length)) { pairs.push([id, [].concat(own)]); continue; }
      if (isPower(id)) continue; // the mark is the meter itself: it shows its own reading
      const d = ents[id] && ents[id].device_id;
      if (!d || perDevice[d] > 1) continue;
      const sensor = (byDevice[d] || []).find(isPower);
      if (sensor) pairs.push([id, [sensor]]);
    }
    this._powerCache = { key, svg, pairs };
    return pairs;
  }

  _drawPower() {
    const svg = this._svg, sr = this.shadowRoot;
    if (!svg) return;
    svg.querySelectorAll("#fc-power").forEach((el) => el.remove());
    const chip = sr.getElementById("fc-power-total");
    if (this._config.power === false || !this._hass) { if (chip) chip.hidden = true; return; }
    const lang = this._lang(), pairs = this._powerPairs(), states = this._hass.states;
    let sum = 0, any = false;
    const NS = "http://www.w3.org/2000/svg";
    const root = document.createElementNS(NS, "g");
    root.id = "fc-power";
    const F = this._homeVB || this._fullVB || this._baseVB;
    const u = F ? Math.min(F[2], F[3]) / 52 : 10;
    const seen = new Set();
    for (const [id, sensors] of pairs) {
      // a mark with several meters (a laundry: the washer and the dryer) shows them added up
      const ws = sensors.map((x) => [x, powerWatts(states[x])]).filter((x) => x[1] !== null);
      if (!ws.length) continue;
      const w = ws.reduce((a, x) => a + x[1], 0);
      for (const [x, v] of ws) if (!seen.has(x)) { sum += v; any = true; seen.add(x); }
      if (w < this._config.powerMin) continue;
      const el = svg.querySelector(`[data-entity="${CSS.escape(id)}"]`);
      let at = null;
      try {
        // the mark's middle in the plan's top coordinates (upright, like the widgets)
        // the device itself (its hit area, its badge), not its glow
        const core = el.querySelector("." + NAMES.hitArea + ", ." + NAMES.iconBadge + ", ." + NAMES.sensorBody) || el;
        // its user units -> the screen -> the plan's top units (the view box is not the screen's pixels)
        const b = core.getBBox(), ms = core.getScreenCTM(), rs = svg.getScreenCTM();
        const m = ms && rs && rs.inverse().multiply(ms);
        if (m && (b.width || b.height)) {
          const p = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(m);
          at = [p.x, p.y];
        }
      } catch (e) { /* not drawn */ }
      if (!at) continue;
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", at[0].toFixed(1));
      t.setAttribute("y", (at[1] - 1.3 * u).toFixed(1));
      t.setAttribute("font-size", u.toFixed(1));
      t.setAttribute("data-power", id);
      t.textContent = "⚡" + powerText(w, lang);
      root.appendChild(t);
    }
    if (root.childNodes.length) svg.appendChild(root);
    // the house now: its own meter, or the devices added up
    const total = this._config.powerTotal ? powerWatts(states[this._config.powerTotal]) : any ? sum : null;
    if (chip) {
      chip.hidden = total === null;
      if (total !== null) chip.textContent = "⚡ " + translate(lang, this._config.powerTotal ? "power_house" : "power_devices", { w: powerText(total, lang) });
    }
  }

  _alertText(a) {
    const lang = this._lang();
    if (a.kind === "rule") {
      const s = this._hass.states[a.entity];
      return a.name || (s && s.attributes && s.attributes.friendly_name) || a.entity;
    }
    return translate(lang, "alert_" + a.kind, { t: a.value !== undefined ? a.value.toLocaleString(lang, { maximumFractionDigits: 1 }) : "" });
  }

  _drawAlerts() {
    const svg = this._svg;
    if (!svg || !this._hass || !this._floorsLowered) return;
    const here = this._floorsLowered.find((f) => (f.id || null) === (this._floor || null));
    const all = this._floorsLowered.map((f) => ({ id: f.id, list: this._alertsOf(f) }));
    const mine = here ? all.find((x) => (x.id || null) === (this._floor || null)).list : [];
    svg.querySelectorAll("#fc-alerts").forEach((el) => el.remove());
    const roomById = new Map((this._rooms || []).map((r) => [r.id, r]));
    const polys = mine.filter((a) => a.room && roomById.has(a.room)).map((a) =>
      `<polygon points="${roomById.get(a.room).points.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="${a.color}"/>`);
    if (polys.length) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "g");
      t.innerHTML = `<g id="fc-alerts" pointer-events="none">${polys.join("")}</g>`;
      const rooms = svg.querySelector("#rooms");
      if (rooms) rooms.after(t.firstElementChild);
    }
    // the banner: every alert in the house, with its room
    const box = this.shadowRoot.getElementById("alerts");
    const seen = new Set();
    const flat = all.flatMap((x) => x.list.map((a) => ({ ...a, floor: x.id }))).filter((a) => {
      const k = a.entity + "|" + a.kind;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // lamps left on in empty rooms, on every floor
    const now = Date.now();
    const nudges = this._config.forgotten && this._hass ? this._floorsLowered.flatMap((f) =>
      forgottenLights(f.sources, this._hass.states, now, this._config.forgotten.minutes).map((n) => ({ ...n, floor: f.id, fl: f }))) : [];
    svg.querySelectorAll(".fc-forgotten").forEach((el) => el.classList.remove("fc-forgotten"));
    for (const n of nudges) {
      if ((n.floor || null) !== (this._floor || null)) continue;
      for (const id of n.lights) svg.querySelectorAll(`.light[data-entity="${CSS.escape(id)}"]`).forEach((el) => el.classList.add("fc-forgotten"));
    }
    const alarmKey = (this._floor || "") + "#" + flat.map((a) => a.entity + a.kind + a.room + (a.value !== undefined ? Math.round(a.value) : "")).join("|");
    const key = alarmKey + "#" + nudges.map((n) => n.room + n.lights.join() + Math.floor((now - n.since) / 300e3)).join("|");
    if (key !== this._bannerKey) box.innerHTML = "";
    for (const a of key !== this._bannerKey ? flat : []) {
      const fl = this._floorsLowered.find((f) => (f.id || null) === (a.floor || null));
      const room = fl && a.room ? (fl.lowered.rooms.find((r) => r.id === a.room) || {}).name : null;
      const b = document.createElement("button");
      b.className = "fc";
      b.style.color = a.color;
      // an alert on another floor says which one
      const other = (a.floor || null) !== (this._floor || null) ? (this._floorsList().find((f) => (f.id || null) === (a.floor || null)) || {}).name : null;
      b.textContent = "⚠ " + this._alertText(a) + (room ? " · " + room : "") + (other ? " (" + other + ")" : "");
      b.addEventListener("click", () => {
        if ((a.floor || null) !== (this._floor || null)) { this._floor = a.floor; this._buildFloor(); }
        else this._moreInfo(a.entity);
      });
      box.appendChild(b);
    }
    for (const n of key !== this._bannerKey ? nudges : []) {
      const b = document.createElement("button");
      b.className = "fc nudge";
      b.style.color = "#ffab40";
      const room = (n.fl.lowered.rooms.find((r) => r.id === n.room) || {}).name || n.room;
      b.textContent = translate(this._lang(), "forgotten", { room, min: Math.round((now - n.since) / 60e3) });
      b.addEventListener("click", () => this._hass.callService("homeassistant", "turn_off", { entity_id: n.lights }));
      box.appendChild(b);
    }
    this._bannerKey = key;
    // a dot on the floors with an alert
    const floorsWith = new Set(all.filter((x) => x.list.length).map((x) => x.id || ""));
    this.shadowRoot.querySelectorAll("#floors button").forEach((b, i) => {
      const f = this._floorsList()[i];
      b.classList.toggle("alarm", !!f && floorsWith.has(f.id || ""));
    });
    // a new alert wakes a dimmed tablet
    if (flat.length && alarmKey !== this._alertKey) this._touched();
    this._alertKey = alarmKey;
  }

  // ---- time travel -----------------------------------------------------------

  _wireTimeline() {
    const sr = this.shadowRoot;
    const btn = sr.getElementById("tt-btn");
    if (!this._config.timeTravel) { btn.hidden = true; return; }
    btn.title = translate(this._lang(), "time_travel");
    btn.onclick = () => (this._travel ? this._exitTravel() : this._enterTravel(1));
    sr.getElementById("tt-live").textContent = translate(this._lang(), "live");
    sr.getElementById("tt-live").onclick = () => this._exitTravel();
    this._renderRanges();
    const slider = sr.getElementById("tt-slider");
    slider.addEventListener("input", () => { if (!this._travel) return; this._stopPlay(); this._showAt(this._sliderTime()); });
    sr.getElementById("tt-play").onclick = () => (this._playTimer ? this._stopPlay() : this._play());
    const rec = sr.getElementById("tt-rec");
    rec.title = translate(this._lang(), "rec_t");
    rec.onclick = () => this._recordDay();
  }

  // ---- "a day in 30 seconds": the travel range as an animated GIF ------------------------------

  // The plan as it is drawn now, whole, as an image: the SVG with the card's styles round it.
  async _frame(W, H, F) {
    const sr = this.shadowRoot, wrap = sr.getElementById("wrap");
    const css = [...sr.querySelectorAll("style")].map((x) => x.textContent).join("\n").replace(/:host/g, "#fcx");
    const clone = this._svg.cloneNode(true);
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: W, height: H, viewBox: F.join(" ") })) clone.setAttribute(k, v);
    clone.querySelectorAll("#fc-widgets, #fc-power").forEach((el) => el.remove());
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" id="fcx" width="${W}" height="${H}"><style><![CDATA[${css}]]></style>` +
      `<g id="wrap" class="${wrap.className}"><g id="stage">${new XMLSerializer().serializeToString(clone)}</g></g></svg>`;
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error("frame")); img.src = url; });
      return img;
    } finally { URL.revokeObjectURL(url); }
  }

  async _recordDay(N = 72) { // 72 frames, 0.4 s each: about 30 seconds
    const t = this._travel, sr = this.shadowRoot;
    if (!t || this._recording || !this._svg) return;
    this._stopPlay();
    this._recording = true;
    const btn = sr.getElementById("tt-rec"), slider = sr.getElementById("tt-slider"), keep = slider.value;
    const lang = this._lang();
    const F = (this._fullVB || this._baseVB).slice();
    const W = Math.round(Math.min(720, (720 * F[2]) / F[3])), H = Math.round((W * F[3]) / F[2]);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const bg = getComputedStyle(this).getPropertyValue("--fc-bg").trim() || "#131a24";
    const fg = getComputedStyle(this).getPropertyValue("--fc-text").trim() || "#c3cfdf";
    const frames = [];
    try {
      for (let i = 0; i < N; i++) {
        btn.textContent = `🎬 ${Math.round((100 * i) / N)}%`;
        const at = t.start + ((t.end - t.start) * i) / (N - 1);
        slider.value = String(Math.round((1000 * i) / (N - 1)));
        this._showAt(at);
        await new Promise((r) => setTimeout(r, 0));
        const img = await this._frame(W, H, F);
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.drawImage(img, 0, 0, W, H);
        // the time, bottom left
        let when;
        try { when = new Date(at).toLocaleString(lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
        catch (e) { when = new Date(at).toISOString(); }
        g.font = "600 16px system-ui, sans-serif";
        const tw = g.measureText(when).width;
        g.fillStyle = bg; g.globalAlpha = 0.8; g.fillRect(8, H - 34, tw + 20, 26); g.globalAlpha = 1;
        g.fillStyle = fg; g.fillText(when, 18, H - 15);
        frames.push(g.getImageData(0, 0, W, H).data);
      }
      btn.textContent = "🎬 …";
      await new Promise((r) => setTimeout(r, 0));
      const pal = makePalette(frames, 4), idx = indexer(pal);
      const gif = encodeGif(W, H, frames.map(idx), pal, Math.round(2880 / N)); // the whole range in about 29 s
      this._lastGif = { bytes: gif.length, w: W, h: H, frames: N, blob: new Blob([gif], { type: "image/gif" }) };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(this._lastGif.blob);
      a.download = `floorplan-${new Date(t.start).toISOString().slice(0, 10)}-${t.days}d.gif`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 20000);
    } catch (e) {
      console.warn("LIVING-FLOORPLAN-CARD: recording failed", e);
    } finally {
      this._recording = false;
      btn.textContent = "🎬";
      if (this._travel) { slider.value = keep; this._showAt(this._sliderTime()); }
    }
  }

  // 24 h and 7 days from the recorder; 30 days and 3 months when InfluxDB Proxy is there.
  _renderRanges(sel) {
    const box = this.shadowRoot.getElementById("tt-ranges");
    if (!box) return;
    const keys = { 1: "range_24h", 7: "range_7d", 30: "range_30d", 90: "range_90d", 365: "p_year" };
    const days = this._influx ? [1, 7, 30, 90, 365] : [1, 7];
    box.innerHTML = "";
    for (const d of days) {
      const b = document.createElement("button");
      b.className = "fc" + (d === sel ? " sel" : "");
      b.dataset.r = String(d);
      b.textContent = translate(this._lang(), keys[d]);
      b.onclick = () => this._enterTravel(d);
      box.appendChild(b);
    }
  }

  // Is InfluxDB Proxy installed? Asked once.
  async _proxy() {
    if (!this._config.influx || !this._hass) return false;
    if (this._influx === undefined) this._influx = await hasProxy(this._hass);
    return this._influx;
  }

  _sliderTime() {
    const t = this._travel;
    if (!t) return Date.now();
    return t.start + ((t.end - t.start) * Number(this.shadowRoot.getElementById("tt-slider").value)) / 1000;
  }

  async _enterTravel(days) {
    if (!this._hass || !this._entities) return;
    this._stopPlay();
    const req = (this._travelReq = (this._travelReq || 0) + 1);
    const end = Date.now(), start = end - days * 864e5;
    const sr = this.shadowRoot;
    sr.getElementById("wrap").classList.add("traveling");
    sr.getElementById("timeline").hidden = false;
    sr.getElementById("tt-btn").classList.add("sel");
    this._renderRanges(days);
    sr.getElementById("tt-when").textContent = translate(this._lang(), "loading_history");
    // the zoom buttons and the legend sit above the timeline, whatever its height
    sr.getElementById("wrap").style.setProperty("--fc-timeline-h", sr.getElementById("timeline").offsetHeight + "px");
    if (this._map !== "live") { this._map = "live"; this._renderLayers(); this._enterMap(); }
    const proxy = await this._proxy();
    if (req !== this._travelReq) return;
    this._renderRanges(days);
    let raw = {}, hist = null;
    if (days > 10 && proxy) {
      try { hist = await proxyHistory(this._hass, this._allEntities(), start, end); } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e);
      }
    }
    if (!hist) try {
      raw = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: this._allEntities(),
        minimal_response: false,
        no_attributes: false,
        significant_changes_only: false,
      });
    } catch (e) {
      console.warn("LIVING-FLOORPLAN-CARD: history failed", e);
    }
    if (req !== this._travelReq) return; // left, or another range asked meanwhile
    this._travel = { start, end, days, hist: hist || normalizeHistory(raw) };
    const slider = sr.getElementById("tt-slider");
    slider.value = "0";
    this._showAt(start);
    this._renderMarks();
  }

  _showAt(t) {
    if (!this._travel || !this._svg) return;
    const get = statesAt(this._travel.hist, this._hass.states, t);
    this._placeLightField(get);
    applyStates(this._svg, { get }, this._lang(), this._paintFn());
    this._placeLabels();
    this._svg.querySelectorAll(".fc-forgotten").forEach((el) => el.classList.remove("fc-forgotten"));
    this._drawSun(t);
    this._drawTrail(t, (id) => this._travel.hist[id] || []);
    this.shadowRoot.getElementById("fc-alerts")?.remove();
    const lang = this._lang();
    let when;
    try {
      when = new Date(t).toLocaleString(lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) { when = new Date(t).toISOString(); }
    this.shadowRoot.getElementById("tt-when").textContent = when;
  }

  // What marks the time travel line: alarms, locks, cameras' detections, then the config's `events`.
  _eventRules() {
    if (!this._config.events || !this._hass) return [];
    const lang = this._lang();
    const name = (id) => (this._hass.states[id] && this._hass.states[id].attributes && this._hass.states[id].attributes.friendly_name) || id;
    const rules = [], seen = new Set();
    const add = (r) => { if (r.entity && !seen.has(r.entity)) { seen.add(r.entity); rules.push(r); } };
    const rule = (entity, color, label, states = null) => ({ entity, states, above: null, below: null, color, name: label });
    for (const r of this._config.events) add({ ...r, name: r.name || name(r.entity) });
    for (const f of this._floorsLowered || []) {
      for (const d of f.lowered.devices || []) {
        if (d.type === "icon" && ALARM_KINDS.includes(d.kind) && d.entity) add(rule(d.entity, "#e53935", translate(lang, "alert_" + d.kind)));
      }
      for (const l of f.lowered.locks || []) if (l.entity) add(rule(l.entity, "#e57373", translate(lang, "ev_open", { name: name(l.entity) }), ["open", "unlocked", "opening"]));
      for (const c of f.lowered.cameras || []) {
        const det = this._config.cameraDetect[c.entity] || c.detect || (this._autoDetect || {})[c.entity];
        if (det) add(rule(det, "#a99be0", translate(lang, "ev_detect", { name: c.name || name(c.entity) })));
      }
    }
    return rules;
  }

  _renderMarks() {
    const sr = this.shadowRoot, box = sr.getElementById("tt-marks"), t = this._travel;
    box.innerHTML = "";
    if (!t) return;
    const lang = this._lang();
    const marks = clusterMarks(eventMarks(this._eventRules(), t.hist, t.start, t.end), t.start, t.end);
    for (const m of marks.slice(-400)) {
      const b = document.createElement("button");
      b.className = "mk" + (m.n > 1 ? " many" : "");
      b.style.left = (m.pos * 100).toFixed(2) + "%";
      b.style.background = m.rule.color;
      let when;
      try { when = new Date(m.t).toLocaleString(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { when = ""; }
      const label = m.rule.name + (m.n > 1 ? " ×" + m.n : "");
      b.dataset.label = label + " · " + when;
      b.setAttribute("aria-label", b.dataset.label);
      b.onclick = () => {
        this._stopPlay();
        sr.getElementById("tt-slider").value = String(Math.round(m.pos * 1000));
        this._showAt(m.t);
        sr.getElementById("tt-when").textContent += " · " + label;
      };
      box.appendChild(b);
    }
    sr.getElementById("wrap").style.setProperty("--fc-timeline-h", sr.getElementById("timeline").offsetHeight + "px");
  }

  // Every entity of every floor (history for time travel, so a floor switch keeps the past).
  _allEntities() {
    const ids = new Set(this._entities || []);
    const walk = (o) => {
      if (typeof o === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(o)) ids.add(o); return; }
      if (o && typeof o === "object") for (const v of Object.values(o)) walk(v);
    };
    for (const f of this._floorsLowered || []) {
      for (const k of ["lights", "devices", "covers", "climate", "locks", "windows", "doors", "rooms", "cameras"]) walk(f.lowered[k]);
    }
    for (const r of this._eventRules()) ids.add(r.entity);
    return [...ids];
  }

  _play() {
    if (!this._travel) return;
    const sr = this.shadowRoot, slider = sr.getElementById("tt-slider");
    if (Number(slider.value) >= 1000) slider.value = "0";
    sr.getElementById("tt-play").textContent = "❚❚";
    sr.getElementById("tt-play").title = translate(this._lang(), "pause");
    // the whole range in about 30 seconds
    this._playTimer = setInterval(() => {
      const v = Math.min(1000, Number(slider.value) + 4);
      slider.value = String(v);
      this._showAt(this._sliderTime());
      if (v >= 1000) this._stopPlay();
    }, 120);
  }

  _stopPlay() {
    if (this._playTimer) { clearInterval(this._playTimer); this._playTimer = null; }
    const b = this.shadowRoot.getElementById("tt-play");
    if (b) { b.textContent = "▶"; b.title = translate(this._lang(), "play"); }
  }

  _exitTravel() {
    this._stopPlay();
    this._travel = null;
    this._travelReq = (this._travelReq || 0) + 1;
    const sr = this.shadowRoot;
    sr.getElementById("wrap").classList.remove("traveling");
    sr.getElementById("timeline").hidden = true;
    sr.getElementById("tt-btn").classList.remove("sel");
    sr.getElementById("tt-marks").innerHTML = "";
    this._doorsKey = null;
    this._sig = "";
    this._update();
  }

  // ---- room maps -----------------------------------------------------------

  _mapLabel(kind) {
    return translate(this._lang(), "map_" + kind);
  }

  // The period of the map: "now", a number of days, "winter" / "summer".
  _period() {
    if (this._mapPeriod !== undefined && this._mapPeriod !== null) return this._mapPeriod;
    return AVERAGE_KINDS.includes(this._map) ? "now" : this._config.mapDays;
  }

  _periodLabel(p) {
    const lang = this._lang();
    if (p === "now" || p === "winter" || p === "summer") return translate(lang, "p_" + p);
    if (p === 365) return translate(lang, "p_year");
    if (p === 90) return translate(lang, "range_90d");
    return translate(lang, "p_days", { n: p });
  }

  // Periods a map offers: averages from the long-term statistics (kept for ever), hours from
  // the history (the recorder's days, or InfluxDB Proxy's months and the year).
  _periodsFor(kind) {
    if (kind === "signal" || kind === "live") return [];
    if (AVERAGE_KINDS.includes(kind)) return ["now", 7, 30, 90, 365, "winter", "summer"];
    if (kind === "energy") return [7, 30, 90, 365];
    // hours from the history: the recorder reaches ~10 days back, InfluxDB Proxy months
    if (!this._influx) return [...new Set([7, Math.min(this._config.mapDays, RECORDER_DAYS)])].sort((x, y) => x - y);
    return [...new Set([7, 30, 90, 365, this._config.mapDays])].sort((x, y) => x - y);
  }

  // Comparing needs the period before too: from the history only as far back as it reaches.
  _canCompare(kind, p) {
    if (p === "now" || kind === "signal") return false;
    if (AVERAGE_KINDS.includes(kind) || kind === "energy" || this._influx) return true;
    return typeof p === "number" && 2 * p <= RECORDER_DAYS;
  }

  _mapKey() {
    return [this._map, this._floor || "", String(this._period()), this._compare ? "vs" : ""].join("|");
  }

  _renderLayers() {
    const btn = this.shadowRoot.getElementById("layer-btn");
    const menu = this.shadowRoot.getElementById("layer-menu");
    if (!this._config.maps) { btn.hidden = true; menu.hidden = true; return; }
    btn.textContent = "▦ ";
    const lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = this._mapLabel(this._map);
    btn.appendChild(lbl);
    btn.title = this._mapLabel(this._map);
    btn.onclick = () => { menu.hidden = !menu.hidden; };
    menu.innerHTML = "";
    for (const k of MAP_KINDS) {
      const b = document.createElement("button");
      b.className = "fc" + (k === this._map ? " sel" : "");
      b.textContent = this._mapLabel(k);
      b.addEventListener("click", () => {
        menu.hidden = true;
        if (k === this._map) return;
        this._map = k;
        this._mapPeriod = null;
        this._compare = false;
        this._renderLayers();
        this._enterMap();
      });
      menu.appendChild(b);
    }
  }

  async _enterMap() {
    const wrap = this.shadowRoot.getElementById("wrap");
    const kind = this._map;
    wrap.classList.toggle("mapping", kind !== "live");
    if (kind === "live" || kind === "signal" || this._period() === "now") { this._drawMap(); return; }
    const key = this._mapKey();
    const fresh = this._mapCache && this._mapCache.key === key && Date.now() - this._mapCache.at < 10 * 60e3;
    if (!fresh) {
      this._drawMap(null);
      const req = (this._mapReq = (this._mapReq || 0) + 1);
      await this._proxy(); // which periods there are
      const south = !!(this._hass && this._hass.config && this._hass.config.latitude < 0);
      const p = this._period();
      const now = Date.now();
      const r1 = periodRange(p, now, { south }), r0 = periodRange(p, now, { before: true, south });
      // the lamps' share of "energy" comes from the history: both periods with it or both without (a fair comparison)
      const earliest = this._compare ? r0[0] : r1[0];
      const lights = (await this._proxy()) || now - earliest <= RECORDER_DAYS * 864e5;
      const cur = await this._mapValues(kind, r1, { lights });
      const prev = this._compare ? await this._mapValues(kind, r0, { lights }) : null;
      if (req !== this._mapReq || key !== this._mapKey()) return; // changed meanwhile
      this._mapCache = { key, at: Date.now(), values: prev ? diffValues(cur, prev) : cur };
    }
    this._drawMap();
  }

  // Values per room of a map for [start, end].
  async _mapValues(kind, [start, end], { lights = true } = {}) {
    const sources = this._sources || {};
    if (!this._hass) return {};
    if (AVERAGE_KINDS.includes(kind)) {
      const ids = [...new Set(Object.values(sources).flatMap((x) => x[kind] || []))];
      const st = await this._stats(ids, start, end, "mean");
      return roomAverages(sources, kind, (id) => (st[id] === undefined ? null : st[id]));
    }
    if (kind === "energy") {
      // meters (long-term statistics: any period), and the lights where their history reaches
      const out = {};
      const meters = this._meters();
      const st = await this._stats(meters.map((m) => m.entity), start, end, "change");
      for (const m of meters) {
        if (st[m.entity] === undefined) continue;
        out[m.room] = (out[m.room] || 0) + st[m.entity] * kwhFactor(this._hass.states[m.entity]);
      }
      if (lights) {
        const lv = await this._historyValues("light_energy", start, end);
        for (const [room, v] of Object.entries(lv)) out[room] = (out[room] || 0) + v;
      }
      return out;
    }
    return this._historyValues(kind, start, end);
  }

  // Long-term statistics of `ids` -> { id: mean of the means | sum of the changes }; sensors without
  // statistics: InfluxDB Proxy's hourly means.
  async _stats(ids, start, end, type) {
    const out = {};
    if (!ids.length) return out;
    try {
      const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(), statistic_ids: ids, period: end - start > 120 * 864e5 ? "month" : "day", types: [type] });
      for (const [id, rows] of Object.entries(r || {})) { const v = statsValue(rows, type); if (v !== null) out[id] = v; }
    } catch (e) { console.warn("LIVING-FLOORPLAN-CARD: statistics failed", e); }
    const miss = ids.filter((id) => out[id] === undefined);
    if (type === "mean" && miss.length && (await this._proxy())) {
      try {
        const h = await proxyHistory(this._hass, miss, start, end);
        for (const [id, rows] of Object.entries(h)) {
          const v = rows.map((x) => Number(x.state)).filter(Number.isFinite);
          if (v.length) out[id] = v.reduce((a, b) => a + b, 0) / v.length;
        }
      } catch (e) { console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e); }
    }
    return out;
  }

  // Energy meters in the rooms of this floor: the config's `energy`, and the energy sensors of the
  // devices on the plan (their own, their reading, or on their device in Home Assistant).
  _meters() {
    const out = [], seen = new Set();
    const L = this._lowered;
    if (!L || !this._hass) return out;
    const idx = roomIndex(L);
    const roomOfDevice = (d) => {
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      return d.room || (at ? idx.roomAt(at[0], at[1]) : null);
    };
    const add = (entity, room) => { if (entity && room && !seen.has(entity)) { seen.add(entity); out.push({ entity, room }); } };
    const devices = L.devices || [];
    for (const m of this._config.energy) {
      const d = devices.find((x) => x.entity === m.entity || x.value_entity === m.entity);
      add(m.entity, m.room || (d && roomOfDevice(d)));
    }
    const ents = this._hass.entities || {};
    const byDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    // one meter per device: an A/C with "energy", "heating energy" and "cooling energy" counts the first only
    const PART = /cool|heat|import|export|return|produc|solar|charg|discharg|_l[123]\b|phase/;
    const pick = (ids) => ids.filter((x) => isEnergyMeter(this._hass.states[x]))
      .sort((a, b) => Number(PART.test(a)) - Number(PART.test(b)) || a.length - b.length)[0];
    const usedDevices = new Set();
    for (const d of devices) {
      const room = roomOfDevice(d);
      for (const id of [d.entity, d.value_entity]) {
        if (!id) continue;
        const dev = ents[id] && ents[id].device_id;
        if (isEnergyMeter(this._hass.states[id])) { add(id, room); if (dev) usedDevices.add(dev); continue; }
        if (!dev || usedDevices.has(dev)) continue;
        const m = pick(byDevice[dev] || []);
        if (m) { usedDevices.add(dev); add(m, room); }
      }
    }
    return out;
  }

  // Hours / light energy per room from the history: the recorder, InfluxDB Proxy beyond its days.
  async _historyValues(kind, start, end) {
    const sources = this._sources || {};
    const key = kind === "presence_hours" ? "presence" : "lights";
    const ids = [...new Set(Object.values(sources).flatMap((x) => x[key] || []))];
    if (!ids.length) return {};
    const energy = kind === "light_energy";
    let rows = null; // [{ t, state, attributes }] per entity
    // InfluxDB Proxy beyond the recorder's days, and for the energy always - it keeps the brightness, the recorder may not
    if ((Date.now() - start > RECORDER_DAYS * 864e5 || energy) && (await this._proxy())) {
      try { rows = await proxyHistory(this._hass, ids, start, end); } catch (e) { console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e); }
    }
    if (!rows) {
      try {
        rows = normalizeHistory(await this._hass.callWS({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          minimal_response: !energy,
          no_attributes: !energy,
          significant_changes_only: false,
        }));
      } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: history failed", e);
      }
    }
    rows = rows || {};
    if (energy) {
      const levels = {};
      for (const id of ids) {
        const b = this._hass.states[id] && this._hass.states[id].attributes && this._hass.states[id].attributes.brightness;
        if (typeof b === "number") levels[id] = b / 255;
      }
      return energyValues(sources, rows, start, end, lightWatts(this._lowered || {}), levels);
    }
    const history = {};
    for (const [id, list] of Object.entries(rows)) history[id] = list.map((r) => ({ s: r.state, lu: r.t / 1000 }));
    return hoursValues(kind, sources, history, start, end);
  }

  // Radio devices on this floor with their signal: one spot per Home Assistant device.
  _signalPoints() {
    const L = this._lowered;
    if (!L || !this._hass) return [];
    const ents = this._hass.entities || {};
    const byDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    const placed = [];
    const put = (id, at) => { if (id && at) placed.push([id, at]); };
    for (const l of L.lights || []) {
      // a strip: its middle
      const at = l.at || (l.bulbs && l.bulbs[0]) || (l.strip && [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2]);
      if (l.type === "fixture") for (const c of l.circuits || []) put(c.entity, at);
      else put(l.entity, at);
    }
    for (const d of L.devices || []) {
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      put(d.entity, at); put(d.value_entity, at);
    }
    for (const k of L.climate || []) { put(k.temperature, k.at); put(k.humidity, k.at); }
    for (const x of [...(L.cameras || []), ...(L.locks || [])]) put(x.entity, x.at);
    const seen = new Set(), out = [];
    for (const [id, at] of placed) {
      const dev = ents[id] && ents[id].device_id;
      if (!dev || seen.has(dev)) continue;
      const sig = (byDevice[dev] || []).find((x) => /linkquality|_lqi$|rssi|signal_strength|wifi_signal/.test(x) ||
        (this._hass.states[x] && this._hass.states[x].attributes && this._hass.states[x].attributes.device_class === "signal_strength"));
      if (!sig) continue;
      seen.add(dev);
      const s = this._hass.states[sig];
      const unit = (s && s.attributes && s.attributes.unit_of_measurement) || "";
      const level = signalLevel(s);
      out.push({ x: at[0], y: at[1], level, entity: sig, text: level === null ? "—" : Math.round(Number(s.state)) + (unit && unit !== "lqi" ? " " + unit : "") });
    }
    return out;
  }

  // values: undefined = compute now, null = nothing yet (loading)
  _drawMap(values) {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-map, #fc-map-text").forEach((el) => el.remove());
    const legend = this.shadowRoot.getElementById("legend");
    const kind = this._map;
    if (kind === "live" || !this._rooms) { legend.hidden = true; this._legendSpace(); return; }
    const lang = this._lang();
    const textRot = -((this._lowered && this._lowered.canvas && this._lowered.canvas.rotate) || 0);
    const angle = textRot - (this._turned ? 90 : 0);
    const g = (html) => { const t = document.createElementNS("http://www.w3.org/2000/svg", "g"); t.innerHTML = html; return t.firstElementChild; };
    const place = (layers) => {
      const rooms = svg.querySelector("#rooms");
      if (rooms) rooms.after(g(layers.fill));
      (svg.querySelector("#" + NAMES.rotation) || svg).appendChild(g(layers.text));
    };
    legend.hidden = false;
    if (kind === "signal") {
      const pts = this._signalPoints();
      const layers = signalLayers(pts, { angle, paint: this._paintFn() });
      place(layers);
      this._legendHead(legend, "<div>" + this._mapLabel(kind) + (pts.length ? "" : " · " + translate(lang, "none_found")) + '</div><div class="bar" style="background:linear-gradient(90deg,' +
        layers.stops.map((x) => x[1]).join(",") + ')"></div><div class="ends"><span>' + translate(lang, "sig_weak") + "</span><span>" + translate(lang, "sig_good") + "</span></div>");
      legend.querySelector(".periods")?.remove();
      this._legendSpace();
      return;
    }
    const now = this._period() === "now";
    const delta = !!this._compare && !now;
    if (values === undefined) {
      if (now) values = this._hass ? liveValues(kind, this._sources, this._hass.states) : {};
      else values = this._mapCache && this._mapCache.key === this._mapKey() ? this._mapCache.values : null;
    }
    const title = this._mapLabel(kind) + (now ? "" : " · " + this._periodLabel(this._period())) + (delta ? " · " + translate(lang, "vs_before") : "");
    if (values === null) { this._legendHead(legend, ""); legend.querySelector(".head").textContent = title + " · " + translate(lang, "loading_history"); this._legendSpace(); return; }
    const num = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const money = (v) => { try { return v.toLocaleString(lang, { style: "currency", currency: (this._hass.config && this._hass.config.currency) || "EUR" }); } catch (e) { return num(v, 2); } };
    const base = kind === "temperature" ? (v) => num(v, 1) + "°" : kind === "humidity" ? (v) => num(v, 0) + "%"
      : kind === "light_energy" || kind === "energy" ? (v) => (this._config.price ? money(v * this._config.price) : num(v, Math.abs(v) < 10 ? 2 : 1) + " kWh")
      : (v) => translate(lang, "hours", { n: num(v, Math.abs(v) < 10 ? 1 : 0) });
    const format = delta ? (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + base(Math.abs(v)) : base;
    const layers = mapLayers(this._rooms, values, kind, { format, angle, paint: this._paintFn(), delta });
    place(layers);
    const stops = layers.stops;
    const lo = stops[0][0], hi = stops[stops.length - 1][0];
    this._legendHead(legend, "<div>" + title + '</div><div class="bar" style="background:linear-gradient(90deg,' +
      stops.map((x) => x[1]).join(",") + ')"></div><div class="ends"><span>' + format(lo) + "</span><span>" + format(hi) + "</span></div>");
    this._legendPeriods(legend);
    this._legendSpace();
  }

  // The legend's head (title, colour bar, ends) changes; its period chips stay the same nodes.
  _legendHead(legend, html) {
    let head = legend.querySelector(":scope > .head");
    if (!head) { legend.innerHTML = ""; head = document.createElement("div"); head.className = "head"; legend.appendChild(head); }
    if (head.innerHTML !== html) head.innerHTML = html;
  }

  // The plan ends above the legend (the zoom buttons keep their corner).
  _legendSpace() {
    const wrap = this.shadowRoot.getElementById("wrap"), legend = this.shadowRoot.getElementById("legend");
    const h = legend.hidden ? 0 : legend.offsetHeight + 12;
    if (wrap.style.getPropertyValue("--fc-legend-h") !== h + "px") wrap.style.setProperty("--fc-legend-h", h + "px");
  }

  // Period chips under a map, and "± before" to compare with the period before.
  _legendPeriods(legend) {
    const periods = this._periodsFor(this._map);
    const cur = this._period();
    const sig = [this._map, String(cur), this._compare ? "vs" : "", periods.join(), this._lang()].join("|");
    const old = legend.querySelector(":scope > .periods");
    if (old && old.dataset.sig === sig) return; // unchanged: not rebuilt under a finger
    if (old) old.remove();
    if (!periods.length) return;
    const row = document.createElement("div");
    row.className = "periods";
    row.dataset.sig = sig;
    for (const p of periods) {
      const b = document.createElement("button");
      b.className = "fc" + (p === cur ? " sel" : "");
      b.textContent = this._periodLabel(p);
      b.onclick = () => {
        if (p === cur) return;
        this._mapPeriod = p;
        if (!this._canCompare(this._map, p)) this._compare = false;
        this._enterMap();
      };
      row.appendChild(b);
    }
    if (this._canCompare(this._map, cur)) {
      const c = document.createElement("button");
      c.className = "fc cmp" + (this._compare ? " sel" : "");
      c.textContent = translate(this._lang(), "compare");
      c.onclick = () => { this._compare = !this._compare; this._enterMap(); };
      row.appendChild(c);
    }
    legend.appendChild(row);
  }

  _lang() {
    const h = this._hass;
    return (h && ((h.locale && h.locale.language) || h.language)) || navigator.language || "en";
  }

  getCardSize() {
    return 8;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 8, min_rows: 4 };
  }

  // A new card from the picker: no model yet, it shows how to make one.
  static getStubConfig() {
    return { type: "custom:" + CARD_NAME };
  }

  // The visual editor in the dashboard (Home Assistant's own form).
  static getConfigForm() {
    const nl = String(navigator.language || "").slice(0, 2).toLowerCase(), pl = nl === "pl", de = nl === "de";
    const L = (en, plText, deText) => (pl ? plText : de && deText ? deText : en);
    return {
      schema: [
        { name: "model", selector: { text: {} } },
        { name: "light", selector: { select: { mode: "dropdown", options: [
          { value: "realistic", label: L("Realistic (shadows, through doorways)", "Realistyczne (cienie, przez drzwi)", "Realistisch (Schatten, durch Türen)") },
          { value: "glow", label: L("Round glows", "Okrągłe poświaty", "Runde Lichtkreise") }] } } },
        { name: "rotate", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: L("Automatic", "Automatycznie", "Automatisch") }, { value: "0", label: "0°" }, { value: "90", label: "90°" }] } } },
        { name: "map", selector: { select: { mode: "dropdown", options: MAP_KINDS.map((k) => ({ value: k, label: translate(navigator.language, "map_" + k, { days: 7 }) })) } } },
        { name: "map_days", selector: { number: { min: 1, max: 30, mode: "box" } } },
        { name: "doors", selector: { select: { mode: "dropdown", options: [
          { value: "closed", label: L("Closed (they stop the light)", "Zamknięte (blokują światło)", "Geschlossen (sie halten das Licht auf)") },
          { value: "open", label: L("Open (light goes through)", "Otwarte (światło przechodzi)", "Offen (Licht geht durch)") }] } } },
        { name: "price", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: L("Like Home Assistant", "Jak Home Assistant", "Wie Home Assistant") }, { value: "dark", label: L("Dark", "Ciemny", "Dunkel") }, { value: "light", label: L("Light", "Jasny", "Hell") }] } } },
        { name: "camera_popup", selector: { select: { mode: "dropdown", options: [
          { value: "kiosk", label: L("In tablet mode", "W trybie tabletu", "Im Tablet-Modus") }, { value: "always", label: L("Always", "Zawsze", "Immer") }, { value: "never", label: L("Never", "Nigdy", "Nie") }] } } },
        { name: "show_room_names", selector: { boolean: {} } },
        { name: "time_travel", selector: { boolean: {} } },
        { name: "maps", selector: { boolean: {} } },
        { name: "hold_action", selector: { select: { mode: "dropdown", options: [
          { value: "insights", label: "Entity Insights" }, { value: "more-info", label: L("Entity dialog", "Okno encji", "Entitätsdialog") }] } } },
      ],
      computeLabel: (s) => ({
        model: L("Model (house.json from the floor plan editor)", "Model (house.json z edytora rzutu)", "Modell (house.json aus dem Grundriss-Editor)"),
        light: L("Light", "Światło", "Licht"), rotate: L("Turn the plan", "Obrót rzutu", "Plan drehen"), map: L("Map on load", "Mapa na starcie", "Karte beim Laden"),
        map_days: L("Days of history for the maps", "Dni historii dla map", "Tage Verlauf für die Karten"), price: L("Electricity price per kWh", "Cena prądu za kWh", "Strompreis pro kWh"), doors: L("Doors without a contact sensor", "Drzwi bez kontaktronu", "Türen ohne Kontaktsensor"), show_room_names: L("Room names", "Nazwy pokoi", "Raumnamen"),
        time_travel: L("Time travel button", "Przycisk przewijania czasu", "Zeitreise-Taste"), maps: L("Map button", "Przycisk map", "Karten-Taste"),
        hold_action: L("Hold", "Przytrzymanie", "Gedrückt halten"), theme: L("Theme", "Wygląd", "Design"),
        camera_popup: L("Camera picture when it sees someone", "Obraz kamery, gdy kogoś wykryje", "Kamerabild, wenn sie jemanden sieht"),
      })[s.name],
    };
  }
}

// Loaded by the integration, the card can come before Home Assistant's own app, which then puts
// a registry of its own in window.customElements: defined before that, the card works but Lovelace
// does not see it ("Configuration error"). On HA's page: wait for the app, then define (27.10).
function registerCard() {
  if (customElements.get(CARD_NAME)) return;
  customElements.define(CARD_NAME, LivingFloorplanCard);
  if (!customElements.get(OLD_CARD_NAME)) customElements.define(OLD_CARD_NAME, class extends LivingFloorplanCard {});
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: CARD_NAME,
    name: translate(navigator.language, "card_name"),
    description: translate(navigator.language, "card_description"),
    preview: false,
  });
  console.info("%c LIVING-FLOORPLAN-CARD %c " + VERSION + " ", "background:#ffc300;color:#131a24", "");
}
if (typeof document !== "undefined" && document.querySelector("home-assistant") && !customElements.get("home-assistant")) {
  const wait = setInterval(() => { if (customElements.get("home-assistant")) { clearInterval(wait); registerCard(); } }, 50);
  setTimeout(() => { clearInterval(wait); registerCard(); }, 15000);
} else registerCard();
