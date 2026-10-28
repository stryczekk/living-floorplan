// The trail of movement: where motion and presence sensors fired in the last
// minutes, joined in the order it happened, fading with age.

const ACTIVE = new Set(["on", "detected", "presence", "move", "moving", "motion", "occupied", "home", "true"]);
export const isMotion = (s) => ACTIVE.has(String(s).toLowerCase());

// Moments a sensor became active within [t - windowMs, t]: from rows [{ t, state }] sorted by time.
export function activations(rows, t, windowMs) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.t > t) break;
    const was = i > 0 && isMotion(rows[i - 1].state);
    if (isMotion(r.state) && !was && r.t >= t - windowMs) out.push(r.t);
  }
  // still active from before the window: counts as now-ish, at the window start
  const last = rows.filter((r) => r.t <= t).pop();
  if (last && isMotion(last.state) && !out.length && last.t < t - windowMs) out.push(t - windowMs);
  return out;
}

const f1 = (v) => Math.round(v * 10) / 10;

// SVG of the trail: segments between consecutive activations and a dot per
// activation, opacity 1 for now down to 0.1 at the edge of the window.
export function trailLayer(devices, rowsOf, t, windowMs = 30 * 60e3) {
  const events = [];
  for (const d of devices) {
    if (!d.at || !d.entity) continue;
    for (const at of activations(rowsOf(d.entity) || [], t, windowMs)) events.push({ t: at, x: d.at[0], y: d.at[1] });
  }
  events.sort((a, b) => a.t - b.t);
  const op = (tt) => Math.max(0.1, 1 - (t - tt) / windowMs).toFixed(2);
  const parts = [];
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1], b = events[i];
    if (a.x === b.x && a.y === b.y) continue;
    parts.push(`<line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke-opacity="${op(b.t)}"/>`);
  }
  for (const e of events) parts.push(`<circle cx="${f1(e.x)}" cy="${f1(e.y)}" r="5" fill-opacity="${op(e.t)}"/>`);
  return `<g id="fc-trail" pointer-events="none" fill="#4fc3f7" stroke="#4fc3f7" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 6">${parts.join("")}</g>`;
}
