// Long history through the InfluxDB Proxy integration
// (https://github.com/stryczekk/ha-influx-proxy): months back instead of the
// recorder's 10 days. Rows come back in the timeline's own format.

const STATE_BATCH = 40;   // the proxy's limit per /states request
const SERIES_BATCH = 12;  // and per /series request

// Whether the proxy is there: a tiny /states request (404 = never set up).
export async function hasProxy(hass) {
  try {
    await hass.callApi("GET", "influx_proxy/states?entities=sun.sun&days=0.01");
    return true;
  } catch (e) {
    return false;
  }
}

const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

// A numeric sensor goes through /series (hourly means), the rest through /states.
export function isNumericSensor(id, state) {
  if (!id.startsWith("sensor.")) return false;
  return !!(state && (state.attributes && state.attributes.unit_of_measurement || (state.state !== "" && !isNaN(Number(state.state)))));
}

// /states rows [time_ms, state, ...attributes] -> [{ t, state, attributes }]
export function fromStates(rows, attrNames) {
  return (rows || []).map((r) => {
    const attributes = {};
    attrNames.forEach((a, i) => { if (r[2 + i] !== null && r[2 + i] !== undefined) attributes[a] = r[2 + i]; });
    return { t: r[0], state: String(r[1]), attributes };
  });
}

// /series points {start, mean} -> [{ t, state }] (the mean as the state)
export function fromSeries(points) {
  return (points || []).filter((p) => p.mean !== null && p.mean !== undefined)
    .map((p) => ({ t: p.start, state: String(Math.round(p.mean * 10) / 10), attributes: {} }));
}

// History of `ids` in [start, end] (ms) -> { id: [{ t, state, attributes }] }.
export async function proxyHistory(hass, ids, start, end) {
  const numeric = ids.filter((id) => isNumericSensor(id, hass.states[id]));
  const other = ids.filter((id) => !numeric.includes(id));
  const attrs = ["brightness", "current_position"];
  const out = {};
  const q = (path, list, extra = "") => hass.callApi("GET", `influx_proxy/${path}?entities=${list.map(encodeURIComponent).join(",")}` +
    `&start=${Math.round(start)}&end=${Math.round(end)}${extra}`);
  const jobs = [
    ...chunks(other, STATE_BATCH).map((list) => q("states", list, "&attributes=" + attrs.join(","))
      .then((r) => { for (const [id, rows] of Object.entries(r || {})) out[id] = fromStates(rows, attrs); })),
    ...chunks(numeric, SERIES_BATCH).map((list) => q("series", list)
      .then((r) => { for (const [id, pts] of Object.entries(r || {})) out[id] = fromSeries(pts); })),
  ];
  const res = await Promise.allSettled(jobs);
  if (res.every((r) => r.status === "rejected") && jobs.length) throw res[0].reason;
  for (const rows of Object.values(out)) rows.sort((a, b) => a.t - b.t);
  return out;
}
