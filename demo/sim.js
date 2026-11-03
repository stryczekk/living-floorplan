// A made-up home for the demo page: every entity of the plan gets a state that follows a day of three people
// (one works from home, one commutes, a kid goes to school), the sun and the weather; what the visitor switches
// stays as they left it (in this browser) until the house itself changes it; history and statistics come from
// the same day plan, so time travel, the maps and the dialogs have something to show.
// Nothing is sent anywhere: a fake `hass` object answers the card.

import { nameIn } from "./names.js";
const STORE = "living-floorplan-demo:v1";
const H = 3600e3, MIN = 60e3, DAY = 864e5;

// ---- small deterministic helpers -------------------------------------------------------------------------
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rnd = (seed, k = 0) => { let x = (seed ^ Math.imul(k + 1, 2654435761)) >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const hourOf = (t) => (t - dayStart(t)) / H;
const dayKey = (t) => Math.floor((dayStart(t) + 12 * H) / DAY);
const weekend = (t) => { const w = new Date(t).getDay(); return w === 0 || w === 6; };
const within = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
const doy = (t) => { const d = new Date(t); return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / DAY; };
// sunrise / sunset (hours) for ~50° N, good enough for a demo
const sunrise = (t) => 6.0 - 2.1 * Math.cos((2 * Math.PI * (doy(t) - 172)) / 365);
const sunset = (t) => 18.2 + 2.3 * Math.cos((2 * Math.PI * (doy(t) - 172)) / 365);
const dark = (t, margin = 0.4) => { const h = hourOf(t); return h < sunrise(t) + margin || h > sunset(t) - margin; };
// a name from the id, with what the thing is when the id does not say it ("light.office" -> "Office light")
const KIND_WORD = { light: "light", cover: "blind", climate: "thermostat", lock: "lock", camera: "camera", fan: "fan", media_player: "player",
  siren: "siren", humidifier: "humidifier", vacuum: "vacuum", lawn_mower: "mower", valve: "valve", water_heater: "water heater", weather: "weather" };
const human = (id) => {
  const [d, n] = id.split("."); let s = n.replace(/_/g, " ");
  const k = KIND_WORD[d];
  if (k && !s.includes(k) && !(d === "climate" && /_ac$/.test(n)) && !(d === "media_player" && /tv|speaker|soundbar/.test(n))
    && !(d === "light" && /lamp|strip|spots|mirror|night|projector|backlight|bedside|headboard|steps/.test(n))
    && !(d === "fan" && /purifier|ventilation/.test(n)) && !(d === "water_heater" && /boiler/.test(n))) s += " " + k;
  s = s.replace(/ ac$/, " air conditioner").replace(/\btv\b/, "TV").replace(/\bap\b/, "AP").replace(/\bco2\b/, "CO₂").replace(/\bpc\b/, "PC")
    .replace(/\bnas\b/, "NAS").replace(/\bups\b/, "UPS").replace(/\bev\b/, "EV").replace(/\bpoe\b/, "PoE");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ---- who is where ----------------------------------------------------------------------------------------
// [hour, room] steps; "out" = away. Shifted a little every day (seeded), weekends later and without work / school.
const PEOPLE = {
  alex: { weekday: [[0, "bedroom"], [6.5, "ensuite"], [6.8, "wardrobe"], [6.9, "landing"], [6.95, "hall"], [7.0, "kitchen"],
    [7.7, "office"], [12.5, "kitchen"], [13.1, "office"], [17.0, "utility"], [17.3, "kitchen"], [18.6, "living"], [22.4, "landing"],
    [22.45, "bath1"], [22.7, "bedroom"]],
  weekend: [[0, "bedroom"], [8.2, "ensuite"], [8.5, "kitchen"], [10.0, "garden"], [12.5, "kitchen"], [13.3, "living"], [16.0, "garage"],
    [17.0, "kitchen"], [18.5, "living"], [23.0, "landing"], [23.05, "bedroom"]] },
  sam: { weekday: [[0, "bedroom"], [6.3, "ensuite"], [6.55, "wardrobe"], [6.7, "landing"], [6.75, "hall"], [6.8, "kitchen"],
    [7.45, "vestibule"], [7.55, "garage"], [7.65, "out"], [16.5, "garage"], [16.6, "vestibule"], [16.7, "cloakroom"], [16.8, "kitchen"],
    [18.5, "living"], [21.4, "bathroom"], [21.55, "living"], [23.0, "landing"], [23.05, "bedroom"]],
  weekend: [[0, "bedroom"], [8.0, "ensuite"], [8.3, "kitchen"], [11.0, "out"], [13.0, "kitchen"], [14.0, "living"], [19.0, "kitchen"],
    [20.0, "living"], [23.2, "landing"], [23.25, "bedroom"]] },
  kid: { weekday: [[0, "room3"], [7.0, "bath1"], [7.2, "room3"], [7.4, "landing"], [7.45, "hall"], [7.5, "kitchen"], [7.75, "vestibule"],
    [7.8, "out"], [14.4, "vestibule"], [14.5, "kitchen"], [14.9, "room3"], [18.5, "living"], [19.8, "bath1"], [20.2, "room3"]],
  weekend: [[0, "room3"], [8.0, "bath1"], [8.2, "kitchen"], [9.0, "living"], [11.0, "out"], [13.0, "kitchen"], [14.0, "room3"],
    [18.0, "living"], [20.3, "bath1"], [20.6, "room3"]] },
};
function roomOf(person, t) {
  const plan = PEOPLE[person][weekend(t) ? "weekend" : "weekday"], d = dayKey(t), h = hourOf(t);
  let room = plan[0][1];
  plan.forEach(([at, r], i) => { const j = i ? (rnd(hash(person), d * 50 + i) - 0.5) * 0.3 : 0; if (h >= at + j) room = r; });
  return room;
}
const peopleIn = (room, t) => Object.keys(PEOPLE).filter((p) => roomOf(p, t) === room).length;
const anyoneHome = (t) => Object.keys(PEOPLE).some((p) => roomOf(p, t) !== "out");
// moving about (a motion sensor): someone there and this minute is a moving one
const moving = (room, t, seed) => peopleIn(room, t) > 0 && rnd(seed, Math.floor(t / MIN)) < 0.55;

// ---- the weather ----------------------------------------------------------------------------------------
// a day's random part eased into the next one (no jump at midnight)
const daily = (seed, t) => { const f = hourOf(t) / 24, d = dayKey(t); return rnd(seed, d) * (1 - f) + rnd(seed, d + 1) * f; };
const cloud = (t) => Math.min(1, Math.max(0, daily(7, t) * 0.8 + 0.25 * Math.sin(t / (3 * H))));
function outsideTemp(t) {
  const season = 9 - 10 * Math.cos((2 * Math.PI * (doy(t) - 15)) / 365); // ~-1 in January, ~19 in July
  const wave = 4 * Math.sin(((hourOf(t) - 9) / 24) * 2 * Math.PI);
  return season + wave + (daily(11, t) - 0.5) * 4;
}
function solar(t) {
  const h = hourOf(t), a = sunrise(t), b = sunset(t);
  if (h <= a || h >= b) return 0;
  return Math.round(5200 * Math.sin((Math.PI * (h - a)) / (b - a)) * (1 - 0.75 * cloud(t)));
}

// ---- the model: which entity is what, in which room -------------------------------------------------------
function inventory(model) {
  const info = {}; // id -> { room, kind, list }
  const put = (id, extra) => { if (typeof id === "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(id)) info[id] = { ...(info[id] || {}), ...extra }; };
  for (const fl of [model, ...(model.floors || [])]) {
    for (const l of fl.lights || []) {
      if (l.type === "fixture") (l.circuits || []).forEach((c, i) => put(c.entity, { room: l.room, kind: "fixture", small: !!c.dim || i === 1 }));
      else put(l.entity, { room: l.room, kind: l.kind, outdoor: !!l.outdoor, watts: l.watts });
    }
    for (const d of fl.devices || []) {
      put(d.entity, { room: d.room, kind: d.kind || d.type });
      put(d.value_entity, { room: d.room, kind: "value" });
      put(d.contact, { room: d.room, kind: "contact" });
      for (const it of d.items || []) put(it.entity, { kind: it.kind });
      if (d.top) put(d.top.entity, { room: d.room, kind: d.top.kind });
    }
    for (const c of fl.climate || []) { put(c.temperature, { kind: "temperature" }); put(c.humidity, { kind: "humidity" }); }
    for (const c of fl.covers || []) put(c.entity, { kind: "cover" });
    for (const w of fl.walls || []) for (const o of w.openings || []) {
      for (const s of o.contacts || []) put(s, { kind: "contact" });
      if (o.entity) put(o.entity, { kind: o.type === "garage_door" ? "garage_door" : "opening" });
    }
    for (const r of fl.rooms || []) if (r.tint && r.tint.entity) put(r.tint.entity, { room: r.id });
  }
  for (const c of model.cameras || []) { put(c.entity, { kind: "camera", name: c.name }); put(c.entity_hq, { kind: "camera", name: c.name }); put(c.detect, { kind: "person" }); }
  for (const l of model.locks || []) put(l.entity, { kind: "lock" });
  // anything else in the model (labels of the washer, rack items...)
  (function walk(o) {
    if (typeof o === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(o) && !info[o]) info[o] = {}; return; }
    if (o && typeof o === "object") for (const v of Object.values(o)) walk(v);
  })(model);
  return info;
}
// a room name in an entity id ("climate.room_1", "sensor.kids_room_co2") -> the plan's room id
const ROOM_WORDS = [["bathroom_first_floor", "bath1"], ["first_floor_bath", "bath1"], ["en_suite", "ensuite"], ["kids_room", "room3"],
  ["kids", "room3"], ["room_1", "room1"], ["room1", "room1"], ["room_2", "room2"], ["room2", "room2"], ["room3", "room3"],
  ["living", "living"], ["dining", "living"], ["kitchen", "kitchen"], ["hall", "hall"], ["bathroom", "bathroom"], ["pantry", "pantry"],
  ["office", "office"], ["desk", "office"], ["cloakroom", "cloakroom"], ["vestibule", "vestibule"], ["utility", "utility"],
  ["garage", "garage"], ["landing", "landing"], ["stairs", "hall"], ["wardrobe", "wardrobe"], ["bedroom", "bedroom"], ["bedside", "bedroom"]];
const roomFromId = (id) => { const n = id.split(".")[1]; const w = ROOM_WORDS.find(([k]) => n.includes(k)); return w ? w[1] : null; };
// base temperature of a room (bedrooms cooler, bathrooms warmer)
const roomBase = (r) => ({ bedroom: 19.5, room1: 20.5, room2: 20.5, room3: 21, bathroom: 23, bath1: 23.5, ensuite: 23, garage: 12,
  utility: 18, pantry: 17, vestibule: 18.5, cloakroom: 19, wardrobe: 19.5, landing: 20.5, hall: 21 }[r] ?? 21.5);
const roomTemp = (r, t, seed) => roomBase(r) + 0.6 * Math.sin(((hourOf(t) - 15) / 24) * 2 * Math.PI) + (outsideTemp(t) - 8) * 0.05
  + (peopleIn(r, t) ? 0.3 : 0) + (rnd(seed, Math.floor(t / (20 * MIN))) - 0.5) * 0.2;

// what a lamp does by itself, before the night: by its name, else its room taken (when it is dark)
function lightRule(name, info, room, seed, jitter) {
  const on = (b, a = {}) => ({ s: b ? "on" : "off", a });
  if (info.outdoor || /porch|terrace|garden|driveway|garage_front|balcony/.test(name)) return (t) => on(dark(t, 0) && within(hourOf(t), sunset(t) + 0.1, 22.9 + jitter(t, 1, 0.2)));
  if (/star/.test(name)) return (t) => on(within(hourOf(t), 19.9 + jitter(t, 1, 0.2), 21.3 + jitter(t, 2, 0.3)), { brightness: 60 });
  if (/night/.test(name)) return (t) => on(within(hourOf(t), 19.8 + jitter(t, 1), 6.8), { brightness: 40 });
  if (/tv_backlight/.test(name)) return (t) => on(within(hourOf(t), 20 + jitter(t, 2), 22.4 + jitter(t, 3)), { brightness: 120 });
  if (/reading/.test(name)) return (t) => on(dark(t) && within(hourOf(t), 19 + jitter(t, 2), 21.5) && peopleIn("living", t) > 0, { brightness: 180 });
  if (/dining_table_small/.test(name)) return (t) => on(dark(t, 1) && within(hourOf(t), 18.3, 19.2 + jitter(t, 4, 0.2)) && anyoneHome(t));
  if (/dining_table$/.test(name)) return (t) => on(dark(t, 1) && weekend(t) && within(hourOf(t), 19, 20));
  if (/living_room_small/.test(name)) return (t) => on(dark(t, 1) && within(hourOf(t), 19.2, 22.5) && peopleIn("living", t) > 0);
  if (/living_room$/.test(name)) return (t) => on(dark(t, 1) && within(hourOf(t), 18.5, 19.4) && peopleIn("living", t) > 0);
  if (/fireplace/.test(name)) return (t) => on(dark(t) && within(hourOf(t), 20.5, 22.3) && weekend(t), { brightness: 150 });
  if (/kitchen_counter|kitchen_island/.test(name)) return (t) => on(dark(t, 0.8) && peopleIn("kitchen", t) > 0);
  if (/mirror/.test(name)) return (t) => on(peopleIn(room, t) > 0 && dark(t, 1.5));
  if (/stairs|landing/.test(name)) return (t) => on(dark(t, 1) && (moving("hall", t, seed) || moving("landing", t, seed) || within(hourOf(t), 21.8, 22.6)));
  if (/headboard|bedside/.test(name)) return (t) => on(within(hourOf(t), 22.4, 23.3 + jitter(t, 5)), { brightness: 110 });
  if (/desk/.test(name)) return (t) => on(peopleIn(room || "office", t) > 0 && (dark(t, 1.5) || cloud(t) > 0.7), { brightness: 200 });
  if (/wardrobe|cloakroom|pantry|utility|garage/.test(name)) return (t) => on(moving(room || "garage", t, seed) && (dark(t, 2) || /wardrobe|pantry|garage|utility/.test(name)));
  return (t) => on(room ? peopleIn(room, t) > 0 && dark(t, 0.8) : false);
}

// ---- what an entity is doing at time t, by itself -----------------------------------------------------------
function scheduleOf(id, info) {
  const [domain, name] = id.split(".");
  const seed = hash(id), room = info.room || roomFromId(id);
  const st = (s, a = {}) => ({ s, a });
  const on = (b, a) => st(b ? "on" : "off", a);
  const days = (t) => dayKey(t);
  const jitter = (t, k, span = 0.4) => (rnd(seed, days(t) * 10 + k) - 0.5) * span;
  if (domain === "light") {
    const f = lightRule(name, info, room, seed, jitter);
    // lights go out for the night (23:00-6:00), the night lights stay; asleep in a bedroom = its lamps off
    const asleep = (t) => (room === "bedroom" && !within(hourOf(t), 6.2, 23.0)) || (room === "room3" && !within(hourOf(t), 6.9, 20.5));
    if (/night/.test(name)) return f;
    return (t) => (within(hourOf(t), 23.0, 6.0) || asleep(t) ? on(false) : f(t));
  }
  if (domain === "cover") {
    if (/skylight/.test(name)) return (t) => { const c = cloud(t) > 0.85 && within(hourOf(t), 12, 15); return st(c ? "closed" : "open", { current_position: c ? 0 : 100 }); };
    if (/garage/.test(name)) return (t) => { const o = [7.5, 16.45].some((h) => within(hourOf(t), h, h + 0.12)) && !weekend(t); return st(o ? "open" : "closed", { current_position: o ? 100 : 0 }); };
    return (t) => {
      const h = hourOf(t), up = (weekend(t) ? 8.3 : 6.9) + jitter(t, 1, 0.3), down = sunset(t) + 0.2 + jitter(t, 2, 0.3);
      // the sunny side half down at midday in summer
      const half = /living|dining/.test(name) && cloud(t) < 0.3 && within(h, 12, 15.5) && outsideTemp(t) > 20;
      const p = within(h, up, down) ? (half ? 40 : 100) : 0;
      return st(p ? "open" : "closed", { current_position: p });
    };
  }
  if (domain === "binary_sensor") {
    if (/smoke|leak|_co$|gas|fault/.test(name)) return () => on(false);
    if (/presence/.test(name)) return (t) => on(peopleIn(room, t) > 0);
    if (/motion/.test(name)) return (t) => on(moving(room, t, seed));
    if (/person/.test(name)) return (t) => on([7.45, 7.75, 14.4, 16.5].some((h) => within(hourOf(t), h, h + 0.05)) && !weekend(t));
    if (/doorbell/.test(name)) return (t) => on(within(hourOf(t), 11.3 + jitter(t, 1), 11.31 + jitter(t, 1)) && rnd(seed, days(t)) < 0.6);
    if (/mailbox/.test(name)) return (t) => on(within(hourOf(t), 10.2 + jitter(t, 1), 10.22 + jitter(t, 1)));
    if (/rain/.test(name)) return (t) => on(cloud(t) > 0.9);
    if (/internet|zigbee/.test(name)) return () => on(true);
    if (/fridge_door/.test(name)) return (t) => on([7.1, 13.0, 17.4, 18.3].some((h) => within(hourOf(t), h + jitter(t, h * 10, 0.2), h + jitter(t, h * 10, 0.2) + 0.02)));
    if (/dishwasher/.test(name)) return (t) => on(within(hourOf(t), 21.3, 23.0));
    if (/oven|cooktop/.test(name)) return (t) => on(within(hourOf(t), 17.4 + jitter(t, 1, 0.2), 18.1) || (/cooktop/.test(name) && within(hourOf(t), 7.05, 7.2)));
    if (/washer/.test(name)) return (t) => on(within(hourOf(t), 9.0, 10.5) && days(t) % 2 === 0);
    if (/window/.test(name)) return (t) => on((/bath/.test(name) && within(hourOf(t), 7.2, 7.5)) || (/kitchen/.test(name) && within(hourOf(t), 18.0, 18.3)));
    if (/door/.test(name)) return (t) => on(moving(room, t, seed) && rnd(seed, Math.floor(t / MIN) + 7) < 0.3);
    return (t) => on(rnd(seed, Math.floor(t / (30 * MIN))) < 0.2);
  }
  if (domain === "sensor") {
    const num = (v, unit, device_class, extra = {}) => st(String(v), { unit_of_measurement: unit, device_class, state_class: "measurement", ...extra });
    if (/outside_temp|terrace_temp/.test(name)) return (t) => num(outsideTemp(t).toFixed(1), "°C", "temperature");
    if (/outside_hum/.test(name)) return (t) => num(Math.round(70 + 20 * Math.cos(((hourOf(t) - 5) / 24) * 2 * Math.PI) * 0.6), "%", "humidity");
    if (/hot_water/.test(name)) return (t) => num((52 - (within(hourOf(t), 6.5, 7.5) || within(hourOf(t), 21.3, 22) ? 9 : 0) + Math.sin(t / H) * 1.5).toFixed(1), "°C", "temperature");
    if (/temperature/.test(name)) return (t) => num(roomTemp(room, t, seed).toFixed(1), "°C", "temperature");
    if (/humidity/.test(name)) return (t) => num(Math.round(45 + (/bath|ensuite/.test(room || "") && peopleIn(room, t) ? 22 : 0) + 4 * Math.sin(t / (5 * H) + seed)), "%", "humidity");
    if (/co2/.test(name)) return (t) => num(Math.round(450 + 380 * Math.min(3, peopleIn(room, t)) + 60 * Math.sin(t / H + seed)), "ppm", "carbon_dioxide");
    if (/illuminance/.test(name)) return (t) => num(Math.round(solar(t) / 8 + (dark(t) ? 2 : 40)), "lx", "illuminance");
    if (/solar/.test(name)) return (t) => num(solar(t), "W", "power");
    if (/home_battery|ups_battery/.test(name)) return (t) => num(Math.round(/ups/.test(name) ? 100 : 30 + 60 * Math.max(0, Math.sin(((hourOf(t) - 9) / 24) * 2 * Math.PI))), "%", "battery");
    if (/ev_charger/.test(name)) return (t) => num(within(hourOf(t), 22.5, 3.5) && days(t) % 3 === 0 ? 7400 : 0, "W", "power");
    if (/dehumidifier_power/.test(name)) return (t) => num(within(hourOf(t), 8, 12) ? Math.round(230 + 20 * rnd(seed, Math.floor(t / (5 * MIN)))) : 0.4, "W", "power");
    if (/desk_pc_power|desk_power/.test(name)) return (t) => num(peopleIn(room || "office", t) ? Math.round(95 + 40 * rnd(seed, Math.floor(t / (5 * MIN)))) : 2, "W", "power");
    if (/house_power/.test(name)) return (t) => num(Math.round(280 + (within(hourOf(t), 17.4, 18.1) ? 2100 : 0) + (within(hourOf(t), 21.3, 23) ? 1200 : 0) + 160 * rnd(seed, Math.floor(t / (5 * MIN)))), "W", "power");
    if (/poe_power/.test(name)) return (t) => num((28 + (dark(t) ? 8 : 0)).toFixed(1), "W", "power");
    if (/clients/.test(name)) return (t) => num(anyoneHome(t) ? 9 + Math.round(4 * rnd(seed, Math.floor(t / H))) : 4, "clients");
    if (/nas_volume/.test(name)) return (t) => num((61 + (t % (90 * DAY)) / (90 * DAY) * 3).toFixed(1), "%");
    if (/energy/.test(name)) return (t) => st(((t - Date.UTC(2026, 0, 1)) / H * 0.018).toFixed(2), { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" });
    if (/waste/.test(name)) return (t) => { const d = new Date(dayStart(t)); d.setDate(d.getDate() + ((9 - d.getDay()) % 7 || 7)); return st(d.toISOString().slice(0, 10), { device_class: "date" }); };
    if (/_(state)$/.test(name)) { const w = /washer/.test(name); return (t) => st(washerOn(t, w) ? "run" : "stop"); }
    if (/_(job)$/.test(name)) { const w = /washer/.test(name); return (t) => st(washerOn(t, w) ? (hourOf(t) % 1 < 0.5 ? "wash" : "rinse") : "finished"); }
    if (/_(end)$/.test(name)) { const w = /washer/.test(name); return (t) => st(washerOn(t, w) ? new Date(dayStart(t) + (w ? 10.5 : 12) * H).toISOString() : "unknown", { device_class: "timestamp" }); }
    return (t) => num(Math.round(10 + 5 * Math.sin(t / H + seed)), "");
  }
  if (domain === "climate") {
    const target = /bath|ensuite/.test(name) ? 23 : /bedroom/.test(name) ? 19.5 : /garage/.test(name) ? 10 : 21;
    // the A/C: cools on hot afternoons, warms the room up on cold evenings (as a heat pump)
    if (/_ac$/.test(name)) return (t) => {
      const hot = outsideTemp(t) > 24, cold = outsideTemp(t) < 12, home = peopleIn(room, t) > 0, h = hourOf(t);
      const mode = hot && home ? "cool" : cold && home && within(h, 17.5, 20.5) ? "heat" : "off";
      const cur = Number((roomTemp(room, t, seed) - (mode === "heat" ? 0.4 : 0)).toFixed(1));
      return st(mode, { hvac_modes: ["off", "cool", "heat", "dry", "fan_only"], temperature: 23, current_temperature: cur,
        hvac_action: mode === "cool" ? "cooling" : mode === "heat" ? (h < 19.8 + jitter(t, 3, 0.3) ? "heating" : "idle") : "off", min_temp: 16, max_temp: 30, target_temp_step: 0.5 });
    };
    return (t) => {
      const cur = Number(roomTemp(room, t, seed).toFixed(1)), night = within(hourOf(t), 22.5, 6), want = target - (night ? 1 : 0);
      return st("heat", { hvac_modes: ["off", "heat"], temperature: want, current_temperature: cur, hvac_action: cur < want - 0.15 ? "heating" : "idle", min_temp: 5, max_temp: 30, target_temp_step: 0.5 });
    };
  }
  if (domain === "media_player") {
    if (/tv|soundbar/.test(name)) return (t) => st(within(hourOf(t), 20 + jitter(t, 1), 22.4) && peopleIn("living", t) ? "playing" : "off", { volume_level: 0.3, media_title: "Evening news" });
    if (/kitchen/.test(name)) return (t) => st(within(hourOf(t), 7.0, 7.7) ? "playing" : "idle", { volume_level: 0.2, media_title: "Morning radio" });
    if (/kids/.test(name)) return (t) => st(within(hourOf(t), 20.2, 20.6) ? "playing" : "idle", { volume_level: 0.15, media_title: "Bedtime story" });
    return (t) => st(within(hourOf(t), 22.4, 22.9) ? "playing" : "idle", { volume_level: 0.2, media_title: "Rain sounds" });
  }
  if (domain === "lock") return (t) => st(within(hourOf(t), 7.4, 7.85) || within(hourOf(t), 14.35, 14.5) || within(hourOf(t), 16.45, 16.75) ? "unlocked" : "locked");
  if (domain === "switch") {
    if (/coffee/.test(name)) return (t) => on(within(hourOf(t), 6.75, 7.2) || within(hourOf(t), 13.0, 13.2));
    if (/irrigation/.test(name)) return (t) => on(within(hourOf(t), 5.0, 5.3) && outsideTemp(t) > 12);
    if (/pool/.test(name)) return (t) => on(within(hourOf(t), 10, 16) && outsideTemp(t) > 15);
    if (/desk/.test(name)) return (t) => on(peopleIn(room || "office", t) > 0);
    return (t) => on(within(hourOf(t), 8, 12));
  }
  if (domain === "fan") return (t) => on(/ventilation/.test(name) || (/purifier/.test(name) && anyoneHome(t)) || (/office/.test(name) && outsideTemp(t) > 22), { percentage: /ventilation/.test(name) ? (within(hourOf(t), 17, 20) ? 70 : 40) : 50 });
  if (domain === "humidifier") return (t) => on(within(hourOf(t), 20, 7), { humidity: 50 });
  if (domain === "vacuum") return (t) => st(within(hourOf(t), 10.0, 10.8) && !weekend(t) ? "cleaning" : "docked", { battery_level: 90 });
  if (domain === "lawn_mower") return (t) => st(within(hourOf(t), 11, 13) && outsideTemp(t) > 10 && cloud(t) < 0.8 && days(t) % 3 === 1 ? "mowing" : "docked");
  // a boiler: showers in the morning and the evening cool the water, the boiler brings it back in about an hour
  if (domain === "water_heater") return (t) => {
    const h = hourOf(t), dip = (a) => (h >= a && h < a + 1.4 ? (h < a + 0.4 ? (h - a) / 0.4 : 1 - (h - a - 0.4)) * 10 : 0);
    return st("eco", { temperature: 55, operation_list: ["eco", "performance", "off"],
      current_temperature: Number((54.5 - Math.max(dip(6.4), dip(21.2)) + 0.4 * Math.sin(t / H)).toFixed(1)) });
  };
  if (domain === "valve") return () => st("open", { current_position: 100 });
  if (domain === "alarm_control_panel") return (t) => st(!anyoneHome(t) ? "armed_away" : within(hourOf(t), 23.3, 6.2) ? "armed_night" : "disarmed");
  if (domain === "siren") return () => on(false);
  if (domain === "weather") return (t) => {
    const c = cloud(t), cond = c > 0.9 ? "rainy" : c > 0.65 ? "cloudy" : c > 0.35 ? "partlycloudy" : dark(t, 0) ? "clear-night" : "sunny";
    return st(cond, { temperature: Number(outsideTemp(t).toFixed(1)), humidity: 72, cloud_coverage: Math.round(c * 100), wind_speed: 11, temperature_unit: "°C" });
  };
  if (domain === "camera") return () => st("streaming", { frontend_stream_type: "hls" });
  // a button: pressed on the way out in the morning and back in the afternoon; its state = when it was last pressed
  if (domain === "event") return (t) => {
    const presses = [-1, 0].flatMap((d) => [7.7, 16.6].map((h) => dayStart(t) + d * DAY + (h + jitter(t + d * DAY, h * 10, 0.2)) * H)).filter((x) => x <= t);
    return st(new Date(Math.max(...presses)).toISOString().replace(/\.\d+Z$/, ".000Z"), { event_type: "single_press", device_class: "button" });
  };
  return () => st("on");
}
// the washer runs every other morning, the dryer after it
function washerOn(t, washer) {
  if (dayKey(t) % 2) return false;
  return washer ? within(hourOf(t), 9.0, 10.5) : within(hourOf(t), 10.6, 12.0);
}

// ---- the demo itself ---------------------------------------------------------------------------------------
export function createDemo(model, { lang = "en" } = {}) {
  const info = inventory(model);
  const ids = Object.keys(info);
  const sched = Object.fromEntries(ids.map((id) => [id, scheduleOf(id, info[id])]));
  let names = {};
  const nameAll = () => { names = Object.fromEntries(ids.map((id) => [id, nameIn(lang, info[id].name || human(id))])); };
  nameAll();
  // the visitor's own changes: id -> { s, a, t, base } (base: what the house said then - when that changes, the house takes over)
  let mem = load();
  function load() {
    try { const m = JSON.parse(localStorage.getItem(STORE) || "null"); if (m && m.over && m.log) return m; } catch { /* private mode */ }
    return { over: {}, log: [], started: Date.now() };
  }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(mem)); } catch { /* private mode */ } };
  const transient = {}; // id -> { s, a, until } (a cover moving, an alarm set off for a while)

  // a plug's power (sensor.x_power) follows its switch (switch.x) - also when the visitor switched it
  const follows = {};
  for (const id of ids) { const m = id.match(/^sensor\.(.+)_power$/); if (m && sched["switch." + m[1]]) follows[id] = "switch." + m[1]; }
  const PLUG_W = { dehumidifier: 240, desk_pc: 110, room_1_desk: 60, coffee_machine: 1350 };
  const baseState = (id, t) => sched[id](t);
  function current(id, t) {
    if (follows[id]) {
      const on = current(follows[id], t).s === "on", base = baseState(id, t);
      const w = on ? (Number(base.s) > 5 ? Number(base.s) : PLUG_W[follows[id].split(".")[1]] || 100) : 0.4;
      return { s: String(w), a: base.a };
    }
    const tr = transient[id];
    if (tr && tr.until > t) return { s: tr.s, a: { ...baseState(id, t).a, ...tr.a } };
    const o = mem.over[id];
    if (o) {
      const b = baseState(id, t);
      // the house moved on (a light its schedule turns off, a cover at sunset): the visitor's change gives way
      if (b.s !== o.base) { endOverride(id, t); return b; }
      return { s: o.s, a: { ...b.a, ...o.a } };
    }
    return baseState(id, t);
  }
  function endOverride(id, t) {
    const last = mem.log.findLast((x) => x.id === id && x.to === null);
    if (last) last.to = t;
    delete mem.over[id];
    save();
  }
  function setOverride(id, s, a = {}) {
    const t = Date.now(), b = baseState(id, t);
    const o = mem.over[id];
    if (o) { const last = mem.log.findLast((x) => x.id === id && x.to === null); if (last) last.to = t; }
    if (b.s === s && !Object.keys(a).some((k) => JSON.stringify(a[k]) !== JSON.stringify(b.a[k]))) delete mem.over[id];
    else { mem.over[id] = { s, a, t, base: b.s }; mem.log.push({ id, from: t, to: null, s, a }); }
    if (mem.log.length > 4000) mem.log = mem.log.slice(-3000);
    save();
  }

  // ---- hass ----
  const listeners = new Set();
  let hass = null, lastChanged = {};
  function build() {
    const t = Date.now(), states = {};
    for (const id of ids) {
      const c = current(id, t);
      const prev = hass && hass.states[id];
      const same = prev && prev.state === c.s && JSON.stringify(prev.attributes) === JSON.stringify({ friendly_name: names[id], ...c.a });
      if (same) { states[id] = prev; continue; }
      if (!prev) lastChanged[id] = lastChangeOf(id, t);
      else if (prev.state !== c.s) lastChanged[id] = new Date(t).toISOString();
      states[id] = { entity_id: id, state: c.s, attributes: { friendly_name: names[id], ...c.a },
        last_changed: lastChanged[id] || new Date(t - 3 * H).toISOString(), last_updated: new Date(t).toISOString(), context: { id: "demo" } };
    }
    hass = { ...api, states, language: lang, locale: { language: lang, number_format: "language", time_format: "24" },
      config: { latitude: 49.82, longitude: 19.04, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone, unit_system: { temperature: "°C" }, currency: "EUR" },
      user: { id: "demo", name: "Demo", is_admin: false }, themes: { darkMode: true } };
    for (const f of listeners) f(hass);
  }
  const subs = new Set(); // entity-insights' "subscribe_entities"

  // ---- services ----
  const serviceListeners = new Set();
  function callService(domain, service, data = {}) {
    const list = [].concat(data.entity_id || []);
    for (const f of serviceListeners) try { f(domain, service, list); } catch { /* a listener's own problem */ }
    for (const id of list) serviceOne(id.split(".")[0] === domain || domain === "homeassistant" ? id.split(".")[0] : domain, service, id, data);
    build();
    for (const f of subs) setTimeout(f, 50);
    return Promise.resolve();
  }
  function serviceOne(domain, service, id, data) {
    const t = Date.now(), c = current(id, t);
    const isOn = !["off", "closed", "locked", "idle", "docked", "standby", "unavailable"].includes(c.s);
    if (service === "toggle") service = domain === "cover" ? (c.s === "opening" || c.s === "closing" ? "stop_cover" : (c.a.current_position ?? (c.s === "open" ? 100 : 0)) > 0 ? "close_cover" : "open_cover")
      : domain === "lock" ? (c.s === "locked" ? "unlock" : "lock") : isOn ? "turn_off" : "turn_on";
    if (domain === "light") {
      if (service === "turn_off") return setOverride(id, "off");
      const a = {};
      if (data.brightness !== undefined) a.brightness = data.brightness;
      if (data.brightness_pct !== undefined) a.brightness = Math.round(data.brightness_pct * 2.55);
      return setOverride(id, "on", a.brightness !== undefined ? a : { brightness: c.s === "on" ? c.a.brightness ?? 255 : 255 });
    }
    if (domain === "cover") {
      const from = c.a.current_position ?? (c.s === "open" ? 100 : 0);
      let to = service === "open_cover" ? 100 : service === "close_cover" ? 0 : service === "set_cover_position" ? Number(data.position) : null;
      if (service === "stop_cover") { const tr = transient[id]; delete transient[id]; clearInterval(moves[id]); const p = tr ? tr.a.current_position : from; return setOverride(id, p > 0 ? "open" : "closed", { current_position: p }); }
      if (to === null || !Number.isFinite(to)) return;
      return moveCover(id, from, to);
    }
    if (domain === "lock") return setOverride(id, service === "lock" ? "locked" : "unlocked");
    if (domain === "climate") {
      if (service === "set_temperature") return setOverride(id, data.hvac_mode || c.s, { temperature: Number(data.temperature) });
      if (service === "set_hvac_mode") return setOverride(id, data.hvac_mode, data.hvac_mode === "off" ? { hvac_action: "off" } : {});
      if (service === "turn_off") return setOverride(id, "off", { hvac_action: "off" });
      if (service === "turn_on") return setOverride(id, /_ac$/.test(id) ? "cool" : "heat");
      return;
    }
    if (domain === "media_player") {
      if (service === "volume_set") return setOverride(id, c.s, { volume_level: Number(data.volume_level) });
      if (service === "media_pause") return setOverride(id, "paused");
      return setOverride(id, service === "turn_off" || service === "media_stop" ? (/tv|soundbar/.test(id) ? "off" : "idle") : "playing");
    }
    if (domain === "fan" && service === "set_percentage") return setOverride(id, Number(data.percentage) > 0 ? "on" : "off", { percentage: Number(data.percentage) });
    if (domain === "humidifier" && service === "set_humidity") return setOverride(id, c.s, { humidity: Number(data.humidity) });
    if (domain === "vacuum") return setOverride(id, service === "start" || service === "turn_on" ? "cleaning" : "docked");
    if (domain === "lawn_mower") return setOverride(id, service === "start_mowing" || service === "turn_on" ? "mowing" : "docked");
    if (domain === "valve") return setOverride(id, service === "close_valve" || service === "turn_off" ? "closed" : "open", { current_position: service === "close_valve" || service === "turn_off" ? 0 : 100 });
    if (domain === "alarm_control_panel") return setOverride(id, { alarm_disarm: "disarmed", alarm_arm_home: "armed_home", alarm_arm_away: "armed_away", alarm_arm_night: "armed_night" }[service] || c.s);
    if (domain === "water_heater") return setOverride(id, data.operation_mode || c.s, data.temperature !== undefined ? { temperature: Number(data.temperature) } : {});
    if (["switch", "fan", "humidifier", "siren", "input_boolean"].includes(domain)) return setOverride(id, service === "turn_off" ? "off" : "on");
  }
  const moves = {};
  function moveCover(id, from, to) {
    clearInterval(moves[id]);
    if (from === to) return setOverride(id, to > 0 ? "open" : "closed", { current_position: to });
    let p = from;
    const dir = to > from ? 1 : -1;
    const step = () => {
      p = Math.max(Math.min(p + dir * 5, Math.max(from, to)), Math.min(from, to));
      if (p === to) { clearInterval(moves[id]); delete transient[id]; setOverride(id, to > 0 ? "open" : "closed", { current_position: to }); }
      else transient[id] = { s: dir > 0 ? "opening" : "closing", a: { current_position: Math.round(p) }, until: Date.now() + 5000 };
      build();
    };
    transient[id] = { s: dir > 0 ? "opening" : "closing", a: { current_position: from }, until: Date.now() + 5000 };
    moves[id] = setInterval(step, 400);
  }

  // when the state last changed, looking back through the day plan (up to two days)
  function lastChangeOf(id, t) {
    const now = current(id, t).s, step = id.startsWith("sensor.") || id.startsWith("weather.") ? 10 * MIN : 2 * MIN;
    for (let u = t - step; u > t - 2 * DAY; u -= step) if (baseState(id, u).s !== now) return new Date(u + step).toISOString();
    return new Date(t - 2 * DAY).toISOString();
  }

  // ---- history and statistics from the same day plan (+ what the visitor did) ----
  function rowsOf(id, a, b, attrs) {
    const step = id.startsWith("sensor.") || id.startsWith("climate.") || id.startsWith("weather.") ? 10 * MIN : 2 * MIN;
    const out = [];
    let last = null;
    const push = (t, c) => {
      const key = c.s + (attrs ? JSON.stringify(c.a) : "");
      if (key === last) return;
      last = key;
      out.push(attrs ? { s: c.s, a: { friendly_name: names[id], ...c.a }, lu: t / 1000 } : { s: c.s, lu: t / 1000 });
    };
    const spans = mem.log.filter((x) => x.id === id && x.from < b && (x.to === null || x.to > a));
    const at = (t) => { const sp = spans.findLast((x) => x.from <= t && (x.to === null || x.to > t)); const base = baseState(id, t); return sp ? { s: sp.s, a: { ...base.a, ...sp.a } } : base; };
    for (let t = a - (a % step); t < b; t += step) push(Math.max(t, a), at(Math.max(t, a)));
    for (const sp of spans) { if (sp.from >= a) push(sp.from, at(sp.from)); }
    out.sort((x, y) => x.lu - y.lu);
    // a recent change of the visitor shows at once
    const now = current(id, Math.min(b, Date.now()));
    if (b >= Date.now() - MIN) push(Math.min(b, Date.now()), now);
    return out;
  }
  function statistics(m) {
    const a = Date.parse(m.start_time), b = Date.parse(m.end_time || new Date().toISOString());
    const per = { "5minute": 5 * MIN, hour: H, day: DAY, week: 7 * DAY, month: 30 * DAY }[m.period] || H;
    const out = {};
    for (const id of m.statistic_ids || []) {
      if (!sched[id]) continue;
      const rows = [];
      for (let t = a - (a % per); t < b; t += per) {
        const vals = [];
        for (let u = t; u < t + per; u += Math.max(per / 24, 10 * MIN)) { const v = Number(baseState(id, u).s); if (Number.isFinite(v)) vals.push(v); }
        if (!vals.length) continue;
        const mean = vals.reduce((x, y) => x + y, 0) / vals.length;
        const first = vals[0], lastV = vals[vals.length - 1];
        rows.push({ start: t, end: t + per, mean, min: Math.min(...vals), max: Math.max(...vals), state: lastV, sum: lastV, change: lastV - first });
      }
      out[id] = rows;
    }
    return out;
  }
  const api = {
    callService,
    callWS: async (m) => {
      if (m.type === "history/history_during_period") {
        const a = Date.parse(m.start_time), b = Date.parse(m.end_time || new Date().toISOString()), out = {};
        for (const id of m.entity_ids || []) if (sched[id]) out[id] = rowsOf(id, a, b, m.no_attributes === false);
        return out;
      }
      if (m.type === "recorder/statistics_during_period") return statistics(m);
      if (m.type === "logbook/get_events") return [];
      if (m.type === "auth/current_user") return { id: "demo", name: "Demo", is_admin: false };
      throw Object.assign(new Error("not in the demo: " + m.type), { code: "unknown_command" });
    },
    callApi: async () => { throw Object.assign(new Error("not found"), { status_code: 404 }); },
    connection: {
      subscribeEvents: async () => () => {},
      subscribeMessage: async (cb) => { const f = () => cb({}); subs.add(f); cb({}); return () => subs.delete(f); },
    },
  };

  // set off something for a while (the page's buttons)
  function trigger(what) {
    const now = Date.now(), set = (id, s, ms, a = {}) => { if (sched[id]) transient[id] = { s, a, until: now + ms }; };
    if (what === "doorbell") { set("binary_sensor.doorbell", "on", 6000); set("binary_sensor.front_door_person", "on", 40000); }
    // an alarm stays on until it is turned off again (a second press)
    const alarm = (id) => { if (!id) return; if (transient[id] && transient[id].until > now) delete transient[id]; else set(id, "on", 24 * H); };
    if (what === "smoke") alarm(ids.find((x) => /kitchen_smoke$/.test(x)) || ids.find((x) => /_smoke$/.test(x)));
    if (what === "leak") alarm(ids.find((x) => /^binary_sensor\.bathroom_leak$/.test(x)) || ids.find((x) => /_leak$/.test(x)));
    if (what === "motion") {
      const ms = ids.filter((x) => /_motion$/.test(x)), on = ms.some((id) => transient[id] && transient[id].until > now);
      for (const id of ms) { if (on) delete transient[id]; else set(id, "on", 24 * H); }
    }
    build();
    setTimeout(build, 6100); setTimeout(build, 30100); setTimeout(build, 40100);
  }
  function reset() { mem = { over: {}, log: [], started: Date.now() }; save(); for (const k of Object.keys(transient)) delete transient[k]; build(); }

  build();
  setInterval(build, 5000);
  return {
    get hass() { return hass; },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    onService(f) { serviceListeners.add(f); return () => serviceListeners.delete(f); },
    callService, trigger, reset,
    // an alarm set off from the page, still on
    active(what) {
      const id = what === "smoke" ? ids.find((x) => /kitchen_smoke$/.test(x)) || ids.find((x) => /_smoke$/.test(x))
        : what === "leak" ? ids.find((x) => /^binary_sensor\.bathroom_leak$/.test(x)) || ids.find((x) => /_leak$/.test(x)) : null;
      if (what === "motion") return ids.some((x) => /_motion$/.test(x) && transient[x] && transient[x].until > Date.now());
      return !!(id && transient[id] && transient[id].until > Date.now());
    },
    changedByVisitor: () => Object.keys(mem.over).length,
    setLanguage(l) { lang = l; nameAll(); build(); },
  };
}
