// Sun through the windows: where the sun is (from the home's latitude and
// longitude and the time) and the patch of sunlight each sunlit window throws
// on the floor, clipped to its room.

const RAD = Math.PI / 180;

// Sun position (the SunCalc formulas): azimuth in degrees from north,
// clockwise; elevation in degrees above the horizon.
export function sunPosition(date, lat, lon) {
  const d = date.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const e = RAD * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = RAD * -lon, phi = RAD * lat;
  const H = RAD * (280.16 + 360.9856235 * d) - lw - ra;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { azimuth: ((az / RAD + 180) % 360 + 360) % 360, elevation: alt / RAD };
}

const FACADES = { n: 0, north: 0, ne: 45, e: 90, east: 90, se: 135, s: 180, south: 180, sw: 225, w: 270, west: 270, nw: 315 };
export function facadeAngle(f) {
  const k = String(f || "").toLowerCase().replace(/[^a-z]/g, "");
  return k in FACADES ? FACADES[k] : null;
}

// Which way a window looks into the house (a unit vector in plan units).
function inwardOf(w, line, roomAt) {
  if (w.inward) return w.inward;
  const [a, b] = line;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  for (const s of [1, -1]) for (const step of [20, 35, 55]) if (roomAt(mx + s * n[0] * step, my + s * n[1] * step)) return [s * n[0], s * n[1]];
  return null;
}

// Sunlit patches: [{ id, room, points }] for windows the sun shines into.
// `offset`: degrees the house is turned from the facades written in the model.
export function sunPatches(model, sun, { roomAt, offset = 0, cmPerSvg = 1 }) {
  if (!sun || sun.elevation < 2) return [];
  const out = [];
  const tanE = Math.tan(sun.elevation * RAD);
  for (const w of model.windows || []) {
    const face = facadeAngle(w.facade);
    if (face === null) continue;
    const delta = ((sun.azimuth - (face + offset) + 540) % 360) - 180; // sun vs the window's outward direction
    if (Math.abs(delta) >= 85) continue;
    const lines = w.line ? [w.line] : Object.values(w.sashes || {}).map((s) => (Array.isArray(s) ? s : s && s.line)).filter(Boolean);
    if (!lines.length) continue;
    // the whole opening: the two ends of its lines furthest apart (sashes overlap)
    const pts = lines.flat();
    let line = [pts[0], pts[1]], best = -1;
    for (const a of pts) for (const b of pts) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > best) { best = d; line = [a, b]; } }
    const n = inwardOf(w, line, roomAt);
    if (!n) continue;
    const room = roomAt(((line[0][0] + line[1][0]) / 2) + n[0] * 35, ((line[0][1] + line[1][1]) / 2) + n[1] * 35);
    if (!room) continue;
    // heights in cm: full-height glass (sliding, doors) from the floor, windows from a sill
    const door = w.type === "hst" || /door|balcony|terrace|hst/i.test(w.id || "");
    const head = door ? 220 : 210, sill = door ? 0 : 85;
    // the glass projected on the floor: from where the sill's shadow ends to where the top of the glass
    // lets the sun reach (a low sun throws it far - the room's outline cuts what lands on the walls)
    const near = Math.min(1500, sill / tanE) / cmPerSvg, far = Math.min(1500, head / tanE) / cmPerSvg;
    if (far - near < 5) continue;
    // the light travels into the house, turned by delta from straight in
    const t = delta * RAD, v = [n[0] * Math.cos(t) - n[1] * Math.sin(t), n[0] * Math.sin(t) + n[1] * Math.cos(t)];
    const inner = (w.tick || 12) * 1;
    const [p1, p2] = line.map((p) => [p[0] + n[0] * inner, p[1] + n[1] * inner]);
    const at = (p, d) => [p[0] + v[0] * d, p[1] + v[1] * d];
    out.push({ id: w.id, room, points: [at(p1, near), at(p2, near), at(p2, far), at(p1, far)], from: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], dir: v, length: far });
  }
  return out;
}

const f1 = (v) => Math.round(v * 10) / 10;

// The sun layer: patches clipped to their rooms' outlines, soft-edged like a real
// patch of sun (the penumbra), one warm even colour.
export function sunLayer(patches, rooms) {
  if (!patches.length) return `<g id="fc-sun" pointer-events="none"></g>`;
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const defs = [`<filter id="fc-sun-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5"/></filter>`], paths = [];
  patches.forEach((p, i) => {
    const r = byId.get(p.room);
    if (!r) return;
    defs.push(`<clipPath id="fc-sun-c${i}"><polygon points="${r.points.map((q) => f1(q[0]) + "," + f1(q[1])).join(" ")}"/></clipPath>`);
    // the blur inside the room's clip: soft at the light's own edges, sharp at the walls
    paths.push(`<g clip-path="url(#fc-sun-c${i})"><polygon filter="url(#fc-sun-soft)" fill="#ffd98a" fill-opacity="0.3" points="${p.points.map((q) => f1(q[0]) + "," + f1(q[1])).join(" ")}"/></g>`);
  });
  return `<g id="fc-sun" pointer-events="none"><defs>${defs.join("")}</defs><g>${paths.join("")}</g></g>`;
}
