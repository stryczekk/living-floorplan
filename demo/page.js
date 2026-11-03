// The demo page: the card on the example house, driven by the made-up home of sim.js. Stands in for the bits of
// Home Assistant's frontend the card leans on - the entity dialog (`hass-more-info`), a camera player
// (`ha-camera-stream`, here a drawn scene) and `<home-assistant>` (Entity Insights finds `hass` on it).
import "../card/card.js";
import { createDemo } from "./sim.js";
import { modelIn } from "./names.js";

const L = {
  en: {
    title: "Living Floor Plan", tag: "demo",
    doorbell: "Ring the doorbell", smoke: "Smoke in the kitchen", leak: "Water leak in the bathroom", motion: "Everyone moves", reset: "Reset the demo",
    smoke_off: "Stop the smoke", leak_off: "Stop the leak", motion_off: "Everyone still",
    on_plan: "On the plan", view: "View", yours: "Your changes",
    tablet: "Wall tablet", theme: "Light / dark", changed: "{n} of your changes kept", none: "Nothing changed by you yet",
    on: "On", off: "Off", open: "Open", close: "Close", stop: "Stop", lock: "Lock", unlock: "Unlock", brightness: "Brightness",
    position: "Position", target: "Set to", mode: "Mode", heat: "Heat", cool: "Cool", start: "Start", dock: "Back to dock",
    speed: "Speed", target_hum: "Target humidity", play: "Play", pause: "Pause", volume: "Volume", battery: "Battery",
    w_eco: "Eco", w_performance: "Performance", w_off: "Off", s_disarmed: "Disarm", s_armed_home: "Home", s_armed_away: "Away", s_armed_night: "Night",
    wx_temperature: "Temperature", wx_humidity: "Humidity", wx_cloud_coverage: "Clouds", wx_wind_speed: "Wind",
    m_off: "Off", m_heat: "Heat", m_cool: "Cool", m_dry: "Dry", m_fan_only: "Fan", m_auto: "Auto", m_heat_cool: "Heat / cool",
    a_heating: "heating", a_cooling: "cooling", a_idle: "idle", a_off: "off", now: "in the room", now_water: "water", set: "set",
    in_24h: "in 24 h", pressed_short: "pressed", no_changes: "no changes in 24 h",
    last: "Changed {t}", simulated: "Simulated camera · nothing is recorded",
    house: "The house", edit: "Draw your own / change this one", back: "Back to the example house", mine: "Your plan from the editor",
  },
  pl: {
    title: "Living Floor Plan", tag: "demo",
    doorbell: "Zadzwoń do drzwi", smoke: "Dym w kuchni", leak: "Zalanie w łazience", motion: "Wszyscy w ruchu", reset: "Resetuj demo",
    smoke_off: "Wyłącz dym", leak_off: "Wyłącz zalanie", motion_off: "Zatrzymaj ruch",
    on_plan: "Na planie", view: "Widok", yours: "Twoje zmiany",
    tablet: "Tablet na ścianie", theme: "Jasny / ciemny", changed: "Zapamiętanych zmian: {n}", none: "Jeszcze nic nie zmieniłeś",
    on: "Włącz", off: "Wyłącz", open: "Otwórz", close: "Zamknij", stop: "Stop", lock: "Zamknij", unlock: "Otwórz", brightness: "Jasność",
    position: "Pozycja", target: "Ustaw", mode: "Tryb", heat: "Grzanie", cool: "Chłodzenie", start: "Start", dock: "Do bazy",
    speed: "Prędkość", target_hum: "Wilgotność docelowa", play: "Graj", pause: "Pauza", volume: "Głośność", battery: "Bateria",
    w_eco: "Eko", w_performance: "Wydajny", w_off: "Wyłącz", s_disarmed: "Rozbrój", s_armed_home: "W domu", s_armed_away: "Poza domem", s_armed_night: "Noc",
    wx_temperature: "Temperatura", wx_humidity: "Wilgotność", wx_cloud_coverage: "Zachmurzenie", wx_wind_speed: "Wiatr",
    m_off: "Wyłączony", m_heat: "Grzanie", m_cool: "Chłodzenie", m_dry: "Osuszanie", m_fan_only: "Wentylator", m_auto: "Auto", m_heat_cool: "Grzanie / chłodzenie",
    a_heating: "grzeje", a_cooling: "chłodzi", a_idle: "nie grzeje", a_off: "wyłączony", now: "w pokoju", now_water: "woda", set: "zadana",
    in_24h: "w 24 h", pressed_short: "naciśnięty", no_changes: "bez zmian w 24 h",
    last: "Zmiana {t}", simulated: "Symulowana kamera · nic nie jest nagrywane",
    house: "Dom", edit: "Narysuj swój / przerób ten", back: "Wróć do przykładowego domu", mine: "Twój plan z edytora",
  },
  de: {
    title: "Living Floor Plan", tag: "Demo",
    doorbell: "Klingeln", smoke: "Rauch in der Küche", leak: "Wasserleck im Bad", motion: "Alle bewegen sich", reset: "Demo zurücksetzen",
    smoke_off: "Rauch stoppen", leak_off: "Leck stoppen", motion_off: "Alle still",
    on_plan: "Auf dem Plan", view: "Ansicht", yours: "Deine Änderungen",
    tablet: "Wandtablet", theme: "Hell / dunkel", changed: "{n} deiner Änderungen gespeichert", none: "Noch nichts von dir geändert",
    on: "An", off: "Aus", open: "Öffnen", close: "Schließen", stop: "Stopp", lock: "Abschließen", unlock: "Aufschließen", brightness: "Helligkeit",
    position: "Position", target: "Einstellen auf", mode: "Modus", heat: "Heizen", cool: "Kühlen", start: "Start", dock: "Zur Station",
    speed: "Geschwindigkeit", target_hum: "Ziel-Luftfeuchtigkeit", play: "Abspielen", pause: "Pause", volume: "Lautstärke", battery: "Akku",
    w_eco: "Eco", w_performance: "Leistung", w_off: "Aus", s_disarmed: "Unscharf", s_armed_home: "Zuhause", s_armed_away: "Abwesend", s_armed_night: "Nacht",
    wx_temperature: "Temperatur", wx_humidity: "Luftfeuchtigkeit", wx_cloud_coverage: "Bewölkung", wx_wind_speed: "Wind",
    m_off: "Aus", m_heat: "Heizen", m_cool: "Kühlen", m_dry: "Entfeuchten", m_fan_only: "Lüfter", m_auto: "Auto", m_heat_cool: "Heizen / Kühlen",
    a_heating: "heizt", a_cooling: "kühlt", a_idle: "untätig", a_off: "aus", now: "im Raum", now_water: "Wasser", set: "Soll",
    in_24h: "in 24 h", pressed_short: "gedrückt", no_changes: "keine Änderungen in 24 h",
    last: "Geändert {t}", simulated: "Simulierte Kamera · keine Aufnahme",
    house: "Das Haus", edit: "Eigenes zeichnen / dieses ändern", back: "Zurück zum Beispielhaus", mine: "Dein Plan aus dem Editor",
  },
};
const P = new URLSearchParams(location.search);
let lang = P.get("lang") || (navigator.language || "en").slice(0, 2);
if (!L[lang]) lang = "en";
const t = (k, v = {}) => (L[lang][k] || L.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x]);

// ---- the model: the server's current plan when there is one (the editor's sandbox), else the bundled example ----
// ?mine: the plan the visitor drew in the demo's editor (same site, kept in their browser)
const EDITOR_STORE = "floorplan-editor.model";
function ownPlan() {
  try { const m = JSON.parse(localStorage.getItem(EDITOR_STORE) || "null"); return m && m.version === 2 && Array.isArray(m.walls) ? m : null; } catch { return null; }
}
// a drawn plan has no entities yet: give every lamp, cover, device, reading, lock and camera a made-up one,
// of the domain the example house uses for that kind of device, so the simulated home brings it to life
function withPlaceholders(model, example) {
  const m = JSON.parse(JSON.stringify(model)), byKind = {};
  for (const f of [example || {}, ...((example && example.floors) || [])])
    for (const d of f.devices || []) { const dom = String(d.entity || "").split(".")[0]; if (dom) byKind[(d.type || "") + "|" + (d.kind || "")] ??= dom; }
  const TYPE = { motion: "binary_sensor", presence: "binary_sensor", tv: "media_player", climate_unit: "climate", skylight: "cover", appliance: "switch" };
  const slug = (s) => String(s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "x";
  let n = 0;
  const make = (dom, id, word) => dom + ".demo_" + slug(id || "item_" + ++n) + (word ? "_" + slug(word) : "");
  for (const f of [m, ...(m.floors || [])]) {
    for (const l of f.lights || []) if (!l.entity) l.entity = make("light", l.id);
    for (const c of f.covers || []) if (!c.entity) c.entity = make("cover", c.id);
    for (const d of f.devices || []) if (!d.entity) {
      const dom = byKind[(d.type || "") + "|" + (d.kind || "")] || TYPE[d.type] || "sensor";
      d.entity = make(dom, d.id, d.kind || d.type);
    }
    for (const c of f.climate || []) { if (!c.temperature) c.temperature = make("sensor", c.id, "temperature"); if (!c.humidity) c.humidity = make("sensor", c.id, "humidity"); }
    for (const l of f.locks || []) if (!l.entity) l.entity = make("lock", l.id);
    for (const c of f.cameras || []) if (!c.entity) c.entity = make("camera", c.id);
  }
  return m;
}
const MINE = P.has("mine") && ownPlan();
async function loadModel() {
  if (MINE) return withPlaceholders(MINE, window.FLOORPLAN_EXAMPLE);
  if (P.get("model")) return (await fetch(P.get("model"))).json();
  try { const r = await fetch("/api/plan", { cache: "no-cache" }); if (r.ok) { const j = await r.json(); if (j.model) return j.model; } } catch { /* static hosting */ }
  if (window.FLOORPLAN_EXAMPLE) return window.FLOORPLAN_EXAMPLE;
  return (await fetch("../examples/house.json")).json();
}

// ---- a camera "stream": a drawn scene, day or night, someone walking when the camera sees a person ----
customElements.define("ha-camera-stream", class extends HTMLElement {
  connectedCallback() {
    this.style.cssText = "display:block;position:relative;aspect-ratio:16/9;background:#000;overflow:hidden;border-radius:8px";
    const c = document.createElement("canvas");
    c.width = 640; c.height = 360; c.style.cssText = "width:100%;height:100%;display:block";
    this.appendChild(c);
    const g = c.getContext("2d"), seed = (this.stateObj && this.stateObj.entity_id || "").length;
    const draw = () => {
      if (!this.isConnected) return;
      const now = new Date(), h = now.getHours() + now.getMinutes() / 60, day = h > 7 && h < 16.5;
      g.fillStyle = day ? "#9cc3e6" : "#0d1626"; g.fillRect(0, 0, 640, 200);
      g.fillStyle = day ? "#5f8f4e" : "#16241a"; g.fillRect(0, 200, 640, 160);
      g.fillStyle = day ? "#b9b2a4" : "#2b2e33"; g.beginPath(); g.moveTo(250, 360); g.lineTo(390, 360); g.lineTo(350, 200); g.lineTo(290, 200); g.fill();
      g.fillStyle = day ? "#e8e4dc" : "#3a3f48"; g.fillRect(40 + seed * 7, 90, 180, 110);
      g.fillStyle = day ? "#6b4b3a" : "#241913"; g.beginPath(); g.moveTo(25 + seed * 7, 92); g.lineTo(130 + seed * 7, 40); g.lineTo(235 + seed * 7, 92); g.fill();
      g.fillStyle = day ? "#9ad" : "#ffd36a"; g.fillRect(70 + seed * 7, 120, 30, 26); g.fillRect(160 + seed * 7, 120, 30, 26);
      for (let i = 0; i < 4; i++) { g.fillStyle = day ? "#3d6b35" : "#0f1a12"; g.beginPath(); g.arc(470 + i * 45, 175 - (i % 2) * 12, 34, 0, 7); g.fill(); }
      const hass = this.hass, cam = this.stateObj && this.stateObj.entity_id || "";
      const person = hass && Object.values(hass.states).some((s) => /person|doorbell/.test(s.entity_id) && s.state === "on" && cam.includes("front"));
      if (person || (cam.includes("driveway") && Math.floor(Date.now() / 20000) % 3 === 0)) {
        const x = 320 + Math.sin(Date.now() / 1200) * 60;
        g.fillStyle = "#222"; g.fillRect(x - 12, 230, 24, 70); g.beginPath(); g.arc(x, 218, 13, 0, 7); g.fill();
        g.strokeStyle = "#ff5252"; g.lineWidth = 3; g.strokeRect(x - 30, 196, 60, 112);
      }
      if (!day) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, 640, 360); }
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 330, 640, 30);
      g.fillStyle = "#fff"; g.font = "15px system-ui, sans-serif";
      g.fillText(((this.stateObj && this.stateObj.attributes.friendly_name) || "Camera") + "   " + now.toLocaleTimeString(lang), 12, 351);
      g.textAlign = "right"; g.fillText(t("simulated"), 628, 351, 330); g.textAlign = "left";
      this._raf = requestAnimationFrame(draw);
    };
    draw();
  }
  disconnectedCallback() { cancelAnimationFrame(this._raf); }
});

// <home-assistant> with .hass: Entity Insights' "standard dialog" button and its live updates look it up
customElements.define("home-assistant", class extends HTMLElement {});
customElements.define("ha-card", class extends HTMLElement {
  connectedCallback() { this.style.cssText = "display:block;border-radius:14px;overflow:hidden;background:var(--card-background-color)"; }
});

// ---- the entity dialog -------------------------------------------------------------------------------------
// one entity's details into root (the dialog's body, or a box of the gallery)
function renderInfo(demo, id, root) {
  const h = demo.hass, s = h.states[id];
  if (!s) return;
  const [domain] = id.split("."), a = s.attributes;
  const btn = (label, svc, data = {}) => `<button data-svc="${svc}" data-data='${JSON.stringify(data)}'>${label}</button>`;
  let ctl = "";
  const sel = (b, on) => (on ? b.replace("<button", '<button class="sel"') : b);
  const range = (label, key, min, max, value, step = 1) =>
    `<label>${label} <b>${value}</b><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${key}"></label>`;
  const pair = (a1, s1, a2, s2) => `<div class="row">${sel(btn(t(a1), s1), stateOn(id, s))}${sel(btn(t(a2), s2), !stateOn(id, s))}</div>`;
  if (["light", "switch", "fan", "humidifier", "siren"].includes(domain)) ctl += pair("on", domain + ".turn_on", "off", domain + ".turn_off");
  if (domain === "light" && s.state === "on") ctl += range(t("brightness"), "brightness", 1, 255, a.brightness ?? 255);
  if (domain === "fan" && a.percentage !== undefined) ctl += range(t("speed"), "percentage", 0, 100, a.percentage, 10);
  if (domain === "humidifier") ctl += range(t("target_hum"), "humidity", 30, 70, a.humidity ?? 50, 5);
  if (domain === "media_player") {
    // off: only the power; on: play / pause, the volume, the power
    if (s.state === "off" || s.state === "standby") ctl += `<div class="row">${btn("⏻ " + t("on"), "media_player.turn_on")}</div>`;
    else ctl += `<div class="row">${sel(btn("▶ " + t("play"), "media_player.media_play"), s.state === "playing")}${sel(btn("❚❚ " + t("pause"), "media_player.media_pause"), s.state === "paused")}${btn("⏻ " + t("off"), "media_player.turn_off")}</div>` +
      range(t("volume"), "volume", 0, 100, Math.round((a.volume_level ?? 0.3) * 100), 5);
  }
  if (domain === "cover") ctl += `<div class="row">${btn("▲ " + t("open"), "cover.open_cover")}${btn("■ " + t("stop"), "cover.stop_cover")}${btn("▼ " + t("close"), "cover.close_cover")}</div>` +
    range(t("position"), "position", 0, 100, a.current_position ?? 0, 5);
  if (domain === "lock") ctl += `<div class="row">${sel(btn(t("lock"), "lock.lock"), s.state === "locked")}${sel(btn(t("unlock"), "lock.unlock"), s.state === "unlocked")}</div>`;
  if (domain === "valve") ctl += `<div class="row">${sel(btn(t("open"), "valve.open_valve"), s.state === "open")}${sel(btn(t("close"), "valve.close_valve"), s.state === "closed")}</div>`;
  if (domain === "climate") ctl += `<div class="row big">${btn("−", "climate.set_temperature", { temperature: (a.temperature ?? 21) - 0.5 })}<b>${a.temperature ?? "—"} °C</b>${btn("+", "climate.set_temperature", { temperature: (a.temperature ?? 21) + 0.5 })}</div>` +
    `<div class="row">${(a.hvac_modes || []).map((m) => sel(btn(t("m_" + m), "climate.set_hvac_mode", { hvac_mode: m }), m === s.state)).join("")}</div>`;
  if (domain === "water_heater") ctl += `<div class="row big">${btn("−", "water_heater.set_temperature", { temperature: (a.temperature ?? 55) - 1 })}<b>${a.temperature ?? "—"} °C</b>${btn("+", "water_heater.set_temperature", { temperature: (a.temperature ?? 55) + 1 })}</div>` +
    `<div class="row">${(a.operation_list || []).map((m) => sel(btn(t("w_" + m), "water_heater.set_operation_mode", { operation_mode: m }), m === s.state)).join("")}</div>`;
  if (domain === "alarm_control_panel") ctl += `<div class="row">${[["alarm_disarm", "disarmed"], ["alarm_arm_home", "armed_home"], ["alarm_arm_away", "armed_away"], ["alarm_arm_night", "armed_night"]]
    .map(([svc, st]) => sel(btn(t("s_" + st), "alarm_control_panel." + svc), s.state === st)).join("")}</div>`;
  if (domain === "vacuum") ctl += `<div class="row">${sel(btn(t("start"), "vacuum.start"), s.state === "cleaning")}${sel(btn(t("dock"), "vacuum.return_to_base"), s.state === "docked")}</div>` +
    (a.battery_level !== undefined ? `<div class="muted">${t("battery")}: ${a.battery_level} %</div>` : "");
  if (domain === "lawn_mower") ctl += `<div class="row">${sel(btn(t("start"), "lawn_mower.start_mowing"), s.state === "mowing")}${sel(btn(t("dock"), "lawn_mower.dock"), s.state === "docked")}</div>`;
  if (domain === "weather") ctl += `<div class="grid">${[["temperature", "°C"], ["humidity", "%"], ["cloud_coverage", "%"], ["wind_speed", "km/h"]]
    .filter(([k]) => a[k] !== undefined).map(([k, u]) => `<div><span>${t("wx_" + k)}</span><b>${a[k]} ${u}</b></div>`).join("")}</div>`;
  if (domain === "media_player" && a.media_title && s.state === "playing") ctl = `<div class="muted big">♪ ${a.media_title}</div>` + ctl;
  const value = stateText(id, s);
  root.innerHTML = `<h2>${a.friendly_name || id}</h2><div class="state">${value}</div>` +
    (domain === "camera" ? `<div class="cam"></div>` : `<div class="hist"></div>`) + ctl +
    `<div class="muted">${t("last", { t: new Date(s.last_changed).toLocaleString(lang) })} · <code>${id}</code></div>`;
  if (domain !== "camera") history24(demo, id, root.querySelector(".hist"));
  if (domain === "camera") { const st = document.createElement("ha-camera-stream"); st.hass = h; st.stateObj = s; root.querySelector(".cam").appendChild(st); }
  root.querySelectorAll("[data-svc]").forEach((b) => { b.onclick = () => { const [d, sv] = b.dataset.svc.split("."); demo.callService(d, sv, { entity_id: id, ...JSON.parse(b.dataset.data) }); }; });
  // sliders: the value next to the label while dragging, the service when let go
  const RANGE = { brightness: ["light", "turn_on", (v) => ({ brightness: v })], position: ["cover", "set_cover_position", (v) => ({ position: v })],
    percentage: ["fan", "set_percentage", (v) => ({ percentage: v })], humidity: ["humidifier", "set_humidity", (v) => ({ humidity: v })],
    volume: ["media_player", "volume_set", (v) => ({ volume_level: v / 100 })] };
  root.querySelectorAll("[data-range]").forEach((r) => {
    r.oninput = () => { r.previousElementSibling.textContent = r.value; };
    r.onchange = () => { const [d, sv, data] = RANGE[r.dataset.range]; demo.callService(d, sv, { entity_id: id, ...data(Number(r.value)) }); };
  });
}

function moreInfo(demo, id) {
  const dlg = document.getElementById("more");
  const render = () => { if (dlg.dataset.entity === id) renderInfo(demo, id, dlg.querySelector(".body")); };
  // one entity at a time: the previous dialog's live updates stop before this one starts
  if (moreOff) moreOff();
  dlg.dataset.entity = id;
  render();
  moreOff = demo.onChange(() => {
    const busy = document.activeElement && document.activeElement.matches("input") && dlg.contains(document.activeElement);
    if (dlg.open && dlg.dataset.entity === id && !busy) render();
  });
  if (!dlg.open) dlg.showModal();
}
let moreOff = null;

// ---- what a state says, in words ------------------------------------------------------------------------------
const WORDS = {
  en: { on: "On", off: "Off", open: "Open", closed: "Closed", opening: "Opening", closing: "Closing", locked: "Locked", unlocked: "Unlocked",
    playing: "Playing", paused: "Paused", idle: "Idle", standby: "Standby", cleaning: "Cleaning", docked: "Docked", returning: "Returning",
    mowing: "Mowing", streaming: "Live", unknown: "Unknown", unavailable: "Unavailable",
    disarmed: "Disarmed", armed_home: "Armed (home)", armed_away: "Armed (away)", armed_night: "Armed (night)", triggered: "ALARM",
    eco: "Eco", performance: "Performance", sunny: "Sunny", "clear-night": "Clear night", partlycloudy: "Partly cloudy", cloudy: "Cloudy",
    rainy: "Rain", snowy: "Snow", fog: "Fog", run: "Running", stop: "Stopped", wash: "Washing", rinse: "Rinsing", finished: "Finished",
    b_motion: ["Motion", "Clear"], b_presence: ["Someone there", "Empty"], b_open: ["Open", "Closed"], b_alarm: ["ALARM!", "OK"],
    b_rain: ["Raining", "Dry"], b_ring: ["Ringing!", "Quiet"], b_run: ["Running", "Off"], b_link: ["Connected", "Disconnected"], b_person: ["Person seen", "Nobody"],
    pressed: "Pressed {t}", ends: "ends {t}", armed: "Armed", not_running: "Not running" },
  pl: { on: "Włączone", off: "Wyłączone", open: "Otwarte", closed: "Zamknięte", opening: "Otwiera się", closing: "Zamyka się", locked: "Zamknięty",
    unlocked: "Otwarty", playing: "Gra", paused: "Pauza", idle: "Bezczynny", standby: "Czuwanie", cleaning: "Sprząta", docked: "W bazie",
    returning: "Wraca do bazy", mowing: "Kosi", streaming: "Na żywo", unknown: "Nieznany", unavailable: "Niedostępny",
    disarmed: "Rozbrojony", armed_home: "Uzbrojony (w domu)", armed_away: "Uzbrojony (poza domem)", armed_night: "Uzbrojony (noc)", triggered: "ALARM",
    eco: "Eko", performance: "Wydajny", sunny: "Słonecznie", "clear-night": "Bezchmurna noc", partlycloudy: "Częściowe zachmurzenie",
    cloudy: "Pochmurno", rainy: "Deszcz", snowy: "Śnieg", fog: "Mgła", run: "Pracuje", stop: "Stoi", wash: "Pranie", rinse: "Płukanie",
    finished: "Skończone", b_motion: ["Ruch", "Brak ruchu"], b_presence: ["Ktoś jest", "Pusto"], b_open: ["Otwarte", "Zamknięte"],
    b_alarm: ["ALARM!", "OK"], b_rain: ["Pada", "Sucho"], b_ring: ["Dzwoni!", "Cisza"], b_run: ["Pracuje", "Nie pracuje"],
    b_link: ["Połączony", "Rozłączony"], b_person: ["Widzi osobę", "Nikogo"], pressed: "Naciśnięty {t}", ends: "koniec {t}",
    armed: "Uzbrojony", not_running: "Nie pracuje" },
  de: { on: "An", off: "Aus", open: "Offen", closed: "Geschlossen", opening: "Öffnet", closing: "Schließt", locked: "Abgeschlossen", unlocked: "Aufgeschlossen",
    playing: "Spielt", paused: "Pausiert", idle: "Untätig", standby: "Standby", cleaning: "Reinigt", docked: "In der Station", returning: "Kehrt zurück",
    mowing: "Mäht", streaming: "Live", unknown: "Unbekannt", unavailable: "Nicht verfügbar",
    disarmed: "Unscharf", armed_home: "Scharf (zuhause)", armed_away: "Scharf (abwesend)", armed_night: "Scharf (Nacht)", triggered: "ALARM",
    eco: "Eco", performance: "Leistung", sunny: "Sonnig", "clear-night": "Klare Nacht", partlycloudy: "Teilweise bewölkt", cloudy: "Bewölkt",
    rainy: "Regen", snowy: "Schnee", fog: "Nebel", run: "Läuft", stop: "Steht", wash: "Waschen", rinse: "Spülen", finished: "Fertig",
    b_motion: ["Bewegung", "Keine Bewegung"], b_presence: ["Jemand da", "Leer"], b_open: ["Offen", "Geschlossen"], b_alarm: ["ALARM!", "OK"],
    b_rain: ["Regnet", "Trocken"], b_ring: ["Klingelt!", "Ruhig"], b_run: ["Läuft", "Aus"], b_link: ["Verbunden", "Getrennt"], b_person: ["Person erkannt", "Niemand"],
    pressed: "Gedrückt {t}", ends: "endet {t}", armed: "Scharf", not_running: "Läuft nicht" },
};
const w = (k) => (WORDS[lang] || WORDS.en)[k] ?? WORDS.en[k] ?? k;
const OFF_STATES = ["off", "closed", "locked", "idle", "docked", "standby", "unknown", "unavailable", "disarmed", "paused"];
const stateOn = (id, s) => !OFF_STATES.includes(s.state);
function binaryKind(n) {
  if (/smoke|leak|_co$|gas/.test(n)) return "b_alarm";
  if (/motion/.test(n)) return "b_motion";
  if (/presence/.test(n)) return "b_presence";
  if (/person/.test(n)) return "b_person";
  if (/doorbell/.test(n)) return "b_ring";
  if (/rain/.test(n)) return "b_rain";
  if (/internet|zigbee|connect/.test(n)) return "b_link";
  if (/running|_on$|washer|dishwasher|oven|cooktop/.test(n)) return "b_run";
  return "b_open"; // windows, doors, the mailbox, the fridge door
}
const num = (v) => { const n = Number(v); return Math.abs(n) >= 100 ? Math.round(n).toLocaleString(lang) : n.toLocaleString(lang, { maximumFractionDigits: 1 }); };
function stateText(id, s) {
  const [domain, n] = id.split("."), a = s.attributes;
  if (domain === "climate") return `${a.current_temperature != null ? num(a.current_temperature) : "—"} °C · ${t("a_" + (a.hvac_action || "off"))}`;
  if (domain === "sensor") {
    if (a.device_class === "timestamp") return s.state === "unknown" ? w("not_running") : w("ends").replace("{t}", new Date(s.state).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }));
    if (a.device_class === "date") return new Date(s.state + "T12:00").toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });
    if (s.state !== "" && Number.isFinite(Number(s.state))) return num(s.state) + (a.unit_of_measurement ? " " + a.unit_of_measurement : "");
    return w(s.state);
  }
  if (domain === "binary_sensor") return w(binaryKind(n))[s.state === "on" ? 0 : 1];
  if (domain === "event") return w("pressed").replace("{t}", new Date(s.state).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }));
  if (domain === "weather") return `${w(s.state)} · ${a.temperature != null ? num(a.temperature) : "—"} °C`;
  if (domain === "light" && s.state === "on" && a.brightness !== undefined) return `${w("on")} · ${Math.round((a.brightness / 255) * 100)} %`;
  if (domain === "cover" && a.current_position !== undefined) return `${w(s.state)} · ${a.current_position} %`;
  if (domain === "fan" && s.state === "on" && a.percentage !== undefined) return `${w("on")} · ${a.percentage} %`;
  if (domain === "water_heater") return `${w(s.state)} · ${a.current_temperature != null ? num(a.current_temperature) : "—"} °C`;
  if (domain === "lock") return w(s.state);
  return w(s.state);
}

// the last 24 hours in the entity dialog: a line for a number, a bar of on / off for the rest
const histCache = {};
// The last 24 hours in the entity dialog, in the shape the entity has:
// a number -> a stepped line; a thermostat / boiler -> the temperature with the set one dashed; a cover -> its position;
// the weather -> its temperature; on / off -> a bar with how long and how often; a text state or a button -> its last changes.
const ATTR_LINE = { climate: ["current_temperature", "temperature"], water_heater: ["current_temperature", "temperature"],
  cover: ["current_position"], weather: ["temperature"] };
async function history24(demo, id, box) {
  if (!box) return;
  const end = Date.now(), start = end - 864e5, domain = id.split(".")[0];
  const st0 = demo.hass.states[id];
  if (!st0 || ["date", "timestamp"].includes(st0.attributes.device_class)) { box.remove(); return; }
  const attrs = ATTR_LINE[domain];
  const key = id + ":" + Math.floor(end / 60e3);
  if (!histCache[key]) histCache[key] = demo.hass.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(), entity_ids: [id], minimal_response: !attrs, no_attributes: !attrs });
  const raw = (await histCache[key])[id] || [];
  if (!raw.length || !box.isConnected) return;
  const W = 400, x = (t) => (((t - start) / (end - start)) * W).toFixed(1);
  const ticks = (y) => [0, 6, 12, 18, 24].map((h) => `<text x="${(h / 24) * W}" y="${y}" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}">−${24 - h} h</text>`).join("");
  const svgOf = (h, inner) => `<svg viewBox="0 0 ${W} ${h}" style="width:100%;height:auto;display:block;font-size:11px;fill:var(--secondary-text-color)">${inner}</svg>`;
  const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString(lang) : (Math.round(v * 10) / 10).toLocaleString(lang));
  const unit = domain === "cover" ? " %" : attrs ? "°" : st0.attributes.unit_of_measurement ? " " + st0.attributes.unit_of_measurement : "";
  // a stepped line (each value held until the next): series = [[values], colour, dashed]
  const lines = (series, legend) => {
    const H = 92, all = series.flatMap(([v]) => v.filter(Number.isFinite));
    if (!all.length) return false;
    let lo = Math.min(...all), hi = Math.max(...all);
    if (domain === "cover") { lo = 0; hi = 100; }
    // as many decimals as the range needs (a meter that grew 0.4 kWh in a day)
    const dec = hi - lo >= 20 ? 0 : hi - lo >= 2 ? 1 : 2;
    const fmt = (v) => v.toLocaleString(lang, { maximumFractionDigits: dec, minimumFractionDigits: hi - lo < 20 && Math.abs(v) >= 100 ? dec : 0 });
    const sp = hi - lo || 1, y = (v) => (H - 14 - ((v - lo) / sp) * (H - 30)).toFixed(1);
    const path = (v) => { let d = ""; raw.forEach((r, i) => { if (!Number.isFinite(v[i])) return; const X = x(r.lu * 1000);
      d += d ? `H${X}V${y(v[i])}` : `M${X} ${y(v[i])}`; }); return d + `H${W}`; };
    box.innerHTML = svgOf(H + 14, series.map(([v, c, dash]) => `<path d="${path(v)}" fill="none" stroke="${c}" stroke-width="${dash ? 1.5 : 2}"${dash ? ' stroke-dasharray="5 4"' : ""} vector-effect="non-scaling-stroke"/>`).join("") +
      `<text x="2" y="10">${fmt(hi)}${unit}</text><text x="2" y="${H - 18}">${fmt(lo)}${unit}</text>` +
      (legend ? `<text x="${W}" y="10" text-anchor="end">${legend}</text>` : "") + ticks(H + 10));
    return true;
  };
  if (attrs) {
    const series = attrs.map((k, n) => [raw.map((r) => Number(r.a && r.a[k])), n ? "#8ea1ba" : "#ffc300", n > 0]);
    if (lines(series, attrs.length > 1 ? `<tspan fill="#ffc300">━ ${t(domain === "water_heater" ? "now_water" : "now")}</tspan>  <tspan fill="#8ea1ba">┅ ${t("set")}</tspan>` : "")) return;
  }
  const nums = raw.map((r) => Number(r.s));
  if (domain === "sensor" && nums.every(Number.isFinite)) { lines([[nums, "#ffc300"]]); return; }
  // a text state (a washer's program) or a button: its changes in the 24 hours (not the state it had when they began)
  if (domain === "sensor" || domain === "event") {
    const when = (ms) => new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    const items = domain === "event"
      ? [...new Set(raw.map((r) => r.s))].map((v) => Date.parse(v)).filter((ms) => ms >= start && ms <= end).map((ms) => [ms, t("pressed_short")])
      : raw.filter((r) => r.lu * 1000 > start + 60e3).map((r) => [r.lu * 1000, w(r.s)]);
    box.innerHTML = `<div class="changes">${items.length ? items.slice(-6).reverse().map(([ms, v]) => `<div><span>${when(ms)}</span><b>${v}</b></div>`).join("")
      : `<div><span></span><b class="muted">${t("no_changes")}</b></div>`}</div>`;
    return;
  }
  // on / off: the bar, and how long it was on how many times
  let onMs = 0, times = 0, bars = "";
  raw.forEach((r, i) => {
    if (OFF_STATES.includes(r.s)) return;
    const a = Math.max(r.lu * 1000, start), b = i + 1 < raw.length ? raw[i + 1].lu * 1000 : end;
    onMs += b - a; times++;
    bars += `<rect x="${x(a)}" y="2" width="${Math.max(1.5, x(b) - x(a))}" height="22" fill="#ffc300" rx="2"/>`;
  });
  const dur = onMs >= 3600e3 ? `${Math.floor(onMs / 3600e3)} h ${Math.round((onMs % 3600e3) / 60e3)} min` : `${Math.round(onMs / 60e3)} min`;
  box.innerHTML = `<div class="sum"><i></i>${onWord(id)}: <b>${times ? dur : "—"}</b>${times ? ` · ${times}×` : ""} <span>${t("in_24h")}</span></div>` +
    svgOf(40, `<rect x="0" y="2" width="${W}" height="22" fill="rgba(127,127,127,.15)" rx="3"/>${bars}${ticks(38)}`);
}
// what the yellow of the bar means
function onWord(id) {
  const [domain, n] = id.split(".");
  if (domain === "binary_sensor") return w(binaryKind(n))[0].replace(/!$/, "");
  return w({ lock: "unlocked", alarm_control_panel: "armed", vacuum: "cleaning", lawn_mower: "mowing", media_player: "playing", valve: "open" }[domain] || "on");
}

// ---- the page ----------------------------------------------------------------------------------------------
const model = await loadModel();
const demo = createDemo(model, { lang });
document.documentElement.lang = lang;
document.title = t("title") + " — " + t("tag");
for (const el of document.querySelectorAll("[data-t]")) el.textContent = t(el.dataset.t);

await customElements.whenDefined("living-floorplan-card");
const ha = document.querySelector("home-assistant");
let card = null;
function mount() {
  if (card) card.remove();
  card = document.createElement("living-floorplan-card");
  card.setConfig({ type: "custom:living-floorplan-card", model: modelIn(lang, model), price: 0.3, sun: { offset: 0 }, room_heating: false,
    theme: document.body.classList.contains("light") ? "light" : "dark" });
  ha.appendChild(card);
  card.hass = demo.hass;
}
ha.hass = demo.hass;
demo.onChange((h) => { ha.hass = h; if (card) card.hass = h; status(); });
mount();
// the entity dialog: Entity Insights' full one where it has one (lights, switches, covers, sensors with a number...), else ours;
// its "standard dialog" button comes from <home-assistant> itself and opens ours
document.addEventListener("hass-more-info", (e) => {
  const id = e.detail && e.detail.entityId;
  if (!id) return;
  const fromInsights = e.composedPath()[0] === ha;
  if (!fromInsights && window.entityInsights && window.entityInsights.open({ entity: id }, demo.hass)) return;
  moreInfo(demo, id);
});
document.getElementById("more").addEventListener("click", (e) => { if (e.target.id === "more" || e.target.closest("[data-close]")) e.currentTarget.close(); });
// the alarm buttons switch: on, and off again (they say so while on)
const triggers = () => document.querySelectorAll("[data-trigger]").forEach((b) => {
  const on = demo.active(b.dataset.trigger);
  b.classList.toggle("on", on);
  b.textContent = on ? t(b.dataset.trigger + "_off") : t(b.dataset.trigger);
});
for (const b of document.querySelectorAll("[data-trigger]")) b.onclick = () => { demo.trigger(b.dataset.trigger); triggers(); };
demo.onChange(triggers);
document.getElementById("reset").onclick = () => { demo.reset(); mount(); };
document.getElementById("theme").onclick = () => {
  const light = document.body.classList.toggle("light");
  try { localStorage.setItem("living-floorplan-demo:theme", light ? "light" : "dark"); } catch { /* private mode */ }
  mount();
};
try { if (localStorage.getItem("living-floorplan-demo:theme") === "light") { document.body.classList.add("light"); mount(); } } catch { /* private mode */ }
for (const a of document.querySelectorAll("[data-lang]")) a.classList.toggle("on", a.dataset.lang === lang);
// the language links keep the visitor's own plan
if (MINE) for (const a of document.querySelectorAll("[data-lang]")) a.href = "?mine&lang=" + a.dataset.lang;
{
  const ed = document.getElementById("to-editor"), back = document.getElementById("to-example");
  ed.href = "editor/?lang=" + lang;
  back.href = "?lang=" + lang;
  back.hidden = !MINE;
  document.getElementById("mine-note").hidden = !MINE;
}
// ?gallery: one box of details per kind of entity, all at once (for checking the dialogs)
if (P.has("gallery")) {
  const ids = Object.keys(demo.hass.states).sort();
  const pick = [], seen = new Set();
  for (const id of ids) {
    const s = demo.hass.states[id], d = id.split(".")[0];
    const k = d + ":" + (s.attributes.device_class || "") + ":" + (d === "binary_sensor" ? binaryKind(id.split(".")[1]) : d === "sensor" && !Number.isFinite(Number(s.state)) ? "text" : "");
    if (!seen.has(k)) { seen.add(k); pick.push(id); }
  }
  const g = document.createElement("div");
  g.id = "gallery";
  g.innerHTML = pick.map((id) => `<div class="gbox" data-id="${id}"></div>`).join("");
  document.querySelector("main").prepend(g);
  const draw = () => g.querySelectorAll(".gbox").forEach((b) => { if (!b.contains(document.activeElement)) renderInfo(demo, b.dataset.id, b); });
  draw(); demo.onChange(draw);
}
// ---- the visit counter: start, "still here" every 15 s while the tab is in view, what was played with ----
// (only on the demo's own server - it adds <meta name="demo-hits">; no cookies, nothing kept in the browser)
const hitUrl = document.querySelector('meta[name="demo-hits"]')?.content;
const visit = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");
const beacon = (k, extra = {}) => {
  if (!hitUrl) return;
  const body = JSON.stringify({ k, v: visit, ...extra });
  if (!(navigator.sendBeacon && navigator.sendBeacon(hitUrl, new Blob([body], { type: "text/plain" })))) fetch(hitUrl, { method: "POST", body, keepalive: true }).catch(() => {});
};
const seen = new Set(), event = (n) => { if (!seen.has(n)) { seen.add(n); beacon("event", { n }); } }; // each kind once a visit
if (hitUrl) {
  let ref = "";
  try { const r = document.referrer && new URL(document.referrer); if (r && r.host !== location.host) ref = r.host; } catch { /* none */ }
  // the browser in general (its family, not its version), the window's width in steps, the visitor's own language
  const ua = navigator.userAgent;
  const br = /SamsungBrowser/.test(ua) ? "samsung" : /Edg\//.test(ua) ? "edge" : /OPR\/|Opera/.test(ua) ? "opera" : /Firefox\//.test(ua) ? "firefox"
    : /Chrome\/|CriOS/.test(ua) ? "chrome" : /Safari\//.test(ua) ? "safari" : "other";
  const W = window.innerWidth, wb = W < 480 ? "<480" : W < 768 ? "480-767" : W < 1280 ? "768-1279" : W < 1920 ? "1280-1919" : "1920+";
  // a campaign from the link (?utm_source=reddit&utm_campaign=launch): the referrer is often lost in apps and mail
  const q = new URLSearchParams(location.search), utm = {};
  for (const k of ["source", "medium", "campaign"]) if (q.get("utm_" + k)) utm["u" + k[0]] = q.get("utm_" + k).slice(0, 60);
  beacon("start", { ...utm, ref, m: matchMedia("(max-width: 760px), (pointer: coarse)").matches, l: lang, b: br, w: wb,
    vl: (navigator.language || "").slice(0, 2).toLowerCase() });
  setInterval(() => { if (document.visibilityState === "visible") beacon("ping"); }, 15000);
  demo.onService((domain) => event("switch:" + domain));
  document.addEventListener("hass-more-info", (e) => e.detail && e.detail.entityId && event("details:" + e.detail.entityId.split(".")[0]));
  document.addEventListener("click", (e) => {
    const el = e.composedPath().find((x) => x instanceof Element && (x.matches("button, a")));
    if (!el) return;
    if (el.dataset.trigger) event("demo:" + el.dataset.trigger);
    else if (el.id === "theme" || el.id === "reset") event("demo:" + el.id);
    else if (el.id === "to-editor" || el.id === "to-example") event("demo:" + el.id);
    else if (el.dataset.lang) event("lang:" + el.dataset.lang);
    else if (el.closest && el.closest("#floors")) event("card:floor");
    else if (el.id === "tt-btn") event("card:time_travel");
    else if (el.id === "set-btn") event("card:settings");
    else if (el.id === "layer-btn") event("card:maps");
    else if (el.closest && el.closest("#zoom")) event("card:zoom");
  }, true);
}
function status() {
  const n = demo.changedByVisitor();
  document.getElementById("status").textContent = n ? t("changed", { n }) : t("none");
}
status();
